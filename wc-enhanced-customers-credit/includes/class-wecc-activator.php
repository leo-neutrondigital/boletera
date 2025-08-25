<?php
if (!defined('ABSPATH')) {
    exit;
}

/**
 * WECC Activator
 * 
 * Maneja la activación del plugin y setup de DB
 */
class WECC_Activator {
    
    /**
     * Ejecuta tareas de activación
     */
    public static function activate(): void {
        // Verificar permisos
        if (!current_user_can('activate_plugins')) {
            return;
        }
        
        // Crear tablas
        self::create_tables();
        
        // Establecer versión de DB
        update_option('wecc_db_version', WECC_DB_VERSION);
        
        // Inicializar indexación automática
        self::init_indexing();
        
        // Crear páginas si es necesario
        self::create_pages();
        
        // Flush rewrite rules para endpoints
        flush_rewrite_rules();
        
        // Asegurarse de que el endpoint de Mi Crédito esté registrado
        add_rewrite_endpoint('mi-credito', EP_ROOT | EP_PAGES);
        flush_rewrite_rules();
        
        // Marcar que necesita flush en el próximo load
        update_option('wecc_flush_rewrite_rules', true);
        
        // Log de activación
        error_log('WECC Plugin activado correctamente');
    }
    
    /**
     * Inicializar sistema de indexación en activación
     */
    private static function init_indexing(): void {
        $indexing_file = WECC_PLUGIN_DIR . 'includes/database/class-wecc-indexing-manager.php';
        if (file_exists($indexing_file)) {
            require_once $indexing_file;
            
            if (class_exists('WECC_Indexing_Manager')) {
                // Crear índices básicos automáticamente
                $results = WECC_Indexing_Manager::create_basic_indexes();
                
                // Log de resultados
                $created_count = count(array_filter($results, fn($r) => $r['status'] === 'created'));
                $existing_count = count(array_filter($results, fn($r) => $r['status'] === 'exists'));
                $error_count = count(array_filter($results, fn($r) => $r['status'] === 'error'));
                
                error_log("WECC Indexing: {$created_count} índices creados, {$existing_count} ya existían, {$error_count} errores");
                
                // Marcar versión de indexación
                update_option('wecc_indexing_version', '1.0');
            }
        }
    }
    
    /**
     * Actualiza la base de datos si es necesario
     */
    public static function upgrade_database(): void {
        $current_version = get_option('wecc_db_version', '0.0.0');
        
        if (version_compare($current_version, WECC_DB_VERSION, '<')) {
            self::create_tables();
            update_option('wecc_db_version', WECC_DB_VERSION);
            
            error_log("WECC DB actualizada de {$current_version} a " . WECC_DB_VERSION);
        }
    }
    
    /**
     * Crea todas las tablas necesarias
     */
    private static function create_tables(): void {
        global $wpdb;
        
        $charset_collate = $wpdb->get_charset_collate();
        
        // Tabla de perfiles de cliente
        $table_profiles = $wpdb->prefix . 'wecc_customer_profiles';
        $sql_profiles = "CREATE TABLE $table_profiles (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            user_id bigint(20) unsigned NOT NULL,
            customer_number varchar(50) DEFAULT NULL,
            full_name varchar(255) NOT NULL,
            street varchar(255) DEFAULT NULL,
            colonia varchar(100) DEFAULT NULL,
            city varchar(100) DEFAULT NULL,
            state3 varchar(3) DEFAULT NULL,
            zip varchar(10) DEFAULT NULL,
            rfc varchar(20) DEFAULT NULL,
            regfiscal varchar(3) DEFAULT NULL,
            phone varchar(20) DEFAULT NULL,
            type varchar(50) DEFAULT 'regular',
            flete varchar(50) DEFAULT 'normal',
            seller bigint(20) unsigned DEFAULT NULL,
            custom_fields longtext DEFAULT NULL,
            created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uk_user_id (user_id),
            UNIQUE KEY uk_customer_number (customer_number),
            KEY idx_full_name (full_name),
            KEY idx_rfc (rfc),
            KEY idx_state3 (state3),
            KEY idx_type (type),
            KEY idx_seller (seller)
        ) $charset_collate;";
        
        // Tabla de cuentas de crédito
        $table_accounts = $wpdb->prefix . 'wecc_credit_accounts';
        $sql_accounts = "CREATE TABLE $table_accounts (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            user_id bigint(20) unsigned NOT NULL,
            credit_limit decimal(10,2) NOT NULL DEFAULT 0.00,
            current_balance decimal(10,2) NOT NULL DEFAULT 0.00,
            balance_used decimal(10,2) NOT NULL DEFAULT 0.00,
            available_credit decimal(10,2) NOT NULL DEFAULT 0.00,
            status varchar(20) NOT NULL DEFAULT 'active',
            interest_rate decimal(5,2) DEFAULT 0.00,
            payment_terms_days int(11) DEFAULT 30,
            last_activity_at datetime DEFAULT NULL,
            created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uk_user_id (user_id),
            KEY idx_status (status),
            KEY idx_credit_limit (credit_limit),
            KEY idx_current_balance (current_balance),
            KEY idx_balance_used (balance_used)
        ) $charset_collate;";
        
        // Tabla del ledger (movimientos)
        $table_ledger = $wpdb->prefix . 'wecc_ledger';
        $sql_ledger = "CREATE TABLE $table_ledger (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            account_id bigint(20) unsigned NOT NULL,
            user_id bigint(20) unsigned NOT NULL,
            type enum('charge','payment','adjustment','refund') NOT NULL,
            amount decimal(10,2) NOT NULL,
            balance_after decimal(10,2) NOT NULL DEFAULT 0.00,
            description text DEFAULT NULL,
            notes text DEFAULT NULL,
            reference_type varchar(50) DEFAULT NULL,
            reference_id bigint(20) unsigned DEFAULT NULL,
            order_id bigint(20) unsigned DEFAULT NULL,
            settles_ledger_id bigint(20) unsigned DEFAULT NULL,
            settles_order_id bigint(20) unsigned DEFAULT NULL,
            metadata longtext DEFAULT NULL,
            transaction_date datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
            due_date datetime DEFAULT NULL,
            settled_at datetime DEFAULT NULL,
            created_by bigint(20) unsigned DEFAULT NULL,
            created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_account_id (account_id),
            KEY idx_user_id (user_id),
            KEY idx_type (type),
            KEY idx_order_id (order_id),
            KEY idx_reference (reference_type, reference_id),
            KEY idx_settles_ledger (settles_ledger_id),
            KEY idx_settles_order (settles_order_id),
            KEY idx_transaction_date (transaction_date),
            KEY idx_due_date (due_date),
            KEY idx_settled_at (settled_at),
            FOREIGN KEY (account_id) REFERENCES {$table_accounts}(id) ON DELETE CASCADE
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        
        dbDelta($sql_profiles);
        dbDelta($sql_accounts);
        dbDelta($sql_ledger);
        
        // Verificar que las tablas se crearon correctamente
        $tables = [$table_profiles, $table_accounts, $table_ledger];
        foreach ($tables as $table) {
            if ($wpdb->get_var("SHOW TABLES LIKE '$table'") !== $table) {
                error_log("WECC Error: No se pudo crear la tabla $table");
            }
        }
    }
    
    /**
     * Manejo de página "Mi Crédito"
     * - Ya no crea la página automáticamente
     * - Solo actualiza la opción si la página existe
     */
    private static function create_pages(): void {
        $page_slug = 'mi-credito';
        $existing_page = get_page_by_path($page_slug);
        
        if ($existing_page) {
            update_option('wecc_my_credit_page_id', $existing_page->ID);
        } else {
            delete_option('wecc_my_credit_page_id');
        }
    }
}
