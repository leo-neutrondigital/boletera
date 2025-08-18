<?php
if (!defined('ABSPATH')) exit;

/**
 * WECC Checkout Handler
 * 
 * Maneja la integración automática con el checkout de WooCommerce
 */
class WECC_Checkout_Handler {
    
    public function __construct() {
        // Mostrar crédito disponible en checkout
        add_action('woocommerce_review_order_before_payment', [$this, 'display_credit_summary']);
        
        // Agregar información al gateway
        add_filter('woocommerce_gateway_description', [$this, 'enhance_gateway_description'], 10, 2);
        
        // Validar disponibilidad del gateway
        add_filter('woocommerce_available_payment_gateways', [$this, 'filter_credit_gateway_availability']);
        
        // Scripts y estilos
        add_action('wp_enqueue_scripts', [$this, 'enqueue_checkout_assets']);
        
        // AJAX para actualizar crédito
        add_action('wp_ajax_wecc_update_credit_info', [$this, 'ajax_update_credit_info']);
        add_action('wp_ajax_nopriv_wecc_update_credit_info', [$this, 'ajax_update_credit_info']);
    }
    
    /**
     * Muestra resumen de crédito antes de los métodos de pago
     */
    public function display_credit_summary(): void {
        if (!is_user_logged_in()) {
            return;
        }
        
        $user_id = get_current_user_id();
        $balance = wecc_get_user_balance($user_id);
        
        // Solo mostrar si tiene crédito configurado
        if ($balance['credit_limit'] <= 0) {
            return;
        }
        
        $cart_total = WC()->cart ? WC()->cart->get_total('edit') : 0;
        $has_sufficient_credit = $balance['available_credit'] >= $cart_total;
        
        echo '<div class="wecc-checkout-credit-summary">';
        echo '<h3>' . __('Tu Crédito Disponible', 'wc-enhanced-customers-credit') . '</h3>';
        
        echo '<div class="wecc-credit-overview">';
        
        // Crédito disponible
        echo '<div class="wecc-credit-item">';
        echo '<span class="label">' . __('Crédito disponible:', 'wc-enhanced-customers-credit') . '</span>';
        echo '<span class="value ' . ($balance['available_credit'] > 0 ? 'positive' : 'zero') . '">';
        echo wc_price($balance['available_credit']);
        echo '</span>';
        echo '</div>';
        
        // Límite total
        echo '<div class="wecc-credit-item">';
        echo '<span class="label">' . __('Límite total:', 'wc-enhanced-customers-credit') . '</span>';
        echo '<span class="value">' . wc_price($balance['credit_limit']) . '</span>';
        echo '</div>';
        
        // Usado
        if ($balance['balance_used'] > 0) {
            echo '<div class="wecc-credit-item">';
            echo '<span class="label">' . __('Usado actualmente:', 'wc-enhanced-customers-credit') . '</span>';
            echo '<span class="value used">' . wc_price($balance['balance_used']) . '</span>';
            echo '</div>';
        }
        
        echo '</div>'; // .wecc-credit-overview
        
        // Mensaje sobre la compra actual
        echo '<div class="wecc-purchase-info">';
        if ($has_sufficient_credit) {
            echo '<div class="wecc-can-pay">';
            echo '<span class="dashicons dashicons-yes-alt"></span>';
            echo '<strong>' . __('¡Puedes pagar esta compra con crédito!', 'wc-enhanced-customers-credit') . '</strong>';
            echo '</div>';
        } else {
            echo '<div class="wecc-cannot-pay">';
            echo '<span class="dashicons dashicons-warning"></span>';
            echo '<span>' . sprintf(
                __('Necesitas %s adicionales para pagar con crédito.', 'wc-enhanced-customers-credit'),
                wc_price($cart_total - $balance['available_credit'])
            ) . '</span>';
            echo '</div>';
        }
        echo '</div>';
        
        echo '</div>'; // .wecc-checkout-credit-summary
    }
    
    /**
     * Mejora la descripción del gateway con información dinámica
     */
    public function enhance_gateway_description(string $description, string $gateway_id): string {
        if ($gateway_id !== 'wecc_credit' || !is_checkout()) {
            return $description;
        }
        
        if (!is_user_logged_in()) {
            return $description . '<br><em>' . __('Debes estar logueado para usar crédito.', 'wc-enhanced-customers-credit') . '</em>';
        }
        
        $user_id = get_current_user_id();
        $balance = wecc_get_user_balance($user_id);
        $cart_total = WC()->cart ? WC()->cart->get_total('edit') : 0;
        
        $enhanced_description = $description;
        
        // Agregar información de crédito disponible
        $enhanced_description .= '<div class="wecc-gateway-credit-info">';
        $enhanced_description .= '<strong>' . __('Disponible:', 'wc-enhanced-customers-credit') . '</strong> ';
        $enhanced_description .= '<span class="wecc-available-amount">' . wc_price($balance['available_credit']) . '</span>';
        
        if ($balance['available_credit'] < $cart_total) {
            $enhanced_description .= '<br><span class="wecc-insufficient-notice">';
            $enhanced_description .= '⚠️ ' . sprintf(
                __('Faltan %s para completar esta compra.', 'wc-enhanced-customers-credit'),
                wc_price($cart_total - $balance['available_credit'])
            );
            $enhanced_description .= '</span>';
        }
        
        $enhanced_description .= '</div>';
        
        return $enhanced_description;
    }
    
    /**
     * Filtra la disponibilidad del gateway según el crédito
     */
    public function filter_credit_gateway_availability(array $gateways): array {
        if (!isset($gateways['wecc_credit']) || !is_checkout()) {
            return $gateways;
        }
        
        // En páginas de pago de crédito (order-pay), ocultar el gateway de crédito
        if (is_wc_endpoint_url('order-pay')) {
            $order_id = absint(get_query_var('order-pay'));
            if ($order_id) {
                $order = wc_get_order($order_id);
                if ($order && $order->get_meta('_wecc_credit_payment')) {
                    unset($gateways['wecc_credit']);
                    return $gateways;
                }
            }
        }
        
        // Si no está logueado, remover
        if (!is_user_logged_in()) {
            unset($gateways['wecc_credit']);
            return $gateways;
        }
        
        $user_id = get_current_user_id();
        $balance = wecc_get_user_balance($user_id);
        
        // Si no tiene límite configurado, no mostrar
        if ($balance['credit_limit'] <= 0) {
            unset($gateways['wecc_credit']);
            return $gateways;
        }
        
        // Si no tiene crédito disponible, no mostrar
        if ($balance['available_credit'] <= 0) {
            unset($gateways['wecc_credit']);
            return $gateways;
        }
        
        return $gateways;
    }
    
    /**
     * Encola assets para checkout
     */
    public function enqueue_checkout_assets(): void {
        if (!is_checkout()) {
            return;
        }
        
        wp_enqueue_style(
            'wecc-checkout',
            WECC_PLUGIN_URL . 'includes/frontend/assets/checkout.css',
            [],
            WECC_VERSION
        );
        
        wp_enqueue_script(
            'wecc-checkout-integration',
            WECC_PLUGIN_URL . 'includes/frontend/assets/checkout-integration.js',
            ['jquery'],
            WECC_VERSION,
            true
        );
        
        wp_localize_script('wecc-checkout-integration', 'wecc_checkout_integration', [
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('wecc_checkout_nonce'),
            'user_id' => get_current_user_id(),
            'i18n' => [
                'updating' => __('Actualizando...', 'wc-enhanced-customers-credit'),
                'error' => __('Error al actualizar información de crédito', 'wc-enhanced-customers-credit'),
                'can_pay' => __('¡Puedes pagar esta compra con crédito!', 'wc-enhanced-customers-credit'),
                'cannot_pay' => __('Necesitas %s adicionales para pagar con crédito.', 'wc-enhanced-customers-credit'),
            ]
        ]);
    }
    
    /**
     * AJAX: Actualiza información de crédito dinámicamente
     */
    public function ajax_update_credit_info(): void {
        if (!wp_verify_nonce($_POST['nonce'] ?? '', 'wecc_checkout_nonce')) {
            wp_die(__('Error de seguridad', 'wc-enhanced-customers-credit'));
        }
        
        if (!is_user_logged_in()) {
            wp_send_json_error(__('Usuario no logueado', 'wc-enhanced-customers-credit'));
        }
        
        $user_id = get_current_user_id();
        $balance = wecc_get_user_balance($user_id);
        $cart_total = WC()->cart ? WC()->cart->get_total('edit') : 0;
        
        $response = [
            'available_credit' => $balance['available_credit'],
            'available_credit_formatted' => wc_price($balance['available_credit']),
            'cart_total' => $cart_total,
            'cart_total_formatted' => wc_price($cart_total),
            'can_pay' => $balance['available_credit'] >= $cart_total,
            'difference' => $cart_total - $balance['available_credit'],
            'difference_formatted' => wc_price(max(0, $cart_total - $balance['available_credit']))
        ];
        
        wp_send_json_success($response);
    }
}
