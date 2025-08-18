<?php
if (!defined('ABSPATH')) exit;

/**
 * WECC Data Migration Page
 * Migra datos existentes de WooCommerce a WECC
 */
class WECC_Data_Migration {
    
    public function __construct() {
        // Solo cargar en admin
        if (is_admin()) {
            add_action('admin_menu', [$this, 'add_migration_page'], 25);
            add_action('wp_ajax_wecc_migrate_data', [$this, 'handle_migration_ajax']);
        }
    }
    
    /**
     * Agregar página de migración al menú
     */
    public function add_migration_page(): void {
        add_submenu_page(
            'wecc-dashboard',
            __('Migrar Datos WC', 'wc-enhanced-customers-credit'),
            __('Migrar Datos', 'wc-enhanced-customers-credit'),
            'manage_woocommerce',
            'wecc-migration',
            [$this, 'render_migration_page']
        );
    }
    
    /**
     * Renderizar página de migración
     */
    public function render_migration_page(): void {
        ?>
        <div class="wrap">
            <h1>🔄 Migrar Datos de WooCommerce a WECC</h1>
            
            <div class="notice notice-info">
                <p><strong>¿Para qué sirve esto?</strong></p>
                <p>Si ya tienes clientes con datos de facturación en WooCommerce (teléfono, dirección, etc.), 
                   esta herramienta los sincronizará automáticamente con los perfiles de WECC.</p>
            </div>
            
            <div class="card" style="max-width: 800px;">
                <h2>Análisis Previo</h2>
                <p>Antes de migrar, vamos a analizar qué datos tienes:</p>
                
                <button type="button" id="wecc-analyze-btn" class="button button-secondary">
                    🔍 Analizar Datos Existentes
                </button>
                
                <div id="wecc-analysis-results" style="margin-top: 20px;"></div>
            </div>
            
            <div class="card" style="max-width: 800px; margin-top: 20px;">
                <h2>Migración de Datos</h2>
                <p>Una vez analizado, puedes proceder con la migración:</p>
                
                <button type="button" id="wecc-migrate-btn" class="button button-primary" disabled>
                    ⚡ Ejecutar Migración
                </button>
                
                <div id="wecc-migration-results" style="margin-top: 20px;"></div>
            </div>
        </div>
        
        <script type="text/javascript">
        jQuery(document).ready(function($) {
            let analysisData = null;
            
            // Analizar datos
            $('#wecc-analyze-btn').on('click', function() {
                const $btn = $(this);
                const $results = $('#wecc-analysis-results');
                
                $btn.prop('disabled', true).text('🔄 Analizando...');
                $results.html('<div class="notice notice-info"><p>Analizando usuarios con datos de WooCommerce...</p></div>');
                
                $.ajax({
                    url: ajaxurl,
                    type: 'POST',
                    data: {
                        action: 'wecc_migrate_data',
                        operation: 'analyze',
                        nonce: '<?php echo wp_create_nonce('wecc_migration'); ?>'
                    },
                    success: function(response) {
                        if (response.success) {
                            analysisData = response.data;
                            $results.html(response.data.html);
                            $('#wecc-migrate-btn').prop('disabled', false);
                        } else {
                            $results.html('<div class="notice notice-error"><p>Error: ' + response.data + '</p></div>');
                        }
                    },
                    error: function() {
                        $results.html('<div class="notice notice-error"><p>Error de conexión</p></div>');
                    },
                    complete: function() {
                        $btn.prop('disabled', false).text('🔍 Analizar Datos Existentes');
                    }
                });
            });
            
            // Ejecutar migración
            $('#wecc-migrate-btn').on('click', function() {
                if (!analysisData) {
                    alert('Primero ejecuta el análisis');
                    return;
                }
                
                if (!confirm('¿Confirmas la migración de ' + analysisData.total + ' usuarios?')) {
                    return;
                }
                
                const $btn = $(this);
                const $results = $('#wecc-migration-results');
                
                $btn.prop('disabled', true).text('⚡ Migrando...');
                $results.html('<div class="notice notice-info"><p>Ejecutando migración...</p></div>');
                
                $.ajax({
                    url: ajaxurl,
                    type: 'POST',
                    data: {
                        action: 'wecc_migrate_data',
                        operation: 'migrate',
                        nonce: '<?php echo wp_create_nonce('wecc_migration'); ?>'
                    },
                    success: function(response) {
                        if (response.success) {
                            $results.html(response.data.html);
                            analysisData = null; // Reset
                            $('#wecc-analyze-btn').text('🔄 Re-analizar');
                        } else {
                            $results.html('<div class="notice notice-error"><p>Error: ' + response.data + '</p></div>');
                        }
                    },
                    error: function() {
                        $results.html('<div class="notice notice-error"><p>Error de conexión</p></div>');
                    },
                    complete: function() {
                        $btn.prop('disabled', true).text('⚡ Ejecutar Migración');
                    }
                });
            });
        });
        </script>
        <?php
    }
    
    /**
     * Manejar AJAX de migración
     */
    public function handle_migration_ajax(): void {
        // Verificar permisos y nonce
        if (!current_user_can('manage_woocommerce') || 
            !wp_verify_nonce($_POST['nonce'] ?? '', 'wecc_migration')) {
            wp_send_json_error('Sin permisos');
        }
        
        $operation = $_POST['operation'] ?? '';
        
        try {
            switch ($operation) {
                case 'analyze':
                    $this->analyze_data();
                    break;
                case 'migrate':
                    $this->migrate_data();
                    break;
                default:
                    wp_send_json_error('Operación inválida');
            }
        } catch (Exception $e) {
            wp_send_json_error($e->getMessage());
        }
    }
    
    /**
     * Analizar datos existentes
     */
    private function analyze_data(): void {
        global $wpdb;
        
        // Obtener usuarios con datos de billing
        $users_with_wc_data = $wpdb->get_results("
            SELECT DISTINCT u.ID, u.user_email, u.display_name
            FROM {$wpdb->users} u
            INNER JOIN {$wpdb->usermeta} um ON u.ID = um.user_id
            WHERE um.meta_key IN (
                'billing_phone', 'billing_address_1', 'billing_city', 
                'billing_state', 'billing_postcode', 'billing_company'
            )
            AND um.meta_value != ''
            ORDER BY u.ID
            LIMIT 50
        ");
        
        if (empty($users_with_wc_data)) {
            wp_send_json_error('No se encontraron usuarios con datos de billing en WooCommerce');
        }
        
        if (!function_exists('wecc_service')) {
            wp_send_json_error('Servicio WECC no disponible');
        }
        
        $customer_service = wecc_service('customer_service');
        $analysis = [
            'total' => count($users_with_wc_data),
            'with_profile' => 0,
            'without_profile' => 0,
            'examples' => []
        ];
        
        // Analizar primeros 10 usuarios como muestra
        foreach (array_slice($users_with_wc_data, 0, 10) as $user) {
            $user_id = $user->ID;
            $existing_profile = $customer_service->get_profile_by_user($user_id);
            
            if ($existing_profile) {
                $analysis['with_profile']++;
            } else {
                $analysis['without_profile']++;
            }
            
            // Obtener datos WC de muestra
            $wc_data = [
                'phone' => get_user_meta($user_id, 'billing_phone', true),
                'address' => get_user_meta($user_id, 'billing_address_1', true),
                'city' => get_user_meta($user_id, 'billing_city', true)
            ];
            
            $analysis['examples'][] = [
                'name' => $user->display_name,
                'email' => $user->user_email,
                'has_profile' => !empty($existing_profile),
                'wc_data' => array_filter($wc_data)
            ];
        }
        
        // Generar HTML de resultados
        $html = '<div class="notice notice-success">';
        $html .= '<h3>📊 Análisis Completado</h3>';
        $html .= '<ul>';
        $html .= '<li><strong>Total de usuarios con datos WC:</strong> ' . $analysis['total'] . '</li>';
        $html .= '<li><strong>Ya tienen perfil WECC:</strong> ' . $analysis['with_profile'] . '</li>';
        $html .= '<li><strong>Sin perfil WECC:</strong> ' . $analysis['without_profile'] . '</li>';
        $html .= '</ul>';
        $html .= '</div>';
        
        $html .= '<h4>👥 Muestra de usuarios (primeros 10):</h4>';
        $html .= '<table class="wp-list-table widefat fixed striped">';
        $html .= '<thead><tr><th>Usuario</th><th>Estado WECC</th><th>Datos WC Encontrados</th></tr></thead>';
        $html .= '<tbody>';
        
        foreach ($analysis['examples'] as $example) {
            $html .= '<tr>';
            $html .= '<td><strong>' . esc_html($example['name']) . '</strong><br><small>' . esc_html($example['email']) . '</small></td>';
            $html .= '<td>' . ($example['has_profile'] ? '✅ Con perfil' : '❌ Sin perfil') . '</td>';
            $html .= '<td><small>' . implode(', ', array_map(function($k, $v) {
                return "$k: $v";
            }, array_keys($example['wc_data']), array_values($example['wc_data']))) . '</small></td>';
            $html .= '</tr>';
        }
        
        $html .= '</tbody></table>';
        
        wp_send_json_success([
            'html' => $html,
            'total' => $analysis['total'],
            'summary' => $analysis
        ]);
    }
    
    /**
     * Ejecutar migración completa
     */
    private function migrate_data(): void {
        global $wpdb;
        
        if (!function_exists('wecc_service')) {
            throw new Exception('Servicio WECC no disponible');
        }
        
        $customer_service = wecc_service('customer_service');
        
        // Obtener usuarios con datos de billing
        $users_with_wc_data = $wpdb->get_results("
            SELECT DISTINCT u.ID, u.user_email, u.display_name
            FROM {$wpdb->users} u
            INNER JOIN {$wpdb->usermeta} um ON u.ID = um.user_id
            WHERE um.meta_key IN (
                'billing_phone', 'billing_address_1', 'billing_city', 
                'billing_state', 'billing_postcode', 'billing_company'
            )
            AND um.meta_value != ''
            ORDER BY u.ID
        ");
        
        $results = [
            'created' => 0,
            'updated' => 0,
            'skipped' => 0,
            'errors' => 0,
            'details' => []
        ];
        
        foreach ($users_with_wc_data as $user) {
            $user_id = $user->ID;
            
            try {
                // Obtener datos de WooCommerce
                $wc_data = [
                    'billing_phone' => get_user_meta($user_id, 'billing_phone', true),
                    'billing_address_1' => get_user_meta($user_id, 'billing_address_1', true),
                    'billing_city' => get_user_meta($user_id, 'billing_city', true),
                    'billing_state' => get_user_meta($user_id, 'billing_state', true),
                    'billing_postcode' => get_user_meta($user_id, 'billing_postcode', true),
                    'billing_company' => get_user_meta($user_id, 'billing_company', true),
                ];
                
                // Mapear a formato WECC
                $wecc_data = [];
                if (!empty($wc_data['billing_phone'])) $wecc_data['phone'] = $wc_data['billing_phone'];
                if (!empty($wc_data['billing_address_1'])) $wecc_data['street'] = $wc_data['billing_address_1'];
                if (!empty($wc_data['billing_city'])) $wecc_data['city'] = $wc_data['billing_city'];
                if (!empty($wc_data['billing_postcode'])) $wecc_data['zip'] = $wc_data['billing_postcode'];
                
                // Mapear estado
                if (!empty($wc_data['billing_state'])) {
                    $state_map = [
                        'AG' => 'AGU', 'BC' => 'BCN', 'BS' => 'BCS', 'CM' => 'CAM',
                        'CS' => 'CHP', 'CH' => 'CHH', 'CO' => 'COA', 'CL' => 'COL',
                        'DF' => 'DIF', 'DG' => 'DUR', 'GT' => 'GUA', 'GR' => 'GUE',
                        'HG' => 'HID', 'JA' => 'JAL', 'EM' => 'MEX', 'MI' => 'MIC',
                        'MO' => 'MOR', 'NA' => 'NAY', 'NL' => 'NLE', 'OA' => 'OAX',
                        'PU' => 'PUE', 'QT' => 'QUE', 'QR' => 'ROO', 'SL' => 'SLP',
                        'SI' => 'SIN', 'SO' => 'SON', 'TB' => 'TAB', 'TM' => 'TAM',
                        'TL' => 'TLA', 'VE' => 'VER', 'YU' => 'YUC', 'ZA' => 'ZAC'
                    ];
                    $state = $wc_data['billing_state'];
                    $wecc_data['state3'] = $state_map[$state] ?? $state;
                }
                
                $existing_profile = $customer_service->get_profile_by_user($user_id);
                
                if ($existing_profile) {
                    // Actualizar solo campos vacíos
                    $needs_update = false;
                    $updated_fields = [];
                    
                    foreach ($wecc_data as $field => $value) {
                        if (empty($existing_profile[$field]) && !empty($value)) {
                            $existing_profile[$field] = $value;
                            $needs_update = true;
                            $updated_fields[] = $field;
                        }
                    }
                    
                    if ($needs_update) {
                        $customer_service->save_profile($user_id, $existing_profile);
                        $results['updated']++;
                        $results['details'][] = $user->display_name . ' (actualizado: ' . implode(', ', $updated_fields) . ')';
                    } else {
                        $results['skipped']++;
                    }
                } else {
                    // Crear nuevo perfil
                    if (!empty($wecc_data)) {
                        $customer_service->save_profile($user_id, $wecc_data);
                        $results['created']++;
                        $results['details'][] = $user->display_name . ' (creado: ' . implode(', ', array_keys($wecc_data)) . ')';
                    } else {
                        $results['skipped']++;
                    }
                }
                
            } catch (Exception $e) {
                $results['errors']++;
                $results['details'][] = $user->display_name . ' (error: ' . $e->getMessage() . ')';
            }
        }
        
        // Generar HTML de resultados
        $html = '<div class="notice notice-success">';
        $html .= '<h3>✅ Migración Completada</h3>';
        $html .= '<ul>';
        $html .= '<li><strong>Perfiles creados:</strong> ' . $results['created'] . '</li>';
        $html .= '<li><strong>Perfiles actualizados:</strong> ' . $results['updated'] . '</li>';
        $html .= '<li><strong>Sin cambios:</strong> ' . $results['skipped'] . '</li>';
        $html .= '<li><strong>Errores:</strong> ' . $results['errors'] . '</li>';
        $html .= '</ul>';
        $html .= '</div>';
        
        if (!empty($results['details'])) {
            $html .= '<h4>📋 Detalles:</h4>';
            $html .= '<ul>';
            foreach (array_slice($results['details'], 0, 20) as $detail) {
                $html .= '<li>' . esc_html($detail) . '</li>';
            }
            if (count($results['details']) > 20) {
                $html .= '<li><em>... y ' . (count($results['details']) - 20) . ' más</em></li>';
            }
            $html .= '</ul>';
        }
        
        wp_send_json_success([
            'html' => $html,
            'results' => $results
        ]);
    }
}

// Inicializar solo si estamos en admin
if (is_admin()) {
    new WECC_Data_Migration();
}
