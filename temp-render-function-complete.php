    /**
     * Renderiza la información del cliente de crédito
     */
    private function render_customer_info(int $user_id): void {
        // Obtener datos del usuario
        $user = get_user_by('id', $user_id);
        if (!$user) {
            return;
        }
        
        // Obtener cuenta de crédito
        $account = wecc_get_or_create_account($user_id);
        if (!$account || $account->credit_limit <= 0) {
            return; // No mostrar si no tiene crédito
        }
        
        // Obtener datos WECC específicos
        global $wpdb;
        $profile = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}wecc_customer_profiles WHERE user_id = %d",
            $user_id
        ));
        
        // Obtener datos de WooCommerce
        $billing_first_name = get_user_meta($user_id, 'billing_first_name', true);
        $billing_last_name = get_user_meta($user_id, 'billing_last_name', true);
        $billing_company = get_user_meta($user_id, 'billing_company', true);
        $billing_phone = get_user_meta($user_id, 'billing_phone', true);
        $billing_address_1 = get_user_meta($user_id, 'billing_address_1', true);
        $billing_city = get_user_meta($user_id, 'billing_city', true);
        $billing_state = get_user_meta($user_id, 'billing_state', true);
        $billing_postcode = get_user_meta($user_id, 'billing_postcode', true);
        
        // Formar nombre completo
        $full_name = trim($billing_first_name . ' ' . $billing_last_name);
        if (empty($full_name)) {
            $full_name = $user->display_name;
        }
        
        // Formar dirección completa
        $address_parts = array_filter([$billing_address_1, $billing_city, $billing_state, $billing_postcode]);
        $full_address = !empty($address_parts) ? implode(', ', $address_parts) : '';
        
        echo '<div class="wecc-customer-info">';
        echo '<h3>📋 Mi información de crédito</h3>';
        
        // Grid principal con 3 bloques
        echo '<div class="wecc-info-blocks">';
        
        // === BLOQUE CONTACTO ===
        echo '<div class="wecc-info-block wecc-contact-block">';
        echo '<div class="wecc-block-header">';
        echo '<h4>📞 CONTACTO</h4>';
        echo '</div>';
        echo '<div class="wecc-block-content">';
        
        // Nombre
        if ($full_name) {
            echo '<div class="wecc-info-item">';
            echo '<div class="wecc-info-label">Nombre:</div>';
            echo '<div class="wecc-info-value">' . esc_html($full_name) . '</div>';
            echo '</div>';
        }
        
        // Email
        echo '<div class="wecc-info-item">';
        echo '<div class="wecc-info-label">Email:</div>';
        echo '<div class="wecc-info-value">' . esc_html($user->user_email) . '</div>';
        echo '</div>';
        
        // Teléfono
        if ($billing_phone) {
            echo '<div class="wecc-info-item">';
            echo '<div class="wecc-info-label">Teléfono:</div>';
            echo '<div class="wecc-info-value">' . esc_html($billing_phone) . '</div>';
            echo '</div>';
        }
        
        // Dirección
        if ($full_address) {
            echo '<div class="wecc-info-item">';
            echo '<div class="wecc-info-label">Dirección:</div>';
            echo '<div class="wecc-info-value">' . esc_html($full_address) . '</div>';
            echo '</div>';
        }
        
        echo '</div>'; // .wecc-block-content
        echo '</div>'; // .wecc-contact-block
        
        // === BLOQUE FISCAL ===
        echo '<div class="wecc-info-block wecc-fiscal-block">';
        echo '<div class="wecc-block-header">';
        echo '<h4>🏢 FISCAL</h4>';
        echo '</div>';
        echo '<div class="wecc-block-content">';
        
        // RFC
        if ($profile && $profile->rfc) {
            echo '<div class="wecc-info-item">';
            echo '<div class="wecc-info-label">RFC:</div>';
            echo '<div class="wecc-info-value">';
            echo '<code class="wecc-rfc">' . esc_html($profile->rfc) . '</code>';
            echo '</div>';
            echo '</div>';
        }
        
        // Razón Social (empresa)
        if ($billing_company) {
            echo '<div class="wecc-info-item">';
            echo '<div class="wecc-info-label">Razón Social:</div>';
            echo '<div class="wecc-info-value">' . esc_html($billing_company) . '</div>';
            echo '</div>';
        }
        
        // Tipo de cliente
        if ($profile && $profile->customer_type) {
            $types = [
                'mayorista' => 'Mayorista',
                'distribuidor' => 'Distribuidor', 
                'minorista' => 'Minorista',
                'corporativo' => 'Corporativo',
                'gobierno' => 'Gobierno',
                'especial' => 'Cliente Especial'
            ];
            
            $type_label = $types[$profile->customer_type] ?? $profile->customer_type;
            
            echo '<div class="wecc-info-item">';
            echo '<div class="wecc-info-label">Tipo:</div>';
            echo '<div class="wecc-info-value">';
            echo '<span class="wecc-customer-type wecc-type-' . esc_attr($profile->customer_type) . '">';
            echo esc_html($type_label);
            echo '</span>';
            echo '</div>';
            echo '</div>';
        }
        
        echo '</div>'; // .wecc-block-content
        echo '</div>'; // .wecc-fiscal-block
        
        // === BLOQUE GESTIÓN ===
        echo '<div class="wecc-info-block wecc-management-block">';
        echo '<div class="wecc-block-header">';
        echo '<h4>📈 GESTIÓN</h4>';
        echo '</div>';
        echo '<div class="wecc-block-content">';
        
        // Cliente desde
        if ($profile && $profile->customer_since) {
            echo '<div class="wecc-info-item">';
            echo '<div class="wecc-info-label">Cliente desde:</div>';
            echo '<div class="wecc-info-value">' . esc_html(date_i18n('d/m/Y', strtotime($profile->customer_since))) . '</div>';
            echo '</div>';
        }
        
        // Número de cliente
        if ($profile && $profile->customer_number) {
            echo '<div class="wecc-info-item">';
            echo '<div class="wecc-info-label">Número:</div>';
            echo '<div class="wecc-info-value">';
            echo '<code class="wecc-customer-number">' . esc_html($profile->customer_number) . '</code>';
            echo '</div>';
            echo '</div>';
        }
        
        // Términos de pago
        if ($account->payment_terms_days) {
            echo '<div class="wecc-info-item">';
            echo '<div class="wecc-info-label">Términos pago:</div>';
            echo '<div class="wecc-info-value">' . esc_html($account->payment_terms_days) . ' días</div>';
            echo '</div>';
        }
        
        // Notas (si las hay) - truncadas
        if ($profile && $profile->credit_notes && trim($profile->credit_notes)) {
            echo '<div class="wecc-info-item">';
            echo '<div class="wecc-info-label">Notas:</div>';
            echo '<div class="wecc-info-value">';
            echo '<em>' . esc_html(substr($profile->credit_notes, 0, 40));
            echo (strlen($profile->credit_notes) > 40 ? '...' : '') . '</em>';
            echo '</div>';
            echo '</div>';
        }
        
        echo '</div>'; // .wecc-block-content
        echo '</div>'; // .wecc-management-block
        
        echo '</div>'; // .wecc-info-blocks
        
        // Link para editar información
        echo '<div class="wecc-edit-info-link">';
        echo '<a href="' . esc_url(wc_get_endpoint_url('edit-account', '', wc_get_page_permalink('myaccount'))) . '">';
        echo '✏️ Editar información de contacto y facturación';
        echo '</a>';
        echo '</div>';
        
        echo '</div>'; // .wecc-customer-info
    }
