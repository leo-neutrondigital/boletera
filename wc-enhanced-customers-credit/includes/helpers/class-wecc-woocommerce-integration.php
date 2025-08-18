<?php
if (!defined('ABSPATH')) exit;

/**
 * WECC WooCommerce Integration Helper
 * 
 * Integra campos del perfil WECC con campos nativos de WooCommerce
 */
class WECC_WooCommerce_Profile_Integration {
    
    public function __construct() {
        // Sincronizar campos WECC con WooCommerce
        add_action('wecc_customer_profile_saved', [$this, 'sync_with_woocommerce_profile'], 10, 2);
        
        // Sincronizar cambios de WooCommerce hacia WECC
        add_action('woocommerce_customer_save_address', [$this, 'sync_from_woocommerce_profile'], 10, 2);
        
        // Agregar campos WECC al perfil de usuario de WooCommerce
        add_action('woocommerce_edit_account_form', [$this, 'add_wecc_fields_to_wc_profile']);
        add_action('woocommerce_save_account_details', [$this, 'save_wecc_fields_from_wc_profile']);
        
        // Extender campos de billing/shipping en admin
        add_filter('woocommerce_customer_meta_fields', [$this, 'add_wecc_fields_to_admin_profile']);
    }
    
    /**
     * Mapeo de campos WECC a campos WooCommerce
     */
    private function get_field_mapping(): array {
        return [
            // WECC Field => WooCommerce Meta Key
            'full_name' => 'billing_company', // Usar company para razón social
            'business_name' => 'billing_company',
            'phone' => 'billing_phone',
            'address' => 'billing_address_1',
            'address_2' => 'billing_address_2', 
            'city' => 'billing_city',
            'state' => 'billing_state',
            'postal_code' => 'billing_postcode',
            'country' => 'billing_country',
            
            // Campos específicos WECC (sin equivalente en WC)
            'rfc' => 'wecc_rfc',
            'customer_type' => 'wecc_customer_type',
            'contact_person' => 'wecc_contact_person',
            'sales_rep' => 'wecc_sales_rep',
            'customer_since' => 'wecc_customer_since',
            'credit_notes' => 'wecc_credit_notes'
        ];
    }
    
    /**
     * Sincroniza campos WECC hacia WooCommerce cuando se guarda el perfil WECC
     */
    public function sync_with_woocommerce_profile(int $user_id, array $profile_data): void {
        $mapping = $this->get_field_mapping();
        
        foreach ($profile_data as $wecc_field => $value) {
            if (isset($mapping[$wecc_field])) {
                $wc_meta_key = $mapping[$wecc_field];
                
                // Solo sincronizar si hay valor
                if (!empty($value)) {
                    update_user_meta($user_id, $wc_meta_key, sanitize_text_field($value));
                    
                    // Para dirección, también sincronizar a shipping si está vacío
                    if (strpos($wc_meta_key, 'billing_') === 0) {
                        $shipping_key = str_replace('billing_', 'shipping_', $wc_meta_key);
                        $existing_shipping = get_user_meta($user_id, $shipping_key, true);
                        
                        if (empty($existing_shipping)) {
                            update_user_meta($user_id, $shipping_key, sanitize_text_field($value));
                        }
                    }
                }
            }
        }
        
        error_log("WECC WC Integration: Sincronizados " . count($profile_data) . " campos para usuario {$user_id}");
    }
    
    /**
     * Sincroniza cambios de WooCommerce hacia WECC (MEJORADO)
     */
    public function sync_from_woocommerce_profile(int $user_id, string $load_address): void {
        // Solo sincronizar billing (facturación)
        if ($load_address !== 'billing') {
            return;
        }
        
        error_log("WECC WC Integration: Sincronizando desde WooCommerce para usuario {$user_id}");
        
        // Obtener servicio de customer
        if (!function_exists('wecc_service')) {
            error_log('WECC WC Integration: wecc_service no disponible');
            return;
        }
        
        try {
            $customer_service = wecc_service('customer_service');
            $existing_profile = $customer_service->get_profile_by_user($user_id) ?: [];
            
            // Mapeo WooCommerce → WECC
            $wc_to_wecc_mapping = [
                'billing_phone' => 'phone',
                'billing_address_1' => 'street', 
                'billing_city' => 'city',
                'billing_postcode' => 'zip',
                'billing_state' => 'state3'
            ];
            
            $updated_profile = $existing_profile;
            $changes_made = [];
            
            foreach ($wc_to_wecc_mapping as $wc_key => $wecc_field) {
                $wc_value = get_user_meta($user_id, $wc_key, true);
                
                if (!empty($wc_value)) {
                    // Mapeo especial para estados
                    if ($wecc_field === 'state3' && strlen($wc_value) === 2) {
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
                        $wc_value = $state_map[$wc_value] ?? $wc_value;
                    }
                    
                    // Solo actualizar si el valor ha cambiado o está vacío en WECC
                    $current_value = $updated_profile[$wecc_field] ?? '';
                    if ($current_value !== $wc_value) {
                        $updated_profile[$wecc_field] = $wc_value;
                        $changes_made[] = "{$wecc_field}: '{$current_value}' → '{$wc_value}'";
                        error_log("WECC WC Integration: Actualizando {$wecc_field} = {$wc_value}");
                    }
                }
            }
            
            // Guardar perfil actualizado si hay cambios
            if (!empty($changes_made)) {
                $customer_service->save_profile($user_id, $updated_profile);
                error_log("WECC WC Integration: Sincronizado desde WC para usuario {$user_id}. Cambios: " . implode(', ', $changes_made));
            } else {
                error_log("WECC WC Integration: Sin cambios para usuario {$user_id}");
            }
            
        } catch (Exception $e) {
            error_log("WECC WC Integration Error: " . $e->getMessage());
        }
    }
    
    /**
     * Agrega campos WECC al formulario de cuenta de WooCommerce (frontend)
     */
    public function add_wecc_fields_to_wc_profile(): void {
        $user_id = get_current_user_id();
        if (!$user_id) return;
        
        // Obtener datos WECC
        $wecc_fields = [
            'rfc' => get_user_meta($user_id, 'wecc_rfc', true),
            'customer_type' => get_user_meta($user_id, 'wecc_customer_type', true),
            'contact_person' => get_user_meta($user_id, 'wecc_contact_person', true)
        ];
        
        // Solo mostrar si hay datos WECC o si el usuario tiene crédito
        $has_credit = wecc_get_or_create_account($user_id)->credit_limit > 0;
        if (empty(array_filter($wecc_fields)) && !$has_credit) {
            return;
        }
        
        ?>
        <fieldset>
            <legend><?php _e('Información de Crédito', 'wc-enhanced-customers-credit'); ?></legend>
            
            <?php if ($wecc_fields['rfc']): ?>
            <p class="woocommerce-form-row woocommerce-form-row--wide form-row form-row-wide">
                <label for="wecc_rfc"><?php _e('RFC', 'wc-enhanced-customers-credit'); ?></label>
                <input type="text" class="woocommerce-Input woocommerce-Input--text input-text" 
                       name="wecc_rfc" id="wecc_rfc" 
                       value="<?php echo esc_attr($wecc_fields['rfc']); ?>" readonly />
                <small><?php _e('Para cambiar tu RFC, contacta con atención al cliente.', 'wc-enhanced-customers-credit'); ?></small>
            </p>
            <?php endif; ?>
            
            <?php if ($wecc_fields['customer_type']): ?>
            <p class="woocommerce-form-row woocommerce-form-row--wide form-row form-row-wide">
                <label><?php _e('Tipo de Cliente', 'wc-enhanced-customers-credit'); ?></label>
                <span style="background: #2271b1; color: white; padding: 4px 8px; border-radius: 3px; font-size: 12px;">
                    <?php echo esc_html($wecc_fields['customer_type']); ?>
                </span>
            </p>
            <?php endif; ?>
            
            <p class="woocommerce-form-row woocommerce-form-row--wide form-row form-row-wide">
                <label for="wecc_contact_person"><?php _e('Persona de Contacto', 'wc-enhanced-customers-credit'); ?></label>
                <input type="text" class="woocommerce-Input woocommerce-Input--text input-text" 
                       name="wecc_contact_person" id="wecc_contact_person" 
                       value="<?php echo esc_attr($wecc_fields['contact_person']); ?>" />
            </p>
        </fieldset>
        <?php
    }
    
    /**
     * Guarda campos WECC desde el formulario de WooCommerce
     */
    public function save_wecc_fields_from_wc_profile(int $user_id): void {
        $contact_person = sanitize_text_field($_POST['wecc_contact_person'] ?? '');
        
        if ($contact_person) {
            update_user_meta($user_id, 'wecc_contact_person', $contact_person);
            
            // También actualizar en el perfil WECC si existe el servicio
            if (function_exists('wecc_service')) {
                try {
                    $customer_service = wecc_service('customer_service');
                    $profile = $customer_service->get_profile_by_user($user_id) ?: [];
                    $profile['contact_person'] = $contact_person;
                    $customer_service->save_profile($user_id, $profile);
                } catch (Exception $e) {
                    error_log("WECC WC Integration Save Error: " . $e->getMessage());
                }
            }
        }
    }
    
    /**
     * Agrega campos WECC al perfil de admin de WooCommerce
     */
    public function add_wecc_fields_to_admin_profile(array $fields): array {
        // Agregar sección WECC a billing
        $fields['billing']['fields']['billing_wecc_separator'] = [
            'label' => __('— Información de Crédito WECC —', 'wc-enhanced-customers-credit'),
            'type' => 'text',
            'custom_attributes' => [
                'readonly' => 'readonly',
                'style' => 'background: #f0f8ff; text-align: center; font-weight: bold; border: 2px solid #2271b1;'
            ]
        ];
        
        $fields['billing']['fields']['wecc_rfc'] = [
            'label' => __('RFC', 'wc-enhanced-customers-credit'),
            'description' => __('RFC para facturación fiscal', 'wc-enhanced-customers-credit')
        ];
        
        $fields['billing']['fields']['wecc_customer_type'] = [
            'label' => __('Tipo de Cliente', 'wc-enhanced-customers-credit'),
            'type' => 'select',
            'options' => [
                '' => __('Sin asignar', 'wc-enhanced-customers-credit'),
                'mayorista' => __('Mayorista', 'wc-enhanced-customers-credit'),
                'distribuidor' => __('Distribuidor', 'wc-enhanced-customers-credit'),
                'minorista' => __('Minorista', 'wc-enhanced-customers-credit'),
                'corporativo' => __('Corporativo', 'wc-enhanced-customers-credit'),
                'gobierno' => __('Gobierno', 'wc-enhanced-customers-credit'),
                'especial' => __('Cliente Especial', 'wc-enhanced-customers-credit')
            ]
        ];
        
        $fields['billing']['fields']['wecc_contact_person'] = [
            'label' => __('Persona de Contacto', 'wc-enhanced-customers-credit'),
            'description' => __('Nombre de la persona de contacto principal', 'wc-enhanced-customers-credit')
        ];
        
        return $fields;
    }
    
    /**
     * Obtiene la dirección completa formateada desde WooCommerce
     */
    public static function get_formatted_address(int $user_id, string $type = 'billing'): string {
        $address_fields = [
            $type . '_address_1',
            $type . '_address_2', 
            $type . '_city',
            $type . '_state',
            $type . '_postcode',
            $type . '_country'
        ];
        
        $address_parts = [];
        foreach ($address_fields as $field) {
            $value = get_user_meta($user_id, $field, true);
            if (!empty($value)) {
                $address_parts[] = $value;
            }
        }
        
        return implode(', ', $address_parts);
    }
}

// Inicializar integración
new WECC_WooCommerce_Profile_Integration();
