<?php
if (!defined('ABSPATH')) exit;

/**
 * WECC Database Manager
 * Maneja la creación y actualización de tablas de base de datos + indexación
 */
class WECC_Database_Manager {
    
    private static $db_version = '2.2'; // Incrementar cuando agregues cambios (agregamos campo block_all_purchases)
    
    public static function init(): void {
        // Verificar versión y actualizar si es necesario
        $installed_version = get_option('wecc_db_version', '0');
        
        if (version_compare($installed_version, self::$db_version, '<')) {
            self::update_database();
            update_option('wecc_db_version', self::$db_version);
            error_log('WECC Database: Actualizada a versión ' . self::$db_version);
        }
        
        // Inicializar indexación (automático)
        self::init_indexing();
    }
    
    /**
     * Inicializar sistema de indexación
     */
    private static function init_indexing(): void {
        // Cargar el indexing manager si existe
        $indexing_file = WECC_PLUGIN_DIR . 'includes/database/class-wecc-indexing-manager.php';
        if (file_exists($indexing_file)) {
            require_once $indexing_file;
            
            if (class_exists('WECC_Indexing_Manager')) {
                WECC_Indexing_Manager::init();
            }
        }
    }
    
    /**
     * Actualiza la base de datos a la versión más reciente
     */
    private static function update_database(): void {
        global $wpdb;
        
        // Crear tabla si no existe
        self::create_customer_profiles_table();
        
        // NUEVO: Crear tabla de cuentas de crédito
        self::create_credit_accounts_table();
        
        // NUEVO: Crear tabla de movimientos
        self::create_ledger_table();
        
        // Agregar columnas faltantes (migración)
        self::add_missing_columns();
        
        error_log('WECC Database: Migración completada');
    }
    
    /**
     * Crea la tabla de cuentas de crédito
     */
    private static function create_credit_accounts_table(): void {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'wecc_credit_accounts';
        $charset_collate = $wpdb->get_charset_collate();
        
        $sql = "CREATE TABLE $table_name (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            user_id bigint(20) unsigned NOT NULL,
            credit_limit decimal(15,2) DEFAULT 0.00,
            current_balance decimal(15,2) DEFAULT 0.00,
            balance_used decimal(15,2) DEFAULT 0.00,
            available_credit decimal(15,2) DEFAULT 0.00,
            status varchar(20) DEFAULT 'active',
            payment_terms_days int(11) DEFAULT 30,
            
            -- NUEVO CAMPO VERSIÓN 2.2
            block_all_purchases_when_overdue tinyint(1) DEFAULT 1,
            
            last_activity_at datetime DEFAULT NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            
            PRIMARY KEY (id),
            UNIQUE KEY user_id (user_id),
            KEY status (status),
            KEY credit_limit (credit_limit)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
        
        error_log('WECC Database: Tabla credit_accounts verificada/creada');
    }
    
    /**
     * Crea la tabla de movimientos del ledger
     */
    private static function create_ledger_table(): void {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'wecc_ledger';
        $charset_collate = $wpdb->get_charset_collate();
        
        $sql = "CREATE TABLE $table_name (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            account_id bigint(20) unsigned NOT NULL,
            user_id bigint(20) unsigned NOT NULL,
            type varchar(20) NOT NULL,
            amount decimal(15,2) NOT NULL,
            description text DEFAULT NULL,
            order_id bigint(20) unsigned DEFAULT NULL,
            due_date datetime DEFAULT NULL,
            settles_ledger_id bigint(20) unsigned DEFAULT NULL,
            remaining_amount decimal(15,2) DEFAULT NULL,
            notes text DEFAULT NULL,
            metadata text DEFAULT NULL,
            transaction_date datetime DEFAULT CURRENT_TIMESTAMP,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            
            PRIMARY KEY (id),
            KEY account_id (account_id),
            KEY user_id (user_id),
            KEY type (type),
            KEY order_id (order_id),
            KEY due_date (due_date),
            KEY transaction_date (transaction_date)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
        
        error_log('WECC Database: Tabla ledger verificada/creada');
    }
    
    /**
     * Crea la tabla de perfiles de clientes
     */
    private static function create_customer_profiles_table(): void {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'wecc_customer_profiles';
        
        $charset_collate = $wpdb->get_charset_collate();
        
        $sql = "CREATE TABLE $table_name (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            user_id bigint(20) unsigned NOT NULL,
            customer_number varchar(50) DEFAULT NULL,
            full_name varchar(255) DEFAULT NULL,
            street varchar(255) DEFAULT NULL,
            colonia varchar(100) DEFAULT NULL,
            city varchar(100) DEFAULT NULL,
            state3 char(3) DEFAULT NULL,
            zip varchar(10) DEFAULT NULL,
            rfc varchar(20) DEFAULT NULL,
            regfiscal varchar(3) DEFAULT NULL,
            phone varchar(20) DEFAULT NULL,
            type varchar(50) DEFAULT NULL,
            flete varchar(50) DEFAULT NULL,
            seller bigint(20) unsigned DEFAULT NULL,
            custom_fields longtext DEFAULT NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            
            -- NUEVAS COLUMNAS PARA VERSIÓN 2.1
            customer_type varchar(50) DEFAULT NULL,
            sales_rep bigint(20) unsigned DEFAULT NULL,
            customer_since date DEFAULT NULL,
            credit_notes text DEFAULT NULL,
            payment_terms_preference varchar(50) DEFAULT NULL,
            credit_rating varchar(20) DEFAULT NULL,
            internal_notes text DEFAULT NULL,
            
            PRIMARY KEY (id),
            UNIQUE KEY customer_number (customer_number),
            KEY user_id (user_id),
            KEY customer_type (customer_type),
            KEY sales_rep (sales_rep)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
        
        error_log('WECC Database: Tabla customer_profiles verificada/creada');
    }
    
    /**
     * Agrega columnas faltantes a tabla existente
     */
    private static function add_missing_columns(): void {
        global $wpdb;
        
        // Migrar tabla de perfiles
        self::migrate_customer_profiles_table();
        
        // NUEVO: Migrar tabla de cuentas de crédito
        self::migrate_credit_accounts_table();
    }
    
    /**
     * Migra tabla customer_profiles
     */
    private static function migrate_customer_profiles_table(): void {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'wecc_customer_profiles';
        
        // Verificar si la tabla existe
        if ($wpdb->get_var("SHOW TABLES LIKE '$table_name'") != $table_name) {
            return; // Si no existe, dbDelta ya la creó completa
        }
        
        // Obtener columnas actuales
        $existing_columns = [];
        $columns = $wpdb->get_results("DESCRIBE $table_name");
        foreach ($columns as $col) {
            $existing_columns[] = $col->Field;
        }
        
        // Columnas que necesitamos agregar
        $new_columns = [
            'customer_type' => 'VARCHAR(50) DEFAULT NULL',
            'sales_rep' => 'BIGINT(20) UNSIGNED DEFAULT NULL',
            'customer_since' => 'DATE DEFAULT NULL',
            'credit_notes' => 'TEXT DEFAULT NULL',
            'payment_terms_preference' => 'VARCHAR(50) DEFAULT NULL',
            'credit_rating' => 'VARCHAR(20) DEFAULT NULL',
            'internal_notes' => 'TEXT DEFAULT NULL'
        ];
        
        // Agregar columnas faltantes
        foreach ($new_columns as $column_name => $column_definition) {
            if (!in_array($column_name, $existing_columns)) {
                $sql = "ALTER TABLE $table_name ADD COLUMN $column_name $column_definition";
                $result = $wpdb->query($sql);
                
                if ($result !== false) {
                    error_log("WECC Database: Columna agregada - $column_name");
                } else {
                    error_log("WECC Database: Error agregando columna $column_name - " . $wpdb->last_error);
                }
            }
        }
        
        // Agregar índices si no existen
        self::add_missing_indexes_profiles();
    }
    
    /**
     * Migra tabla credit_accounts (NUEVO)
     */
    private static function migrate_credit_accounts_table(): void {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'wecc_credit_accounts';
        
        // Verificar si la tabla existe
        if ($wpdb->get_var("SHOW TABLES LIKE '$table_name'") != $table_name) {
            return; // Si no existe, dbDelta ya la creó completa
        }
        
        // Obtener columnas actuales
        $existing_columns = [];
        $columns = $wpdb->get_results("DESCRIBE $table_name");
        foreach ($columns as $col) {
            $existing_columns[] = $col->Field;
        }
        
        // CAMPO NUEVO VERSIÓN 2.2: bloquear todas las compras cuando hay vencidos
        if (!in_array('block_all_purchases_when_overdue', $existing_columns)) {
            $sql = "ALTER TABLE $table_name ADD COLUMN block_all_purchases_when_overdue TINYINT(1) DEFAULT 1";
            $result = $wpdb->query($sql);
            
            if ($result !== false) {
                error_log("WECC Database: Campo block_all_purchases_when_overdue agregado con éxito");
            } else {
                error_log("WECC Database: Error agregando campo block_all_purchases_when_overdue - " . $wpdb->last_error);
            }
        }
        
        // Agregar otros campos que pudieran faltar
        $other_fields = [
            'last_activity_at' => 'DATETIME DEFAULT NULL',
            'created_at' => 'DATETIME DEFAULT CURRENT_TIMESTAMP',
            'updated_at' => 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
        ];
        
        foreach ($other_fields as $field_name => $field_definition) {
            if (!in_array($field_name, $existing_columns)) {
                $sql = "ALTER TABLE $table_name ADD COLUMN $field_name $field_definition";
                $result = $wpdb->query($sql);
                
                if ($result !== false) {
                    error_log("WECC Database: Campo $field_name agregado");
                } else {
                    error_log("WECC Database: Error agregando campo $field_name - " . $wpdb->last_error);
                }
            }
        }
    }
    
    /**
     * Agrega índices faltantes para customer_profiles
     */
    private static function add_missing_indexes_profiles(): void {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'wecc_customer_profiles';
        
        // Verificar índices existentes
        $existing_indexes = [];
        $indexes = $wpdb->get_results("SHOW INDEX FROM $table_name");
        foreach ($indexes as $index) {
            $existing_indexes[] = $index->Key_name;
        }
        
        // Índices que necesitamos
        $needed_indexes = [
            'customer_type' => "ADD INDEX customer_type (customer_type)",
            'sales_rep' => "ADD INDEX sales_rep (sales_rep)"
        ];
        
        foreach ($needed_indexes as $index_name => $index_sql) {
            if (!in_array($index_name, $existing_indexes)) {
                $wpdb->query("ALTER TABLE $table_name $index_sql");
                error_log("WECC Database: Índice agregado - $index_name");
            }
        }
    }
    
    /**
     * Obtiene la versión actual de la base de datos
     */
    public static function get_db_version(): string {
        return get_option('wecc_db_version', '0');
    }
    
    /**
     * Obtiene la versión requerida
     */
    public static function get_required_version(): string {
        return self::$db_version;
    }
    
    /**
     * Verifica si la base de datos está actualizada
     */
    public static function is_db_up_to_date(): bool {
        return version_compare(self::get_db_version(), self::$db_version, '>=');
    }
    
    /**
     * Métodos de utilidad para indexación
     */
    
    /**
     * Forzar recreación de índices (para uso manual)
     */
    public static function reindex_database(): array {
        $indexing_file = WECC_PLUGIN_DIR . 'includes/database/class-wecc-indexing-manager.php';
        if (file_exists($indexing_file)) {
            require_once $indexing_file;
            
            if (class_exists('WECC_Indexing_Manager')) {
                return WECC_Indexing_Manager::reindex_all();
            }
        }
        
        return ['error' => 'Indexing Manager no disponible'];
    }
    
    /**
     * Obtener estado de indexación
     */
    public static function get_indexing_status(): array {
        $indexing_file = WECC_PLUGIN_DIR . 'includes/database/class-wecc-indexing-manager.php';
        if (file_exists($indexing_file)) {
            require_once $indexing_file;
            
            if (class_exists('WECC_Indexing_Manager')) {
                return [
                    'enabled' => WECC_Indexing_Manager::is_indexing_enabled(),
                    'version' => WECC_Indexing_Manager::get_indexing_version(),
                    'status' => WECC_Indexing_Manager::get_index_status_summary()
                ];
            }
        }
        
        return ['enabled' => false, 'version' => '0', 'status' => []];
    }
    
    /**
     * Analizar rendimiento de búsquedas
     */
    public static function analyze_search_performance(string $search_term = 'test'): array {
        $indexing_file = WECC_PLUGIN_DIR . 'includes/database/class-wecc-indexing-manager.php';
        if (file_exists($indexing_file)) {
            require_once $indexing_file;
            
            if (class_exists('WECC_Indexing_Manager')) {
                return WECC_Indexing_Manager::analyze_search_performance($search_term);
            }
        }
        
        return ['error' => 'Análisis no disponible'];
    }
}
