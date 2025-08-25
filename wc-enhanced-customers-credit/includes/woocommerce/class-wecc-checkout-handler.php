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
        
        // NUEVA FUNCIONALIDAD V2.2: Bloquear TODOS los gateways si está configurado
        add_filter('woocommerce_available_payment_gateways', [$this, 'filter_all_gateways_for_overdue_block'], 5);
        
        // NUEVA FUNCIONALIDAD V2.2: Limpiar marca de sesión cuando se vacía el carrito
        add_action('woocommerce_cart_emptied', [$this, 'cleanup_session_on_cart_empty']);
        add_action('woocommerce_remove_cart_item', [$this, 'cleanup_session_on_item_remove'], 10, 2);
        
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
        
        // NUEVO V2.2: No mostrar bloque de crédito si estamos pagando adeudos
        if (wecc_is_credit_payment_page()) {
            error_log('WECC: Es pago de adeudos - omitiendo bloque de crédito en checkout');
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
        
        // Verificar si está bloqueado por vencidos
        $is_blocked = $this->has_overdue_charges($user_id);
        $overdue_info = $is_blocked ? $this->get_overdue_info($user_id) : null;
        
        echo '<div class="wecc-checkout-credit-summary' . ($is_blocked ? ' wecc-blocked' : '') . '">';
        
        if ($is_blocked) {
            // Mostrar versión bloqueada con el diseño mejorado
            echo '<h3>🚑 No puedes realizar compras en este momento</h3>';
            
            echo '<div class="wecc-blocked-main">';
            echo '<div class="wecc-blocked-summary">';
            echo '<p><strong>Tienes ' . wc_price($overdue_info['amount']) . '</strong> en adeudos vencidos desde hace <strong>' . $overdue_info['days'] . ' días</strong>.</p>';
            echo '</div>';
            
            // Información de cuenta compacta
            echo '<div class="wecc-blocked-account-info">';
            echo '<div class="wecc-info-row">';
            echo '<span>Total adeudo: <strong>' . wc_price($balance['balance_used']) . '</strong></span>';
            echo '<span>Límite de crédito: <strong>' . wc_price($balance['credit_limit']) . '</strong></span>';
            echo '</div>';
            echo '</div>';
            
            // Sección "Qué necesitas hacer"
            echo '<div class="wecc-blocked-action-section">';
            echo '<h4>💳 ¿Qué necesitas hacer?</h4>';
            echo '<ol>';
            echo '<li><strong>Paga tus adeudos pendientes</strong> usando el botón de abajo</li>';
            echo '<li>Una vez pagado, podrás continuar con tu compra</li>';
            echo '<li>Tu carrito se mantendrá guardado mientras tanto</li>';
            echo '</ol>';
            echo '</div>';
            
            echo '</div>'; // .wecc-blocked-main
            
            // NO mostrar la información de crédito deshabilitada cuando está bloqueado
        } else {
            // Mostrar versión normal
            echo '<h3>' . __('Tu Crédito Disponible', 'wc-enhanced-customers-credit') . '</h3>';
            echo '<div class="wecc-credit-overview">';
        }
        
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
        if ($is_blocked) {
            // Botón de acción para pagar adeudos
            $pay_url = wc_get_endpoint_url('mi-credito', '', wc_get_page_permalink('myaccount'));
            
            echo '<div class="wecc-blocked-payment-action">';
            echo '<a href="' . esc_url($pay_url) . '" class="wecc-btn wecc-btn-warning wecc-btn-large">';
            echo '💳 Pagar Adeudos (' . wc_price($balance['balance_used']) . ')';
            echo '</a>';
            echo '<div class="wecc-help-text">';
            echo '<small>¿Necesitas ayuda? Contacta a nuestro departamento de crédito</small>';
            echo '</div>';
            echo '</div>';
        } else if ($has_sufficient_credit) {
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
     * Verifica si el usuario tiene cargos vencidos - VERSIÓN CORREGIDA
     */
    private function has_overdue_charges(int $user_id): bool {
        // Usar la función helper corregida
        return wecc_user_has_overdue_charges($user_id);
    }
    
    /**
     * Obtiene información detallada de adeudos vencidos - VERSIÓN CORREGIDA
     */
    private function get_overdue_info(int $user_id): array {
        global $wpdb;
        
        // Query corregida que considera pagos aplicados
        $overdue_data = $wpdb->get_row($wpdb->prepare(
            "SELECT 
                SUM(charges_with_payments.remaining_amount) as total_amount,
                MIN(charges_with_payments.due_date) as oldest_due_date,
                COUNT(*) as count
             FROM (
                 SELECT 
                     l.id,
                     l.amount,
                     l.due_date,
                     COALESCE(payments.paid_amount, 0) as paid_amount,
                     (l.amount - COALESCE(payments.paid_amount, 0)) as remaining_amount
                 FROM {$wpdb->prefix}wecc_ledger l
                 LEFT JOIN {$wpdb->prefix}wecc_credit_accounts a ON l.account_id = a.id
                 LEFT JOIN (
                     SELECT 
                         settles_ledger_id,
                         SUM(ABS(amount)) as paid_amount
                     FROM {$wpdb->prefix}wecc_ledger 
                     WHERE type = 'payment' AND settles_ledger_id IS NOT NULL
                     GROUP BY settles_ledger_id
                 ) payments ON l.id = payments.settles_ledger_id
                 WHERE a.user_id = %d 
                 AND l.type = 'charge' 
                 AND l.due_date < NOW()
             ) charges_with_payments
             WHERE remaining_amount > 0",
            $user_id
        ));
        
        if (!$overdue_data || !$overdue_data->total_amount) {
            return ['amount' => 0, 'days' => 0, 'count' => 0];
        }
        
        // Calcular días desde el vencimiento más antiguo
        $days_overdue = 0;
        if ($overdue_data->oldest_due_date) {
            $oldest_timestamp = strtotime($overdue_data->oldest_due_date);
            $current_timestamp = time();
            $days_overdue = ceil(($current_timestamp - $oldest_timestamp) / (24 * 60 * 60));
        }
        
        return [
            'amount' => (float) $overdue_data->total_amount,
            'days' => max(1, $days_overdue),
            'count' => (int) $overdue_data->count
        ];
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
     * NUEVA FUNCIONALIDAD V2.2: Bloquea TODOS los gateways si el usuario tiene configuración de bloqueo total
     */
    public function filter_all_gateways_for_overdue_block(array $gateways): array {
        // Solo ejecutar en checkout
        if (!is_checkout()) {
            return $gateways;
        }
        
        // NO bloquear si es admin en backend (para que admin pueda testear)
        if (is_admin() && !wp_doing_ajax()) {
            return $gateways;
        }
        
        // DEBUG EXTENSO PARA DIAGNOSTICAR
        $user_id = get_current_user_id();
        error_log("WECC DEBUG TOTAL: === INICIO FILTRADO GATEWAYS ===");
        error_log("WECC DEBUG TOTAL: Usuario ID: {$user_id}");
        error_log("WECC DEBUG TOTAL: Gateways originales: " . implode(', ', array_keys($gateways)));
        
        // Verificar estado de sesión
        $paying_debts = WC()->session->get('wecc_paying_credit_debts');
        error_log("WECC DEBUG TOTAL: Marca session 'wecc_paying_credit_debts': " . ($paying_debts ? 'TRUE' : 'FALSE'));
        
        // NUEVO: Limpiar marca de sesión si ya no hay productos de pago de adeudos en carrito
        $this->cleanup_credit_payment_session_if_needed();
        
        // Verificar después de limpieza
        $paying_debts_after = WC()->session->get('wecc_paying_credit_debts');
        error_log("WECC DEBUG TOTAL: Marca session DESPUÉS de limpieza: " . ($paying_debts_after ? 'TRUE' : 'FALSE'));
        
        // Verificar detección de pago de adeudos
        $is_credit_payment = wecc_is_credit_payment_page();
        error_log("WECC DEBUG TOTAL: wecc_is_credit_payment_page(): " . ($is_credit_payment ? 'TRUE' : 'FALSE'));
        
        // CASO ESPECIAL: Si es página de pago de adeudos de crédito
        if ($is_credit_payment) {
            error_log('WECC DEBUG TOTAL: Es página de pago de adeudos, permitiendo todos los gateways EXCEPTO crédito');
            error_log('WECC DEBUG TOTAL: Gateways originales: ' . implode(', ', array_keys($gateways)));
            
            // Eliminar solo el gateway de crédito
            unset($gateways['wecc_credit']);
            
            error_log('WECC DEBUG TOTAL: Gateways después de filtrar: ' . implode(', ', array_keys($gateways)));
            
            return $gateways; // Retornar todos los demás gateways
        }
        
        // Solo aplicar a usuarios logueados
        if (!is_user_logged_in()) {
            error_log('WECC DEBUG TOTAL: Usuario no logueado, no aplicando bloqueo');
            return $gateways;
        }
        
        // Verificar si se debe bloquear todo
        $should_block = wecc_should_block_all_purchases($user_id);
        error_log("WECC DEBUG TOTAL: wecc_should_block_all_purchases({$user_id}): " . ($should_block ? 'TRUE' : 'FALSE'));
        
        // Verificar componentes del bloqueo
        $has_total_block = wecc_user_has_total_block_enabled($user_id);
        $has_overdue = wecc_user_has_overdue_charges($user_id);
        error_log("WECC DEBUG TOTAL: wecc_user_has_total_block_enabled(): " . ($has_total_block ? 'TRUE' : 'FALSE'));
        error_log("WECC DEBUG TOTAL: wecc_user_has_overdue_charges(): " . ($has_overdue ? 'TRUE' : 'FALSE'));
        
        if ($should_block) {
            error_log("WECC DEBUG TOTAL: Usuario {$user_id} debe ser bloqueado totalmente - eliminando todos los gateways");
            
            // Guardar los gateways que se van a bloquear para mostrar mensaje después
            WC()->session->set('wecc_blocked_gateways', array_keys($gateways));
            WC()->session->set('wecc_user_is_blocked', true);
            
            // Retornar array vacío = SIN gateways disponibles
            return [];
        }
        
        // Limpiar session si no está bloqueado
        WC()->session->__unset('wecc_blocked_gateways');
        WC()->session->__unset('wecc_user_is_blocked');
        
        error_log("WECC DEBUG TOTAL: No se aplica bloqueo, retornando gateways originales");
        error_log("WECC DEBUG TOTAL: === FIN FILTRADO GATEWAYS ===");
        
        return $gateways;
    }
    
    /**
     * NUEVA FUNCIONALIDAD V2.2: Limpia marca de sesión si ya no es pago de adeudos legítimo
     */
    private function cleanup_credit_payment_session_if_needed(): void {
        // Solo si hay marca de sesión activa
        if (!WC()->session->get('wecc_paying_credit_debts')) {
            return;
        }
        
        $has_credit_payment_products = false;
        
        // Verificar si hay productos de pago de adeudos en el carrito
        if (WC()->cart && !WC()->cart->is_empty()) {
            foreach (WC()->cart->get_cart() as $cart_item) {
                $product_id = $cart_item['product_id'];
                $payment_type = get_post_meta($product_id, 'wecc_payment_type', true);
                
                if ($payment_type) {
                    $has_credit_payment_products = true;
                    break;
                }
            }
        }
        
        // Si NO hay productos de pago de adeudos, limpiar marca de sesión
        if (!$has_credit_payment_products) {
            WC()->session->__unset('wecc_paying_credit_debts');
            error_log('WECC: Limpiando marca de sesión - ya no hay productos de pago de adeudos en carrito');
        }
    }
    
    /**
     * NUEVA FUNCIONALIDAD V2.2: Limpia sesión cuando se vacía el carrito
     */
    public function cleanup_session_on_cart_empty(): void {
        if (WC()->session->get('wecc_paying_credit_debts')) {
            WC()->session->__unset('wecc_paying_credit_debts');
            error_log('WECC: Limpiando marca de sesión - carrito vaciado');
        }
    }
    
    /**
     * NUEVA FUNCIONALIDAD V2.2: Limpia sesión cuando se elimina item si era producto de pago
     */
    public function cleanup_session_on_item_remove(string $cart_item_key, WC_Cart $cart): void {
        // Solo hacer cleanup después de que se elimine el item
        add_action('woocommerce_after_cart_item_quantity_update', function() {
            $this->cleanup_credit_payment_session_if_needed();
        });
    }
    public function filter_credit_gateway_availability(array $gateways): array {
        error_log('WECC GATEWAY DEBUG: === INICIO FILTRO GATEWAY CRÉDITO ===');
        error_log('WECC GATEWAY DEBUG: Gateways recibidos: ' . implode(', ', array_keys($gateways)));
        error_log('WECC GATEWAY DEBUG: ¿Tiene wecc_credit?: ' . (isset($gateways['wecc_credit']) ? 'SÍ' : 'NO'));
        
        if (!isset($gateways['wecc_credit']) || !is_checkout()) {
            error_log('WECC GATEWAY DEBUG: Saliendo temprano - No hay gateway o no es checkout');
            return $gateways;
        }
        
        // En páginas de pago de crédito (order-pay), ocultar el gateway de crédito
        if (is_wc_endpoint_url('order-pay')) {
            $order_id = absint(get_query_var('order-pay'));
            if ($order_id) {
                $order = wc_get_order($order_id);
                if ($order && $order->get_meta('_wecc_credit_payment')) {
                    error_log('WECC GATEWAY DEBUG: Es order-pay de crédito, eliminando gateway');
                    unset($gateways['wecc_credit']);
                    return $gateways;
                }
            }
        }
        
        // Si no está logueado, remover
        if (!is_user_logged_in()) {
            error_log('WECC GATEWAY DEBUG: Usuario no logueado, eliminando gateway');
            unset($gateways['wecc_credit']);
            return $gateways;
        }
        
        $user_id = get_current_user_id();
        error_log('WECC GATEWAY DEBUG: Usuario logueado ID: ' . $user_id);
        
        $balance = wecc_get_user_balance($user_id);
        error_log('WECC GATEWAY DEBUG: Balance obtenido: ' . print_r($balance, true));
        
        // Si no tiene límite configurado, no mostrar
        if ($balance['credit_limit'] <= 0) {
            error_log('WECC GATEWAY DEBUG: Sin límite de crédito (' . $balance['credit_limit'] . '), eliminando gateway');
            unset($gateways['wecc_credit']);
            return $gateways;
        }
        
        // Si no tiene crédito disponible, no mostrar
        if ($balance['available_credit'] <= 0) {
            error_log('WECC GATEWAY DEBUG: Sin crédito disponible (' . $balance['available_credit'] . '), eliminando gateway');
            unset($gateways['wecc_credit']);
            return $gateways;
        }
        
        error_log('WECC GATEWAY DEBUG: Gateway de crédito APROBADO - manteniéndolo');
        error_log('WECC GATEWAY DEBUG: === FIN FILTRO GATEWAY CRÉDITO ===');
        
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
        
        // NUEVA VERIFICACIÓN: Incluir estado de bloqueo
        $is_blocked = $this->has_overdue_charges($user_id);
        $overdue_info = $is_blocked ? $this->get_overdue_info($user_id) : null;
        
        $response = [
            'available_credit' => $balance['available_credit'],
            'available_credit_formatted' => wc_price($balance['available_credit']),
            'cart_total' => $cart_total,
            'cart_total_formatted' => wc_price($cart_total),
            'can_pay' => !$is_blocked && $balance['available_credit'] >= $cart_total, // CLAVE: Incluir verificación de bloqueo
            'is_blocked' => $is_blocked,
            'overdue_info' => $overdue_info,
            'difference' => $cart_total - $balance['available_credit'],
            'difference_formatted' => wc_price(max(0, $cart_total - $balance['available_credit']))
        ];
        
        wp_send_json_success($response);
    }
}
