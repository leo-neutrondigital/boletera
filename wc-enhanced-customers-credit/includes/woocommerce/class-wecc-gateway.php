<?php
if (!defined('ABSPATH')) exit;

/**
 * WECC Gateway
 * 
 * Gateway de pago para crédito de clientes
 */
class WECC_Gateway extends WC_Payment_Gateway {
    
    public function __construct() {
        $this->id = 'wecc_credit';
        $this->method_title = __('Crédito WECC', 'wc-enhanced-customers-credit');
        $this->method_description = __('Permite a los clientes pagar con su crédito disponible.', 'wc-enhanced-customers-credit');
        $this->has_fields = true;
        $this->supports = ['products', 'refunds'];
        
        $this->init_form_fields();
        $this->init_settings();
        
        $this->title = $this->get_option('title');
        $this->description = $this->get_option('description');
        $this->enabled = $this->get_option('enabled');
        
        // Hooks
        add_action('woocommerce_update_options_payment_gateways_' . $this->id, [$this, 'process_admin_options']);
        add_action('wp_enqueue_scripts', [$this, 'payment_scripts']);
    }
    
    /**
     * Campos de configuración admin
     */
    public function init_form_fields() {
        $this->form_fields = [
            'enabled' => [
                'title' => __('Habilitar/Deshabilitar', 'wc-enhanced-customers-credit'),
                'type' => 'checkbox',
                'label' => __('Habilitar pagos con crédito', 'wc-enhanced-customers-credit'),
                'default' => 'yes'
            ],
            'title' => [
                'title' => __('Título', 'wc-enhanced-customers-credit'),
                'type' => 'text',
                'description' => __('Título que ve el cliente durante el checkout.', 'wc-enhanced-customers-credit'),
                'default' => __('Pagar con Crédito', 'wc-enhanced-customers-credit'),
                'desc_tip' => true,
            ],
            'description' => [
                'title' => __('Descripción', 'wc-enhanced-customers-credit'),
                'type' => 'textarea',
                'description' => __('Descripción del método de pago que ve el cliente.', 'wc-enhanced-customers-credit'),
                'default' => __('Usa tu crédito disponible para completar la compra.', 'wc-enhanced-customers-credit'),
                'desc_tip' => true,
            ],
            'min_amount' => [
                'title' => __('Monto mínimo', 'wc-enhanced-customers-credit'),
                'type' => 'decimal',
                'description' => __('Monto mínimo para usar crédito (0 = sin límite).', 'wc-enhanced-customers-credit'),
                'default' => '0',
                'desc_tip' => true,
            ],
            'max_amount' => [
                'title' => __('Monto máximo', 'wc-enhanced-customers-credit'),
                'type' => 'decimal',  
                'description' => __('Monto máximo para usar crédito (0 = sin límite).', 'wc-enhanced-customers-credit'),
                'default' => '0',
                'desc_tip' => true,
            ],
        ];
    }
    
    /**
     * Scripts para el checkout
     */
    public function payment_scripts() {
        if (!is_checkout() || !$this->is_available()) {
            return;
        }
        
        wp_enqueue_script(
            'wecc-checkout',
            WECC_PLUGIN_URL . 'includes/frontend/assets/checkout.js',
            ['jquery'],
            WECC_VERSION,
            true
        );
        
        wp_localize_script('wecc-checkout', 'wecc_checkout', [
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('wecc_checkout_nonce'),
            'i18n' => [
                'insufficient_credit' => __('Crédito insuficiente para completar la compra.', 'wc-enhanced-customers-credit'),
                'loading' => __('Verificando crédito...', 'wc-enhanced-customers-credit'),
            ]
        ]);
    }
    
    /**
     * Verifica si el gateway está disponible
     */
    public function is_available() {
        if (!parent::is_available()) {
            return false;
        }
        
        // Solo disponible para usuarios logueados
        if (!is_user_logged_in()) {
            return false;
        }
        
        // Verificar que el usuario tenga crédito disponible
        $user_id = get_current_user_id();
        $balance = wecc_get_user_balance($user_id);
        
        if ($balance['available_credit'] <= 0) {
            return false;
        }
        
        // Verificar límites de monto
        $cart_total = WC()->cart ? WC()->cart->get_total('edit') : 0;
        
        $min_amount = (float) $this->get_option('min_amount', 0);
        if ($min_amount > 0 && $cart_total < $min_amount) {
            return false;
        }
        
        $max_amount = (float) $this->get_option('max_amount', 0);
        if ($max_amount > 0 && $cart_total > $max_amount) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Campos del formulario de pago
     */
    public function payment_fields() {
        if ($this->description) {
            echo '<p>' . wp_kses_post($this->description) . '</p>';
        }
        
        $user_id = get_current_user_id();
        $balance = wecc_get_user_balance($user_id);
        $cart_total = WC()->cart ? WC()->cart->get_total('edit') : 0;
        
        echo '<div class="wecc-credit-info">';
        
        // Mostrar crédito disponible
        echo '<div class="wecc-available-credit">';
        echo '<strong>' . __('Crédito disponible:', 'wc-enhanced-customers-credit') . '</strong> ';
        echo '<span class="amount">' . wc_price($balance['available_credit']) . '</span>';
        echo '</div>';
        
        // Mostrar total de la orden
        echo '<div class="wecc-order-total">';
        echo '<strong>' . __('Total a pagar:', 'wc-enhanced-customers-credit') . '</strong> ';
        echo '<span class="amount">' . wc_price($cart_total) . '</span>';
        echo '</div>';
        
        // Verificar si hay suficiente crédito
        if ($balance['available_credit'] < $cart_total) {
            echo '<div class="wecc-insufficient-credit notice notice-error">';
            echo '<p>' . sprintf(
                __('Crédito insuficiente. Necesitas %s adicionales.', 'wc-enhanced-customers-credit'),
                wc_price($cart_total - $balance['available_credit'])
            ) . '</p>';
            echo '</div>';
        } else {
            echo '<div class="wecc-sufficient-credit notice notice-success">';
            echo '<p>' . __('✓ Tienes suficiente crédito para esta compra.', 'wc-enhanced-customers-credit') . '</p>';
            echo '</div>';
        }
        
        echo '</div>';
        
        // Campo oculto para validación
        echo '<input type="hidden" name="wecc_credit_amount" value="' . esc_attr($cart_total) . '">';
    }
    
    /**
     * Valida los campos del pago
     */
    public function validate_fields() {
        $user_id = get_current_user_id();
        
        if (!$user_id) {
            wc_add_notice(__('Debes estar logueado para usar crédito.', 'wc-enhanced-customers-credit'), 'error');
            return false;
        }
        
        $balance = wecc_get_user_balance($user_id);
        $cart_total = WC()->cart ? WC()->cart->get_total('edit') : 0;
        
        if ($balance['available_credit'] < $cart_total) {
            wc_add_notice(sprintf(
                __('Crédito insuficiente. Disponible: %s, Necesario: %s', 'wc-enhanced-customers-credit'),
                wc_price($balance['available_credit']),
                wc_price($cart_total)
            ), 'error');
            return false;
        }
        
        return true;
    }
    
    /**
     * Procesa el pago
     */
    public function process_payment($order_id) {
        $order = wc_get_order($order_id);
        
        if (!$order) {
            return [
                'result' => 'failure',
                'messages' => __('Orden no encontrada.', 'wc-enhanced-customers-credit')
            ];
        }
        
        $user_id = $order->get_user_id();
        $order_total = $order->get_total();
        
        if (!$user_id) {
            return [
                'result' => 'failure', 
                'messages' => __('Usuario no válido.', 'wc-enhanced-customers-credit')
            ];
        }
        
        try {
            // Verificar crédito disponible una vez más
            $balance = wecc_get_user_balance($user_id);
            
            if ($balance['available_credit'] < $order_total) {
                throw new Exception(__('Crédito insuficiente al procesar el pago.', 'wc-enhanced-customers-credit'));
            }
            
            // Crear cuenta si no existe
            $account = wecc_get_or_create_account($user_id);
            if (!$account) {
                throw new Exception(__('No se pudo crear la cuenta de crédito.', 'wc-enhanced-customers-credit'));
            }
            
            // Crear cargo en el ledger
            $this->create_credit_charge($account->id, $order_total, $order_id);
            
            // Marcar orden como completada
            $order->payment_complete();
            $order->add_order_note(sprintf(
                __('Pago procesado con crédito WECC. Monto: %s', 'wc-enhanced-customers-credit'),
                wc_price($order_total)
            ));
            
            // Reducir stock
            wc_reduce_stock_levels($order_id);
            
            // Limpiar carrito
            WC()->cart->empty_cart();
            
            // Disparar evento
            do_action('wecc_credit_payment_processed', $order_id, $user_id, $order_total);
            
            return [
                'result' => 'success',
                'redirect' => $this->get_return_url($order)
            ];
            
        } catch (Exception $e) {
            wecc_log('Error processing credit payment: ' . $e->getMessage(), 'error');
            
            wc_add_notice($e->getMessage(), 'error');
            return [
                'result' => 'failure'
            ];
        }
    }
    
    /**
     * Crea un cargo en el ledger
     */
    private function create_credit_charge(int $account_id, float $amount, int $order_id): void {
        global $wpdb;
        
        // Calcular fecha de vencimiento basada en los días de crédito del usuario
        $user_id = get_current_user_id();
        $account = $wpdb->get_row($wpdb->prepare(
            "SELECT payment_terms_days FROM {$wpdb->prefix}wecc_credit_accounts WHERE id = %d",
            $account_id
        ));
        
        $credit_days = $account->payment_terms_days ?: 30; // Por defecto 30 días
        
        // Permitir configuración por tipo de cliente
        if (function_exists('wecc_service')) {
            $customer_service = wecc_service('customer_service');
            $profile = $customer_service->get_profile_by_user($user_id);
            
            if ($profile && isset($profile['credit_days']) && $profile['credit_days'] > 0) {
                $credit_days = (int) $profile['credit_days'];
            }
        }
        
        $due_date = date('Y-m-d H:i:s', strtotime("+{$credit_days} days"));
        
        $result = $wpdb->insert(
            $wpdb->prefix . 'wecc_ledger',
            [
                'account_id' => $account_id,
                'user_id' => $user_id,
                'type' => 'charge',
                'amount' => $amount,
                'description' => sprintf(__('Compra - Orden #%d', 'wc-enhanced-customers-credit'), $order_id),
                'order_id' => $order_id,
                'transaction_date' => wecc_current_datetime(),
                'due_date' => $due_date,
                'metadata' => wp_json_encode([
                    'credit_days' => $credit_days,
                    'payment_method' => 'wecc_credit'
                ]),
                'created_at' => wecc_current_datetime()
            ],
            ['%d', '%d', '%s', '%f', '%s', '%d', '%s', '%s', '%s', '%s']
        );
        
        if ($result === false) {
            throw new Exception('Error creando cargo en ledger: ' . $wpdb->last_error);
        }
        
        // Actualizar balance de la cuenta
        $this->update_account_balance($account_id);
    }
    
    /**
     * Actualiza el balance de la cuenta
     */
    private function update_account_balance(int $account_id): void {
        global $wpdb;
        
        // Calcular nuevo balance
        $total_charges = (float) $wpdb->get_var($wpdb->prepare(
            "SELECT COALESCE(SUM(amount), 0) FROM {$wpdb->prefix}wecc_ledger 
             WHERE account_id = %d AND type IN ('charge', 'adjustment')",
            $account_id
        ));
        
        $total_payments = (float) $wpdb->get_var($wpdb->prepare(
            "SELECT COALESCE(SUM(ABS(amount)), 0) FROM {$wpdb->prefix}wecc_ledger 
             WHERE account_id = %d AND type IN ('payment', 'refund')",
            $account_id
        ));
        
        $balance_used = max(0, $total_charges - $total_payments);
        
        // Actualizar tabla de cuentas
        $wpdb->update(
            $wpdb->prefix . 'wecc_credit_accounts',
            [
                'balance_used' => $balance_used,
                'current_balance' => $balance_used,
                'last_activity_at' => wecc_current_datetime(),
                'updated_at' => wecc_current_datetime()
            ],
            ['id' => $account_id],
            ['%f', '%f', '%s', '%s'],
            ['%d']
        );
    }
    
    /**
     * Procesa refunds
     */
    public function process_refund($order_id, $amount = null, $reason = '') {
        $order = wc_get_order($order_id);
        
        if (!$order) {
            return new WP_Error('wecc_refund_error', __('Orden no encontrada.', 'wc-enhanced-customers-credit'));
        }
        
        $user_id = $order->get_user_id();
        if (!$user_id) {
            return new WP_Error('wecc_refund_error', __('Usuario no válido.', 'wc-enhanced-customers-credit'));
        }
        
        try {
            $account = wecc_get_or_create_account($user_id);
            if (!$account) {
                throw new Exception(__('Cuenta de crédito no encontrada.', 'wc-enhanced-customers-credit'));
            }
            
            // Crear reembolso en el ledger
            global $wpdb;
            $result = $wpdb->insert(
                $wpdb->prefix . 'wecc_ledger',
                [
                    'account_id' => $account->id,
                    'user_id' => $user_id,
                    'type' => 'refund',
                    'amount' => -abs($amount), // Negativo para reembolso
                    'description' => sprintf(__('Reembolso - Orden #%d. Razón: %s', 'wc-enhanced-customers-credit'), $order_id, $reason),
                    'order_id' => $order_id,
                    'transaction_date' => wecc_current_datetime(),
                    'created_at' => wecc_current_datetime()
                ],
                ['%d', '%d', '%s', '%f', '%s', '%d', '%s', '%s']
            );
            
            if ($result === false) {
                throw new Exception('Error creando reembolso: ' . $wpdb->last_error);
            }
            
            // Actualizar balance
            $this->update_account_balance($account->id);
            
            return true;
            
        } catch (Exception $e) {
            wecc_log('Error processing refund: ' . $e->getMessage(), 'error');
            return new WP_Error('wecc_refund_error', $e->getMessage());
        }
    }
}
