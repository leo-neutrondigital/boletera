<?php
if (!defined('ABSPATH')) exit;

/**
 * WECC My Credit Endpoint
 * 
 * Endpoint "Mi Crédito" en WooCommerce My Account
 */
class WECC_My_Credit_Endpoint {
    
    private $content_rendered = false;
    
    /**
     * Constructor
     */
    public function __construct() {
        // Registrar endpoint
        add_action('init', [$this, 'add_endpoint']);
        
        // Limpieza de endpoints conflictivos al cargar
        add_action('init', [$this, 'clean_conflicting_endpoints'], 5);
        
        // Agregar al menú de My Account
        add_filter('woocommerce_account_menu_items', [$this, 'add_menu_item']);
        
        // Contenido del endpoint - Usar hook estándar del endpoint con verificación de duplicación
        add_action('woocommerce_account_mi-credito_endpoint', [$this, 'render_my_credit_dashboard_action']);
        
        // Título de la página
        add_filter('woocommerce_endpoint_mi-credito_title', [$this, 'endpoint_title']);
        
        // Scripts y estilos
        add_action('wp_enqueue_scripts', [$this, 'enqueue_assets']);
        
        // Prevenir creación de página física que interfiera
        add_action('wp_insert_post', [$this, 'prevent_page_conflict'], 10, 2);
        
        // AJAX handlers
        add_action('wp_ajax_wecc_pay_charge', [$this, 'ajax_pay_charge']);
        add_action('wp_ajax_wecc_pay_all', [$this, 'ajax_pay_all']);
        
        // Shortcode para usar en páginas
        // add_shortcode('wecc_my_credit', [$this, 'shortcode_handler']);
    }
    
    /**
     * Limpia endpoints conflictivos - ejecuta UNA VEZ
     */
    public function clean_conflicting_endpoints(): void {
        // Solo ejecutar una vez
        if (get_option('wecc_endpoints_cleaned_v6')) {
            return;
        }
        
        if (WP_DEBUG) {
            error_log('WECC: Iniciando limpieza de endpoints conflictivos');
        }
        
        // 1. Limpiar opciones problemáticas
        $options_to_delete = [
            'wecc_endpoints_flushed',
            'wecc_rewrite_fixed_v3', 
            'wecc_endpoint_added_v4',
            'wecc_endpoint_clean_v5'
        ];
        
        foreach ($options_to_delete as $option) {
            delete_option($option);
        }
        
        // 2. Buscar y eliminar páginas "Mi Crédito" conflictivas
        $possible_titles = ['Mi Crédito', 'Mi Credito', 'mi-credito'];
        foreach ($possible_titles as $title) {
            $page = get_page_by_title($title);
            if ($page) {
                wp_delete_post($page->ID, true);
                if (WP_DEBUG) {
                    error_log('WECC: Eliminada página conflictiva: ' . $title);
                }
            }
        }
        
        // 3. Flush rewrite rules
        flush_rewrite_rules(false);
        
        // 4. Marcar como completada
        update_option('wecc_endpoints_cleaned_v6', true);
        
        if (WP_DEBUG) {
            error_log('WECC: Limpieza de endpoints completada');
        }
    }
    
    /**
     * Previene creación de páginas que interfieran con nuestro endpoint
     */
    public function prevent_page_conflict($post_id, $post): void {
        // Solo para páginas nuevas
        if ($post->post_type !== 'page' || $post->post_status !== 'publish') {
            return;
        }
        
        // Si alguien trata de crear una página llamada "Mi Crédito" o "mi-credito"
        if (in_array($post->post_name, ['mi-credito', 'mi-credito-2']) || 
            in_array($post->post_title, ['Mi Crédito', 'Mi Credito'])) {
            
            if (WP_DEBUG) {
                error_log('WECC: Evitando conflicto - página "' . $post->post_title . '" creada');
            }
            
            // Cambiar el slug para evitar conflicto
            wp_update_post([
                'ID' => $post_id,
                'post_name' => 'mi-credito-pagina-' . $post_id
            ]);
        }
    }
    
    /**
     * Agrega el endpoint de forma ultra simple
     */
    public function add_endpoint(): void {
        add_rewrite_endpoint('mi-credito', EP_PAGES);
    }
    
    /**
     * Agrega el elemento al menú de My Account
     */
    public function add_menu_item(array $items): array {
        // Solo mostrar si el usuario tiene crédito activo
        if (!is_user_logged_in()) {
            return $items;
        }
        
        $user_id = get_current_user_id();
        $balance = wecc_get_user_balance($user_id);
        
        // Solo mostrar si tiene límite de crédito configurado
        if ($balance['credit_limit'] <= 0) {
            return $items;
        }
        
        // Insertar antes de "Cerrar sesión"
        $new_items = [];
        foreach ($items as $key => $item) {
            if ($key === 'customer-logout') {
                $new_items['mi-credito'] = __('Mi Crédito', 'wc-enhanced-customers-credit');
            }
            $new_items[$key] = $item;
        }
        
        return $new_items;
    }
    
    /**
     * Título del endpoint
     */
    public function endpoint_title(string $title): string {
        return __('Mi Crédito', 'wc-enhanced-customers-credit');
    }
    
    /**
     * Encola assets
     */
    public function enqueue_assets(): void {
        if (!is_wc_endpoint_url('mi-credito') && !is_page(get_option('wecc_my_credit_page_id'))) {
            return;
        }
        
        wp_enqueue_style(
            'wecc-my-credit',
            WECC_PLUGIN_URL . 'includes/frontend/assets/my-credit.css',
            [],
            WECC_VERSION
        );
        
        wp_enqueue_script(
            'wecc-my-credit',
            WECC_PLUGIN_URL . 'includes/frontend/assets/my-credit.js',
            ['jquery'],
            WECC_VERSION,
            true
        );
        
        wp_localize_script('wecc-my-credit', 'wecc_my_credit', [
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('wecc_my_credit_nonce'),
            'i18n' => [
                'confirm_pay_charge' => __('¿Confirmas el pago de este cargo?', 'wc-enhanced-customers-credit'),
                'confirm_pay_all' => __('¿Confirmas el pago de todo tu saldo pendiente?', 'wc-enhanced-customers-credit'),
                'processing' => __('Procesando pago...', 'wc-enhanced-customers-credit'),
                'error' => __('Error al procesar el pago', 'wc-enhanced-customers-credit'),
                'success' => __('Pago procesado correctamente', 'wc-enhanced-customers-credit'),
            ]
        ]);
    }
    
    /**
     * Renderiza contenido solo si estamos en nuestro endpoint
     */
   /*  public function maybe_render_credit_content(): void {
        // Solo ejecutar en nuestro endpoint
        if (!is_wc_endpoint_url('mi-credito')) {
            return;
        }
        
        // DEBUG temporal para verificar
        echo '<div style="background: #e7f3ff; border: 2px solid #007cba; padding: 15px; margin: 15px; border-radius: 8px;">';
        echo '<h3 style="color: #007cba; margin: 0 0 10px 0;">💳 Endpoint Mi Crédito Detectado</h3>';
        echo '<p>URL: ' . esc_html($_SERVER['REQUEST_URI'] ?? 'N/A') . '</p>';
        echo '<p>is_wc_endpoint_url("mi-credito"): ' . (is_wc_endpoint_url('mi-credito') ? 'TRUE' : 'FALSE') . '</p>';
        echo '<p>is_account_page(): ' . (is_account_page() ? 'TRUE' : 'FALSE') . '</p>';
        echo '</div>';
        
        if (!is_user_logged_in()) {
            echo '<div class="woocommerce-info">Debes estar logueado para ver tu crédito.</div>';
            return;
        }
        
        echo '<div style="background: #d4edda; border: 2px solid #28a745; padding: 15px; margin: 15px; border-radius: 8px;">';
        echo '<h3 style="color: #28a745; margin: 0;">✓ Renderizando Dashboard de Crédito</h3>';
        echo '</div>';
        
        // Renderizar dashboard
        $this->render_my_credit_dashboard(get_current_user_id());
        
        echo '<div style="background: #f8d7da; border: 2px solid #dc3545; padding: 15px; margin: 15px; border-radius: 8px;">';
        echo '<h3 style="color: #dc3545; margin: 0;">✓ Dashboard Renderizado Completamente</h3>';
        echo '</div>';
    }
     */
    /**
     * Renderiza el contenido del endpoint
     */
    public function render_my_credit_dashboard_action(): void {
        if (!is_user_logged_in()) {
            echo '<div class="woocommerce-info">Debes estar logueado para ver tu crédito.</div>';
            return;
        }
        
        $user_id = get_current_user_id();
        $balance = wecc_get_user_balance($user_id);
        
        // Si no tiene crédito configurado, mostrar mensaje y ocultar contenido
        if ($balance['credit_limit'] <= 0) {
            echo '<div class="woocommerce-info">';
            echo '<h3>💳 No tienes crédito asignado</h3>';
            echo '<p>Tu cuenta no tiene límite de crédito configurado. Para obtener crédito, contacta a nuestro departamento de ventas.</p>';
            
            // Botón para contactar o volver al dashboard
            echo '<div style="margin-top: 15px;">';
            echo '<a href="' . esc_url(wc_get_page_permalink('myaccount')) . '" class="button">← Volver a Mi Cuenta</a>';
            echo '</div>';
            echo '</div>';
            return;
        }
        
        $this->render_my_credit_dashboard($user_id);
    }

    /**
     * Handler del shortcode
     */
    public function shortcode_handler($atts): string {
        if (!is_user_logged_in()) {
            return '<div class="woocommerce-info">' . 
                   __('Debes estar logueado para ver tu crédito.', 'wc-enhanced-customers-credit') . 
                   '</div>';
        }
        
        ob_start();
        $this->render_my_credit_dashboard(get_current_user_id());
        return ob_get_clean();
    }
    
    /**
     * Renderiza el dashboard completo de crédito
     */
    private function render_my_credit_dashboard(int $user_id): void {
        $balance = wecc_get_user_balance($user_id);
        $pending_charges = $this->get_pending_charges($user_id);
        
        // Paginación para movimientos
        $page = max(1, (int) ($_GET['movements_page'] ?? 1));
        $per_page = 10;
        $offset = ($page - 1) * $per_page;
        
        $ledger = wecc_get_user_ledger($user_id, $per_page, $offset);
        $total_movements = $this->get_total_movements_count($user_id);
        $total_pages = ceil($total_movements / $per_page);
        
        echo '<div class="wecc-my-credit">';
        
        // Información del cliente (NUEVA SECCIÓN)
        $this->render_customer_info($user_id);
        
        // Resumen de crédito
        $this->render_credit_summary($balance);
        
        // Cargos pendientes detallados (ARRIBA) - Solo si hay cargos pendientes
        if (!empty($pending_charges)) {
            // Verificar si realmente hay cargos con monto pendiente
            $has_actual_pending = false;
            foreach ($pending_charges as $charge) {
                $remaining = $this->get_charge_remaining_amount($charge);
                if ($remaining > 0) {
                    $has_actual_pending = true;
                    break;
                }
            }
            
            // Solo mostrar si hay cargos con monto pendiente real
            if ($has_actual_pending) {
                $this->render_pending_charges($pending_charges, $balance);
            }
        }
        
        // Movimientos recientes (ABAJO)
        $this->render_recent_movements($ledger, $page, $total_pages);
        
        echo '</div>';
    }
    /**
     * Calcula información de días para vencimiento
     */
    private function calculate_days_info(?string $due_date): array {
        if (!$due_date) {
            return [
                'days_diff' => 0,
                'is_overdue' => false
            ];
        }
        
        $due_timestamp = strtotime($due_date);
        $current_timestamp = time();
        $diff_days = ceil(($due_timestamp - $current_timestamp) / (24 * 60 * 60));
        
        return [
            'days_diff' => abs($diff_days),
            'is_overdue' => $diff_days < 0
        ];
    }
    
    /**
     * Obtiene cargos pendientes
     */
    private function get_pending_charges(int $user_id): array {
        global $wpdb;
        
        $account = wecc_get_or_create_account($user_id);
        if (!$account) {
            return [];
        }
        
        return $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}wecc_ledger 
             WHERE account_id = %d AND type = 'charge'
             ORDER BY due_date ASC, created_at ASC",
            $account->id
        ), ARRAY_A);
    }
    
    /**
     * Obtiene el total de movimientos para paginación
     */
    private function get_total_movements_count(int $user_id): int {
        global $wpdb;
        
        $account = wecc_get_or_create_account($user_id);
        if (!$account) {
            return 0;
        }
        
        return (int) $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$wpdb->prefix}wecc_ledger 
             WHERE account_id = %d",
            $account->id
        ));
    }
    
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
        
        echo '<div class="wecc-info-grid">';
        
        // Nombre completo
        if ($full_name) {
            echo '<div class="wecc-info-item">';
            echo '<div class="wecc-info-label">Nombre:</div>';
            echo '<div class="wecc-info-value">' . esc_html($full_name) . '</div>';
            echo '</div>';
        }
        
        // Empresa (si existe)
        if ($billing_company) {
            echo '<div class="wecc-info-item">';
            echo '<div class="wecc-info-label">Empresa:</div>';
            echo '<div class="wecc-info-value">' . esc_html($billing_company) . '</div>';
            echo '</div>';
        }
        
        // Email
        echo '<div class="wecc-info-item">';
        echo '<div class="wecc-info-label">Email:</div>';
        echo '<div class="wecc-info-value">' . esc_html($user->user_email) . '</div>';
        echo '</div>';
        
        // Dirección completa
        if ($full_address) {
            echo '<div class="wecc-info-item">';
            echo '<div class="wecc-info-label">Dirección:</div>';
            echo '<div class="wecc-info-value">' . esc_html($full_address) . '</div>';
            echo '</div>';
        }
        
        // Número de cliente
        if ($profile && $profile->customer_number) {
            echo '<div class="wecc-info-item">';
            echo '<div class="wecc-info-label">Número de cliente:</div>';
            echo '<div class="wecc-info-value">' . esc_html($profile->customer_number) . '</div>';
            echo '</div>';
        }
        
        // Tipo de cliente (CORREGIDO)
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
            echo '<div class="wecc-info-label">Tipo de cliente:</div>';
            echo '<div class="wecc-info-value">';
            echo '<span class="wecc-customer-type wecc-type-' . esc_attr($profile->customer_type) . '">';
            echo esc_html($type_label);
            echo '</span>';
            echo '</div>';
            echo '</div>';
        }
        
        // Cliente desde
        if ($profile && $profile->customer_since) {
            echo '<div class="wecc-info-item">';
            echo '<div class="wecc-info-label">Cliente desde:</div>';
            echo '<div class="wecc-info-value">' . esc_html(date_i18n('j \\d\\e F, Y', strtotime($profile->customer_since))) . '</div>';
            echo '</div>';
        }
        
        // Términos de pago
        if ($account->payment_terms_days) {
            echo '<div class="wecc-info-item">';
            echo '<div class="wecc-info-label">Términos de pago:</div>';
            echo '<div class="wecc-info-value">' . esc_html($account->payment_terms_days) . ' días</div>';
            echo '</div>';
        }
        
        // RFC (si está disponible)
        if ($profile && $profile->rfc) {
            echo '<div class="wecc-info-item">';
            echo '<div class="wecc-info-label">RFC:</div>';
            echo '<div class="wecc-info-value">';
            echo '<code class="wecc-rfc">' . esc_html($profile->rfc) . '</code>';
            echo '</div>';
            echo '</div>';
        }
        
        // Notas de crédito (si las hay)
        if ($profile && $profile->credit_notes && trim($profile->credit_notes)) {
            echo '<div class="wecc-info-item wecc-info-notes">';
            echo '<div class="wecc-info-label">Notas:</div>';
            echo '<div class="wecc-info-value">';
            echo '<em>' . esc_html($profile->credit_notes) . '</em>';
            echo '</div>';
            echo '</div>';
        }
        
        echo '</div>'; // .wecc-info-grid
        
        // Link para editar información
        echo '<div class="wecc-edit-info-link">';
        echo '<a href="' . esc_url(wc_get_endpoint_url('edit-account', '', wc_get_page_permalink('myaccount'))) . '">';
        echo '✏️ Editar información de contacto y facturación';
        echo '</a>';
        echo '</div>';
        
        echo '</div>'; // .wecc-customer-info
    }
    
    /**
     * Renderiza el resumen de crédito
     */
    private function render_credit_summary(array $balance): void {
        $user_id = get_current_user_id();
        $account = wecc_get_or_create_account($user_id);
        $is_blocked = wecc_user_has_overdue_charges($user_id);
        $overdue_info = $is_blocked ? $this->get_overdue_info($user_id) : null;
        
        echo '<div class="wecc-credit-summary' . ($is_blocked ? ' wecc-blocked' : '') . '">';
        echo '<h3>' . __('Tu Crédito Disponible', 'wc-enhanced-customers-credit') . '</h3>';
        
        if ($is_blocked) {
            // Mostrar versión bloqueada con candado
            echo '<div class="wecc-blocked-info">';
            echo '<div class="wecc-block-icon">🔒</div>';
            echo '<div class="wecc-block-message">';
            echo '<h4>🚑 Tu crédito está temporalmente bloqueado</h4>';
            echo '<p>Tienes <strong>' . wc_price($overdue_info['amount']) . '</strong> en pagos vencidos desde hace <strong>' . $overdue_info['days'] . ' días</strong>.</p>';
            echo '<p class="wecc-action-required">Regulariza tu situación para reactivar tu crédito.</p>';
            echo '</div>';
            echo '</div>';
            
            // Mostrar información básica en gris
            echo '<div class="wecc-summary-cards wecc-disabled">';
        } else {
            // Mostrar versión normal
            echo '<div class="wecc-summary-cards">';
        }
        
        // Crédito disponible
        echo '<div class="wecc-summary-item">';
        echo '<div class="wecc-label">Crédito disponible:</div>';
        echo '<div class="wecc-value wecc-available">' . wc_price($balance['available_credit']) . '</div>';
        echo '</div>';
        
        // Límite total
        echo '<div class="wecc-summary-item">';
        echo '<div class="wecc-label">Límite total:</div>';
        echo '<div class="wecc-value">' . wc_price($balance['credit_limit']) . '</div>';
        echo '</div>';
        
        // Usado actualmente
        echo '<div class="wecc-summary-item">';
        echo '<div class="wecc-label">Usado actualmente:</div>';
        echo '<div class="wecc-value wecc-used">' . wc_price($balance['balance_used']) . '</div>';
        echo '</div>';
        
        echo '</div>'; // .wecc-summary-cards
        
        if ($is_blocked) {
            // Botón de acción para contactar o pagar
            echo '<div class="wecc-blocked-actions">';
            if ($balance['balance_used'] > 0) {
                echo '<a href="#wecc-pending-charges" class="wecc-btn wecc-btn-warning wecc-btn-large">';
                echo '💳 Pagar Adeudos (' . wc_price($balance['balance_used']) . ')';
                echo '</a>';
            }
            echo '<div class="wecc-contact-info">';
            echo '<small>¿Necesitas ayuda? Contacta al departamento de crédito</small>';
            echo '</div>';
            echo '</div>';
        } else if ($balance['balance_used'] > 0) {
            // Mostrar información de próximo vencimiento si no está bloqueado
            $next_due = $this->get_next_due_date($user_id);
            if ($next_due) {
                echo '<div class="wecc-next-due">';
                echo '<small>📅 Próximo vencimiento: ' . esc_html(date_i18n('j \d\e F, Y', strtotime($next_due))) . '</small>';
                echo '</div>';
            }
        }
        
        echo '</div>'; // .wecc-credit-summary
    }

    
    /**
     * Obtiene información detallada de adeudos vencidos (CORREGIDO - considera pagos)
     */
    private function get_overdue_info(int $user_id): array {
        global $wpdb;
        
        $overdue_data = $wpdb->get_row($wpdb->prepare(
            "SELECT 
                SUM(GREATEST(l.amount - COALESCE(payments.paid_amount, 0), 0)) as total_amount,
                MIN(l.due_date) as oldest_due_date,
                COUNT(CASE WHEN (l.amount - COALESCE(payments.paid_amount, 0)) > 0.01 THEN 1 END) as count
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
             AND (l.amount - COALESCE(payments.paid_amount, 0)) > 0.01",
            $user_id
        ));
        
        if (!$overdue_data || $overdue_data->total_amount <= 0) {
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
     * Obtiene la próxima fecha de vencimiento
     */
    private function get_next_due_date(int $user_id): ?string {
        global $wpdb;
        
        return $wpdb->get_var($wpdb->prepare(
            "SELECT l.due_date
             FROM {$wpdb->prefix}wecc_ledger l
             LEFT JOIN {$wpdb->prefix}wecc_credit_accounts a ON l.account_id = a.id
             WHERE a.user_id = %d 
             AND l.type = 'charge' 
             AND l.due_date >= NOW() 
             AND l.amount > 0
             ORDER BY l.due_date ASC
             LIMIT 1",
            $user_id
        ));
    }
    
    /**
     * Renderiza las acciones de pago
     */
    private function render_payment_actions(array $balance, array $pending_charges): void {
        echo '<div class="wecc-payment-actions">';
        echo '<h4>' . __('Opciones de Pago', 'wc-enhanced-customers-credit') . '</h4>';
        
        if ($balance['balance_used'] > 0) {
            $pay_all_url = wc_get_endpoint_url('mi-credito', '', wc_get_page_permalink('myaccount')) . '?wecc_pay_all=1&_wecc_nonce=' . wecc_create_nonce('pay_nonce');
            
            echo '<a href="' . esc_url($pay_all_url) . '" class="button button-primary wecc-pay-all">';
            echo sprintf(__('Pagar Todo (%s)', 'wc-enhanced-customers-credit'), wc_price($balance['balance_used']));
            echo '</a>';
        }
        
        echo '<p class="description">';
        echo __('Puedes pagar tu saldo pendiente usando cualquier método de pago disponible.', 'wc-enhanced-customers-credit');
        echo '</p>';
        
        echo '</div>';
    }
    
    /**
     * Renderiza movimientos recientes con paginación
     */
    private function render_recent_movements(array $ledger, int $current_page, int $total_pages): void {
        echo '<div class="wecc-recent-movements">';
        echo '<h3>' . __('Movimientos Recientes', 'wc-enhanced-customers-credit') . '</h3>';
        
        if (empty($ledger)) {
            echo '<p>' . __('No hay movimientos registrados.', 'wc-enhanced-customers-credit') . '</p>';
            echo '</div>';
            return;
        }
        
        echo '<table class="wecc-ledger-table">';
        echo '<thead>';
        echo '<tr>';
        echo '<th>' . __('Fecha', 'wc-enhanced-customers-credit') . '</th>';
        echo '<th>' . __('Descripción', 'wc-enhanced-customers-credit') . '</th>';
        echo '<th>' . __('Tipo', 'wc-enhanced-customers-credit') . '</th>';
        echo '<th>' . __('Monto', 'wc-enhanced-customers-credit') . '</th>';
        echo '<th>' . __('Estado', 'wc-enhanced-customers-credit') . '</th>';
        echo '</tr>';
        echo '</thead>';
        echo '<tbody>';
        
        foreach ($ledger as $entry) {
            $this->render_ledger_row($entry);
        }
        
        echo '</tbody>';
        echo '</table>';
        
        // Paginación
        if ($total_pages > 1) {
            $this->render_pagination($current_page, $total_pages);
        }
        
        echo '</div>';
    }
    
    /**
     * Renderiza una fila del ledger con símbolos (+/-) y mejores fechas
     */
    private function render_ledger_row(array $entry): void {
        $type_labels = [
            'charge' => __('Cargo', 'wc-enhanced-customers-credit'),
            'payment' => __('Pago', 'wc-enhanced-customers-credit'),
            'adjustment' => __('Ajuste', 'wc-enhanced-customers-credit'),
            'refund' => __('Reembolso', 'wc-enhanced-customers-credit')
        ];
        
        $amount_class = $entry['amount'] > 0 ? 'positive' : 'negative';
        $type_class = 'wecc-type-' . $entry['type'];
        
        // Símbolos para identificar tipo de movimiento
        $amount_symbol = $entry['amount'] > 0 ? '(-)' : '(+)';
        $amount_color = $entry['amount'] > 0 ? '#dc3545' : '#28a745';
        
        echo '<tr>';
        
        // Fecha - usar created_at que es el campo por el que ordenamos
        echo '<td>';
        echo esc_html(date_i18n('j M, Y', strtotime($entry['created_at'])));
        echo '<br><small>' . esc_html(date_i18n('g:i A', strtotime($entry['created_at']))) . '</small>';
        echo '</td>';
        
        // Descripción
        echo '<td>';
        echo esc_html($entry['description'] ?: $entry['notes'] ?: '-');
        if ($entry['order_id']) {
            echo '<br><small><a href="' . esc_url(wc_get_endpoint_url('view-order', $entry['order_id'], wc_get_page_permalink('myaccount'))) . '">';
            echo sprintf(__('Ver Orden #%d', 'wc-enhanced-customers-credit'), $entry['order_id']);
            echo '</a></small>';
        }
        echo '</td>';
        
        // Tipo
        echo '<td>';
        echo '<span class="' . esc_attr($type_class) . '">';
        echo esc_html($type_labels[$entry['type']] ?? $entry['type']);
        echo '</span>';
        echo '</td>';
        
        // Monto con símbolos
        echo '<td>';
        echo '<span class="amount ' . esc_attr($amount_class) . '" style="color: ' . $amount_color . ';">';
        echo '<strong>' . $amount_symbol . ' ' . wc_price(abs($entry['amount'])) . '</strong>';
        echo '</span>';
        echo '</td>';
        
        // Estado
        echo '<td>';
        if ($entry['type'] === 'charge') {
            $remaining = $this->get_charge_remaining_amount($entry);
            if ($remaining > 0) {
                echo '<span class="status pending">' . __('Pendiente', 'wc-enhanced-customers-credit') . '</span>';
                echo '<br><small>' . sprintf(__('Resta: %s', 'wc-enhanced-customers-credit'), wc_price($remaining)) . '</small>';
            } else {
                echo '<span class="status paid">' . __('Pagado', 'wc-enhanced-customers-credit') . '</span>';
            }
        } else {
            echo '<span class="status completed">' . __('Completado', 'wc-enhanced-customers-credit') . '</span>';
        }
        echo '</td>';
        
        echo '</tr>';
    }
    
    /**
     * Renderiza cargos pendientes con mejores opciones de pago
     */
    private function render_pending_charges(array $pending_charges, array $balance): void {
        echo '<div class="wecc-pending-charges">';
        echo '<h3>' . __('Adeudos Pendientes', 'wc-enhanced-customers-credit') . '</h3>';
        
        // Botón para pagar todo (mejorado)
        if ($balance['balance_used'] > 0) {
            echo '<div class="wecc-payment-actions">';
            echo '<div class="wecc-payment-summary">';
            echo '<div class="summary-text">';
            echo '<h4>' . __('Total Adeudo:', 'wc-enhanced-customers-credit') . ' <span class="total-amount">' . wc_price($balance['balance_used']) . '</span></h4>';
            echo '<p>' . __('Puedes pagar todo tu saldo pendiente con cualquier método de pago.', 'wc-enhanced-customers-credit') . '</p>';
            echo '</div>';
            echo '<div class="payment-button">';
            $pay_all_url = wc_get_endpoint_url('mi-credito', '', wc_get_page_permalink('myaccount')) . '?wecc_pay_all=1&_wecc_nonce=' . wecc_create_nonce('pay_nonce');
            echo '<a href="' . esc_url($pay_all_url) . '" class="wecc-btn wecc-btn-primary wecc-btn-large">';
            echo __('Pagar Todo', 'wc-enhanced-customers-credit');
            echo '</a>';
            echo '</div>';
            echo '</div>';
            echo '</div>';
        }
        
        echo '<div class="wecc-charges-list">';
        foreach ($pending_charges as $charge) {
            $remaining = $this->get_charge_remaining_amount($charge);
            if ($remaining <= 0) continue;
            
            // Calcular días restantes
            $days_info = $this->calculate_days_info($charge['due_date']);
            
            echo '<div class="wecc-charge-item' . ($days_info['is_overdue'] ? ' overdue' : '') . '">';
            
            // Info del cargo
            echo '<div class="charge-info">';
            echo '<div class="charge-title">';
            echo '<strong>' . esc_html($charge['description'] ?: sprintf(__('Cargo #%d', 'wc-enhanced-customers-credit'), $charge['id'])) . '</strong>';
            if ($charge['order_id']) {
                echo '<span class="order-link"> - <a href="' . esc_url(wc_get_endpoint_url('view-order', $charge['order_id'], wc_get_page_permalink('myaccount'))) . '">';
                echo sprintf(__('Orden #%d', 'wc-enhanced-customers-credit'), $charge['order_id']);
                echo '</a></span>';
            }
            echo '</div>';
            
            echo '<div class="charge-dates">';
            echo '<small class="created-date">' . __('Creado:', 'wc-enhanced-customers-credit') . ' ' . esc_html(date_i18n('j M, Y', strtotime($charge['created_at']))) . '</small>';
            if ($charge['due_date']) {
                echo '<br><small class="due-date ' . ($days_info['is_overdue'] ? 'overdue' : 'pending') . '">';
                if ($days_info['is_overdue']) {
                    echo '⚠️ ' . sprintf(__('Venció hace %d días', 'wc-enhanced-customers-credit'), $days_info['days_diff']);
                } else {
                    echo '📅 ' . sprintf(__('Vence en %d días', 'wc-enhanced-customers-credit'), $days_info['days_diff']);
                }
                echo ' (' . esc_html(date_i18n('j M, Y', strtotime($charge['due_date']))) . ')';
                echo '</small>';
            }
            echo '</div>';
            echo '</div>';
            
            // Monto pendiente
            echo '<div class="charge-amount">';
            echo '<span class="amount">' . wc_price($remaining) . '</span>';
            echo '</div>';
            
            // Acción de pago
            echo '<div class="charge-actions">';
            $pay_url = wc_get_endpoint_url('mi-credito', '', wc_get_page_permalink('myaccount')) . '?wecc_pay_charge=' . $charge['id'] . '&_wecc_nonce=' . wecc_create_nonce('pay_nonce');
            echo '<a href="' . esc_url($pay_url) . '" class="wecc-btn wecc-btn-secondary">';
            echo __('Pagar', 'wc-enhanced-customers-credit');
            echo '</a>';
            echo '</div>';
            
            echo '</div>'; // .wecc-charge-item
        }
        echo '</div>'; // .wecc-charges-list
        echo '</div>'; // .wecc-pending-charges
    }
    
    /**
     * Renderiza la paginación
     */
    private function render_pagination(int $current_page, int $total_pages): void {
        echo '<div class="wecc-pagination">';
        
        $base_url = wc_get_endpoint_url('mi-credito', '', wc_get_page_permalink('myaccount'));
        
        // Botón anterior
        if ($current_page > 1) {
            $prev_url = add_query_arg('movements_page', $current_page - 1, $base_url);
            echo '<a href="' . esc_url($prev_url) . '" class="wecc-pagination-btn">&laquo; Anterior</a>';
        }
        
        // Números de página
        $start = max(1, $current_page - 2);
        $end = min($total_pages, $current_page + 2);
        
        for ($i = $start; $i <= $end; $i++) {
            if ($i == $current_page) {
                echo '<span class="wecc-pagination-current">' . $i . '</span>';
            } else {
                $page_url = add_query_arg('movements_page', $i, $base_url);
                echo '<a href="' . esc_url($page_url) . '" class="wecc-pagination-btn">' . $i . '</a>';
            }
        }
        
        // Botón siguiente
        if ($current_page < $total_pages) {
            $next_url = add_query_arg('movements_page', $current_page + 1, $base_url);
            echo '<a href="' . esc_url($next_url) . '" class="wecc-pagination-btn">Siguiente &raquo;</a>';
        }
        
        echo '</div>';
    }
    
    /**
     * Calcula el monto restante de un cargo
     */
    private function get_charge_remaining_amount(array $charge): float {
        global $wpdb;
        
        $charge_amount = (float) $charge['amount'];
        
        // DEBUG TEMPORAL
        error_log("WECC DEBUG FRONTEND: === Calculando monto restante (frontend) ===");
        error_log("WECC DEBUG FRONTEND: Charge ID: {$charge['id']}");
        error_log("WECC DEBUG FRONTEND: Monto original: {$charge_amount}");
        error_log("WECC DEBUG FRONTEND: Order ID: {$charge['order_id']}");
        
        // Pagos aplicados a este cargo
        $paid_amount = (float) $wpdb->get_var($wpdb->prepare(
            "SELECT COALESCE(SUM(ABS(amount)), 0) FROM {$wpdb->prefix}wecc_ledger 
             WHERE type = 'payment' AND settles_ledger_id = %d",
            $charge['id']
        ));
        error_log("WECC DEBUG FRONTEND: Pagos aplicados: {$paid_amount}");
        
        // Ajustes del pedido relacionado
        $adjustments = 0;
        if ($charge['order_id']) {
            $adjustments = (float) $wpdb->get_var($wpdb->prepare(
                "SELECT COALESCE(SUM(amount), 0) FROM {$wpdb->prefix}wecc_ledger 
                 WHERE type = 'adjustment' AND order_id = %d",
                $charge['order_id']
            ));
            error_log("WECC DEBUG FRONTEND: Ajustes: {$adjustments}");
        }
        
        $remaining = max(0, $charge_amount + min(0, $adjustments) - $paid_amount);
        error_log("WECC DEBUG FRONTEND: Monto restante calculado: {$remaining}");
        error_log("WECC DEBUG FRONTEND: === Fin cálculo frontend ===");
        
        return $remaining;
    }
    
    /**
     * AJAX: Pagar cargo específico
     */
    public function ajax_pay_charge(): void {
        if (!wp_verify_nonce($_POST['nonce'] ?? '', 'wecc_my_credit_nonce')) {
            wp_send_json_error(__('Error de seguridad', 'wc-enhanced-customers-credit'));
        }
        
        if (!is_user_logged_in()) {
            wp_send_json_error(__('Debes estar logueado', 'wc-enhanced-customers-credit'));
        }
        
        $ledger_id = (int) ($_POST['ledger_id'] ?? 0);
        if (!$ledger_id) {
            wp_send_json_error(__('ID de cargo inválido', 'wc-enhanced-customers-credit'));
        }
        
        // Redirigir al flujo de pago
        $pay_url = wecc_get_payment_url('pay_charge', ['wecc_pay_charge' => $ledger_id]);
        wp_send_json_success(['redirect' => $pay_url]);
    }
    
    /**
     * AJAX: Pagar todo el saldo
     */
    public function ajax_pay_all(): void {
        if (!wp_verify_nonce($_POST['nonce'] ?? '', 'wecc_my_credit_nonce')) {
            wp_send_json_error(__('Error de seguridad', 'wc-enhanced-customers-credit'));
        }
        
        if (!is_user_logged_in()) {
            wp_send_json_error(__('Debes estar logueado', 'wc-enhanced-customers-credit'));
        }
        
        // Redirigir al flujo de pago
        $pay_url = wecc_get_payment_url('pay_all', ['wecc_pay_all' => '1']);
        wp_send_json_success(['redirect' => $pay_url]);
    }
}
