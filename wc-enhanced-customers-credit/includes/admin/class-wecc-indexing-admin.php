<?php
if (!defined('ABSPATH')) exit;

/**
 * WECC Indexing Admin Page
 * 
 * Página de administración para gestión manual de índices y análisis de rendimiento
 */
class WECC_Indexing_Admin_Page {
    
    /**
     * Inicializar página de admin
     */
    public static function init(): void {
        // Solo cargar en admin
        if (!is_admin()) return;
        
        // Registrar hooks
        add_action('admin_menu', [__CLASS__, 'register_admin_page'], 70);
        add_action('wp_ajax_wecc_indexing_action', [__CLASS__, 'handle_ajax_actions']);
    }
    
    /**
     * Registrar página en el menú de admin
     */
    public static function register_admin_page(): void {
        if (!current_user_can('manage_woocommerce')) return;
        
        // Registrar directamente bajo WooCommerce por ahora
        add_submenu_page(
            'woocommerce',           // Parent slug - WooCommerce principal
            __('Optimización WECC', 'wc-enhanced-customers-credit'),
            __('🚀 Optimización WECC', 'wc-enhanced-customers-credit'),
            'manage_woocommerce',
            'wecc-indexing',
            [__CLASS__, 'render_admin_page']
        );
    }
    
    /**
     * Renderizar página de administración
     */
    public static function render_admin_page(): void {
        // Procesar acciones POST
        if (isset($_POST['wecc_indexing_action']) && wp_verify_nonce($_POST['wecc_nonce'], 'wecc_indexing_nonce')) {
            self::handle_form_actions();
        }
        
        // Obtener datos para la página
        $indexing_status = WECC_Database_Manager::get_indexing_status();
        $db_status = [
            'db_version' => WECC_Database_Manager::get_db_version(),
            'required_version' => WECC_Database_Manager::get_required_version(),
            'is_up_to_date' => WECC_Database_Manager::is_db_up_to_date()
        ];
        
        ?>
        <div class="wrap">
            <h1>🚀 Optimización de Base de Datos WECC</h1>
            
            <!-- Estado General -->
            <div class="card" style="max-width: none; margin-bottom: 20px;">
                <h2>📊 Estado General</h2>
                <table class="widefat fixed striped">
                    <tbody>
                        <tr>
                            <td><strong>Versión de Base de Datos:</strong></td>
                            <td>
                                <?php echo esc_html($db_status['db_version']); ?> 
                                <?php if ($db_status['is_up_to_date']): ?>
                                    <span style="color: green;">✅ Actualizada</span>
                                <?php else: ?>
                                    <span style="color: red;">❌ Requiere actualización a <?php echo esc_html($db_status['required_version']); ?></span>
                                <?php endif; ?>
                            </td>
                        </tr>
                        <tr>
                            <td><strong>Sistema de Indexación:</strong></td>
                            <td>
                                <?php if ($indexing_status['enabled']): ?>
                                    <span style="color: green;">✅ Activo (v<?php echo esc_html($indexing_status['version']); ?>)</span>
                                <?php else: ?>
                                    <span style="color: red;">❌ Inactivo</span>
                                <?php endif; ?>
                            </td>
                        </tr>
                        <tr>
                            <td><strong>Índices Instalados:</strong></td>
                            <td>
                                <?php 
                                $status = $indexing_status['status'];
                                if (!empty($status)):
                                ?>
                                    <strong><?php echo $status['total_created']; ?>/<?php echo $status['total_expected']; ?></strong> 
                                    (<?php echo $status['percentage']; ?>%)
                                    <?php if ($status['is_fully_indexed']): ?>
                                        <span style="color: green;">✅ Completo</span>
                                    <?php else: ?>
                                        <span style="color: orange;">⚠️ Parcial</span>
                                    <?php endif; ?>
                                <?php else: ?>
                                    <span style="color: gray;">➖ No disponible</span>
                                <?php endif; ?>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <!-- Acciones Rápidas -->
            <div class="card" style="max-width: none; margin-bottom: 20px;">
                <h2>⚡ Acciones Rápidas</h2>
                <p>Herramientas para gestionar y optimizar la indexación de la base de datos.</p>
                
                <div style="display: flex; gap: 15px; flex-wrap: wrap; margin: 20px 0;">
                    <form method="post" style="display: inline-block;">
                        <?php wp_nonce_field('wecc_indexing_nonce', 'wecc_nonce'); ?>
                        <input type="hidden" name="wecc_indexing_action" value="create_indexes">
                        <button type="submit" class="button button-primary">
                            🔧 Crear/Verificar Índices
                        </button>
                    </form>
                    
                    <form method="post" style="display: inline-block;">
                        <?php wp_nonce_field('wecc_indexing_nonce', 'wecc_nonce'); ?>
                        <input type="hidden" name="wecc_indexing_action" value="reindex_all">
                        <button type="submit" class="button button-secondary" 
                                onclick="return confirm('¿Estás seguro? Esto recreará todos los índices.')">
                            🔄 Reindexar Todo
                        </button>
                    </form>
                    
                    <form method="post" style="display: inline-block;">
                        <?php wp_nonce_field('wecc_indexing_nonce', 'wecc_nonce'); ?>
                        <input type="hidden" name="wecc_indexing_action" value="analyze_performance">
                        <button type="submit" class="button button-secondary">
                            📊 Analizar Rendimiento
                        </button>
                    </form>
                    
                    <form method="post" style="display: inline-block;">
                        <?php wp_nonce_field('wecc_indexing_nonce', 'wecc_nonce'); ?>
                        <input type="hidden" name="wecc_indexing_action" value="drop_indexes">
                        <button type="submit" class="button button-link-delete" 
                                onclick="return confirm('¿Estás seguro? Esto eliminará todos los índices WECC.')">
                            🗑️ Eliminar Índices
                        </button>
                    </form>
                </div>
            </div>
            
            <!-- Análisis de Rendimiento -->
            <div class="card" style="max-width: none; margin-bottom: 20px;">
                <h2>📈 Análisis de Rendimiento</h2>
                <form method="post" style="margin-bottom: 15px;">
                    <?php wp_nonce_field('wecc_indexing_nonce', 'wecc_nonce'); ?>
                    <input type="hidden" name="wecc_indexing_action" value="custom_analysis">
                    <label for="search_term">Término de búsqueda para analizar:</label>
                    <input type="text" name="search_term" id="search_term" value="test" class="regular-text">
                    <button type="submit" class="button">🔍 Analizar</button>
                </form>
                
                <p class="description">
                    Este análisis mide el tiempo de respuesta de las búsquedas y examina el plan de ejecución de la consulta.
                </p>
            </div>
            
            <!-- Estado Detallado de Índices -->
            <?php if ($indexing_status['enabled']): ?>
            <div class="card" style="max-width: none;">
                <h2>🔍 Estado Detallado de Índices</h2>
                <?php 
                $details = $indexing_status['status']['details'] ?? [];
                if (!empty($details)):
                ?>
                <table class="wp-list-table widefat fixed striped">
                    <thead>
                        <tr>
                            <th>Índice</th>
                            <th>Estado</th>
                            <th>Descripción</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($details as $index_name => $exists): ?>
                        <tr>
                            <td><code><?php echo esc_html($index_name); ?></code></td>
                            <td>
                                <?php if ($exists): ?>
                                    <span style="color: green;">✅ Creado</span>
                                <?php else: ?>
                                    <span style="color: red;">❌ Faltante</span>
                                <?php endif; ?>
                            </td>
                            <td>
                                <?php 
                                // Descripciones de índices
                                $descriptions = [
                                    'idx_wecc_usermeta_billing_meta' => 'Optimiza búsquedas en metadatos de WooCommerce',
                                    'idx_wecc_display_name' => 'Acelera búsquedas por nombre de usuario',
                                    'idx_wecc_user_email_search' => 'Mejora búsquedas por email',
                                    'idx_wecc_rfc' => 'Optimiza búsquedas por RFC',
                                    'idx_wecc_customer_number' => 'Acelera búsquedas por número de cliente',
                                    'idx_wecc_search_fields' => 'Índice compuesto para búsquedas múltiples',
                                    // Índices v1.1 para estadísticas
                                    'idx_wecc_ledger_overdue' => 'Índice de optimización para cálculos de vencidos',
                                    'idx_wecc_ledger_payments' => 'Índice de optimización para pagos aplicados',
                                    'idx_wecc_accounts_status' => 'Índice de optimización para estadísticas de cuentas',
                                    'idx_wecc_ledger_created' => 'Índice de optimización para consultas por fecha'
                                ];
                                echo esc_html($descriptions[$index_name] ?? 'Índice de optimización');
                                ?>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
                <?php endif; ?>
            </div>
            <?php endif; ?>
        </div>
        
        <style>
        .card {
            background: white;
            border: 1px solid #ccd0d4;
            border-radius: 4px;
            padding: 20px;
            margin: 20px 0;
        }
        .card h2 {
            margin-top: 0;
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
        }
        .button {
            margin-right: 10px;
            margin-bottom: 5px;
        }
        </style>
        <?php
    }
    
    /**
     * Manejar acciones del formulario
     */
    private static function handle_form_actions(): void {
        $action = $_POST['wecc_indexing_action'];
        
        switch ($action) {
            case 'create_indexes':
                self::handle_create_indexes();
                break;
                
            case 'reindex_all':
                self::handle_reindex_all();
                break;
                
            case 'analyze_performance':
                self::handle_analyze_performance();
                break;
                
            case 'custom_analysis':
                self::handle_custom_analysis();
                break;
                
            case 'drop_indexes':
                self::handle_drop_indexes();
                break;
        }
    }
    
    /**
     * Manejar creación de índices
     */
    private static function handle_create_indexes(): void {
        require_once WECC_PLUGIN_DIR . 'includes/database/class-wecc-indexing-manager.php';
        
        if (class_exists('WECC_Indexing_Manager')) {
            $results = WECC_Indexing_Manager::create_basic_indexes();
            self::show_indexing_results('Creación de Índices', $results);
        } else {
            self::show_admin_notice('error', 'Indexing Manager no disponible');
        }
    }
    
    /**
     * Manejar reindexación completa
     */
    private static function handle_reindex_all(): void {
        $results = WECC_Database_Manager::reindex_database();
        
        if (isset($results['error'])) {
            self::show_admin_notice('error', $results['error']);
        } else {
            $summary = $results['summary'];
            $message = sprintf(
                'Reindexación completada: %d índices eliminados, %d creados, %d errores',
                $summary['total_dropped'],
                $summary['total_created'],
                $summary['errors']
            );
            
            $type = $summary['errors'] > 0 ? 'warning' : 'success';
            self::show_admin_notice($type, $message);
            
            // Mostrar detalles si hay errores
            if ($summary['errors'] > 0) {
                self::show_indexing_results('Resultados Detallados', array_merge(
                    $results['drop_results'], 
                    $results['create_results']
                ));
            }
        }
    }
    
    /**
     * Manejar análisis de rendimiento estándar
     */
    private static function handle_analyze_performance(): void {
        $analysis = WECC_Database_Manager::analyze_search_performance();
        
        if (isset($analysis['error'])) {
            self::show_admin_notice('error', $analysis['error']);
        } else {
            self::show_performance_analysis($analysis);
        }
    }
    
    /**
     * Manejar análisis de rendimiento personalizado
     */
    private static function handle_custom_analysis(): void {
        $search_term = sanitize_text_field($_POST['search_term'] ?? 'test');
        $analysis = WECC_Database_Manager::analyze_search_performance($search_term);
        
        if (isset($analysis['error'])) {
            self::show_admin_notice('error', $analysis['error']);
        } else {
            self::show_performance_analysis($analysis);
        }
    }
    
    /**
     * Manejar eliminación de índices
     */
    private static function handle_drop_indexes(): void {
        require_once WECC_PLUGIN_DIR . 'includes/database/class-wecc-indexing-manager.php';
        
        if (class_exists('WECC_Indexing_Manager')) {
            $results = WECC_Indexing_Manager::drop_wecc_indexes();
            self::show_indexing_results('Eliminación de Índices', $results);
        } else {
            self::show_admin_notice('error', 'Indexing Manager no disponible');
        }
    }
    
    /**
     * Mostrar resultados de operaciones de indexación
     */
    private static function show_indexing_results(string $title, array $results): void {
        echo '<div class="notice notice-info"><h3>' . esc_html($title) . '</h3>';
        echo '<table class="wp-list-table widefat fixed striped">';
        echo '<thead><tr><th>Índice</th><th>Estado</th><th>Mensaje</th></tr></thead><tbody>';
        
        foreach ($results as $result) {
            // Compatible con PHP 7.4+
            switch($result['status']) {
                case 'created':
                case 'dropped':
                    $status_class = 'success';
                    break;
                case 'exists':
                case 'not_exists':
                    $status_class = 'info';
                    break;
                case 'failed':
                case 'error':
                    $status_class = 'error';
                    break;
                default:
                    $status_class = 'info';
            }
            
            switch($result['status']) {
                case 'created':
                    $status_icon = '✅';
                    break;
                case 'dropped':
                    $status_icon = '🗑️';
                    break;
                case 'exists':
                    $status_icon = 'ℹ️';
                    break;
                case 'not_exists':
                    $status_icon = '➖';
                    break;
                case 'failed':
                case 'error':
                    $status_icon = '❌';
                    break;
                default:
                    $status_icon = '❓';
            }
            
            echo '<tr>';
            echo '<td><code>' . esc_html($result['index']) . '</code></td>';
            echo '<td><span class="' . $status_class . '">' . $status_icon . ' ' . esc_html(ucfirst($result['status'])) . '</span></td>';
            echo '<td>' . esc_html($result['message']) . '</td>';
            echo '</tr>';
        }
        
        echo '</tbody></table></div>';
    }
    
    /**
     * Mostrar análisis de rendimiento
     */
    private static function show_performance_analysis(array $analysis): void {
        echo '<div class="notice notice-info"><h3>📊 Análisis de Rendimiento</h3>';
        
        // Resumen principal
        echo '<table class="wp-list-table widefat fixed striped" style="margin-bottom: 15px;">';
        echo '<tbody>';
        echo '<tr><td><strong>Término buscado:</strong></td><td>' . esc_html($analysis['search_term']) . '</td></tr>';
        echo '<tr><td><strong>Tiempo de consulta:</strong></td><td>' . esc_html($analysis['query_time_ms']) . ' ms</td></tr>';
        echo '<tr><td><strong>Resultados encontrados:</strong></td><td>' . esc_html($analysis['results_found']) . '</td></tr>';
        echo '<tr><td><strong>Estado de búsqueda:</strong></td><td>';
        
        if ($analysis['search_successful']) {
            echo '<span style="color: green;">✅ Exitosa</span>';
        } else {
            echo '<span style="color: red;">❌ Error: ' . esc_html($analysis['search_error']) . '</span>';
        }
        
        echo '</td></tr>';
        echo '</tbody></table>';
        
        // Recomendaciones
        if (!empty($analysis['recommendations'])) {
            echo '<h4>💡 Recomendaciones:</h4><ul>';
            foreach ($analysis['recommendations'] as $recommendation) {
                echo '<li>' . esc_html($recommendation) . '</li>';
            }
            echo '</ul>';
        }
        
        // Estado de índices
        $index_status = $analysis['index_status'];
        if (!empty($index_status)) {
            echo '<h4>🔍 Estado de Indexación:</h4>';
            echo '<p>Índices instalados: <strong>' . $index_status['total_created'] . '/' . $index_status['total_expected'] . '</strong> (' . $index_status['percentage'] . '%)</p>';
        }
        
        echo '</div>';
    }
    
    /**
     * Mostrar notificación admin
     */
    private static function show_admin_notice(string $type, string $message): void {
        echo '<div class="notice notice-' . esc_attr($type) . '"><p>' . esc_html($message) . '</p></div>';
    }
}
