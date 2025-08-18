<?php
if (!defined('ABSPATH')) exit;

/**
 * WECC Database Manager
 * Maneja la creación y actualización de tablas de base de datos
 */
class WECC_Database_Manager {
    
    private static $db_version = '2.1'; // Incrementar cuando agregues cambios
    
    public static function init(): void {
        // Verificar versión y actualizar si es necesario
        $installed_version = get_option('wecc_db_version', '0');
        
        if (version_compare($installed_version, self::$db_version, '<')) {
            self::update_database();
            update_option('wecc_db_version', self::$db_version);
            error_log('WECC Database: Actualizada a versión ' . self::$db_version);
        }
    }
    
    /**
     * Actualiza la base de datos a la versión más reciente
     */
    private static function update_database(): void {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'wecc_customer_profiles';
        
        // Crear tabla si no existe
        self::create_customer_profiles_table();
        
        // Agregar columnas faltantes (migración)
        self::add_missing_columns();
        
        error_log('WECC Database: Migración completada');
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
        self::add_missing_indexes();
    }
    
    /**
     * Agrega índices faltantes
     */
    private static function add_missing_indexes(): void {
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
}
