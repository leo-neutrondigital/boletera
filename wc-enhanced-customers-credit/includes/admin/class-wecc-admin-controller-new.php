<?php
if (!defined('ABSPATH')) exit;

/**
 * WECC Admin Controller - REFACTORIZADO
 * 
 * Actúa como router principal y coordina los controladores especializados
 */
class WECC_Admin_Controller_New {
    
    private $customers_controller;
    private $credit_controller;
    private $payments_controller;
    private $bulk_controller;
    
    public function __construct() {
        error_log('WECC Admin Controller New: Constructor ejecutado');
        
        // Cargar controladores especializados
        $this->load_controllers();
        
        // Registrar hooks principales
        $this->init_hooks();
    }
    
    /**
     * AJAX: Guardar solo datos de crédito
     */
    public function ajax_save_credit_data_only(): void {
        // Verificar permisos y nonce
        if (!current_user_can('manage_woocommerce') || 
            !wp_verify_nonce($_POST['nonce'] ?? '', 'wecc_admin_nonce')) {
            wp_send_json_error('Sin permisos');
        }
        
        $user_id = (int) ($_POST['user_id'] ?? 0);
        if (!$user_id) {
            wp_send_json_error('ID de usuario inválido');
        }
        
        try {
            if (class_exists('WECC_Unified_Customer_Service')) {
                $unified_service = new WECC_Unified_Customer_Service();
                
                // Preparar datos WECC
                $wecc_data = [];
                $wecc_fields = ['rfc', 'customer_type', 'customer_number', 'sales_rep', 'customer_since', 'credit_notes'];
                
                foreach ($wecc_fields as $field) {
                    $value = $_POST[$field] ?? '';
                    if ($field === 'credit_notes') {
                        $value = sanitize_textarea_field($value);
                    } else {
                        $value = sanitize_text_field($value);
                    }
                    $wecc_data[$field] = $value;
                    error_log("WECC AJAX Credit: Campo {$field} = '{$value}'");
                }
                
                $saved = $unified_service->save_wecc_specific_data($user_id, $wecc_data);
                
                if ($saved) {
                    // Sincronizar customer_type para descuentos
                    if (!empty($_POST['customer_type'])) {
                        update_user_meta($user_id, 'wecc_customer_type', $_POST['customer_type']);
                        update_user_meta($user_id, 'customer_type', $_POST['customer_type']);
                    }
                    
                    do_action('wecc_credit_data_saved', $user_id, $wecc_data);
                    
                    wp_send_json_success('Datos de crédito guardados correctamente');
                } else {
                    wp_send_json_error('Error al guardar en la base de datos');
                }
            } else {
                wp_send_json_error('Servicio no disponible');
            }
            
        } catch (Exception $e) {
            error_log('WECC AJAX Credit Error: ' . $e->getMessage());
            wp_send_json_error('Error interno: ' . $e->getMessage());
        }
    }
    
    /**
     * AJAX: Verificar si un número de cliente ya existe
     */
    public function ajax_check_customer_number(): void {
        // Verificar permisos y nonce
        if (!current_user_can('manage_woocommerce') || 
            !wp_verify_nonce($_POST['nonce'] ?? '', 'wecc_admin_nonce')) {
            wp_send_json_error('Sin permisos');
        }
        
        $customer_number = sanitize_text_field($_POST['customer_number'] ?? '');
        $current_user_id = (int) ($_POST['user_id'] ?? 0);
        
        if (empty($customer_number)) {
            wp_send_json_success(['exists' => false]);
        }
        
        global $wpdb;
        $table_name = $wpdb->prefix . 'wecc_customer_profiles';
        
        // Buscar si el número existe (excluyendo el usuario actual)
        $query = "SELECT p.user_id, u.display_name, u.user_email 
                  FROM {$table_name} p 
                  LEFT JOIN {$wpdb->users} u ON p.user_id = u.ID 
                  WHERE p.customer_number = %s";
        $params = [$customer_number];
        
        if ($current_user_id > 0) {
            $query .= " AND p.user_id != %d";
            $params[] = $current_user_id;
        }
        
        $existing = $wpdb->get_row($wpdb->prepare($query, $params));
        
        if ($existing) {
            wp_send_json_success([
                'exists' => true,
                'user_id' => $existing->user_id,
                'user_name' => $existing->display_name ?: $existing->user_email
            ]);
        } else {
            wp_send_json_success(['exists' => false]);
        }
    }
    
    /**
     * Maneja el guardado del formulario unificado
     */
    private function handle_save_unified_customer(): void {
        error_log('WECC Admin Router: Iniciando save_unified_customer');
        error_log('WECC Admin Router: POST keys = ' . implode(', ', array_keys($_POST)));
        error_log('WECC Admin Router: wecc_action = ' . ($_POST['wecc_action'] ?? 'NO_SET'));
        error_log('WECC Admin Router: nonce = ' . ($_POST['wecc_unified_nonce'] ?? 'NO_SET'));
        
        if (!wp_verify_nonce($_POST['wecc_unified_nonce'] ?? '', 'wecc_save_unified_customer')) {
            error_log('WECC Admin Router: Nonce inválido');
            wp_redirect(add_query_arg('message', 'error_permissions', wp_get_referer()));
            exit;
        }
        
        $user_id = (int) ($_POST['user_id'] ?? 0);
        error_log('WECC Admin Router: User ID = ' . $user_id);
        
        if (!$user_id) {
            error_log('WECC Admin Router: User ID inválido');
            wp_redirect(add_query_arg('message', 'error_saving', wp_get_referer()));
            exit;
        }
        
        try {
            // 1. GUARDAR CAMPOS DE WOOCOMMERCE
            $wc_fields = [
                'billing_first_name', 'billing_last_name', 'billing_company',
                'billing_phone', 'billing_address_1', 'billing_address_2',
                'billing_city', 'billing_state', 'billing_postcode'
            ];
            
            foreach ($wc_fields as $field) {
                $value = sanitize_text_field($_POST[$field] ?? '');
                if (!empty($value)) {
                    update_user_meta($user_id, $field, $value);
                    error_log("WECC Unified: Actualizado {$field} = {$value}");
                }
            }
            
            // 2. GUARDAR CAMPOS ESPECÍFICOS DE WECC
            if (class_exists('WECC_Unified_Customer_Service')) {
                $unified_service = new WECC_Unified_Customer_Service();
                
                // Preparar datos WECC
                $wecc_data = [];
                $wecc_fields = ['rfc', 'customer_type', 'customer_number', 'sales_rep', 'customer_since', 'credit_notes'];
                
                foreach ($wecc_fields as $field) {
                    $value = $_POST[$field] ?? '';
                    if ($field === 'credit_notes') {
                        $value = sanitize_textarea_field($value);
                    } else {
                        $value = sanitize_text_field($value);
                    }
                    $wecc_data[$field] = $value; // Guardar TODOS los valores, incluso vacíos
                    error_log("WECC Unified: Campo {$field} = '{$value}'");
                }
                
                error_log('WECC Unified: Intentando guardar datos WECC...');
                $saved = $unified_service->save_wecc_specific_data($user_id, $wecc_data);
                if ($saved) {
                    error_log('WECC Unified: Datos WECC guardados correctamente');
                } else {
                    error_log('WECC Unified: ERROR al guardar datos WECC - resultado: ' . var_export($saved, true));
                }
            } else {
                error_log('WECC Unified: WECC_Unified_Customer_Service NO EXISTE');
            }
            
            // 3. SINCRONIZAR PARA DESCUENTOS
            if (!empty($_POST['customer_type'])) {
                update_user_meta($user_id, 'wecc_customer_type', $_POST['customer_type']);
                update_user_meta($user_id, 'customer_type', $_POST['customer_type']);
            }
            
            // Disparar hook para extensiones
            do_action('wecc_unified_customer_saved', $user_id, $_POST);
            
            // Redirigir de vuelta al mismo formulario con mensaje de éxito
            $redirect_url = admin_url("admin.php?page=wecc-dashboard&tab=customers&action=edit&user_id={$user_id}&message=customer_saved");
            wp_redirect($redirect_url);
            exit;
            
        } catch (Exception $e) {
            error_log('WECC Admin Router: Error saving unified customer: ' . $e->getMessage());
            wp_redirect(add_query_arg('message', 'error_saving', wp_get_referer()));
            exit;
        }
    }
    
    /**
     * Carga todos los controladores especializados
     */
    private function load_controllers(): void {
        require_once WECC_PLUGIN_DIR . 'includes/admin/controllers/class-wecc-customers-controller.php';
        require_once WECC_PLUGIN_DIR . 'includes/admin/controllers/class-wecc-credit-controller.php';
        require_once WECC_PLUGIN_DIR . 'includes/admin/controllers/class-wecc-bulk-controller.php';
        
        // Cargar payments_controller solo para funciones AJAX que podrían ser útiles
        require_once WECC_PLUGIN_DIR . 'includes/admin/controllers/class-wecc-payments-controller.php';
        
        $this->customers_controller = new WECC_Customers_Controller();
        $this->credit_controller = new WECC_Credit_Controller();
        $this->bulk_controller = new WECC_Bulk_Controller();
        $this->payments_controller = new WECC_Payments_Controller(); // Solo para AJAX
    }
    
    /**
     * Inicializa hooks principales
     */
    private function init_hooks(): void {
        add_action('admin_menu', [$this, 'register_menu'], 60);
        add_action('admin_init', [$this, 'handle_form_submissions'], 30);
        
        // Debug: Verificar que el hook se registra
        error_log('WECC Admin Router: Hook admin_init registrado para handle_form_submissions');
        
        // AJAX hooks - delegar a controladores especializados
        $this->register_ajax_hooks();
        
        // Inicializar página de indexación
        $this->init_indexing_page();
    }
    
    /**
     * Inicializar página de indexación
     */
    private function init_indexing_page(): void {
        $indexing_admin_file = WECC_PLUGIN_DIR . 'includes/admin/class-wecc-indexing-admin.php';
        if (file_exists($indexing_admin_file)) {
            require_once $indexing_admin_file;
            
            if (class_exists('WECC_Indexing_Admin_Page')) {
                WECC_Indexing_Admin_Page::init();
            }
        }
    }
    
    /**
     * Registra el menú principal
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
     * Router principal - delega a controladores especializados
     */
    public function render_admin_router(): void {
        $tab = $_GET['tab'] ?? 'dashboard';
        $action = $_GET['action'] ?? '';
        
        echo '<div class="wrap">';
        echo '<h1>' . __('Crédito WECC', 'wc-enhanced-customers-credit') . '</h1>';
        
        $this->render_tab_navigation($tab);
        
        // Mostrar notificaciones
        if (isset($_GET['message'])) {
            $this->show_admin_notice($_GET['message']);
        }
        
        // Delegar a controlador especializado
        switch ($tab) {
            case 'customers':
                $this->route_customers($action);
                break;
            case 'credit':
                $this->route_credit($action);
                break;
            case 'bulk':
                $this->route_bulk($action);
                break;
            default:
                $this->render_dashboard_tab();
                break;
        }
        
        echo '</div>';
    }
    
    /**
     * Rutas para el controlador de clientes
     */
    private function route_customers(string $action): void {
        switch ($action) {
            case 'view':
                $this->customers_controller->render_customer_history();
                break;
            case 'edit':
                $this->customers_controller->render_customer_edit();
                break;
            default:
                $this->customers_controller->render_customers_list();
                break;
        }
    }
    
    /**
     * Rutas para el controlador de crédito
     */
    private function route_credit(string $action): void {
        // Solo manejar configuración individual
        $this->credit_controller->render_enable_credit_form();
    }
    
    /**
     * Rutas para el controlador de carga masiva
     */
    private function route_bulk(string $action): void {
        switch ($action) {
            case 'import':
                $this->bulk_controller->render_import_form();
                break;
            case 'export':
                $this->bulk_controller->render_export_form();
                break;
            case 'download_template':
                $this->bulk_controller->download_template();
                break;
            default:
                $this->bulk_controller->render_bulk_page();
                break;
        }
    }
    
    /**
     * Navegación por pestañas - ESTRUCTURA SIMPLIFICADA
     */
    private function render_tab_navigation(string $current_tab): void {
        $tabs = [
            'dashboard' => __('Dashboard', 'wc-enhanced-customers-credit'),
            'customers' => __('Clientes', 'wc-enhanced-customers-credit'),
            'bulk' => __('Carga Masiva', 'wc-enhanced-customers-credit')
        ];
        
        // Lógica especial: cuando estamos en "credit", mostrar "customers" como activo
        $active_tab = $current_tab === 'credit' ? 'customers' : $current_tab;
        
        echo '<h2 class="nav-tab-wrapper">';
        foreach ($tabs as $tab_key => $tab_label) {
            $url = admin_url("admin.php?page=wecc-dashboard&tab={$tab_key}");
            $active = $active_tab === $tab_key ? 'nav-tab-active' : '';
            echo "<a href='{$url}' class='nav-tab {$active}'>{$tab_label}</a>";
        }
        echo '</h2>';
    }
    
    /**
     * Dashboard ejecutivo - Con métricas completas
     */
    private function render_dashboard_tab(): void {
        // Mostrar descripción del dashboard
        echo '<p class="description">';
        echo 'Resumen ejecutivo del sistema de crédito - ';
        echo 'Última actualización: ' . current_time('d/m/Y H:i');
        echo '</p>';
        
        // Cargar controller del dashboard
        require_once WECC_PLUGIN_DIR . 'includes/admin/controllers/class-wecc-dashboard-controller.php';
        $controller = new WECC_Dashboard_Controller();
        $metrics = $controller->get_dashboard_metrics();
        
        // Extraer datos para facilitar el uso
        $financial = $metrics['financial_summary'];
        $clients = $metrics['client_metrics'];
        $alerts = $metrics['critical_alerts'];
        $trends = $metrics['monthly_trends'];
        $quality = $metrics['quality_metrics'];
        
        // Incluir el template
        include WECC_PLUGIN_DIR . 'templates/admin/dashboard.php';
    }
    
    /**
     * Registra hooks AJAX delegando a controladores
     */
    private function register_ajax_hooks(): void {
        // Búsquedas de usuarios/clientes
        add_action('wp_ajax_wecc_user_search', [$this->customers_controller, 'ajax_user_search']);
        add_action('wp_ajax_wecc_search_customer_for_payment', [$this->payments_controller, 'ajax_search_customer_for_payment']);
        
        // Guardado separado de datos de crédito
        add_action('wp_ajax_wecc_save_credit_data_only', [$this, 'ajax_save_credit_data_only']);
        add_action('wp_ajax_wecc_check_customer_number', [$this, 'ajax_check_customer_number']);
        
        // Migración de datos
        add_action('wp_ajax_wecc_migrate_data', 'WECC_Data_Migration::handle_migration_ajax');
        
        // Operaciones de crédito
        add_action('wp_ajax_wecc_get_customer_debts', [$this->payments_controller, 'ajax_get_customer_debts']);
    }
    
    /**
     * Maneja envíos de formularios - delega a controladores
     */
    public function handle_form_submissions(): void {
        if (!isset($_POST['wecc_action']) || !current_user_can('manage_woocommerce')) {
            return;
        }
        
        $action = $_POST['wecc_action'];
        error_log('WECC Admin Router: handle_form_submissions llamado con action = ' . $action);
        
        // Delegar según el tipo de acción
        switch ($action) {
            case 'save_unified_customer':
                error_log('WECC Admin Router: Ejecutando save_unified_customer');
                $this->handle_save_unified_customer();
                break;
            case 'save_customer':
                error_log('WECC Admin Router: Ejecutando save_customer legacy');
                // TODO: Implementar en customers_controller
                $this->handle_legacy_save_customer();
                break;
            case 'enable_credit':
                $this->credit_controller->handle_enable_credit();
                break;
            case 'bulk_import':
                $this->bulk_controller->handle_import();
                break;
            case 'bulk_export':
                $this->bulk_controller->handle_export();
                break;
        }
    }
    
    /**
     * Manejo temporal del guardado de cliente (del sistema anterior)
     */
    private function handle_legacy_save_customer(): void {
        error_log('WECC Admin Router: Iniciando save_customer legacy');
        error_log('WECC Admin Router: POST data = ' . print_r($_POST, true));
        
        if (!wp_verify_nonce($_POST['wecc_customer_nonce'] ?? '', 'wecc_save_customer')) {
            error_log('WECC Admin Router: Nonce inválido');
            wp_redirect(add_query_arg('message', 'error_permissions', wp_get_referer()));
            exit;
        }
        
        $user_id = (int) ($_POST['user_id'] ?? 0);
        error_log('WECC Admin Router: User ID = ' . $user_id);
        
        if (!$user_id) {
            error_log('WECC Admin Router: User ID inválido');
            wp_redirect(add_query_arg('message', 'error_saving', wp_get_referer()));
            exit;
        }
        
        try {
            // Usar el servicio de customer si está disponible
            if (function_exists('wecc_service')) {
                error_log('WECC Admin Router: Usando wecc_service');
                $customer_service = wecc_service('customer_service');
                
                // Debug de campos esperados vs recibidos
                $field_definitions = $customer_service->get_field_definitions();
                error_log('WECC Admin Router: Campos definidos = ' . print_r(array_keys($field_definitions), true));
                
                $received_fields = [];
                foreach (array_keys($field_definitions) as $field_key) {
                    if (isset($_POST[$field_key])) {
                        $received_fields[$field_key] = $_POST[$field_key];
                    }
                }
                error_log('WECC Admin Router: Campos recibidos = ' . print_r($received_fields, true));
                
                // Verificación específica del full_name
                $full_name = $_POST['full_name'] ?? '';
                error_log('WECC Admin Router: full_name recibido = "' . $full_name . '" (longitud: ' . strlen($full_name) . ')');
                
                // Guardar perfil (esto dispara el hook wecc_customer_profile_saved)
                $saved_profile = $customer_service->save_profile($user_id, $_POST);
                error_log('WECC Admin Router: Cliente guardado exitosamente');
                
                // Manualmente disparar sincronización WC (por si acaso)
                do_action('wecc_customer_profile_saved', $user_id, $_POST, 'updated');
            } else {
                error_log('WECC Admin Router: wecc_service no disponible');
                throw new Exception('Servicio no disponible');
            }
            
            $redirect_url = admin_url('admin.php?page=wecc-dashboard&tab=customers&message=customer_saved');
            wp_redirect($redirect_url);
            exit;
            
        } catch (Exception $e) {
            error_log('WECC Admin Router: Error saving customer: ' . $e->getMessage());
            wp_redirect(add_query_arg('message', 'error_saving', wp_get_referer()));
            exit;
        }
    }
    
    /**
     * Muestra notificaciones admin
     */
    private function show_admin_notice(string $message): void {
        $notices = [
            'customer_saved' => ['success', __('Cliente guardado correctamente.', 'wc-enhanced-customers-credit')],
            'credit_enabled' => ['success', __('Crédito habilitado correctamente.', 'wc-enhanced-customers-credit')],
            'credit_saved' => ['success', __('Configuración de crédito guardada correctamente.', 'wc-enhanced-customers-credit')],
            'payment_registered' => ['success', __('Pago registrado correctamente.', 'wc-enhanced-customers-credit')],
            'import_completed' => ['success', __('Importación completada.', 'wc-enhanced-customers-credit')],
            'error_saving' => ['error', __('Error al guardar. Revisa los datos.', 'wc-enhanced-customers-credit')]
        ];
        
        if (isset($notices[$message])) {
            [$type, $text] = $notices[$message];
            echo '<div class="notice notice-' . esc_attr($type) . ' is-dismissible"><p>' . esc_html($text) . '</p></div>';
        }
    }
}
