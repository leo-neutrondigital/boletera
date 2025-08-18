<?php
if (!defined('ABSPATH')) exit;

/**
 * WECC Customers Controller
 * 
 * Maneja la lista de clientes, vista individual y acciones básicas
 */
class WECC_Customers_Controller {
    
    private $customer_service;
    private $balance_service;
    
    public function __construct() {
        $this->init_dependencies();
    }
    
    /**
     * Inicializar servicios
     */
    private function init_dependencies(): void {
        if (function_exists('wecc_service')) {
            try {
                $this->customer_service = wecc_service('customer_service');
                $this->balance_service = wecc_service('balance_service');
            } catch (Exception $e) {
                error_log('WECC Customers Controller: Error inicializando servicios - ' . $e->getMessage());
            }
        }
    }
    
    /**
     * Renderiza la lista de clientes con acciones rápidas
     */
    public function render_customers_list(): void {
        // Verificar que el servicio esté disponible
        if (!$this->customer_service) {
            echo '<div class="notice notice-error"><p>' . __('Error: Servicio de clientes no disponible. Recarga la página.', 'wc-enhanced-customers-credit') . '</p></div>';
            return;
        }
        
        // Obtener parámetros
        $search = sanitize_text_field($_GET['s'] ?? '');
        $page = max(1, (int) ($_GET['paged'] ?? 1));
        $per_page = 20;
        
        // Obtener clientes
        $results = $this->customer_service->search_customers(['search' => $search], $page, $per_page);
        
        // Enriquecer con datos de crédito
        $enriched_customers = $this->enrich_customers_with_credit_data($results['profiles'] ?? []);
        
        // Variables para la vista
        $view_data = [
            'customers' => $enriched_customers,
            'search' => $search,
            'pagination' => [
                'current_page' => $page,
                'total_pages' => $results['pages'] ?? 1,
                'total_items' => $results['total'] ?? 0
            ]
        ];
        
        // Cargar vista
        $this->load_view('customers-list', $view_data);
    }
    
    /**
     * Enriquece datos de clientes con información de crédito
     */
    private function enrich_customers_with_credit_data(array $profiles): array {
        $enriched = [];
        
        foreach ($profiles as $profile) {
            $user_id = $profile['user_id'];
            $user = get_user_by('id', $user_id);
            
            // Obtener datos de crédito
            $account = wecc_get_or_create_account($user_id);
            $balance = wecc_get_user_balance($user_id);
            
            // Verificar si tiene cargos vencidos
            $has_overdue = $this->has_overdue_charges($user_id);
            
            $enriched[] = [
                'user_id' => $user_id,
                'user' => $user,
                'profile' => $profile,
                'account' => $account,
                'balance' => $balance,
                'has_overdue' => $has_overdue,
                'status' => $this->get_customer_status($account, $has_overdue)
            ];
        }
        
        return $enriched;
    }
    
    /**
     * Verifica si tiene cargos vencidos
     */
    private function has_overdue_charges(int $user_id): bool {
        global $wpdb;
        
        // Usar balance_used en lugar de remaining_amount que no existe
        $count = (int) $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$wpdb->prefix}wecc_ledger l
             LEFT JOIN {$wpdb->prefix}wecc_credit_accounts a ON l.account_id = a.id
             WHERE a.user_id = %d 
             AND l.type = 'charge' 
             AND l.due_date < NOW() 
             AND l.amount > 0",
            $user_id
        ));
        
        return $count > 0;
    }
    
    /**
     * Determina el estado visual del cliente
     */
    private function get_customer_status($account, bool $has_overdue): array {
        if (!$account || $account->credit_limit <= 0) {
            return ['text' => 'Sin Crédito', 'class' => 'no-credit'];
        }
        
        if ($has_overdue) {
            return ['text' => 'Bloqueado', 'class' => 'blocked'];
        }
        
        if ($account->status === 'active') {
            return ['text' => 'Activo', 'class' => 'active'];
        }
        
        return ['text' => 'Inactivo', 'class' => 'inactive'];
    }
    
    /**
     * Renderiza la vista completa de historial de un cliente
     */
    public function render_customer_history(): void {
        $user_id = (int) ($_GET['user_id'] ?? 0);
        
        if (!$user_id) {
            wp_redirect(admin_url('admin.php?page=wecc-dashboard&tab=customers'));
            exit;
        }
        
        if (!$this->customer_service) {
            echo '<div class="notice notice-error"><p>' . __('Error: Servicio no disponible.', 'wc-enhanced-customers-credit') . '</p></div>';
            return;
        }
        
        // Procesar formulario de pago rápido
        if (isset($_POST['wecc_action']) && $_POST['wecc_action'] === 'register_payment') {
            $this->process_quick_payment($_POST);
        }
        
        // Mostrar mensaje de éxito si viene desde pago
        if (isset($_GET['message']) && $_GET['message'] === 'payment_registered') {
            echo '<div class="notice notice-success is-dismissible"><p><strong>✅ Pago registrado exitosamente.</strong> El historial se ha actualizado.</p></div>';
        }
        
        // Mostrar errores si existen
        if (isset($_GET['error'])) {
            echo '<div class="notice notice-error is-dismissible"><p><strong>❌ Error:</strong> ' . esc_html(urldecode($_GET['error'])) . '</p></div>';
        }
        
        $user = get_user_by('id', $user_id);
        if (!$user) {
            echo '<div class="notice notice-error"><p>' . __('Usuario no encontrado.', 'wc-enhanced-customers-credit') . '</p></div>';
            return;
        }
        
        // Obtener datos completos incluyendo balance detallado
        $profile = $this->customer_service->get_profile_by_user($user_id);
        $account = wecc_get_or_create_account($user_id);
        $balance = wecc_get_user_balance($user_id);
        
        // Obtener balance detallado si hay balance_service disponible
        if ($this->balance_service && $account) {
            $detailed_balance = $this->balance_service->get_detailed_balance($account->id);
            $balance = array_merge($balance, $detailed_balance);
            
            // DEBUG TEMPORAL
            if (WP_DEBUG && $user_id == 81) {
                echo "<div style='background: #f0f8ff; padding: 15px; margin: 20px 0; border: 1px solid #0073aa;'>";
                echo "<h4>🔍 DEBUG BALANCE USUARIO 81:</h4>";
                
                // Movimientos en ledger
                global $wpdb;
                $ledger_movements = $wpdb->get_results("SELECT * FROM {$wpdb->prefix}wecc_ledger WHERE account_id = {$account->id} ORDER BY id");
                $total_calculated = 0;
                
                echo "<table border='1' style='border-collapse: collapse; font-size: 11px;'>";
                echo "<tr><th>ID</th><th>Tipo</th><th>Monto</th><th>Settles</th><th>Notas</th></tr>";
                
                foreach ($ledger_movements as $mov) {
                    $total_calculated += $mov->amount;
                    $color = $mov->amount > 0 ? '#ffe6e6' : '#e6ffe6';
                    echo "<tr style='background: {$color};'>";
                    echo "<td>{$mov->id}</td>";
                    echo "<td>{$mov->type}</td>";
                    echo "<td><strong>" . number_format($mov->amount, 2) . "</strong></td>";
                    echo "<td>{$mov->settles_ledger_id}</td>";
                    echo "<td>" . substr($mov->notes, 0, 30) . "...</td>";
                    echo "</tr>";
                }
                
                echo "<tr style='background: #fff3cd; font-weight: bold;'>";
                echo "<td colspan='2'>TOTAL</td>";
                echo "<td>" . number_format($total_calculated, 2) . "</td>";
                echo "<td colspan='2'>";
                
                // Manejar precisión decimal
                if (abs($total_calculated) < 0.01) {
                    echo "BALANCE CERO (precisión: " . number_format($total_calculated, 15) . ")";
                } elseif ($total_calculated < 0) {
                    echo "SALDO A FAVOR: " . number_format(abs($total_calculated), 2);
                } else {
                    echo "DEUDA: " . number_format($total_calculated, 2);
                }
                
                echo "</td>";
                echo "</tr>";
                echo "</table>";
                
                error_log("WECC DEBUG: Balance original = " . print_r(wecc_get_user_balance($user_id), true));
                error_log("WECC DEBUG: Balance detallado = " . print_r($detailed_balance, true));
                error_log("WECC DEBUG: Balance final = " . print_r($balance, true));
                error_log("WECC DEBUG: Total calculado en ledger = " . $total_calculated);
                
                echo "</div>";
            }
        }
        
        $movements = $this->get_customer_movements($user_id);
        
        $view_data = [
            'customer' => $user,
            'profile' => $profile,
            'account' => $account,
            'balance' => $balance,
            'movements' => $movements,
            'has_overdue' => $this->has_overdue_charges($user_id)
        ];
        
        $this->load_view('customer-history', $view_data);
    }
    
    /**
     * Obtiene movimientos de un cliente con cálculo dinámico de restante
     */
    private function get_customer_movements(int $user_id): array {
        global $wpdb;
        
        // ORDEN POR FECHA DESC para mostrar movimientos más recientes primero (como frontend)
        $movements = $wpdb->get_results($wpdb->prepare(
            "SELECT l.*, o.id as order_id, l.created_at
             FROM {$wpdb->prefix}wecc_ledger l
             LEFT JOIN {$wpdb->prefix}wecc_credit_accounts a ON l.account_id = a.id
             LEFT JOIN {$wpdb->prefix}posts o ON l.order_id = o.ID
             WHERE a.user_id = %d
             ORDER BY l.created_at DESC, l.id DESC
             LIMIT 50",
            $user_id
        ), ARRAY_A);
        
        // Enriquecer con información adicional
        foreach ($movements as &$movement) {
            $movement['days_remaining'] = $this->calculate_days_remaining($movement);
            $movement['is_overdue'] = $this->is_movement_overdue($movement);
            
            // Cálculo dinámico del restante para cargos
            if ($movement['type'] === 'charge') {
                $movement['remaining_amount'] = $this->calculate_charge_remaining_amount($movement);
                $movement['original_amount'] = (float) $movement['amount'];
            } else {
                // Para pagos, no hay restante
                $movement['remaining_amount'] = 0;
                $movement['original_amount'] = (float) $movement['amount'];
            }
        }
        
        return $movements;
    }
    
    /**
     * Calcula el monto restante de un cargo dinámicamente
     */
    private function calculate_charge_remaining_amount(array $charge): float {
        global $wpdb;
        
        $charge_id = (int) $charge['id'];
        $charge_amount = (float) $charge['amount'];
        $order_id = $charge['order_id'] ? (int) $charge['order_id'] : null;
        
        // Sumar ajustes negativos para este pedido (reembolsos/descuentos)
        $adjustments = 0.0;
        if ($order_id) {
            $adjustments = (float) $wpdb->get_var($wpdb->prepare(
                "SELECT COALESCE(SUM(amount), 0) 
                 FROM {$wpdb->prefix}wecc_ledger 
                 WHERE type = 'adjustment' AND order_id = %d AND amount < 0",
                $order_id
            ));
        }
        
        // Sumar pagos aplicados a este cargo específico
        $payments_applied = (float) $wpdb->get_var($wpdb->prepare(
            "SELECT COALESCE(SUM(ABS(amount)), 0) 
             FROM {$wpdb->prefix}wecc_ledger 
             WHERE type = 'payment' AND settles_ledger_id = %d",
            $charge_id
        ));
        
        // Cálculo: Cargo original + ajustes negativos - pagos aplicados
        $remaining = $charge_amount + $adjustments - $payments_applied;
        
        return max(0, $remaining);
    }
    
    /**
     * Calcula días restantes para un movimiento
     */
    private function calculate_days_remaining(array $movement): ?int {
        if (!$movement['due_date'] || $movement['type'] !== 'charge') {
            return null;
        }
        
        $due_date = new DateTime($movement['due_date']);
        $now = new DateTime();
        $diff = $now->diff($due_date);
        
        if ($due_date < $now) {
            return -$diff->days; // Negativo = vencido
        }
        
        return $diff->days;
    }
    
    /**
     * Verifica si un movimiento está vencido
     */
    private function is_movement_overdue(array $movement): bool {
        if (!$movement['due_date'] || $movement['type'] !== 'charge') {
            return false;
        }
        
        // Usar amount en lugar de remaining_amount
        return strtotime($movement['due_date']) < time() && $movement['amount'] > 0;
    }
    
    /**
     * Renderiza formulario de edición de datos básicos del cliente (UNIFICADO)
     */
    public function render_customer_edit(): void {
        error_log('WECC Customers Controller: Renderizando customer edit unificado');
        
        try {
            include WECC_PLUGIN_DIR . 'includes/admin/views/unified-customer-form.php';
        } catch (Exception $e) {
            echo '<div class="notice notice-error"><p>' . esc_html($e->getMessage()) . '</p></div>';
            error_log('WECC Error in customer edit: ' . $e->getMessage());
        }
    }
    
    /**
     * Renderiza formulario básico de cliente (sin crédito)
     */
    private function render_basic_customer_form($user, $profile): void {
        echo '<table class="form-table">';
        
        // Selector de usuario (solo para nuevo)
        if (!$user) {
            echo '<tr>';
            echo '<th><label for="wecc_user_search">' . __('Usuario', 'wc-enhanced-customers-credit') . '</label></th>';
            echo '<td>';
            echo '<input type="hidden" name="user_id" id="wecc_user_id" value="">';
            echo '<input type="text" id="wecc_user_search" class="regular-text" placeholder="' . __('Buscar usuario por email...', 'wc-enhanced-customers-credit') . '" autocomplete="off">';
            echo '<p class="description">' . __('Escribe para buscar usuarios existentes.', 'wc-enhanced-customers-credit') . '</p>';
            
            // JavaScript para autocomplete (temporal hasta mover assets)
            $this->render_user_search_script();
            echo '</td>';
            echo '</tr>';
        } else {
            echo '<input type="hidden" name="user_id" value="' . $user->ID . '">';
            
            // Mostrar datos de WordPress (readonly)
            echo '<tr>';
            echo '<th>' . __('Datos de WordPress', 'wc-enhanced-customers-credit') . '</th>';
            echo '<td style="background: #f8f9fa; padding: 15px; border-radius: 4px; border: 1px solid #e9ecef;">';
            echo '<div style="display: grid; grid-template-columns: auto 1fr; gap: 10px 20px; align-items: center;">';
            echo '<strong>Nombre:</strong> <span>' . esc_html($user->display_name) . '</span>';
            echo '<strong>Email:</strong> <span>' . esc_html($user->user_email) . '</span>';
            echo '<strong>Usuario:</strong> <span>' . esc_html($user->user_login) . '</span>';
            echo '</div>';
            echo '<p class="description" style="margin: 10px 0 0 0; font-style: italic; color: #666;">';
            echo '\u2139\ufe0f Estos datos se toman automáticamente de WordPress y no se pueden editar aquí.';
            echo '</p>';
            echo '</td>';
            echo '</tr>';
            
            // Separador visual
            echo '<tr><td colspan="2" style="padding: 0;"><hr style="margin: 20px 0; border: none; border-top: 2px solid #0073aa;"><h3 style="margin: 20px 0 10px 0; color: #0073aa;">\ud83d\udcbc Datos Específicos del Crédito</h3></td></tr>';
        }
        
        // Campos del perfil (SOLO los específicos del crédito)
        if ($this->customer_service) {
            $fields = $this->customer_service->get_field_definitions();
            foreach ($fields as $field_key => $field_config) {
                $value = $profile ? ($profile[$field_key] ?? '') : '';
                
                echo '<tr>';
                echo '<th><label for="' . esc_attr($field_key) . '">' . esc_html($field_config['label']) . '</label></th>';
                echo '<td>';
                $this->render_form_field($field_key, $field_config, $value);
                if (!empty($field_config['description'])) {
                    echo '<p class="description">' . esc_html($field_config['description']) . '</p>';
                }
                echo '</td>';
                echo '</tr>';
            }
        }
        
        echo '</table>';
    }
    
    /**
     * Renderiza un campo de formulario
     */
    private function render_form_field(string $field_key, array $field_config, $value): void {
        $field_name = esc_attr($field_key);
        $field_id = esc_attr($field_key);
        $field_value = esc_attr($value);
        
        switch ($field_config['type']) {
            case 'select':
                echo '<select name="' . $field_name . '" id="' . $field_id . '">';
                echo '<option value="">' . __('Seleccionar...', 'wc-enhanced-customers-credit') . '</option>';
                foreach ($field_config['options'] as $option_value => $option_label) {
                    $selected = selected($value, $option_value, false);
                    echo '<option value="' . esc_attr($option_value) . '" ' . $selected . '>' . esc_html($option_label) . '</option>';
                }
                echo '</select>';
                break;
                
            case 'user_select':
                echo '<select name="' . $field_name . '" id="' . $field_id . '">';
                echo '<option value="">' . __('Sin asignar', 'wc-enhanced-customers-credit') . '</option>';
                
                $users = get_users(['role' => $field_config['role'] ?? 'shop_manager']);
                foreach ($users as $user) {
                    $selected = selected($value, $user->ID, false);
                    echo '<option value="' . esc_attr($user->ID) . '" ' . $selected . '>' . esc_html($user->display_name) . '</option>';
                }
                echo '</select>';
                break;
                
            case 'tel':
                echo '<input type="tel" name="' . $field_name . '" id="' . $field_id . '" value="' . $field_value . '" class="regular-text"';
                if (!empty($field_config['placeholder'])) {
                    echo ' placeholder="' . esc_attr($field_config['placeholder']) . '"';
                }
                echo '>';
                break;
                
            default: // text
                echo '<input type="text" name="' . $field_name . '" id="' . $field_id . '" value="' . $field_value . '" class="regular-text"';
                if (!empty($field_config['placeholder'])) {
                    echo ' placeholder="' . esc_attr($field_config['placeholder']) . '"';
                }
                if (!empty($field_config['pattern'])) {
                    echo ' pattern="' . esc_attr($field_config['pattern']) . '"';
                }
                if (!empty($field_config['max_length'])) {
                    echo ' maxlength="' . esc_attr($field_config['max_length']) . '"';
                }
                echo '>';
                break;
        }
    }
    
    /**
     * Script temporal para búsqueda de usuarios
     */
    private function render_user_search_script(): void {
        // Asegurar que wecc_admin esté disponible
        wp_enqueue_script('jquery-ui-autocomplete');
        wp_localize_script('jquery', 'wecc_admin', [
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('wecc_admin_nonce')
        ]);
        
        add_action('admin_footer', function() {
            ?>
            <script type="text/javascript">
            jQuery(document).ready(function($) {
                if (typeof $.fn.autocomplete !== 'undefined' && typeof wecc_admin !== 'undefined') {
                    $('#wecc_user_search').autocomplete({
                        source: function(request, response) {
                            $.ajax({
                                url: wecc_admin.ajax_url,
                                type: 'POST',
                                dataType: 'json',
                                data: {
                                    action: 'wecc_user_search',
                                    term: request.term,
                                    nonce: wecc_admin.nonce
                                },
                                success: function(data) {
                                    if (data.success && data.data) {
                                        response(data.data);
                                    } else {
                                        response([]);
                                    }
                                },
                                error: function() {
                                    response([]);
                                }
                            });
                        },
                        minLength: 2,
                        select: function(event, ui) {
                            $('#wecc_user_id').val(ui.item.id);
                            $(this).val(ui.item.label);
                            return false;
                        }
                    });
                }
            });
            </script>
            <?php
        });
    }
    
    /**
     * Maneja búsqueda AJAX de usuarios
     */
    public function ajax_user_search(): void {
        // Verificar permisos
        if (!current_user_can('manage_woocommerce')) {
            wp_send_json_error('Sin permisos');
        }
        
        // Verificar nonce
        $nonce = $_POST['nonce'] ?? '';
        if (!wp_verify_nonce($nonce, 'wecc_admin_nonce')) {
            wp_send_json_error('Nonce inválido');
        }
        
        $search = sanitize_text_field($_POST['term'] ?? '');
        
        if (strlen($search) < 2) {
            wp_send_json_success([]);
        }
        
        // Buscar usuarios
        $users = get_users([
            'search' => '*' . $search . '*',
            'search_columns' => ['user_email', 'display_name', 'user_login'],
            'number' => 10,
            'fields' => ['ID', 'display_name', 'user_email']
        ]);
        
        $results = [];
        foreach ($users as $user) {
            // Verificar si ya tiene perfil
            $has_profile = false;
            if ($this->customer_service) {
                $profile = $this->customer_service->get_profile_by_user($user->ID);
                $has_profile = !empty($profile);
            }
            
            $label = $user->display_name . ' (' . $user->user_email . ')';
            if ($has_profile) {
                $label .= ' [Ya tiene perfil]';
            }
            
            $results[] = [
                'id' => $user->ID,
                'label' => $label,
                'value' => $user->user_email
            ];
        }
        
        wp_send_json_success($results);
    }
    
    /**
     * Procesa el formulario de pago rápido
     */
    private function process_quick_payment(array $data): void {
        // Verificar nonce
        if (!wp_verify_nonce($data['wecc_payment_nonce'] ?? '', 'wecc_register_payment')) {
            wp_die(__('Error de seguridad. Inténtalo de nuevo.', 'wc-enhanced-customers-credit'));
        }
        
        // Verificar permisos
        if (!current_user_can('manage_woocommerce')) {
            wp_die(__('No tienes permisos para realizar esta acción.', 'wc-enhanced-customers-credit'));
        }
        
        $user_id = (int) ($data['user_id'] ?? 0);
        $amount = (float) ($data['payment_amount'] ?? 0);
        $notes = sanitize_textarea_field($data['payment_notes'] ?? '');
        
        if (!$user_id || $amount <= 0) {
            wp_die(__('Datos inválidos en el formulario.', 'wc-enhanced-customers-credit'));
        }
        
        try {
            // Reutilizar la lógica existente del balance service
            if ($this->balance_service) {
                $account = wecc_get_or_create_account($user_id);
                if (!$account) {
                    throw new Exception(__('No se pudo obtener la cuenta del cliente.', 'wc-enhanced-customers-credit'));
                }
                
                // Aplicar pago con lógica FIFO (reutilizando lógica existente)
                $result = $this->balance_service->allocate_general_payment(
                    $account->id, 
                    $amount, 
                    null, // sin order_id
                    $notes ?: 'Pago externo registrado desde admin', 
                    ['payment_method' => 'admin_quick_payment']
                );
                
                if ($result && $result['success']) {
                    // Redirigir con mensaje de éxito
                    $redirect_url = add_query_arg([
                        'page' => 'wecc-dashboard',
                        'tab' => 'customers',
                        'action' => 'view',
                        'user_id' => $user_id,
                        'message' => 'payment_registered'
                    ], admin_url('admin.php'));
                    
                    wp_redirect($redirect_url);
                    exit;
                } else {
                    throw new Exception(__('Error al procesar el pago.', 'wc-enhanced-customers-credit'));
                }
            } else {
                throw new Exception(__('Servicio de balance no disponible.', 'wc-enhanced-customers-credit'));
            }
            
        } catch (Exception $e) {
            // Mostrar error y redirigir
            $error_message = $e->getMessage();
            $redirect_url = add_query_arg([
                'page' => 'wecc-dashboard',
                'tab' => 'customers', 
                'action' => 'view',
                'user_id' => $user_id,
                'error' => urlencode($error_message)
            ], admin_url('admin.php'));
            
            wp_redirect($redirect_url);
            exit;
        }
    }
    
    /**
     * Carga una vista
     */
    private function load_view(string $view, array $data = []): void {
        extract($data);
        $view_file = WECC_PLUGIN_DIR . "includes/admin/views/{$view}.php";
        
        if (file_exists($view_file)) {
            include $view_file;
        } else {
            echo '<div class="notice notice-error"><p>Vista no encontrada: ' . esc_html($view) . '</p></div>';
        }
    }
}
