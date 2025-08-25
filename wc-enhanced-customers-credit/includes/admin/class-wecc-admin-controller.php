<?php
if (!defined('ABSPATH')) exit;

/**
 * WECC Admin Controller
 * 
 * Maneja la navegación admin con pestañas:
 * - Dashboard (resumen)
 * - Clientes (perfiles robustos)
 * - Cuentas (límites de crédito)
 * - Movimientos (ledger)
 * - Ajustes (configuración)
 */
class WECC_Admin_Controller {
    
    private $customer_service;
    private $balance_service;
    
    public function __construct() {
        // Inicializar más tarde para asegurar que los servicios estén listos
        add_action('init', [$this, 'init_dependencies'], 25);
        add_action('admin_menu', [$this, 'register_menu'], 60);
        add_action('admin_init', [$this, 'handle_form_submissions'], 30);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_assets']);
        
        // Hooks AJAX (importantes: deben estar en el constructor)
        add_action('wp_ajax_wecc_user_search', [$this, 'ajax_user_search']);
        add_action('wp_ajax_nopriv_wecc_user_search', [$this, 'ajax_user_search']); // Por si acaso
        
        // DEBUG: Los assets se manejan en WECC_Plugin, no aquí
        // add_action('admin_enqueue_scripts', [$this, 'enqueue_assets']);
    }
    
    public function init_dependencies(): void {
        if (function_exists('wecc_service')) {
            try {
                $this->customer_service = wecc_service('customer_service');
                $this->balance_service = wecc_service('balance_service');
            } catch (Exception $e) {
                wecc_log('Error inicializando servicios en admin: ' . $e->getMessage(), 'error');
            }
        }
        
        // Si aún no están disponibles, intentar después
        if (!$this->customer_service || !$this->balance_service) {
            add_action('admin_init', [$this, 'retry_init_dependencies'], 25);
        }
    }
    
    /**
     * Reintenta inicializar dependencias
     */
    public function retry_init_dependencies(): void {
        if (!$this->customer_service && function_exists('wecc_service')) {
            try {
                $this->customer_service = wecc_service('customer_service');
            } catch (Exception $e) {
                // Silenciar error en segundo intento
            }
        }
        
        if (!$this->balance_service && function_exists('wecc_service')) {
            try {
                $this->balance_service = wecc_service('balance_service');
            } catch (Exception $e) {
                // Silenciar error en segundo intento
            }
        }
    }
    
    /**
     * Registra el menú principal en WooCommerce
     */
    public function register_menu(): void {
        if (!current_user_can('manage_woocommerce')) return;
        
        add_submenu_page(
            'woocommerce',
            __('Crédito WECC', 'wc-enhanced-customers-credit'),
            __('Crédito', 'wc-enhanced-customers-credit'),
            'manage_woocommerce',
            'wecc-dashboard',
            [$this, 'render_admin_router']
        );
    }
    
    /**
     * Router principal con sistema de pestañas
     */
    public function render_admin_router(): void {
        $tab = $_GET['tab'] ?? 'dashboard';
        $action = $_GET['action'] ?? '';
        
        // Manejar acciones especiales antes de renderizar
        if ($action === 'download_template' && $tab === 'bulk') {
            $this->handle_download_template();
            return;
        }
        
        echo '<div class="wrap">';
        echo '<h1>' . __('Crédito WECC', 'wc-enhanced-customers-credit') . '</h1>';
        
        $this->render_tab_navigation($tab);
        
        // Mostrar notificaciones
        if (isset($_GET['message'])) {
            $this->show_admin_notice($_GET['message']);
        }
        
        // Renderizar contenido según pestaña
        switch ($tab) {
            case 'customers':
                $this->render_customers_tab($action);
                break;
            case 'credit':
                $this->render_credit_tab($action);
                break;
            case 'payments':
                $this->render_payments_tab($action);
                break;
            case 'bulk':
                $this->render_bulk_tab($action);
                break;
            case 'accounts':
                $this->render_accounts_tab($action);
                break;
            case 'ledger':
                $this->render_ledger_tab();
                break;
            case 'settings':
                $this->render_settings_tab();
                break;
            default:
                $this->render_dashboard_tab();
                break;
        }
        
        echo '</div>';
    }
    
    /**
     * Guarda el límite de crédito para un usuario
     */
    private function save_credit_limit(int $user_id, float $credit_limit): void {
        global $wpdb;
        
        $account = wecc_get_or_create_account($user_id);
        if (!$account) {
            throw new Exception(__('No se pudo crear la cuenta de crédito.', 'wc-enhanced-customers-credit'));
        }
        
        // Calcular nuevo crédito disponible
        $balance_used = (float) $account->balance_used;
        $available_credit = max(0, $credit_limit - $balance_used);
        
        // Datos a actualizar
        $update_data = [
            'credit_limit' => $credit_limit,
            'available_credit' => $available_credit,
            'updated_at' => current_time('mysql')
        ];
        $update_format = ['%f', '%f', '%s'];
        
        // Agregar días de crédito si se proporcionaron
        if (isset($_POST['payment_terms_days'])) {
            $payment_terms_days = max(1, min(365, (int) $_POST['payment_terms_days']));
            $update_data['payment_terms_days'] = $payment_terms_days;
            $update_format[] = '%d';
        }
        
        $result = $wpdb->update(
            $wpdb->prefix . 'wecc_credit_accounts',
            $update_data,
            ['user_id' => $user_id],
            $update_format,
            ['%d']
        );
        
        if ($result === false) {
            throw new Exception('Error actualizando límite de crédito: ' . $wpdb->last_error);
        }
        
        // Log del cambio
        wecc_log("Límite de crédito actualizado para usuario {$user_id}: {$credit_limit}", 'info');
        
        // Disparar evento
        do_action('wecc_credit_limit_updated', $user_id, $credit_limit, $available_credit);
    }
    
    /**
     * Procesa un pago manual registrado por el admin
     */
    private function process_manual_payment(int $user_id): void {
        if (!isset($_POST['manual_payment_amount']) || empty($_POST['manual_payment_amount'])) {
            return;
        }
        
        $amount = (float) $_POST['manual_payment_amount'];
        $notes = sanitize_textarea_field($_POST['manual_payment_notes'] ?? '');
        
        if ($amount <= 0) {
            throw new Exception(__('El monto del pago debe ser mayor a cero.', 'wc-enhanced-customers-credit'));
        }
        
        $account = wecc_get_or_create_account($user_id);
        if (!$account) {
            throw new Exception(__('No se pudo encontrar la cuenta de crédito.', 'wc-enhanced-customers-credit'));
        }
        
        // Verificar que no exceda el saldo pendiente
        $balance = wecc_get_user_balance($user_id);
        if ($amount > $balance['balance_used']) {
            throw new Exception(sprintf(
                __('El monto no puede exceder el saldo pendiente (%s).', 'wc-enhanced-customers-credit'),
                wc_price($balance['balance_used'])
            ));
        }
        
        global $wpdb;
        
        // Crear entrada de pago en el ledger
        $result = $wpdb->insert(
            $wpdb->prefix . 'wecc_ledger',
            [
                'account_id' => $account->id,
                'user_id' => $user_id,
                'type' => 'payment',
                'amount' => -abs($amount), // Negativo para pago
                'description' => __('Pago manual registrado por admin', 'wc-enhanced-customers-credit'),
                'notes' => $notes,
                'transaction_date' => current_time('mysql'),
                'metadata' => wp_json_encode([
                    'payment_method' => 'manual',
                    'registered_by' => get_current_user_id(),
                    'admin_notes' => $notes
                ]),
                'created_at' => current_time('mysql'),
                'created_by' => get_current_user_id()
            ],
            ['%d', '%d', '%s', '%f', '%s', '%s', '%s', '%s', '%s', '%d']
        );
        
        if ($result === false) {
            throw new Exception('Error registrando pago manual: ' . $wpdb->last_error);
        }
        
        $payment_id = $wpdb->insert_id;
        
        // Aplicar el pago usando FIFO
        if (function_exists('wecc_service')) {
            $balance_service = wecc_service('balance_service');
            $balance_service->allocate_general_payment($account->id, $amount, null, $notes);
        } else {
            // Fallback: actualizar balance directamente
            $this->update_account_balance_simple($account->id);
        }
        
        // Log del evento
        wecc_log("Pago manual registrado para usuario {$user_id}: {$amount} por admin " . get_current_user_id(), 'info');
        
        // Disparar evento
        do_action('wecc_manual_payment_registered', $user_id, $amount, $payment_id, $notes);
    }
    
    /**
     * Actualiza balance de cuenta (fallback simple)
     */
    private function update_account_balance_simple(int $account_id): void {
        global $wpdb;
        
        // Calcular balance usado
        $total_charges = (float) $wpdb->get_var($wpdb->prepare(
            "SELECT COALESCE(SUM(amount), 0) FROM {$wpdb->prefix}wecc_ledger 
             WHERE account_id = %d AND type IN ('charge', 'adjustment') AND amount > 0",
            $account_id
        ));
        
        $total_payments = (float) $wpdb->get_var($wpdb->prepare(
            "SELECT COALESCE(SUM(ABS(amount)), 0) FROM {$wpdb->prefix}wecc_ledger 
             WHERE account_id = %d AND type IN ('payment', 'refund') AND amount < 0",
            $account_id
        ));
        
        $balance_used = max(0, $total_charges - $total_payments);
        
        // Obtener límite actual
        $account = $wpdb->get_row($wpdb->prepare(
            "SELECT credit_limit FROM {$wpdb->prefix}wecc_credit_accounts WHERE id = %d",
            $account_id
        ));
        
        $available_credit = max(0, (float) $account->credit_limit - $balance_used);
        
        // Actualizar
        $wpdb->update(
            $wpdb->prefix . 'wecc_credit_accounts',
            [
                'balance_used' => $balance_used,
                'current_balance' => $balance_used,
                'available_credit' => $available_credit,
                'last_activity_at' => current_time('mysql'),
                'updated_at' => current_time('mysql')
            ],
            ['id' => $account_id],
            ['%f', '%f', '%f', '%s', '%s'],
            ['%d']
        );
    }
    
    /**
     * Navegación por pestañas
     */
    private function render_tab_navigation(string $current_tab): void {
        $tabs = [
            'dashboard' => __('Dashboard', 'wc-enhanced-customers-credit'),
            'customers' => __('Clientes', 'wc-enhanced-customers-credit'),
            'credit' => __('Configurar Crédito', 'wc-enhanced-customers-credit'),
            'payments' => __('Pagos Externos', 'wc-enhanced-customers-credit'),
            'bulk' => __('Carga Masiva', 'wc-enhanced-customers-credit'),
            'accounts' => __('Cuentas Crédito', 'wc-enhanced-customers-credit'),
            'ledger' => __('Movimientos', 'wc-enhanced-customers-credit'),
            'settings' => __('Ajustes', 'wc-enhanced-customers-credit')
        ];
        
        echo '<h2 class="nav-tab-wrapper">';
        foreach ($tabs as $tab_key => $tab_label) {
            $url = admin_url("admin.php?page=wecc-dashboard&tab={$tab_key}");
            $active = $current_tab === $tab_key ? 'nav-tab-active' : '';
            echo "<a href='{$url}' class='nav-tab {$active}'>{$tab_label}</a>";
        }
        echo '</h2>';
    }
    
    /**
     * Dashboard con resumen general
     */
    private function render_dashboard_tab(): void {
        $stats = $this->get_dashboard_stats();
        
        echo '<div class="wecc-dashboard">';
        echo '<div class="wecc-stats-cards">';
        
        // Cards de estadísticas
        $this->render_stat_card('Clientes Totales', $stats['total_customers'], 'users');
        $this->render_stat_card('Cuentas Activas', $stats['active_accounts'], 'credit-card');
        $this->render_stat_card('Saldo Total Usado', wc_price($stats['total_balance_used']), 'money');
        $this->render_stat_card('Límite Total', wc_price($stats['total_credit_limit']), 'chart-line');
        
        echo '</div>';
        
        // Actividad reciente
        echo '<div class="wecc-recent-activity">';
        echo '<h3>' . __('Actividad Reciente', 'wc-enhanced-customers-credit') . '</h3>';
        $this->render_recent_activity($stats['recent_movements']);
        echo '</div>';
        
        // Alertas
        if (!empty($stats['overdue_accounts'])) {
            echo '<div class="wecc-alerts">';
            echo '<h3>' . __('⚠️ Cuentas Vencidas', 'wc-enhanced-customers-credit') . '</h3>';
            $this->render_overdue_alerts($stats['overdue_accounts']);
            echo '</div>';
        }
        
        echo '</div>';
    }
    
    /**
     * Tab de gestión de clientes
     */
    private function render_customers_tab(string $action): void {
        if ($action === 'edit') {
            $this->render_customer_edit_form();
        } else {
            $this->render_customers_list();
        }
    }
    
    /**
     * Lista de clientes con búsqueda
     */
    private function render_customers_list(): void {
        // Verificar que el servicio esté disponible
        if (!$this->customer_service) {
            echo '<div class="notice notice-error"><p>' . __('Error: Servicio de clientes no disponible. Recarga la página.', 'wc-enhanced-customers-credit') . '</p></div>';
            return;
        }
        
        $search = $_GET['s'] ?? '';
        $page = max(1, (int) ($_GET['paged'] ?? 1));
        
        $results = $this->customer_service->search_customers(['search' => $search], $page, 20);
        
        echo '<div class="wecc-customers-list">';
        
        // Buscador
        echo '<form method="get" class="wecc-search-form">';
        echo '<input type="hidden" name="page" value="wecc-dashboard">';
        echo '<input type="hidden" name="tab" value="customers">';
        echo '<p class="search-box">';
        echo '<input type="search" name="s" value="' . esc_attr($search) . '" placeholder="' . __('Buscar clientes...', 'wc-enhanced-customers-credit') . '">';
        submit_button(__('Buscar', 'wc-enhanced-customers-credit'), 'secondary', false, false);
        echo '</p>';
        echo '</form>';
        
        // Tabla de clientes
        echo '<table class="wp-list-table widefat fixed striped">';
        echo '<thead>';
        echo '<tr>';
        echo '<th>' . __('Cliente', 'wc-enhanced-customers-credit') . '</th>';
        echo '<th>' . __('Email', 'wc-enhanced-customers-credit') . '</th>';
        echo '<th>' . __('RFC', 'wc-enhanced-customers-credit') . '</th>';
        echo '<th>' . __('Estado', 'wc-enhanced-customers-credit') . '</th>';
        echo '<th>' . __('Tipo', 'wc-enhanced-customers-credit') . '</th>';
        echo '<th>' . __('Acciones', 'wc-enhanced-customers-credit') . '</th>';
        echo '</tr>';
        echo '</thead>';
        echo '<tbody>';
        
        if (!empty($results['profiles'])) {
            foreach ($results['profiles'] as $profile) {
                $user = get_user_by('id', $profile['user_id']);
                $edit_url = admin_url("admin.php?page=wecc-dashboard&tab=customers&action=edit&user_id={$profile['user_id']}");
                
                echo '<tr>';
                echo '<td><strong>' . esc_html($profile['full_name']) . '</strong><br><small>ID: ' . $profile['user_id'] . '</small></td>';
                echo '<td>' . esc_html($user ? $user->user_email : '-') . '</td>';
                echo '<td>' . esc_html($profile['rfc'] ?: '-') . '</td>';
                echo '<td>' . esc_html($profile['state3'] ?: '-') . '</td>';
                echo '<td>' . esc_html($profile['type'] ?: '-') . '</td>';
                echo '<td>';
                echo '<a href="' . esc_url($edit_url) . '" class="button">' . __('Editar', 'wc-enhanced-customers-credit') . '</a>';
                echo '</td>';
                echo '</tr>';
            }
        } else {
            echo '<tr><td colspan="6">' . __('No se encontraron clientes.', 'wc-enhanced-customers-credit') . '</td></tr>';
        }
        
        echo '</tbody>';
        echo '</table>';
        
        // Paginación
        if ($results['pages'] > 1) {
            echo '<div class="tablenav"><div class="tablenav-pages">';
            for ($i = 1; $i <= $results['pages']; $i++) {
                $url = add_query_arg(['page' => 'wecc-dashboard', 'tab' => 'customers', 'paged' => $i, 's' => $search], admin_url('admin.php'));
                $class = $i === $page ? ' current' : '';
                echo '<a href="' . esc_url($url) . '" class="page-numbers' . $class . '">' . $i . '</a> ';
            }
            echo '</div></div>';
        }
        
        // Botón crear
        $create_url = admin_url('admin.php?page=wecc-dashboard&tab=customers&action=edit');
        echo '<p><a href="' . esc_url($create_url) . '" class="button button-primary">' . __('Nuevo Cliente', 'wc-enhanced-customers-credit') . '</a></p>';
        echo '</div>';
    }
    
    /**
     * Formulario de edición de cliente
     */
    private function render_customer_edit_form(): void {
        // Verificar que el servicio esté disponible
        if (!$this->customer_service) {
            echo '<div class="notice notice-error"><p>' . __('Error: Servicio de clientes no disponible. Recarga la página.', 'wc-enhanced-customers-credit') . '</p></div>';
            return;
        }
        
        $user_id = (int) ($_GET['user_id'] ?? 0);
        $profile = $user_id ? $this->customer_service->get_profile_by_user($user_id) : null;
        $user = $user_id ? get_user_by('id', $user_id) : null;
        
        echo '<div class="wecc-customer-edit">';
        echo '<h3>' . ($profile ? __('Editar Cliente', 'wc-enhanced-customers-credit') : __('Nuevo Cliente', 'wc-enhanced-customers-credit')) . '</h3>';
        
        echo '<form method="post">';
        wp_nonce_field('wecc_save_customer', 'wecc_customer_nonce');
        
        // Asegurar que wecc-admin y wecc_admin JS están disponibles
        wp_enqueue_script('wecc-admin');
        wp_localize_script('jquery', 'wecc_admin', [
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('wecc_admin_nonce'),
            'i18n' => [
                'confirm_delete' => __('¿Estás seguro de eliminar este elemento?', 'wc-enhanced-customers-credit'),
                'loading' => __('Cargando...', 'wc-enhanced-customers-credit'),
                'error' => __('Error al procesar la solicitud', 'wc-enhanced-customers-credit'),
            ]
        ]);
        
        echo '<table class="form-table">';
        
        // Selector de usuario (solo para nuevo)
        if (!$user_id) {
            echo '<tr>';
            echo '<th><label for="wecc_user_search">' . __('Usuario', 'wc-enhanced-customers-credit') . '</label></th>';
            echo '<td>';
            echo '<input type="hidden" name="user_id" id="wecc_user_id" value="">';
            echo '<input type="text" name="user_search" id="wecc_user_search" class="regular-text" placeholder="' . __('Buscar usuario por email...', 'wc-enhanced-customers-credit') . '" autocomplete="off">';
            echo '<p class="description">' . __('Escribe para buscar usuarios existentes o crear uno nuevo.', 'wc-enhanced-customers-credit') . '</p>';
            echo '</td>';
            echo '</tr>';
        } else {
            echo '<input type="hidden" name="user_id" value="' . $user_id . '">';
            echo '<tr>';
            echo '<th>' . __('Usuario', 'wc-enhanced-customers-credit') . '</th>';
            echo '<td><strong>' . esc_html($user->display_name) . '</strong> (' . esc_html($user->user_email) . ')</td>';
            echo '</tr>';
        }
        
        // Campos del perfil
        $fields = $this->customer_service->get_field_definitions();
        foreach ($fields as $field_key => $field_config) {
            $value = $profile ? ($profile[$field_key] ?? '') : '';
            
            echo '<tr>';
            echo '<th><label for="' . esc_attr($field_key) . '">' . esc_html($field_config['label']) . '</label></th>';
            echo '<td>';
            
            $this->render_form_field($field_key, $field_config, $value);
            
            if (!empty($field_config['description'])) {
                echo '<p class="description">' . esc_html($field_config['description']) . '</p>';
            }
            echo '</td>';
            echo '</tr>';
        }
        
        // Sección de crédito si es usuario existente
        if ($user_id) {
            echo '<tr><td colspan="2"><hr><h3>' . __('Configuración de Crédito', 'wc-enhanced-customers-credit') . '</h3></td></tr>';
            
            $account = wecc_get_or_create_account($user_id);
            $balance = wecc_get_user_balance($user_id);
            
            echo '<tr>';
            echo '<th><label for="credit_limit">' . __('Límite de Crédito', 'wc-enhanced-customers-credit') . '</label></th>';
            echo '<td>';
            echo '<input type="number" name="credit_limit" id="credit_limit" value="' . esc_attr($account->credit_limit) . '" class="regular-text" step="0.01" min="0">';
            echo '<p class="description">' . __('Límite máximo de crédito para este cliente.', 'wc-enhanced-customers-credit') . '</p>';
            echo '</td>';
            echo '</tr>';
            
            echo '<tr>';
            echo '<th><label for="payment_terms_days">' . __('Días de Crédito', 'wc-enhanced-customers-credit') . '</label></th>';
            echo '<td>';
            echo '<input type="number" name="payment_terms_days" id="payment_terms_days" value="' . esc_attr($account->payment_terms_days ?: 30) . '" class="small-text" min="1" max="365">';
            echo '<p class="description">' . __('Número de días para pagar (ej: 5, 15, 30).', 'wc-enhanced-customers-credit') . '</p>';
            echo '</td>';
            echo '</tr>';
            
            echo '<tr>';
            echo '<th>' . __('Estado Actual', 'wc-enhanced-customers-credit') . '</th>';
            echo '<td>';
            echo '<strong>' . __('Usado:', 'wc-enhanced-customers-credit') . '</strong> ' . wc_price($balance['balance_used']) . '<br>';
            echo '<strong>' . __('Disponible:', 'wc-enhanced-customers-credit') . '</strong> ' . wc_price($balance['available_credit']) . '<br>';
            echo '<strong>' . __('Estado:', 'wc-enhanced-customers-credit') . '</strong> ' . esc_html($account->status);
            echo '</td>';
            echo '</tr>';
            
            // Sección de pago manual
            if ($balance['balance_used'] > 0) {
                echo '<tr><td colspan="2"><hr><h4>' . __('Registrar Pago Manual', 'wc-enhanced-customers-credit') . '</h4></td></tr>';
                
                echo '<tr>';
                echo '<th><label for="manual_payment_amount">' . __('Monto del Pago', 'wc-enhanced-customers-credit') . '</label></th>';
                echo '<td>';
                echo '<input type="number" name="manual_payment_amount" id="manual_payment_amount" value="" class="regular-text" step="0.01" min="0.01" max="' . esc_attr($balance['balance_used']) . '">';
                echo '<p class="description">' . sprintf(__('Máximo: %s (saldo actual)', 'wc-enhanced-customers-credit'), wc_price($balance['balance_used'])) . '</p>';
                echo '</td>';
                echo '</tr>';
                
                echo '<tr>';
                echo '<th><label for="manual_payment_notes">' . __('Notas del Pago', 'wc-enhanced-customers-credit') . '</label></th>';
                echo '<td>';
                echo '<textarea name="manual_payment_notes" id="manual_payment_notes" class="large-text" rows="3" placeholder="Ej: Pago en efectivo, transferencia bancaria, etc."></textarea>';
                echo '</td>';
                echo '</tr>';
                
                echo '<tr>';
                echo '<th></th>';
                echo '<td>';
                echo '<label><input type="checkbox" name="register_manual_payment" value="1"> ' . __('Registrar este pago manual', 'wc-enhanced-customers-credit') . '</label>';
                echo '</td>';
                echo '</tr>';
            }
        }
        
        echo '</table>';
        
        echo '<input type="hidden" name="wecc_action" value="save_customer">';
        submit_button(__('Guardar Cliente', 'wc-enhanced-customers-credit'));
        
        $back_url = admin_url('admin.php?page=wecc-dashboard&tab=customers');
        echo '<a href="' . esc_url($back_url) . '" class="button">' . __('Volver', 'wc-enhanced-customers-credit') . '</a>';
        
        echo '</form>';
        echo '</div>';
    }
    
    /**
     * Renderiza un campo de formulario según su tipo
     */
    private function render_form_field(string $field_key, array $field_config, $value): void {
        $field_name = esc_attr($field_key);
        $field_id = esc_attr($field_key);
        $field_value = esc_attr($value);
        
        switch ($field_config['type']) {
            case 'select':
                echo '<select name="' . $field_name . '" id="' . $field_id . '">';
                echo '<option value="">' . __('Seleccionar...', 'wc-enhanced-customers-credit') . '</option>';
                foreach ($field_config['options'] as $option_value => $option_label) {
                    $selected = selected($value, $option_value, false);
                    echo '<option value="' . esc_attr($option_value) . '" ' . $selected . '>' . esc_html($option_label) . '</option>';
                }
                echo '</select>';
                break;
            case 'user_select':
                echo '<select name="' . $field_name . '" id="' . $field_id . '">';
                echo '<option value="">' . __('Sin asignar', 'wc-enhanced-customers-credit') . '</option>';
                $users = get_users(['role' => $field_config['role'] ?? 'shop_manager']);
                foreach ($users as $user) {
                    $selected = selected($value, $user->ID, false);
                    echo '<option value="' . esc_attr($user->ID) . '" ' . $selected . '>' . esc_html($user->display_name) . '</option>';
                }
                echo '</select>';
                break;
            case 'tel':
                echo '<input type="tel" name="' . $field_name . '" id="' . $field_id . '" value="' . $field_value . '" class="regular-text"';
                if (!empty($field_config['placeholder'])) {
                    echo ' placeholder="' . esc_attr($field_config['placeholder']) . '"';
                }
                echo '>';
                break;
            default: // text
                // For specific keys, add explicit name attributes as requested
                $explicit_names = [
                    'full_name', 'street', 'colonia', 'city', 'state3', 'zip', 'rfc', 'regfiscal', 'phone', 'type', 'flete', 'seller'
                ];
                if (in_array($field_key, $explicit_names, true)) {
                    echo '<input type="text" name="' . esc_attr($field_key) . '" id="' . $field_id . '" value="' . $field_value . '" class="regular-text"';
                } else {
                    echo '<input type="text" name="' . $field_name . '" id="' . $field_id . '" value="' . $field_value . '" class="regular-text"';
                }
                if (!empty($field_config['placeholder'])) {
                    echo ' placeholder="' . esc_attr($field_config['placeholder']) . '"';
                }
                if (!empty($field_config['pattern'])) {
                    echo ' pattern="' . esc_attr($field_config['pattern']) . '"';
                }
                if (!empty($field_config['max_length'])) {
                    echo ' maxlength="' . esc_attr($field_config['max_length']) . '"';
                }
                if ($field_key === 'full_name') {
                    echo ' required';
                }
                echo '>';
                break;
        }
    }
    
    /**
     * Obtiene estadísticas para el dashboard
     */
    private function get_dashboard_stats(): array {
        global $wpdb;
        
        $stats = [];
        
        // Clientes totales
        $stats['total_customers'] = (int) $wpdb->get_var(
            "SELECT COUNT(*) FROM {$wpdb->prefix}wecc_customer_profiles"
        );
        
        // Cuentas activas
        $stats['active_accounts'] = (int) $wpdb->get_var(
            "SELECT COUNT(*) FROM {$wpdb->prefix}wecc_credit_accounts WHERE status = 'active'"
        );
        
        // Saldo total usado y límite total
        $balances = $wpdb->get_row(
            "SELECT SUM(balance_used) as total_used, SUM(credit_limit) as total_limit 
             FROM {$wpdb->prefix}wecc_credit_accounts WHERE status = 'active'",
            ARRAY_A
        );
        
        $stats['total_balance_used'] = (float) ($balances['total_used'] ?? 0);
        $stats['total_credit_limit'] = (float) ($balances['total_limit'] ?? 0);
        
        // Movimientos recientes
        $stats['recent_movements'] = $wpdb->get_results(
            "SELECT l.*, p.full_name, u.user_email 
             FROM {$wpdb->prefix}wecc_ledger l
             LEFT JOIN {$wpdb->prefix}wecc_credit_accounts a ON l.account_id = a.id
             LEFT JOIN {$wpdb->prefix}wecc_customer_profiles p ON a.user_id = p.user_id
             LEFT JOIN {$wpdb->prefix}users u ON a.user_id = u.ID
             ORDER BY l.transaction_date DESC 
             LIMIT 10",
            ARRAY_A
        );
        
        // Cuentas vencidas
        $stats['overdue_accounts'] = $wpdb->get_results(
            "SELECT l.*, p.full_name, u.user_email, a.balance_used
             FROM {$wpdb->prefix}wecc_ledger l
             LEFT JOIN {$wpdb->prefix}wecc_credit_accounts a ON l.account_id = a.id
             LEFT JOIN {$wpdb->prefix}wecc_customer_profiles p ON a.user_id = p.user_id
             LEFT JOIN {$wpdb->prefix}users u ON a.user_id = u.ID
             WHERE l.type = 'charge' AND l.due_date < NOW() AND a.balance_used > 0
             GROUP BY a.id
             ORDER BY l.due_date ASC",
            ARRAY_A
        );
        
        return $stats;
    }
    
    /**
     * Renderiza una card de estadística
     */
    private function render_stat_card(string $title, $value, string $icon): void {
        echo '<div class="wecc-stat-card">';
        echo '<div class="wecc-stat-icon dashicons dashicons-' . esc_attr($icon) . '"></div>';
        echo '<div class="wecc-stat-content">';
        echo '<h4>' . esc_html($title) . '</h4>';
        echo '<div class="wecc-stat-value">' . $value . '</div>';
        echo '</div>';
        echo '</div>';
    }
    
    /**
     * Renderiza actividad reciente
     */
    private function render_recent_activity(array $movements): void {
        if (empty($movements)) {
            echo '<p>' . __('No hay actividad reciente.', 'wc-enhanced-customers-credit') . '</p>';
            return;
        }
        
        echo '<table class="wp-list-table widefat fixed striped">';
        echo '<thead>';
        echo '<tr>';
        echo '<th>' . __('Cliente', 'wc-enhanced-customers-credit') . '</th>';
        echo '<th>' . __('Tipo', 'wc-enhanced-customers-credit') . '</th>';
        echo '<th>' . __('Monto', 'wc-enhanced-customers-credit') . '</th>';
        echo '<th>' . __('Fecha', 'wc-enhanced-customers-credit') . '</th>';
        echo '</tr>';
        echo '</thead>';
        echo '<tbody>';
        
        foreach ($movements as $movement) {
            $type_labels = [
                'charge' => __('Cargo', 'wc-enhanced-customers-credit'),
                'payment' => __('Pago', 'wc-enhanced-customers-credit'),
                'adjustment' => __('Ajuste', 'wc-enhanced-customers-credit'),
                'refund' => __('Reembolso', 'wc-enhanced-customers-credit')
            ];
            
            $type_class = 'wecc-type-' . $movement['type'];
            $amount_class = $movement['amount'] > 0 ? 'wecc-positive' : 'wecc-negative';
            
            echo '<tr>';
            echo '<td>' . esc_html($movement['full_name'] ?: $movement['user_email'] ?: 'Usuario #' . $movement['user_id']) . '</td>';
            echo '<td><span class="' . esc_attr($type_class) . '">' . esc_html($type_labels[$movement['type']] ?? $movement['type']) . '</span></td>';
            echo '<td><span class="' . esc_attr($amount_class) . '">' . wc_price($movement['amount']) . '</span></td>';
            echo '<td>' . esc_html(date_i18n(get_option('date_format') . ' ' . get_option('time_format'), strtotime($movement['transaction_date']))) . '</td>';
            echo '</tr>';
        }
        
        echo '</tbody>';
        echo '</table>';
    }
    
    /**
     * Renderiza alertas de cuentas vencidas
     */
    private function render_overdue_alerts(array $accounts): void {
        if (empty($accounts)) {
            return;
        }
        
        echo '<div class="wecc-overdue-list">';
        foreach ($accounts as $account) {
            echo '<div class="wecc-overdue-item">';
            echo '<strong>' . esc_html($account['full_name'] ?: $account['user_email']) . '</strong> - ';
            echo wc_price($account['balance_used']) . ' vencido desde ' . esc_html(date_i18n(get_option('date_format'), strtotime($account['due_date'])));
            echo '</div>';
        }
        echo '</div>';
    }
    
    /**
     * Muestra notificación admin
     */
    private function show_admin_notice(string $message): void {
        $notices = [
            'customer_saved' => ['success', __('Cliente guardado correctamente.', 'wc-enhanced-customers-credit')],
            'customer_deleted' => ['success', __('Cliente eliminado correctamente.', 'wc-enhanced-customers-credit')],
            'error_saving' => ['error', __('Error al guardar. Revisa los datos.', 'wc-enhanced-customers-credit')],
            'error_permissions' => ['error', __('No tienes permisos para esta acción.', 'wc-enhanced-customers-credit')]
        ];
        
        if (isset($notices[$message])) {
            [$type, $text] = $notices[$message];
            echo '<div class="notice notice-' . esc_attr($type) . ' is-dismissible"><p>' . esc_html($text) . '</p></div>';
        }
    }
    
    /**
     * Maneja envíos de formularios
     */
    public function handle_form_submissions(): void {
        error_log('WECC Form Handler: Método ejecutado');
        error_log('WECC Form Handler: POST data = ' . print_r($_POST, true));
        
        if (!isset($_POST['wecc_action']) || !current_user_can('manage_woocommerce')) {
            error_log('WECC Form Handler: No hay acción o sin permisos');
            return;
        }
        
        $action = $_POST['wecc_action'];
        error_log('WECC Form Handler: Acción = ' . $action);
        
        switch ($action) {
            case 'save_customer':
                error_log('WECC Form Handler: Ejecutando save_customer');
                $this->handle_save_customer();
                break;
            case 'bulk_import':
                error_log('WECC Form Handler: Ejecutando bulk_import');
                $this->handle_bulk_import();
                break;
            case 'bulk_export':
                error_log('WECC Form Handler: Ejecutando bulk_export');
                $this->handle_bulk_export();
                break;
            default:
                error_log('WECC Form Handler: Acción no reconocida: ' . $action);
                break;
        }
    }
    
    /**
     * Maneja guardado de cliente
     */
    private function handle_save_customer(): void {
        error_log('WECC Save Customer: Iniciando guardado');
        
        if (!wp_verify_nonce($_POST['wecc_customer_nonce'] ?? '', 'wecc_save_customer')) {
            error_log('WECC Save Customer: Nonce inválido');
            wp_redirect(add_query_arg('message', 'error_permissions', wp_get_referer()));
            exit;
        }
        
        // Verificar que el servicio esté disponible
        if (!$this->customer_service) {
            error_log('WECC Save Customer: Servicio no disponible');
            wp_redirect(add_query_arg('message', 'error_saving', wp_get_referer()));
            exit;
        }
        
        $user_id = (int) ($_POST['user_id'] ?? 0);
        error_log('WECC Save Customer: User ID = ' . $user_id);
        
        if (!$user_id) {
            error_log('WECC Save Customer: User ID inválido');
            wp_redirect(add_query_arg('message', 'error_saving', wp_get_referer()));
            exit;
        }
        
        // Validar campo Nombre completo
        $full_name = trim($_POST['full_name'] ?? '');
        if (empty($full_name)) {
            error_log('WECC Save Customer: Error: Datos inválidos: El campo Nombre completo es requerido');
            wp_redirect(admin_url('admin.php?page=wecc-dashboard&tab=customers&action=edit&error=' . urlencode('El campo Nombre completo es requerido')));
            exit;
        }

        try {
            error_log('WECC Save Customer: Guardando perfil');
            $this->customer_service->save_profile($user_id, $_POST);
            
            // Guardar límite de crédito si se proporcionó
            if (isset($_POST['credit_limit'])) {
                $credit_limit = (float) $_POST['credit_limit'];
                error_log('WECC Save Customer: Guardando límite de crédito: ' . $credit_limit);
                $this->save_credit_limit($user_id, $credit_limit);
            }
            
            // Procesar pago manual si se solicitó
            if (isset($_POST['register_manual_payment']) && $_POST['register_manual_payment'] === '1') {
                error_log('WECC Save Customer: Procesando pago manual');
                $this->process_manual_payment($user_id);
            }
            
            error_log('WECC Save Customer: Guardado exitoso, redirigiendo');
            $redirect_url = admin_url('admin.php?page=wecc-dashboard&tab=customers&message=customer_saved');
            wp_redirect($redirect_url);
            exit;
            
        } catch (Exception $e) {
            error_log('WECC Save Customer: Error: ' . $e->getMessage());
            wecc_log('Error saving customer: ' . $e->getMessage(), 'error');
            wp_redirect(add_query_arg('message', 'error_saving', wp_get_referer()));
            exit;
        }
    }
    
    /**
     * AJAX: Búsqueda de usuarios
     */
    public function ajax_user_search(): void {
        // Debug logging
        error_log('WECC AJAX: Método ejecutado');
        error_log('WECC AJAX: REQUEST_METHOD = ' . $_SERVER['REQUEST_METHOD']);
        error_log('WECC AJAX: POST data = ' . print_r($_POST, true));
        error_log('WECC AJAX: GET data = ' . print_r($_GET, true));
        
        // Verificar permisos básicos
        if (!current_user_can('manage_woocommerce')) {
            error_log('WECC AJAX: Sin permisos');
            wp_send_json_error('Sin permisos');
        }
        
        // Obtener datos (compatible con GET y POST)
        $search = sanitize_text_field($_POST['term'] ?? $_GET['term'] ?? '');
        $nonce = $_POST['nonce'] ?? $_GET['nonce'] ?? '';
        
        error_log('WECC AJAX: Search term = ' . $search);
        error_log('WECC AJAX: Nonce = ' . $nonce);
        
        // Verificar nonce
        if (!wp_verify_nonce($nonce, 'wecc_admin_nonce')) {
            error_log('WECC AJAX: Nonce inválido');
            wp_send_json_error('Nonce inválido');
        }
        
        if (strlen($search) < 2) {
            error_log('WECC AJAX: Término muy corto');
            wp_send_json_success([]);
        }
        
        // Buscar usuarios
        try {
            $users = get_users([
                'search' => '*' . $search . '*',
                'search_columns' => ['user_email', 'display_name', 'user_login'],
                'number' => 10,
                'fields' => ['ID', 'display_name', 'user_email']
            ]);
            
            error_log('WECC AJAX: Usuarios encontrados: ' . count($users));
            
            $results = [];
            foreach ($users as $user) {
                $results[] = [
                    'id' => $user->ID,
                    'label' => $user->display_name . ' (' . $user->user_email . ')',
                    'value' => $user->user_email
                ];
            }
            
            error_log('WECC AJAX: Enviando ' . count($results) . ' resultados');
            wp_send_json_success($results);
            
        } catch (Exception $e) {
            error_log('WECC AJAX: Error: ' . $e->getMessage());
            wp_send_json_error('Error en búsqueda: ' . $e->getMessage());
        }
    }
    
    /**
     * Encola assets del admin
     */
    public function enqueue_assets($hook): void {
        // Debug: mostrar en qué página estamos
        error_log('WECC Admin Assets: Hook = ' . $hook);

        // Eliminado condicional que restringía los assets solo a páginas WECC.

        error_log('WECC Admin Assets: Cargando assets para WECC');

        wp_enqueue_style(
            'wecc-admin',
            WECC_PLUGIN_URL . 'includes/admin/assets/admin.css',
            [],
            WECC_VERSION
        );

        wp_enqueue_script(
            'wecc-admin',
            WECC_PLUGIN_URL . 'includes/admin/assets/admin.js',
            ['jquery', 'jquery-ui-autocomplete'],
            WECC_VERSION,
            true
        );

        error_log('WECC Admin Assets: Scripts encolados');

        wp_localize_script('wecc-admin', 'wecc_admin', [
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('wecc_admin_nonce'),
            'i18n' => [
                'confirm_delete' => __('¿Estás seguro de eliminar este elemento?', 'wc-enhanced-customers-credit'),
                'loading' => __('Cargando...', 'wc-enhanced-customers-credit'),
                'error' => __('Error al procesar la solicitud', 'wc-enhanced-customers-credit'),
            ]
        ]);

        error_log('WECC Admin Assets: Localize script configurado');
    }
    
    /**
     * Tab de cuentas de crédito
     */
    private function render_accounts_tab(string $action): void {
        echo '<div class="wecc-accounts-tab">';
        echo '<h3>' . __('Cuentas de Crédito', 'wc-enhanced-customers-credit') . '</h3>';
        echo '<p>' . __('Funcionalidad en desarrollo...', 'wc-enhanced-customers-credit') . '</p>';
        echo '</div>';
    }
    
    /**
     * Tab del ledger
     */
    private function render_ledger_tab(): void {
        echo '<div class="wecc-ledger-tab">';
        echo '<h3>' . __('Movimientos', 'wc-enhanced-customers-credit') . '</h3>';
        echo '<p>' . __('Funcionalidad en desarrollo...', 'wc-enhanced-customers-credit') . '</p>';
        echo '</div>';
    }
    
    /**
     * Tab de ajustes
     */
    private function render_settings_tab(): void {
        echo '<div class="wecc-settings-tab">';
        echo '<h3>' . __('Ajustes', 'wc-enhanced-customers-credit') . '</h3>';
        echo '<p>' . __('Funcionalidad en desarrollo...', 'wc-enhanced-customers-credit') . '</p>';
        echo '</div>';
    }
    
    /**
     * Tab de configurar crédito
     */
    private function render_credit_tab(string $action): void {
        if (!class_exists('WECC_Credit_Controller')) {
            echo '<div class="notice notice-error"><p>' . __('Controlador de crédito no disponible.', 'wc-enhanced-customers-credit') . '</p></div>';
            return;
        }
        
        $credit_controller = new WECC_Credit_Controller();
        
        if (isset($_GET['user_id'])) {
            $credit_controller->render_enable_credit_form();
        } else {
            $credit_controller->render_credit_overview();
        }
    }
    
    /**
     * Tab de pagos externos
     */
    private function render_payments_tab(string $action): void {
        if (!class_exists('WECC_Payments_Controller')) {
            echo '<div class="notice notice-error"><p>' . __('Controlador de pagos no disponible.', 'wc-enhanced-customers-credit') . '</p></div>';
            return;
        }
        
        $payments_controller = new WECC_Payments_Controller();
        
        switch ($action) {
            case 'register':
                $payments_controller->render_register_payment_form();
                break;
            default:
                $payments_controller->render_payments_overview();
                break;
        }
    }
    
    /**
     * Tab de carga masiva
     */
    private function render_bulk_tab(string $action): void {
        if (!class_exists('WECC_Bulk_Controller')) {
            echo '<div class="notice notice-error"><p>' . __('Controlador de carga masiva no disponible.', 'wc-enhanced-customers-credit') . '</p></div>';
            return;
        }
        
        $bulk_controller = new WECC_Bulk_Controller();
        $bulk_controller->render_bulk_page();
    }
    
    /**
     * Maneja descarga de template
     */
    private function handle_download_template(): void {
        if (!class_exists('WECC_Bulk_Controller')) {
            wp_die(__('Controlador de carga masiva no disponible.', 'wc-enhanced-customers-credit'));
        }
        
        $bulk_controller = new WECC_Bulk_Controller();
        $bulk_controller->download_template();
    }
    
    /**
     * Maneja importación masiva
     */
    private function handle_bulk_import(): void {
        if (!class_exists('WECC_Bulk_Controller')) {
            wp_redirect(add_query_arg('message', 'error_saving', wp_get_referer()));
            exit;
        }
        
        $bulk_controller = new WECC_Bulk_Controller();
        $bulk_controller->handle_import();
    }
    
    /**
     * Maneja exportación masiva
     */
    private function handle_bulk_export(): void {
        if (!class_exists('WECC_Bulk_Controller')) {
            wp_redirect(add_query_arg('message', 'error_saving', wp_get_referer()));
            exit;
        }
        
        $bulk_controller = new WECC_Bulk_Controller();
        $bulk_controller->handle_export();
    }
}
