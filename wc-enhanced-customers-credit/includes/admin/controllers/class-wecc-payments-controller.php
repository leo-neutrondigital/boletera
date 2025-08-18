<?php
if (!defined('ABSPATH')) exit;

/**
 * WECC Payments Controller
 * 
 * Maneja pagos externos y aplicación FIFO
 */
class WECC_Payments_Controller {
    
    private $payment_service;
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
                $this->payment_service = wecc_service('payment_service');
                $this->balance_service = wecc_service('balance_service');
            } catch (Exception $e) {
                error_log('WECC Payments Controller: Error inicializando servicios - ' . $e->getMessage());
            }
        }
    }
    
    /**
     * Renderiza página de pagos externos
     */
    public function render_payments_page(): void {
        echo '<div class="wecc-external-payments">';
        echo '<h3>' . __('Pagos Externos', 'wc-enhanced-customers-credit') . '</h3>';
        echo '<p>' . __('Registra pagos realizados fuera del sistema (efectivo, transferencia, etc.)', 'wc-enhanced-customers-credit') . '</p>';
        
        // Enlace rápido al formulario
        $register_url = admin_url('admin.php?page=wecc-dashboard&tab=payments&action=register');
        echo '<p><a href="' . esc_url($register_url) . '" class="button button-primary">💳 ' . __('Registrar Nuevo Pago', 'wc-enhanced-customers-credit') . '</a></p>';
        
        // Pagos recientes
        $this->render_recent_payments();
        
        echo '</div>';
    }
    
    /**
     * Renderiza lista de pagos recientes
     */
    private function render_recent_payments(): void {
        global $wpdb;
        
        $recent_payments = $wpdb->get_results(
            "SELECT l.*, u.display_name, u.user_email, p.full_name
             FROM {$wpdb->prefix}wecc_ledger l
             LEFT JOIN {$wpdb->prefix}wecc_credit_accounts a ON l.account_id = a.id
             LEFT JOIN {$wpdb->prefix}users u ON a.user_id = u.ID
             LEFT JOIN {$wpdb->prefix}wecc_customer_profiles p ON a.user_id = p.user_id
             WHERE l.type = 'payment' 
             AND l.notes LIKE '%manual%'
             ORDER BY l.created_at DESC
             LIMIT 20",
            ARRAY_A
        );
        
        echo '<div style="background: white; padding: 20px; border: 1px solid #c3c4c7; border-radius: 4px; margin-top: 20px;">';
        echo '<h4>' . __('Pagos Externos Recientes', 'wc-enhanced-customers-credit') . '</h4>';
        
        if (!empty($recent_payments)) {
            echo '<table class="wp-list-table widefat fixed striped">';
            echo '<thead>';
            echo '<tr>';
            echo '<th>' . __('Cliente', 'wc-enhanced-customers-credit') . '</th>';
            echo '<th>' . __('Monto', 'wc-enhanced-customers-credit') . '</th>';
            echo '<th>' . __('Fecha', 'wc-enhanced-customers-credit') . '</th>';
            echo '<th>' . __('Notas', 'wc-enhanced-customers-credit') . '</th>';
            echo '<th>' . __('Registrado por', 'wc-enhanced-customers-credit') . '</th>';
            echo '</tr>';
            echo '</thead>';
            echo '<tbody>';
            
            foreach ($recent_payments as $payment) {
                $registered_by = get_user_by('id', $payment['created_by']);
                
                echo '<tr>';
                echo '<td>' . esc_html($payment['full_name'] ?: $payment['display_name']) . '<br><small>' . esc_html($payment['user_email']) . '</small></td>';
                echo '<td><span style="color: #00a32a; font-weight: 600;">' . wc_price(abs($payment['amount'])) . '</span></td>';
                echo '<td>' . esc_html(date_i18n('d/m/Y H:i', strtotime($payment['created_at']))) . '</td>';
                echo '<td><small>' . esc_html($payment['notes']) . '</small></td>';
                echo '<td>' . esc_html($registered_by ? $registered_by->display_name : 'Desconocido') . '</td>';
                echo '</tr>';
            }
            
            echo '</tbody>';
            echo '</table>';
        } else {
            echo '<p>' . __('No hay pagos externos registrados aún.', 'wc-enhanced-customers-credit') . '</p>';
        }
        
        echo '</div>';
    }
    
    /**
     * Renderiza formulario de registro de pago externo
     */
    public function render_payment_form(): void {
        $user_id = (int) ($_GET['user_id'] ?? 0);
        $user = $user_id ? get_user_by('id', $user_id) : null;
        
        echo '<div class="wecc-payment-form">';
        echo '<h3>' . __('Registrar Pago Externo', 'wc-enhanced-customers-credit') . '</h3>';
        
        echo '<form method="post">';
        wp_nonce_field('wecc_external_payment', 'wecc_payment_nonce');
        
        echo '<table class="form-table">';
        
        // Selector de cliente
        if (!$user) {
            echo '<tr>';
            echo '<th><label for="wecc_customer_search">' . __('Cliente', 'wc-enhanced-customers-credit') . '</label></th>';
            echo '<td>';
            echo '<input type="hidden" name="user_id" id="wecc_customer_id" value="">';
            echo '<input type="text" id="wecc_customer_search" class="regular-text" placeholder="' . __('Buscar cliente por email...', 'wc-enhanced-customers-credit') . '" autocomplete="off">';
            echo '<p class="description">' . __('Escribe para buscar clientes con crédito.', 'wc-enhanced-customers-credit') . '</p>';
            $this->render_customer_search_script();
            echo '</td>';
            echo '</tr>';
        } else {
            echo '<input type="hidden" name="user_id" value="' . $user_id . '">';
            echo '<tr>';
            echo '<th>' . __('Cliente', 'wc-enhanced-customers-credit') . '</th>';
            echo '<td><strong>' . esc_html($user->display_name) . '</strong> (' . esc_html($user->user_email) . ')</td>';
            echo '</tr>';
            
            // Mostrar deudas actuales
            $this->render_customer_debts($user_id);
        }
        
        // Monto del pago
        echo '<tr>';
        echo '<th><label for="payment_amount">' . __('Monto del Pago', 'wc-enhanced-customers-credit') . '</label></th>';
        echo '<td>';
        echo '<input type="number" name="payment_amount" id="payment_amount" class="regular-text" step="0.01" min="0.01" required>';
        echo '<p class="description">' . __('Monto que el cliente pagó externamente.', 'wc-enhanced-customers-credit') . '</p>';
        echo '</td>';
        echo '</tr>';
        
        // Método de pago
        echo '<tr>';
        echo '<th><label for="payment_method">' . __('Método de Pago', 'wc-enhanced-customers-credit') . '</label></th>';
        echo '<td>';
        echo '<select name="payment_method" id="payment_method" class="regular-text">';
        echo '<option value="cash">' . __('Efectivo', 'wc-enhanced-customers-credit') . '</option>';
        echo '<option value="transfer">' . __('Transferencia', 'wc-enhanced-customers-credit') . '</option>';
        echo '<option value="check">' . __('Cheque', 'wc-enhanced-customers-credit') . '</option>';
        echo '<option value="other">' . __('Otro', 'wc-enhanced-customers-credit') . '</option>';
        echo '</select>';
        echo '</td>';
        echo '</tr>';
        
        // Notas
        echo '<tr>';
        echo '<th><label for="payment_notes">' . __('Notas', 'wc-enhanced-customers-credit') . '</label></th>';
        echo '<td>';
        echo '<textarea name="payment_notes" id="payment_notes" class="large-text" rows="3" placeholder="' . __('Detalles adicionales del pago...', 'wc-enhanced-customers-credit') . '"></textarea>';
        echo '</td>';
        echo '</tr>';
        
        echo '</table>';
        
        echo '<input type="hidden" name="wecc_action" value="external_payment">';
        submit_button(__('Registrar Pago', 'wc-enhanced-customers-credit'));
        
        $back_url = admin_url('admin.php?page=wecc-dashboard&tab=payments');
        echo '<a href="' . esc_url($back_url) . '" class="button">' . __('Volver', 'wc-enhanced-customers-credit') . '</a>';
        
        echo '</form>';
        echo '</div>';
    }
    
    /**
     * Muestra las deudas actuales del cliente
     */
    private function render_customer_debts(int $user_id): void {
        global $wpdb;
        
        $debts = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}wecc_ledger l
             LEFT JOIN {$wpdb->prefix}wecc_credit_accounts a ON l.account_id = a.id
             WHERE a.user_id = %d 
             AND l.type = 'charge' 
             AND l.remaining_amount > 0
             ORDER BY l.due_date ASC",
            $user_id
        ), ARRAY_A);
        
        if (!empty($debts)) {
            echo '<tr>';
            echo '<th>' . __('Deudas Pendientes', 'wc-enhanced-customers-credit') . '</th>';
            echo '<td>';
            echo '<div style="background: #f9f9f9; padding: 10px; border-radius: 4px; max-height: 200px; overflow-y: auto;">';
            
            $total_debt = 0;
            foreach ($debts as $debt) {
                $total_debt += $debt['remaining_amount'];
                $is_overdue = strtotime($debt['due_date']) < time();
                
                echo '<div style="margin-bottom: 8px; padding: 8px; background: white; border-radius: 3px; border-left: 3px solid ' . ($is_overdue ? '#d63638' : '#dba617') . ';">';
                echo '<strong>' . wc_price($debt['remaining_amount']) . '</strong>';
                echo ' - Vence: ' . date_i18n('d/m/Y', strtotime($debt['due_date']));
                if ($is_overdue) {
                    echo ' <span style="color: #d63638;">(Vencido)</span>';
                }
                echo '<br><small>' . esc_html($debt['description']) . '</small>';
                echo '</div>';
            }
            
            echo '<div style="margin-top: 10px; padding: 8px; background: #2271b1; color: white; border-radius: 3px; text-align: center;">';
            echo '<strong>Total Adeudado: ' . wc_price($total_debt) . '</strong>';
            echo '</div>';
            
            echo '</div>';
            echo '</td>';
            echo '</tr>';
        }
    }
    
    /**
     * Script para búsqueda de clientes
     */
    private function render_customer_search_script(): void {
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
                    $('#wecc_customer_search').autocomplete({
                        source: function(request, response) {
                            $.ajax({
                                url: wecc_admin.ajax_url,
                                type: 'POST',
                                dataType: 'json',
                                data: {
                                    action: 'wecc_search_customer_for_payment',
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
                            $('#wecc_customer_id').val(ui.item.id);
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
     * Maneja registro de pago externo con manejo de pagos excesivos
     */
    public function handle_external_payment(): void {
        if (!wp_verify_nonce($_POST['wecc_payment_nonce'] ?? '', 'wecc_external_payment')) {
            wp_redirect(add_query_arg('message', 'error_permissions', wp_get_referer()));
            exit;
        }
        
        $user_id = (int) ($_POST['user_id'] ?? 0);
        $amount = (float) ($_POST['payment_amount'] ?? 0);
        $method = sanitize_text_field($_POST['payment_method'] ?? 'cash');
        $notes = sanitize_textarea_field($_POST['payment_notes'] ?? '');
        
        if (!$user_id || $amount <= 0) {
            wp_redirect(add_query_arg('message', 'error_saving', wp_get_referer()));
            exit;
        }
        
        try {
            $account = wecc_get_or_create_account($user_id);
            if (!$account) {
                throw new Exception('No se pudo encontrar la cuenta de crédito');
            }
            
            // Obtener balance actual
            $balance = wecc_get_user_balance($user_id);
            $debt = $balance['balance_used'];
            
            // Preparar notas del pago
            $payment_notes = sprintf(
                'Pago externo (%s) registrado por admin. %s',
                $method,
                $notes
            );
            
            // MANEJAR PAGOS EXCESIVOS
            if ($amount > $debt && $debt > 0) {
                // Pago excesivo: aplicar solo lo que se debe + crear saldo a favor
                $payment_notes .= sprintf(
                    ' | PAGO EXCESIVO: Se pagó $%s pero solo se debía $%s. Exceso: $%s queda como saldo a favor.',
                    number_format($amount, 2),
                    number_format($debt, 2),
                    number_format($amount - $debt, 2)
                );
                
                error_log("WECC Payment: Pago excesivo detectado - Monto: {$amount}, Deuda: {$debt}");
            } elseif ($debt <= 0) {
                // No hay deuda: todo queda como saldo a favor
                $payment_notes .= ' | SALDO A FAVOR: Cliente no tenía deudas pendientes.';
                error_log("WECC Payment: Pago sin deuda - todo como saldo a favor");
            }
            
            // SOLO aplicar FIFO - NO registrar pago separado
            // El balance_service ya se encarga de registrar el movimiento
            if ($this->balance_service) {
                $result = $this->balance_service->allocate_general_payment(
                    $account->id, 
                    $amount, 
                    null, 
                    $payment_notes,
                    [
                        'payment_method' => $method,
                        'registered_by' => get_current_user_id(),
                        'external_payment' => true,
                        'original_amount' => $amount,
                        'debt_before' => $debt
                    ]
                );
                
                error_log("WECC Payment: Resultado FIFO: " . print_r($result, true));
            } else {
                throw new Exception('Balance service no disponible');
            }
            
            // Log del evento
            error_log("Pago externo registrado: Usuario {$user_id}, Monto {$amount}, Admin " . get_current_user_id());
            
            // REDIRIGIR AL HISTORIAL DEL CLIENTE
            $redirect_url = admin_url("admin.php?page=wecc-dashboard&tab=customers&action=view&user_id={$user_id}&message=payment_registered");
            wp_redirect($redirect_url);
            exit;
            
        } catch (Exception $e) {
            error_log('Error registrando pago externo: ' . $e->getMessage());
            wp_redirect(add_query_arg('message', 'error_saving', wp_get_referer()));
            exit;
        }
    }
    
    /**
     * Busca cliente para aplicar pago
     */
    public function ajax_search_customer_for_payment(): void {
        if (!current_user_can('manage_woocommerce')) {
            wp_send_json_error('Sin permisos');
        }
        
        $nonce = $_POST['nonce'] ?? '';
        if (!wp_verify_nonce($nonce, 'wecc_admin_nonce')) {
            wp_send_json_error('Nonce inválido');
        }
        
        $search = sanitize_text_field($_POST['term'] ?? '');
        
        if (strlen($search) < 2) {
            wp_send_json_success([]);
        }
        
        global $wpdb;
        
        // Buscar clientes con crédito y deuda
        $customers = $wpdb->get_results($wpdb->prepare(
            "SELECT DISTINCT u.ID, u.display_name, u.user_email, a.balance_used, p.full_name
             FROM {$wpdb->prefix}users u
             LEFT JOIN {$wpdb->prefix}wecc_credit_accounts a ON u.ID = a.user_id
             LEFT JOIN {$wpdb->prefix}wecc_customer_profiles p ON u.ID = p.user_id
             WHERE (u.user_email LIKE %s OR u.display_name LIKE %s OR p.full_name LIKE %s)
             AND a.credit_limit > 0 
             AND a.balance_used > 0
             LIMIT 10",
            '%' . $search . '%',
            '%' . $search . '%',
            '%' . $search . '%'
        ));
        
        $results = [];
        foreach ($customers as $customer) {
            $name = $customer->full_name ?: $customer->display_name;
            $label = $name . ' (' . $customer->user_email . ') - Debe: ' . wc_price($customer->balance_used);
            
            $results[] = [
                'id' => $customer->ID,
                'label' => $label,
                'value' => $customer->user_email
            ];
        }
        
        wp_send_json_success($results);
    }
    
    /**
     * Obtiene detalles de deudas de un cliente
     */
    public function ajax_get_customer_debts(): void {
        // TODO: Implementar para mostrar detalles en tiempo real
    }
}
