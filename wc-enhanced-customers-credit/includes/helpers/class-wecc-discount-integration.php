<?php
if (!defined('ABSPATH')) exit;

/**
 * WECC Discount Integration Helper
 * 
 * Integra el tipo de cliente con plugins de descuentos
 */
class WECC_Discount_Integration {
    
    public function __construct() {
        // Sincronizar customer_type con user meta
        add_action('wecc_customer_profile_saved', [$this, 'sync_customer_type_to_user_meta'], 10, 2);
        
        // Hook para WooCommerce checkout (si necesita aplicar descuentos)
        add_action('woocommerce_checkout_update_order_meta', [$this, 'store_customer_type_in_order'], 10, 1);
        
        // Agregar customer_type a user profile en admin
        add_action('show_user_profile', [$this, 'show_customer_type_field']);
        add_action('edit_user_profile', [$this, 'show_customer_type_field']);
    }
    
    /**
     * Sincroniza campos WECC del perfil con user meta de WooCommerce
     */
    public function sync_customer_type_to_user_meta(int $user_id, array $profile_data): void {
        // CAMBIO: Sincronizar más campos, no solo customer_type
        $fields_to_sync = [
            'customer_type' => 'wecc_customer_type',
            'type' => 'wecc_customer_type', // Alias
            'rfc' => 'wecc_rfc',
            'phone' => 'billing_phone',
            'street' => 'billing_address_1',
            'city' => 'billing_city',
            'state3' => 'billing_state',
            'zip' => 'billing_postcode'
        ];
        
        foreach ($fields_to_sync as $wecc_field => $wc_meta_key) {
            $value = $profile_data[$wecc_field] ?? '';
            
            if (!empty($value)) {
                update_user_meta($user_id, $wc_meta_key, sanitize_text_field($value));
                
                // También sincronizar campo de respaldo
                if ($wecc_field === 'type' || $wecc_field === 'customer_type') {
                    update_user_meta($user_id, 'customer_type', sanitize_text_field($value));
                }
                
                error_log("WECC Sync: {$wecc_field} -> {$wc_meta_key} = {$value} para usuario {$user_id}");
            }
        }
    }
    
    /**
     * Guarda el customer_type en el pedido para referencia
     */
    public function store_customer_type_in_order(int $order_id): void {
        if (!$order_id) return;
        
        $order = wc_get_order($order_id);
        if (!$order) return;
        
        $customer_id = $order->get_customer_id();
        if (!$customer_id) return;
        
        $customer_type = get_user_meta($customer_id, 'wecc_customer_type', true);
        if ($customer_type) {
            $order->update_meta_data('_wecc_customer_type', $customer_type);
            $order->save();
            
            error_log("WECC Discount: Customer type '{$customer_type}' stored in order {$order_id}");
        }
    }
    
    /**
     * Muestra el customer_type en el perfil de usuario
     */
    public function show_customer_type_field($user): void {
        if (!current_user_can('manage_woocommerce')) return;
        
        $customer_type = get_user_meta($user->ID, 'wecc_customer_type', true);
        ?>
        <h3><?php _e('Información de Crédito WECC', 'wc-enhanced-customers-credit'); ?></h3>
        <table class="form-table">
            <tr>
                <th><label><?php _e('Tipo de Cliente', 'wc-enhanced-customers-credit'); ?></label></th>
                <td>
                    <?php if ($customer_type): ?>
                        <span style="background: #2271b1; color: white; padding: 4px 8px; border-radius: 3px; font-size: 12px;">
                            <?php echo esc_html($customer_type); ?>
                        </span>
                        <p class="description">
                            <?php _e('Tipo de cliente sincronizado desde WECC. Edítalo desde el módulo de Crédito.', 'wc-enhanced-customers-credit'); ?>
                        </p>
                    <?php else: ?>
                        <em><?php _e('Sin tipo asignado', 'wc-enhanced-customers-credit'); ?></em>
                        <p class="description">
                            <?php _e('Asigna un tipo desde el módulo de Crédito WECC.', 'wc-enhanced-customers-credit'); ?>
                        </p>
                    <?php endif; ?>
                </td>
            </tr>
        </table>
        <?php
    }
    
    /**
     * Obtiene tipos de cliente disponibles para reglas de descuento
     */
    public static function get_customer_types(): array {
        return [
            'mayorista' => __('Mayorista', 'wc-enhanced-customers-credit'),
            'distribuidor' => __('Distribuidor', 'wc-enhanced-customers-credit'),
            'minorista' => __('Minorista', 'wc-enhanced-customers-credit'),
            'corporativo' => __('Corporativo', 'wc-enhanced-customers-credit'),
            'gobierno' => __('Gobierno', 'wc-enhanced-customers-credit'),
            'especial' => __('Cliente Especial', 'wc-enhanced-customers-credit')
        ];
    }
    
    /**
     * Helper para plugins de descuentos: obtener customer_type del usuario actual
     */
    public static function get_current_customer_type(): string {
        if (!is_user_logged_in()) return '';
        
        $user_id = get_current_user_id();
        return get_user_meta($user_id, 'wecc_customer_type', true) ?: '';
    }
    
    /**
     * Helper para verificar si un usuario tiene un tipo específico
     */
    public static function user_has_customer_type(int $user_id, string $type): bool {
        $customer_type = get_user_meta($user_id, 'wecc_customer_type', true);
        return $customer_type === $type;
    }
}

// Inicializar solo si está en área apropiada
if (is_admin() || defined('DOING_AJAX')) {
    new WECC_Discount_Integration();
}

/**
 * Funciones helper globales para plugins de descuentos
 */

/**
 * Verifica si el usuario actual tiene un tipo de cliente específico
 */
function wecc_current_user_has_type(string $type): bool {
    return WECC_Discount_Integration::user_has_customer_type(get_current_user_id(), $type);
}

/**
 * Obtiene el tipo de cliente del usuario actual
 */
function wecc_get_current_customer_type(): string {
    return WECC_Discount_Integration::get_current_customer_type();
}

/**
 * Obtiene todos los tipos de cliente disponibles
 */
function wecc_get_customer_types(): array {
    return WECC_Discount_Integration::get_customer_types();
}
