<?php
if (!defined('ABSPATH')) exit;

/**
 * WECC Indexing Manager
 * 
 * Maneja la creación y gestión de índices para optimizar búsquedas
 * Versión: Índices básicos (no rompe lógicas existentes)
 */
class WECC_Indexing_Manager {
    
    private static $indexing_version = '1.1';
    
    /**
     * Inicializar sistema de indexación
     */
    public static function init(): void {
        // Verificar si necesita crear/actualizar índices
        $installed_version = get_option('wecc_indexing_version', '0');
        
        if (version_compare($installed_version, self::$indexing_version, '<')) {
            self::create_basic_indexes();
            update_option('wecc_indexing_version', self::$indexing_version);
            error_log('WECC Indexing: Índices actualizados a versión ' . self::$indexing_version);
        }
    }
    
    /**
     * Crear índices básicos (automático al activar plugin)
     */
    public static function create_basic_indexes(): array {
        global $wpdb;
        
        $results = [];
        
        // Definir índices a crear
        $indexes = [
            // Índices en wp_usermeta para campos WooCommerce más buscados
            [
                'name' => 'idx_wecc_usermeta_billing_meta',
                'table' => $wpdb->usermeta,
                'sql' => "CREATE INDEX idx_wecc_usermeta_billing_meta ON {$wpdb->usermeta} (meta_key, meta_value(50))",
                'description' => 'Índice general para metadatos de billing'
            ],
            
            // Índices en wp_users
            [
                'name' => 'idx_wecc_display_name',
                'table' => $wpdb->users,
                'sql' => "CREATE INDEX idx_wecc_display_name ON {$wpdb->users} (display_name(50))",
                'description' => 'Índice para búsquedas por nombre'
            ],
            [
                'name' => 'idx_wecc_user_email_search',
                'table' => $wpdb->users,
                'sql' => "CREATE INDEX idx_wecc_user_email_search ON {$wpdb->users} (user_email(50))",
                'description' => 'Índice para búsquedas por email'
            ],
            
            // Índices en tabla WECC
            [
                'name' => 'idx_wecc_rfc',
                'table' => $wpdb->prefix . 'wecc_customer_profiles',
                'sql' => "CREATE INDEX idx_wecc_rfc ON {$wpdb->prefix}wecc_customer_profiles (rfc)",
                'description' => 'Índice para búsquedas por RFC'
            ],
            [
                'name' => 'idx_wecc_customer_number',
                'table' => $wpdb->prefix . 'wecc_customer_profiles',
                'sql' => "CREATE INDEX idx_wecc_customer_number ON {$wpdb->prefix}wecc_customer_profiles (customer_number)",
                'description' => 'Índice para búsquedas por número de cliente'
            ],
            [    'name' => 'idx_wecc_search_fields',
                'table' => $wpdb->prefix . 'wecc_customer_profiles',
                'sql' => "CREATE INDEX idx_wecc_search_fields ON {$wpdb->prefix}wecc_customer_profiles (user_id, customer_type, rfc, customer_number)",
                'description' => 'Índice compuesto para búsquedas múltiples'
            ],
            
            // === NUEVOS ÍNDICES PARA ESTADÍSTICAS (v1.1) ===
            
            // Índice crítico para cálculos de vencidos
            [
                'name' => 'idx_wecc_ledger_overdue',
                'table' => $wpdb->prefix . 'wecc_ledger',
                'sql' => "CREATE INDEX idx_wecc_ledger_overdue ON {$wpdb->prefix}wecc_ledger (account_id, type, due_date)",
                'description' => 'Índice para cálculos de montos vencidos'
            ],
            
            // Índice para pagos aplicados a cargos
            [
                'name' => 'idx_wecc_ledger_payments',
                'table' => $wpdb->prefix . 'wecc_ledger',
                'sql' => "CREATE INDEX idx_wecc_ledger_payments ON {$wpdb->prefix}wecc_ledger (settles_ledger_id, type)",
                'description' => 'Índice para pagos aplicados a cargos específicos'
            ],
            
            // Índice para cuentas activas y límites
            [
                'name' => 'idx_wecc_accounts_status',
                'table' => $wpdb->prefix . 'wecc_credit_accounts',
                'sql' => "CREATE INDEX idx_wecc_accounts_status ON {$wpdb->prefix}wecc_credit_accounts (user_id, status, credit_limit)",
                'description' => 'Índice para estadísticas de cuentas de crédito'
            ],
            
            // Índice para transacciones por fecha (útil para reportes)
            [
                'name' => 'idx_wecc_ledger_created',
                'table' => $wpdb->prefix . 'wecc_ledger',
                'sql' => "CREATE INDEX idx_wecc_ledger_created ON {$wpdb->prefix}wecc_ledger (created_at, type)",
                'description' => 'Índice para consultas por fecha de transacción'
            ]
        ];
        
        foreach ($indexes as $index) {
            $result = self::create_single_index($index);
            $results[] = $result;
        }
        
        return $results;
    }
    
    /**
     * Crear un índice individual
     */
    private static function create_single_index(array $index): array {
        global $wpdb;
        
        // Verificar si el índice ya existe
        if (self::index_exists($index['table'], $index['name'])) {
            return [
                'index' => $index['name'],
                'status' => 'exists',
                'message' => 'Índice ya existe',
                'description' => $index['description']
            ];
        }
        
        try {
            $result = $wpdb->query($index['sql']);
            
            return [
                'index' => $index['name'],
                'status' => $result !== false ? 'created' : 'failed',
                'message' => $result !== false ? 'Creado exitosamente' : 'Error: ' . $wpdb->last_error,
                'description' => $index['description']
            ];
            
        } catch (Exception $e) {
            return [
                'index' => $index['name'],
                'status' => 'error',
                'message' => $e->getMessage(),
                'description' => $index['description']
            ];
        }
    }
    
    /**
     * Verificar si un índice existe
     */
    public static function index_exists(string $table, string $index_name): bool {
        global $wpdb;
        
        $result = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
             WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s AND INDEX_NAME = %s",
            DB_NAME, $table, $index_name
        ));
        
        return $result > 0;
    }
    
    /**
     * Forzar recreación de todos los índices
     */
    public static function reindex_all(): array {
        // Primero eliminar índices existentes
        $drop_results = self::drop_wecc_indexes();
        
        // Luego crear nuevamente
        $create_results = self::create_basic_indexes();
        
        return [
            'drop_results' => $drop_results,
            'create_results' => $create_results,
            'summary' => [
                'total_dropped' => count(array_filter($drop_results, fn($r) => $r['status'] === 'dropped')),
                'total_created' => count(array_filter($create_results, fn($r) => $r['status'] === 'created')),
                'errors' => count(array_filter(array_merge($drop_results, $create_results), fn($r) => $r['status'] === 'error'))
            ]
        ];
    }
    
    /**
     * Eliminar índices creados por WECC
     */
    public static function drop_wecc_indexes(): array {
        global $wpdb;
        
        $results = [];
        $indexes = [
            [$wpdb->usermeta, 'idx_wecc_usermeta_billing_meta'],
            [$wpdb->users, 'idx_wecc_display_name'],
            [$wpdb->users, 'idx_wecc_user_email_search'],
            [$wpdb->prefix . 'wecc_customer_profiles', 'idx_wecc_rfc'],
            [$wpdb->prefix . 'wecc_customer_profiles', 'idx_wecc_customer_number'],
            [$wpdb->prefix . 'wecc_customer_profiles', 'idx_wecc_search_fields'],
            // Nuevos índices v1.1
            [$wpdb->prefix . 'wecc_ledger', 'idx_wecc_ledger_overdue'],
            [$wpdb->prefix . 'wecc_ledger', 'idx_wecc_ledger_payments'],
            [$wpdb->prefix . 'wecc_credit_accounts', 'idx_wecc_accounts_status'],
            [$wpdb->prefix . 'wecc_ledger', 'idx_wecc_ledger_created']
        ];
        
        foreach ($indexes as [$table, $index_name]) {
            if (!self::index_exists($table, $index_name)) {
                $results[] = [
                    'index' => $index_name,
                    'status' => 'not_exists',
                    'message' => 'Índice no existe'
                ];
                continue;
            }
            
            try {
                $sql = "DROP INDEX {$index_name} ON {$table}";
                $result = $wpdb->query($sql);
                $results[] = [
                    'index' => $index_name,
                    'status' => $result !== false ? 'dropped' : 'failed',
                    'message' => $result !== false ? 'Eliminado exitosamente' : 'Error: ' . $wpdb->last_error
                ];
            } catch (Exception $e) {
                $results[] = [
                    'index' => $index_name,
                    'status' => 'error',
                    'message' => $e->getMessage()
                ];
            }
        }
        
        return $results;
    }
    
    /**
     * Analizar rendimiento de búsquedas
     */
    public static function analyze_search_performance(string $search_term = 'test'): array {
        global $wpdb;
        
        // Medir tiempo de búsqueda
        $start_time = microtime(true);
        
        try {
            $unified_service = wecc_service('unified_customer_service');
            $results = $unified_service->search_customers(['search' => $search_term], 1, 20);
            $search_successful = true;
        } catch (Exception $e) {
            $results = ['total' => 0];
            $search_successful = false;
            $search_error = $e->getMessage();
        }
        
        $end_time = microtime(true);
        $query_time = ($end_time - $start_time) * 1000; // en milisegundos
        
        // Obtener plan de ejecución
        $explain_plan = self::get_search_query_plan($search_term);
        
        return [
            'search_term' => $search_term,
            'query_time_ms' => round($query_time, 2),
            'results_found' => $results['total'],
            'search_successful' => $search_successful,
            'search_error' => $search_error ?? null,
            'explain_plan' => $explain_plan,
            'recommendations' => self::get_performance_recommendations($explain_plan, $query_time),
            'index_status' => self::get_index_status_summary()
        ];
    }
    
    /**
     * Obtener plan de ejecución de la consulta de búsqueda
     */
    private static function get_search_query_plan(string $search_term): array {
        global $wpdb;
        
        $search = '%' . $wpdb->esc_like($search_term) . '%';
        
        $sql = "EXPLAIN SELECT DISTINCT u.ID as user_id
            FROM {$wpdb->users} u
            LEFT JOIN {$wpdb->prefix}wecc_customer_profiles p ON u.ID = p.user_id
            LEFT JOIN {$wpdb->usermeta} um_phone ON u.ID = um_phone.user_id AND um_phone.meta_key = 'billing_phone'
            LEFT JOIN {$wpdb->usermeta} um_company ON u.ID = um_company.user_id AND um_company.meta_key = 'billing_company'
            LEFT JOIN {$wpdb->usermeta} um_first_name ON u.ID = um_first_name.user_id AND um_first_name.meta_key = 'billing_first_name'
            LEFT JOIN {$wpdb->usermeta} um_last_name ON u.ID = um_last_name.user_id AND um_last_name.meta_key = 'billing_last_name'
            WHERE (
                u.display_name LIKE '{$search}' OR 
                u.user_email LIKE '{$search}' OR
                um_phone.meta_value LIKE '{$search}' OR
                um_company.meta_value LIKE '{$search}' OR
                um_first_name.meta_value LIKE '{$search}' OR
                um_last_name.meta_value LIKE '{$search}' OR
                CONCAT(um_first_name.meta_value, ' ', um_last_name.meta_value) LIKE '{$search}' OR
                p.rfc LIKE '{$search}' OR
                p.customer_number LIKE '{$search}'
            )
            ORDER BY u.display_name ASC
            LIMIT 20";
        
        try {
            return $wpdb->get_results($sql, ARRAY_A);
        } catch (Exception $e) {
            return [['error' => $e->getMessage()]];
        }
    }
    
    /**
     * Generar recomendaciones de rendimiento
     */
    private static function get_performance_recommendations(array $explain_plan, float $query_time): array {
        $recommendations = [];
        
        if ($query_time > 200) {
            $recommendations[] = '🔴 Consulta muy lenta (>200ms) - Se recomienda indexación avanzada';
        } elseif ($query_time > 100) {
            $recommendations[] = '🟡 Consulta lenta (>100ms) - Considerar optimización';
        } else {
            $recommendations[] = '🟢 Consulta rápida (<100ms) - Rendimiento aceptable';
        }
        
        foreach ($explain_plan as $row) {
            if (isset($row['type']) && $row['type'] === 'ALL') {
                $recommendations[] = "⚠️ Tabla {$row['table']} usa Full Table Scan";
            }
            
            if (isset($row['rows']) && $row['rows'] > 5000) {
                $recommendations[] = "📊 Tabla {$row['table']} examina {$row['rows']} filas";
            }
            
            if (isset($row['key']) && empty($row['key'])) {
                $recommendations[] = "🔍 Tabla {$row['table']} no usa índices";
            }
        }
        
        return $recommendations;
    }
    
    /**
     * Obtener resumen del estado de índices
     */
    public static function get_index_status_summary(): array {
        global $wpdb;
        
        // Mapeo correcto de índice → tabla específica
        $index_table_mapping = [
            // Índices en wp_usermeta
            'idx_wecc_usermeta_billing_meta' => $wpdb->usermeta,
            
            // Índices en wp_users
            'idx_wecc_display_name' => $wpdb->users,
            'idx_wecc_user_email_search' => $wpdb->users,
            
            // Índices en wecc_customer_profiles
            'idx_wecc_rfc' => $wpdb->prefix . 'wecc_customer_profiles',
            'idx_wecc_customer_number' => $wpdb->prefix . 'wecc_customer_profiles',
            'idx_wecc_search_fields' => $wpdb->prefix . 'wecc_customer_profiles',
            
            // Índices v1.1 en wecc_ledger
            'idx_wecc_ledger_overdue' => $wpdb->prefix . 'wecc_ledger',
            'idx_wecc_ledger_payments' => $wpdb->prefix . 'wecc_ledger',
            'idx_wecc_ledger_created' => $wpdb->prefix . 'wecc_ledger',
            
            // Índices v1.1 en wecc_credit_accounts
            'idx_wecc_accounts_status' => $wpdb->prefix . 'wecc_credit_accounts'
        ];
        
        $status = [];
        foreach ($index_table_mapping as $index => $table) {
            // Buscar cada índice en SU tabla específica
            $status[$index] = self::index_exists($table, $index);
        }
        
        $total = count($status);
        $created = count(array_filter($status));
        
        return [
            'total_expected' => $total,
            'total_created' => $created,
            'percentage' => $total > 0 ? round(($created / $total) * 100, 1) : 0,
            'details' => $status,
            'is_fully_indexed' => $created === $total
        ];
    }
    
    /**
     * Obtener información detallada de índices
     */
    public static function get_detailed_index_info(): array {
        global $wpdb;
        
        $tables = [
            'users' => $wpdb->users,
            'usermeta' => $wpdb->usermeta,
            'wecc_profiles' => $wpdb->prefix . 'wecc_customer_profiles',
            'wecc_ledger' => $wpdb->prefix . 'wecc_ledger',
            'wecc_accounts' => $wpdb->prefix . 'wecc_credit_accounts'
        ];
        
        $index_info = [];
        
        foreach ($tables as $alias => $table) {
            $indexes = $wpdb->get_results($wpdb->prepare(
                "SELECT INDEX_NAME, COLUMN_NAME, SEQ_IN_INDEX, NON_UNIQUE, INDEX_TYPE, CARDINALITY
                 FROM INFORMATION_SCHEMA.STATISTICS 
                 WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s 
                 ORDER BY INDEX_NAME, SEQ_IN_INDEX",
                DB_NAME, $table
            ), ARRAY_A);
            
            $index_info[$alias] = $indexes;
        }
        
        return $index_info;
    }
    
    /**
     * Verificar si el sistema de indexación está activo
     */
    public static function is_indexing_enabled(): bool {
        return get_option('wecc_indexing_version', '0') !== '0';
    }
    
    /**
     * Obtener versión de indexación instalada
     */
    public static function get_indexing_version(): string {
        return get_option('wecc_indexing_version', '0');
    }
}
