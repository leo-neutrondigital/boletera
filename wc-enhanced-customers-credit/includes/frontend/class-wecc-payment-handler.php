<?php
if (!defined('ABSPATH')) exit;

/**
 * WECC Payment Handler
 * 
 * Maneja el flujo de pagos desde el frontend
 */
class WECC_Payment_Handler {
    
    public function __construct() {
        // Hook para manejar requests de pago - usar template_redirect para asegurar que se ejecute
        add_action('template_redirect', [$this, 'handle_payment_requests']);
        
        // Shortcode para botón de pago
        add_shortcode('wecc_payment_button', [$this, 'payment_button_shortcode']);
        
        // Procesar después del checkout exitoso
        add_action('woocommerce_thankyou', [$this, 'process_credit_payment'], 10, 1);
        
        // Deshabilitar gateway de crédito en pagos de crédito
        add_filter('woocommerce_available_payment_gateways', [$this, 'disable_credit_gateway_for_credit_payments']);
    }
    
    /**
     * Maneja requests de pago desde frontend
     */
    public function handle_payment_requests(): void {
        // Solo procesar en frontend y si es la URL correcta
        if (is_admin() || !is_main_query()) {
            return;
        }
        
        // Debug
        if (isset($_GET['wecc_pay_charge']) || isset($_GET['wecc_pay_all'])) {
            error_log('WECC Payment Handler: Request detectado - ' . print_r($_GET, true));
        }
        
        // Pagar cargo específico
        if (isset($_GET['wecc_pay_charge']) && is_user_logged_in()) {
            error_log('WECC Payment Handler: Procesando pago de cargo');
            $this->handle_pay_charge((int) $_GET['wecc_pay_charge']);
        }
        
        // Pagar todo el saldo
        if (isset($_GET['wecc_pay_all']) && is_user_logged_in()) {
            error_log('WECC Payment Handler: Procesando pago completo');
            $this->handle_pay_all();
        }
    }
    
    /**
     * Maneja pago de cargo específico
     */
    private function handle_pay_charge(int $ledger_id): void {
        $user_id = get_current_user_id();
        
        if (!$ledger_id) {
            wc_add_notice(__('Cargo inválido', 'wc-enhanced-customers-credit'), 'error');
            wp_redirect(wc_get_page_permalink('myaccount') . 'mi-credito/');
            exit;
        }
        
        // Verificar que el cargo pertenece al usuario
        global $wpdb;
        $charge = $wpdb->get_row($wpdb->prepare(
            "SELECT l.*, a.user_id 
             FROM {$wpdb->prefix}wecc_ledger l
             LEFT JOIN {$wpdb->prefix}wecc_credit_accounts a ON l.account_id = a.id
             WHERE l.id = %d AND l.type = 'charge' AND a.user_id = %d",
            $ledger_id, $user_id
        ));
        
        if (!$charge) {
            wc_add_notice(__('Cargo no encontrado', 'wc-enhanced-customers-credit'), 'error');
            wp_redirect(wc_get_page_permalink('myaccount') . 'mi-credito/');
            exit;
        }
        
        // Calcular monto pendiente
        $remaining = $this->get_charge_remaining_amount($charge);
        
        if ($remaining <= 0) {
            wc_add_notice(__('Este cargo ya está pagado', 'wc-enhanced-customers-credit'), 'notice');
            wp_redirect(wc_get_page_permalink('myaccount') . 'mi-credito/');
            exit;
        }
        
        // Crear producto temporal para checkout
        $this->create_payment_checkout($remaining, sprintf(
            __('Pago de cargo #%d', 'wc-enhanced-customers-credit'), 
            $ledger_id
        ), [
            'wecc_payment_type' => 'charge',
            'wecc_ledger_id' => $ledger_id
        ]);
    }
    
    /**
     * Maneja pago de todo el saldo
     */
    private function handle_pay_all(): void {
        $user_id = get_current_user_id();
        $balance = wecc_get_user_balance($user_id);
        
        if ($balance['balance_used'] <= 0) {
            wc_add_notice(__('No tienes saldo pendiente por pagar', 'wc-enhanced-customers-credit'), 'notice');
            wp_redirect(wc_get_page_permalink('myaccount') . 'mi-credito/');
            exit;
        }
        
        // Crear producto temporal para checkout
        $this->create_payment_checkout($balance['balance_used'], 
            __('Pago total de saldo de crédito', 'wc-enhanced-customers-credit'), [
                'wecc_payment_type' => 'full_balance',
                'wecc_amount' => $balance['balance_used']
            ]
        );
    }
    
    /**
     * Crea un checkout temporal para el pago
     */
    private function create_payment_checkout(float $amount, string $description, array $metadata = []): void {
        error_log('WECC Payment: Creando checkout - Monto: ' . $amount . ', Descripción: ' . $description);
        
        // Limpiar carrito actual
        WC()->cart->empty_cart();
        
        // Crear producto virtual simple
        $product = new WC_Product_Simple();
        $product->set_name($description);
        $product->set_price($amount);
        $product->set_regular_price($amount);
        $product->set_virtual(true);
        $product->set_downloadable(false);
        $product->set_status('publish');
        $product->set_catalog_visibility('hidden');
        
        // Guardar el producto temporalmente
        $product_id = $product->save();
        
        if (!$product_id) {
            error_log('WECC Payment: Error creando producto temporal');
            wc_add_notice(__('Error creando el producto de pago', 'wc-enhanced-customers-credit'), 'error');
            wp_redirect(wc_get_page_permalink('myaccount') . 'mi-credito/');
            exit;
        }
        
        // Agregar metadata al producto
        foreach ($metadata as $key => $value) {
            update_post_meta($product_id, $key, $value);
        }
        
        // Agregar al carrito
        $cart_item_key = WC()->cart->add_to_cart($product_id, 1);
        
        if (!$cart_item_key) {
            // Limpiar producto temporal si falla
            wp_delete_post($product_id, true);
            error_log('WECC Payment: Error agregando al carrito');
            wc_add_notice(__('Error agregando el pago al carrito', 'wc-enhanced-customers-credit'), 'error');
            wp_redirect(wc_get_page_permalink('myaccount') . 'mi-credito/');
            exit;
        }
        
        error_log('WECC Payment: Producto ' . $product_id . ' agregado al carrito, redirigiendo a checkout');
        
        // Redirigir al checkout
        wp_redirect(wc_get_checkout_url());
        exit;
    }
    
    /**
     * Procesa el pago después del checkout exitoso
     */
    public function process_credit_payment(int $order_id): void {
        $order = wc_get_order($order_id);
        if (!$order) {
            error_log('WECC Payment: Orden no encontrada: ' . $order_id);
            return;
        }
        
        $user_id = $order->get_user_id();
        if (!$user_id) {
            error_log('WECC Payment: Usuario no encontrado en orden: ' . $order_id);
            return;
        }
        
        error_log('WECC Payment: Procesando pago de crédito para orden: ' . $order_id);
        
        // Verificar si es un pago de crédito
        $is_credit_payment = false;
        foreach ($order->get_items() as $item) {
            // Revisar metadatos del producto
            $product_id = $item->get_product_id();
            $payment_type = get_post_meta($product_id, 'wecc_payment_type', true);
            $ledger_id = get_post_meta($product_id, 'wecc_ledger_id', true);
            
            if ($payment_type) {
                $is_credit_payment = true;
                error_log('WECC Payment: Tipo de pago detectado: ' . $payment_type);
                
                // Procesar según el tipo de pago
                switch ($payment_type) {
                    case 'charge':
                        $this->process_charge_payment($user_id, (int) $ledger_id, $order->get_total(), $order_id);
                        break;
                        
                    case 'full_balance':
                        $this->process_full_balance_payment($user_id, $order->get_total(), $order_id);
                        break;
                }
                
                // Limpiar producto temporal
                wp_delete_post($product_id, true);
                error_log('WECC Payment: Producto temporal eliminado: ' . $product_id);
            }
        }
        
        // Redirigir de vuelta a Mi Crédito si fue un pago de crédito
        if ($is_credit_payment) {
            $redirect_url = wc_get_page_permalink('myaccount') . 'mi-credito/?wecc_payment_success=1';
            $order->add_order_note('Pago de crédito procesado exitosamente. Cliente redirigido a Mi Crédito.');
            
            // Usar JavaScript para redirigir después de mostrar la página de agradecimiento
            add_action('wp_footer', function() use ($redirect_url) {
                echo '<script>setTimeout(function(){ window.location.href = "' . esc_url($redirect_url) . '"; }, 3000);</script>';
            });
        }
    }
    
    /**
     * Procesa pago de cargo específico
     */
    private function process_charge_payment(int $user_id, int $ledger_id, float $amount, int $order_id): void {
        if (!$ledger_id) return;
        
        try {
            // Usar PAGO DIRECTO en lugar de FIFO para pagos específicos
            if (function_exists('wecc_service')) {
                $balance_service = wecc_service('balance_service');
                $account = wecc_get_or_create_account($user_id);
                
                $result = $balance_service->apply_direct_payment(
                    $account->id,
                    $ledger_id,
                    $amount,
                    $order_id,
                    sprintf(__('Pago online directo - Cargo #%d - Orden #%d', 'wc-enhanced-customers-credit'), $ledger_id, $order_id),
                    [
                        'payment_method' => 'online',
                        'payment_source' => 'frontend',
                        'order_id' => $order_id
                    ]
                );
                
                error_log("WECC Frontend Payment: Pago directo aplicado - Cargo {$ledger_id}, monto {$amount}, resultado: " . print_r($result, true));
            }
        } catch (Exception $e) {
            error_log("Error procesando pago directo de cargo: " . $e->getMessage());
        }
    }
    
    /**
     * Procesa pago de saldo completo
     */
    private function process_full_balance_payment(int $user_id, float $amount, int $order_id): void {
        try {
            // Aplicar pago FIFO a todos los cargos
            if (function_exists('wecc_service')) {
                $balance_service = wecc_service('balance_service');
                $account = wecc_get_or_create_account($user_id);
                
                $result = $balance_service->allocate_general_payment(
                    $account->id,
                    $amount,
                    $order_id,
                    sprintf(__('Pago online completo - Orden #%d', 'wc-enhanced-customers-credit'), $order_id)
                );
                
                error_log("WECC Frontend Payment: Pago completo {$amount}, orden {$order_id}");
            }
        } catch (Exception $e) {
            error_log("Error procesando pago completo: " . $e->getMessage());
        }
    }
    
    /**
     * Calcula monto restante de un cargo
     */
    private function get_charge_remaining_amount($charge): float {
        global $wpdb;
        
        $charge_amount = (float) $charge->amount;
        
        $paid_amount = (float) $wpdb->get_var($wpdb->prepare(
            "SELECT COALESCE(SUM(ABS(amount)), 0) FROM {$wpdb->prefix}wecc_ledger 
             WHERE type = 'payment' AND settles_ledger_id = %d",
            $charge->id
        ));
        
        return max(0, $charge_amount - $paid_amount);
    }
    
    /**
     * Shortcode para botón de pago
     */
    public function payment_button_shortcode($atts): string {
        $atts = shortcode_atts([
            'type' => 'all',
            'ledger_id' => 0,
            'text' => __('Pagar', 'wc-enhanced-customers-credit')
        ], $atts);
        
        if (!is_user_logged_in()) {
            return '<p>' . __('Debes estar logueado para pagar', 'wc-enhanced-customers-credit') . '</p>';
        }
        
        if ($atts['type'] === 'charge') {
            $url = wecc_get_payment_url('pay_charge', ['wecc_pay_charge' => (int) $atts['ledger_id']]);
        } else {
            $url = wecc_get_payment_url('pay_all', ['wecc_pay_all' => '1']);
        }
        
        return '<a href="' . esc_url($url) . '" class="button">' . esc_html($atts['text']) . '</a>';
    }
    
    /**
     * Deshabilita el gateway de crédito cuando se pagan cargos de crédito
     */
    public function disable_credit_gateway_for_credit_payments($gateways): array {
        // Solo en checkout
        if (!is_checkout() || is_admin()) {
            return $gateways;
        }
        
        // Verificar si hay productos de pago de crédito en el carrito
        $has_credit_payment = false;
        
        if (WC()->cart && !WC()->cart->is_empty()) {
            foreach (WC()->cart->get_cart() as $cart_item) {
                $product_id = $cart_item['product_id'];
                
                // Verificar si es un producto temporal de pago de crédito
                $payment_type = get_post_meta($product_id, 'wecc_payment_type', true);
                
                if ($payment_type) {
                    $has_credit_payment = true;
                    break;
                }
            }
        }
        
        // Si hay productos de pago de crédito, remover el gateway de crédito
        if ($has_credit_payment) {
            // Remover gateway usando el ID correcto
            unset($gateways['wecc_credit']);
            
            // Log para debug
            error_log('WECC Payment: Gateway de crédito deshabilitado para pago de crédito');
        }
        
        return $gateways;
    }
}
