<?php
if (!defined('ABSPATH')) exit;

/**
 * WECC Payment Service
 * 
 * Maneja el flujo completo de pagos de crédito:
 * - Creación de órdenes de pago (order-pay)
 * - Procesamiento de pagos completados
 * - Integración con WooCommerce checkout
 * - Validaciones de contexto de pago
 */
class WECC_Payment_Service {
    
    private $balance_service;
    
    public function __construct() {
        // Inicializar después de que el container esté listo
        add_action('init', [$this, 'init_dependencies'], 10);
        add_action('init', [$this, 'init_hooks'], 15);
    }
    
    public function init_dependencies(): void {
        if (function_exists('wecc_service')) {
            $this->balance_service = wecc_service('balance_service');
        }
    }
    
    public function init_hooks(): void {
        // Manejo de acciones de pago desde "Mi Crédito"
        add_action('template_redirect', [$this, 'handle_payment_actions']);
        
        // Ocultar gateway de crédito en pagos de crédito
        add_filter('woocommerce_available_payment_gateways', [$this, 'filter_gateways_on_credit_payment']);
        
        // Procesar pagos completados
        add_action('woocommerce_payment_complete', [$this, 'process_completed_payment'], 10);
        add_action('woocommerce_order_status_completed', [$this, 'maybe_process_by_status'], 10, 1);
        add_action('woocommerce_order_status_processing', [$this, 'maybe_process_by_status'], 10, 1);
        add_action('woocommerce_thankyou', [$this, 'maybe_process_by_status'], 10, 1);
        
        // Limpieza de órdenes pendientes
        add_action('wecc_cleanup_stale_payment_orders', [$this, 'cleanup_stale_orders']);
        if (!wp_next_scheduled('wecc_cleanup_stale_payment_orders')) {
            wp_schedule_event(time() + HOUR_IN_SECONDS, 'twicedaily', 'wecc_cleanup_stale_payment_orders');
        }
    }
    
    /**
     * Detecta y maneja acciones de pago desde "Mi Crédito"
     * URLs: ?wecc_pay_charge=ID o ?wecc_pay_all=1
     */
    public function handle_payment_actions(): void {
        if (!is_user_logged_in() || is_admin()) return;
        
        $nonce = $_GET['_wecc_nonce'] ?? '';
        if (!$nonce || !wp_verify_nonce($nonce, 'wecc_pay_nonce')) return;
        
        $user_id = get_current_user_id();
        
        // Pagar cargo específico
        if (isset($_GET['wecc_pay_charge'])) {
            $ledger_id = (int) $_GET['wecc_pay_charge'];
            $this->handle_single_charge_payment($user_id, $ledger_id);
            return;
        }
        
        // Pagar todo el saldo
        if (isset($_GET['wecc_pay_all'])) {
            $this->handle_total_balance_payment($user_id);
            return;
        }
    }
    
    /**
     * Maneja pago de un cargo específico
     */
    private function handle_single_charge_payment(int $user_id, int $ledger_id): void {
        try {
            $charge_entry = $this->get_user_charge_entry($user_id, $ledger_id);
            if (!$charge_entry) {
                wc_add_notice(__('Cargo no encontrado.', 'wc-enhanced-customers-credit'), 'error');
                wp_safe_redirect(wc_get_account_endpoint_url('mi-credito'));
                exit;
            }
            
            $remaining = $this->get_charge_remaining_amount($charge_entry);
            if ($remaining <= 0) {
                wc_add_notice(__('Este cargo ya está liquidado.', 'wc-enhanced-customers-credit'), 'notice');
                wp_safe_redirect(wc_get_account_endpoint_url('mi-credito'));
                exit;
            }
            
            $label = sprintf(__('Pago de cargo #%d', 'wc-enhanced-customers-credit'), $ledger_id);
            $this->create_payment_order($user_id, $remaining, $label, 'single', $ledger_id);
            
        } catch (Exception $e) {
            wc_add_notice(__('Error procesando el pago: ', 'wc-enhanced-customers-credit') . $e->getMessage(), 'error');
            wp_safe_redirect(wc_get_account_endpoint_url('mi-credito'));
            exit;
        }
    }
    
    /**
     * Maneja pago del saldo total
     */
    private function handle_total_balance_payment(int $user_id): void {
        try {
            $account = $this->get_user_account($user_id);
            if (!$account) {
                wc_add_notice(__('Cuenta de crédito no encontrada.', 'wc-enhanced-customers-credit'), 'error');
                wp_safe_redirect(wc_get_account_endpoint_url('mi-credito'));
                exit;
            }
            
            $balance = $this->balance_service->get_detailed_balance($account->id);
            $amount_to_pay = $balance['balance_used'];
            
            if ($amount_to_pay <= 0) {
                wc_add_notice(__('No tienes saldo pendiente que pagar.', 'wc-enhanced-customers-credit'), 'notice');
                wp_safe_redirect(wc_get_account_endpoint_url('mi-credito'));
                exit;
            }
            
            $label = __('Pago total de crédito', 'wc-enhanced-customers-credit');
            $this->create_payment_order($user_id, $amount_to_pay, $label, 'all');
            
        } catch (Exception $e) {
            wc_add_notice(__('Error procesando el pago: ', 'wc-enhanced-customers-credit') . $e->getMessage(), 'error');
            wp_safe_redirect(wc_get_account_endpoint_url('mi-credito'));
            exit;
        }
    }
    
    /**
     * Crea una orden de pago temporal y redirige a order-pay
     */
    private function create_payment_order(int $user_id, float $amount, string $label, string $mode, ?int $ledger_id = null): void {
        $amount = wc_format_decimal($amount, 2);
        if ($amount <= 0) return;
        
        // DEBUG TEMPORAL
        error_log("WECC DEBUG ORDER: === Creando orden de pago ===");
        error_log("WECC DEBUG ORDER: User ID: {$user_id}");
        error_log("WECC DEBUG ORDER: Monto recibido: {$amount}");
        error_log("WECC DEBUG ORDER: Label: {$label}");
        error_log("WECC DEBUG ORDER: Mode: {$mode}");
        error_log("WECC DEBUG ORDER: Ledger ID: {$ledger_id}");
        
        // Verificar si ya existe una orden pendiente para evitar duplicados
        $existing = $this->find_existing_payment_order($user_id, $mode, $ledger_id);
        if ($existing) {
            wc_clear_notices();
            if (WC()->cart) WC()->cart->empty_cart();
            wp_safe_redirect($existing->get_checkout_payment_url());
            exit;
        }
        
        // Crear nueva orden
        $order = wc_create_order(['customer_id' => $user_id]);
        if (is_wp_error($order) || !$order) {
            throw new Exception('No se pudo crear la orden de pago');
        }
        
        // Agregar fee
        $item_fee = new WC_Order_Item_Fee();
        $item_fee->set_name($label);
        $item_fee->set_amount($amount);
        $item_fee->set_total($amount);
        $item_fee->set_tax_status('none');
        $order->add_item($item_fee);
        
        error_log("WECC DEBUG ORDER: Fee agregado con monto: {$amount}");
        
        // Metadatos para identificación
        $payment_data = [
            'mode' => $mode,
            'ledger_id' => $ledger_id,
            'amount' => $amount,
            'label' => $label,
            'created_at' => current_time('mysql')
        ];
        $order->update_meta_data('_wecc_credit_payment', wp_json_encode($payment_data));
        $order->update_meta_data('_wecc_payment_mode', $mode);
        if ($ledger_id) {
            $order->update_meta_data('_wecc_payment_ledger_id', $ledger_id);
        }
        
        $order->calculate_totals();
        error_log("WECC DEBUG ORDER: Total calculado de la orden: " . $order->get_total());
        
        $order->update_status('pending', __('Orden de pago de crédito creada', 'wc-enhanced-customers-credit'));
        $order->save();
        
        error_log("WECC DEBUG ORDER: Orden #{$order->get_id()} creada exitosamente");
        error_log("WECC DEBUG ORDER: === Fin creación orden ===");
        
        // Limpiar y redirigir
        if (WC()->cart) WC()->cart->empty_cart();
        wc_clear_notices();
        
        wp_safe_redirect($order->get_checkout_payment_url());
        exit;
    }
    
    /**
     * Busca orden de pago existente para evitar duplicados
     */
    private function find_existing_payment_order(int $user_id, string $mode, ?int $ledger_id = null): ?WC_Order {
        $args = [
            'limit' => 1,
            'status' => ['pending', 'on-hold'],
            'customer_id' => $user_id,
            'meta_query' => [
                [
                    'key' => '_wecc_payment_mode',
                    'value' => $mode,
                    'compare' => '='
                ]
            ]
        ];
        
        if ($mode === 'single' && $ledger_id) {
            $args['meta_query'][] = [
                'key' => '_wecc_payment_ledger_id',
                'value' => $ledger_id,
                'compare' => '='
            ];
        }
        
        $query = new WC_Order_Query($args);
        $orders = $query->get_orders();
        return $orders ? $orders[0] : null;
    }
    
    /**
     * Oculta gateway de crédito cuando se está pagando crédito
     */
    public function filter_gateways_on_credit_payment($gateways): array {
        if (!isset($gateways['wecc_credit'])) return $gateways;
        
        // En páginas order-pay de pago de crédito
        if (is_checkout_pay_page()) {
            $order_id = absint(get_query_var('order-pay'));
            if ($order_id) {
                $order = wc_get_order($order_id);
                if ($order && $order->get_meta('_wecc_credit_payment')) {
                    unset($gateways['wecc_credit']);
                }
            }
        }
        
        return $gateways;
    }
    
    /**
     * Procesa pago completado - punto de entrada principal
     */
    public function process_completed_payment(int $order_id): void {
        $order = wc_get_order($order_id);
        if (!$order) return;
        
        // Verificar si es orden de pago de crédito
        $payment_data = $order->get_meta('_wecc_credit_payment');
        if (!$payment_data) return;
        
        // Evitar procesamiento duplicado
        if ($order->get_meta('_wecc_payment_processed')) return;
        
        try {
            $data = json_decode($payment_data, true);
            if (!is_array($data) || empty($data['amount'])) return;
            
            $user_id = $order->get_user_id();
            if (!$user_id) return;
            
            $account = $this->get_user_account($user_id);
            if (!$account) return;
            
            $amount = (float) $data['amount'];
            $mode = $data['mode'] ?? 'all';
            $ledger_id = $data['ledger_id'] ?? null;
            $notes = $data['label'] ?? __('Pago de crédito', 'wc-enhanced-customers-credit');
            
            if ($mode === 'single' && $ledger_id) {
                $this->process_single_charge_payment($account->id, $amount, $ledger_id, $order_id, $notes);
            } else {
                $this->process_general_payment($account->id, $amount, $order_id, $notes);
            }
            
            // Marcar como procesado
            $order->update_meta_data('_wecc_payment_processed', current_time('mysql'));
            $order->add_order_note(__('Pago de crédito procesado exitosamente', 'wc-enhanced-customers-credit'));
            $order->save();
            
            // Evento
            do_action('wecc_credit_payment_completed', $user_id, $amount, $order_id);
            
        } catch (Exception $e) {
            error_log('WECC Payment processing error: ' . $e->getMessage());
            $order->add_order_note('Error procesando pago de crédito: ' . $e->getMessage());
        }
    }
    
    /**
     * Procesa pago de cargo específico
     */
    private function process_single_charge_payment(int $account_id, float $amount, int $ledger_id, int $order_id, string $notes): void {
        global $wpdb;
        $table_ledger = $wpdb->prefix . 'wecc_ledger';
        
        // Crear payment asignado al cargo específico
        $payment_id = $this->create_ledger_payment($account_id, $amount, $order_id, $notes);
        
        if ($payment_id) {
            // Enlazar al cargo específico
            $this->balance_service->ensure_settles_columns();
            
            // Obtener order_id del cargo original
            $charge_order_id = $wpdb->get_var($wpdb->prepare(
                "SELECT order_id FROM {$table_ledger} WHERE id = %d",
                $ledger_id
            ));
            
            $wpdb->update(
                $table_ledger,
                [
                    'settles_ledger_id' => $ledger_id,
                    'settles_order_id' => $charge_order_id
                ],
                ['id' => $payment_id],
                ['%d', '%d'],
                ['%d']
            );
        }
    }
    
    /**
     * Procesa pago general (FIFO)
     */
    private function process_general_payment(int $account_id, float $amount, int $order_id, string $notes): void {
        $result = $this->balance_service->allocate_general_payment($account_id, $amount, $order_id, $notes);
        
        if (!$result['success']) {
            throw new Exception('Error en asignación FIFO: ' . $result['error']);
        }
    }
    
    /**
     * Fallback para gateways que no disparan payment_complete
     */
    public function maybe_process_by_status($order_id): void {
        if (is_object($order_id)) return; // Evitar hooks incorrectos
        
        $order = wc_get_order($order_id);
        if (!$order) return;
        
        // Solo procesar si es orden de pago de crédito y no está procesada
        if (!$order->get_meta('_wecc_credit_payment')) return;
        if ($order->get_meta('_wecc_payment_processed')) return;
        
        // Verificar que el estado sea apropiado
        $status = $order->get_status();
        if (!in_array($status, ['completed', 'processing'])) return;
        
        $this->process_completed_payment($order_id);
    }
    
    /**
     * Limpia órdenes de pago pendientes antiguas
     */
    public function cleanup_stale_orders(): void {
        $cutoff = time() - (2 * DAY_IN_SECONDS); // 48 horas
        
        $query = new WC_Order_Query([
            'limit' => 50,
            'status' => ['pending'],
            'meta_query' => [
                [
                    'key' => '_wecc_credit_payment',
                    'compare' => 'EXISTS'
                ]
            ]
        ]);
        
        $orders = $query->get_orders();
        foreach ($orders as $order) {
            $created = $order->get_date_created();
            if ($created && $created->getTimestamp() < $cutoff) {
                $order->update_status('cancelled', 
                    __('Cancelado automáticamente: pago de crédito no completado en 48h', 'wc-enhanced-customers-credit'));
            }
        }
    }
    
    // ========================================
    // HELPERS PRIVADOS
    // ========================================
    
    private function get_user_account(int $user_id): ?object {
        global $wpdb;
        return $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}wecc_credit_accounts WHERE user_id = %d",
            $user_id
        ));
    }
    
    private function get_user_charge_entry(int $user_id, int $ledger_id): ?object {
        global $wpdb;
        
        $account = $this->get_user_account($user_id);
        if (!$account) return null;
        
        return $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}wecc_ledger 
             WHERE id = %d AND account_id = %d AND type = 'charge'",
            $ledger_id, $account->id
        ));
    }
    
    private function get_charge_remaining_amount($charge_entry): float {
        if (!$charge_entry) return 0.0;
        
        global $wpdb;
        $table_ledger = $wpdb->prefix . 'wecc_ledger';
        
        $charge_amount = (float) $charge_entry->amount;
        
        // DEBUG TEMPORAL
        error_log("WECC DEBUG PAYMENT: === Calculando monto restante ===");
        error_log("WECC DEBUG PAYMENT: Charge ID: {$charge_entry->id}");
        error_log("WECC DEBUG PAYMENT: Monto original: {$charge_amount}");
        error_log("WECC DEBUG PAYMENT: Order ID: {$charge_entry->order_id}");
        
        // Ajustes del pedido
        $adj_sum = 0.0;
        if ($charge_entry->order_id) {
            $adj_sum = (float) $wpdb->get_var($wpdb->prepare(
                "SELECT COALESCE(SUM(amount),0) FROM {$table_ledger} 
                 WHERE type='adjustment' AND order_id=%d",
                $charge_entry->order_id
            ));
            error_log("WECC DEBUG PAYMENT: Ajustes: {$adj_sum}");
        }
        
        // Pagos aplicados
        $paid_sum = (float) $wpdb->get_var($wpdb->prepare(
            "SELECT COALESCE(SUM(ABS(amount)),0) FROM {$table_ledger} 
             WHERE type='payment' AND settles_ledger_id=%d",
            $charge_entry->id
        ));
        error_log("WECC DEBUG PAYMENT: Pagos aplicados: {$paid_sum}");
        
        $remaining = max(0, $charge_amount + min(0.0, $adj_sum) - $paid_sum);
        error_log("WECC DEBUG PAYMENT: Monto restante calculado: {$remaining}");
        error_log("WECC DEBUG PAYMENT: === Fin cálculo ===");
        
        return (float) wc_format_decimal($remaining, 2);
    }
    
    private function create_ledger_payment(int $account_id, float $amount, int $order_id, string $notes): ?int {
        global $wpdb;
        
        $result = $wpdb->insert(
            $wpdb->prefix . 'wecc_ledger',
            [
                'account_id' => $account_id,
                'order_id' => $order_id,
                'type' => 'payment',
                'amount' => -abs($amount),
                'notes' => $notes,
                'created_at' => current_time('mysql'),
                'created_by' => null
            ],
            ['%d', '%d', '%s', '%f', '%s', '%s', '%d']
        );
        
        if ($result === false) return null;
        
        $payment_id = $wpdb->insert_id;
        
        // Recalcular balance
        $this->balance_service->recalculate_and_update_balance($account_id);
        
        return $payment_id;
    }
}
