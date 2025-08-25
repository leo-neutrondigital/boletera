<?php
if (!defined('ABSPATH')) exit;

/**
 * WECC Dashboard Page
 * Página principal del dashboard con métricas ejecutivas
 */
class WECC_Dashboard_Page {
    
    public function __construct() {
        add_action('admin_menu', [$this, 'add_menu_page']);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_scripts']);
    }
    
    public function add_menu_page() {
        add_menu_page(
            'Dashboard WECC',
            'Crédito Dashboard', 
            'manage_woocommerce',
            'wecc-dashboard',
            [$this, 'render_dashboard'],
            'dashicons-money-alt',
            56
        );
    }
    
    public function enqueue_scripts($hook) {
        if ($hook !== 'toplevel_page_wecc-dashboard') {
            return;
        }
        
        wp_enqueue_style('wecc-dashboard-css', WECC_PLUGIN_URL . 'includes/admin/assets/dashboard.css');
        wp_enqueue_script('wecc-dashboard-js', WECC_PLUGIN_URL . 'includes/admin/assets/dashboard.js', ['jquery'], '1.0', true);
    }
    
    public function render_dashboard() {
        // Cargar controller
        require_once WECC_PLUGIN_DIR . 'includes/admin/controllers/class-wecc-dashboard-controller.php';
        $controller = new WECC_Dashboard_Controller();
        $metrics = $controller->get_dashboard_metrics();
        
        // Extraer datos para facilitar el uso
        $financial = $metrics['financial_summary'];
        $clients = $metrics['client_metrics'];
        $alerts = $metrics['critical_alerts'];
        $trends = $metrics['monthly_trends'];
        $quality = $metrics['quality_metrics'];
        
        include WECC_PLUGIN_DIR . 'templates/admin/dashboard.php';
    }
}

// Inicializar la página
new WECC_Dashboard_Page();
