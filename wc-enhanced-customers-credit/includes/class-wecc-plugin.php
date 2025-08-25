<?php
if (!defined('ABSPATH')) {
    exit;
}

/**
 * WECC Plugin - Clase principal que inicializa todo el sistema
 */
class WECC_Plugin {
    
    private static $instance = null;
    
    public static function instance(): self {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        // Aumentar memoria si es necesario
        $current_limit = ini_get('memory_limit');
        if (intval($current_limit) < 256) {
            ini_set('memory_limit', '256M');
        }
        
        error_log('WECC Plugin: Constructor ejecutado');
        $this->load_dependencies();
        $this->init_hooks();
        error_log('WECC Plugin: Plugin inicializado completamente');
    }
    
    /**
     * Carga todas las dependencias del plugin
     */
    private function load_dependencies(): void {
        // Database Manager (primero)
        require_once WECC_PLUGIN_DIR . 'includes/class-wecc-database-manager.php';
        
        // Utilities (primero)
        require_once WECC_PLUGIN_DIR . 'includes/utilities/class-wecc-validator.php';
        require_once WECC_PLUGIN_DIR . 'includes/utilities/helpers.php';
        
        // Service Container
        require_once WECC_PLUGIN_DIR . 'includes/services/class-wecc-service-container.php';
        
        // Services Core
        require_once WECC_PLUGIN_DIR . 'includes/services/class-wecc-customer-service.php';
        require_once WECC_PLUGIN_DIR . 'includes/services/class-wecc-unified-customer-service.php'; // NUEVO
        require_once WECC_PLUGIN_DIR . 'includes/services/class-wecc-balance-service.php';
        require_once WECC_PLUGIN_DIR . 'includes/services/class-wecc-payment-service.php';
        require_once WECC_PLUGIN_DIR . 'includes/services/class-wecc-import-service.php';
        require_once WECC_PLUGIN_DIR . 'includes/services/class-wecc-email-service.php';
        
        // WooCommerce Integration
        require_once WECC_PLUGIN_DIR . 'includes/woocommerce/class-wecc-gateway.php';
        require_once WECC_PLUGIN_DIR . 'includes/woocommerce/class-wecc-checkout-handler.php';
        
        // Frontend
        require_once WECC_PLUGIN_DIR . 'includes/frontend/class-wecc-my-credit-endpoint.php';
        require_once WECC_PLUGIN_DIR . 'includes/frontend/class-wecc-payment-handler.php';
        require_once WECC_PLUGIN_DIR . 'includes/frontend/functions-payment.php';
        
        // Admin (solo en admin)
        if (is_admin()) {
            // Usar el nuevo sistema refactorizado
            require_once WECC_PLUGIN_DIR . 'includes/admin/class-wecc-admin-controller-new.php';
            
            // Herramienta de migración de datos
            require_once WECC_PLUGIN_DIR . 'includes/admin/class-wecc-data-migration.php';
            
            // Mantener el viejo temporalmente como backup
            // require_once WECC_PLUGIN_DIR . 'includes/admin/class-wecc-admin-controller.php';
            // Dashboard page (DESHABILITADO - ahora está integrado en admin controller)
            // require_once WECC_PLUGIN_DIR . 'includes/admin/class-wecc-dashboard-page.php';
            require_once WECC_PLUGIN_DIR . 'includes/admin/class-wecc-customers-page.php';
            require_once WECC_PLUGIN_DIR . 'includes/admin/class-wecc-accounts-page.php';
            require_once WECC_PLUGIN_DIR . 'includes/admin/class-wecc-import-page.php';
            
            // Debug temporal
            if (WP_DEBUG) {
                require_once WECC_PLUGIN_DIR . 'admin-debug.php';
                require_once WECC_PLUGIN_DIR . 'user-test.php';
            }
        }
    }
    
    /**
     * Inicializa hooks y funcionalidades
     */
    private function init_hooks(): void {
        error_log('WECC Plugin: Inicializando hooks');
        
        // Inicializar servicios core
        add_action('init', [$this, 'init_services'], 5);
        
        // Integración WooCommerce
        add_action('init', [$this, 'init_woocommerce_integration'], 10);
        
        // Frontend
        add_action('init', [$this, 'init_frontend'], 15);
        
        // Admin
        if (is_admin()) {
            add_action('init', [$this, 'init_admin'], 20);
        }
        
        // Cargar helpers adicionales
        $this->load_helpers();
        
        // Registro de gateway
        add_filter('woocommerce_payment_gateways', [$this, 'register_gateway']);
        
        // Cargar textdomain
        add_action('init', [$this, 'load_textdomain'], 1);
        
        // Assets
        add_action('wp_enqueue_scripts', [$this, 'enqueue_frontend_assets']);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_admin_assets']);
        
        error_log('WECC Plugin: Hooks registrados, incluyendo admin_enqueue_scripts');
    }
    
    /**
     * Carga helpers adicionales
     */
    private function load_helpers(): void {
        // Helper para integración con plugins de descuentos
        require_once WECC_PLUGIN_DIR . 'includes/helpers/class-wecc-discount-integration.php';
        
        // Helper para integración con perfiles de WooCommerce
        require_once WECC_PLUGIN_DIR . 'includes/helpers/class-wecc-woocommerce-integration.php';
    }
    
    /**
     * Inicializa los servicios principales
     */
    public function init_services(): void {
        // Verificar y actualizar base de datos
        WECC_Database_Manager::init();
        
        // El container ya se auto-inicializa cuando se incluye
        // Solo verificamos que todo esté bien
        try {
            $container = wecc_container();
            
            // Verificar servicios críticos
            $critical_services = ['customer_service', 'balance_service', 'payment_service', 'email_service'];
            foreach ($critical_services as $service) {
                if (!$container->has($service)) {
                    throw new Exception("Servicio crítico '{$service}' no registrado");
                }
            }
            
            // Inicializar Email Service
            $container->get('email_service');
            
        } catch (Exception $e) {
            // Log error y mostrar aviso admin
            error_log('WECC Error inicializando servicios: ' . $e->getMessage());
            
            if (is_admin()) {
                add_action('admin_notices', function() use ($e) {
                    echo '<div class="notice notice-error"><p>';
                    echo '<strong>WC Enhanced Customers Credit</strong>: Error inicializando servicios. ';
                    echo 'Revisa los logs para más detalles.';
                    echo '</p></div>';
                });
            }
        }
    }
    
    /**
     * Inicializa integración con WooCommerce
     */
    public function init_woocommerce_integration(): void {
        new WECC_Checkout_Handler();
    }
    
    /**
     * Inicializa frontend
     */
    public function init_frontend(): void {
        // El endpoint se inicializa en el archivo principal del plugin
        new WECC_Payment_Handler();
    }
    
    /**
     * Inicializa admin
     */
    public function init_admin(): void {
        // Usar el nuevo controlador refactorizado
        new WECC_Admin_Controller_New();
    }
    
    /**
     * Registra el gateway de crédito
     */
    public function register_gateway($gateways): array {
        $gateways[] = 'WECC_Gateway';
        return $gateways;
    }
    
    /**
     * Carga traducciones
     */
    public function load_textdomain(): void {
        // Solo cargar si WordPress está completamente inicializado
        if (!did_action('init')) {
            return;
        }
        
        load_plugin_textdomain(
            'wc-enhanced-customers-credit',
            false,
            dirname(WECC_PLUGIN_BASENAME) . '/languages'
        );
    }
    
    /**
     * Encola assets del frontend
     */
    public function enqueue_frontend_assets(): void {
        if (is_wc_endpoint_url('mi-credito') || is_checkout()) {
            wp_enqueue_style(
                'wecc-frontend',
                WECC_PLUGIN_URL . 'includes/frontend/assets/frontend.css',
                [],
                WECC_VERSION
            );
            
            wp_enqueue_script(
                'wecc-frontend',
                WECC_PLUGIN_URL . 'includes/frontend/assets/frontend.js',
                ['jquery'],
                WECC_VERSION,
                true
            );
            
            // Localize script para AJAX
            wp_localize_script('wecc-frontend', 'wecc_frontend', [
                'ajax_url' => admin_url('admin-ajax.php'),
                'nonce' => wp_create_nonce('wecc_frontend_nonce'),
                'i18n' => [
                    'confirm_payment' => __('¿Confirmas el pago de este cargo?', 'wc-enhanced-customers-credit'),
                    'payment_processing' => __('Procesando pago...', 'wc-enhanced-customers-credit'),
                ]
            ]);
        }
    }
    
    /**
     * Encola assets del admin
     */
    public function enqueue_admin_assets($hook): void {
        error_log('WECC Plugin Assets: Hook = ' . $hook);
        
        // Páginas de WECC (más flexible)
        if (strpos($hook, 'wecc-dashboard') !== false || 
            (isset($_GET['page']) && $_GET['page'] === 'wecc-dashboard')) {
            
            error_log('WECC Plugin Assets: Cargando assets');
            
            wp_enqueue_style(
                'wecc-admin',
                WECC_PLUGIN_URL . 'includes/admin/assets/admin.css',
                [],
                WECC_VERSION
            );
            
            // Cargar estilos del dashboard
            wp_enqueue_style(
                'wecc-dashboard',
                WECC_PLUGIN_URL . 'includes/admin/assets/dashboard.css',
                ['wecc-admin'],
                WECC_VERSION
            );
            
            wp_enqueue_script(
                'wecc-admin',
                WECC_PLUGIN_URL . 'includes/admin/assets/admin.js',
                ['jquery', 'jquery-ui-autocomplete'],
                WECC_VERSION,
                true
            );
            
            // Cargar JavaScript del dashboard
            wp_enqueue_script(
                'wecc-dashboard',
                WECC_PLUGIN_URL . 'includes/admin/assets/dashboard.js',
                ['jquery', 'wecc-admin'],
                WECC_VERSION,
                true
            );
            
            wp_localize_script('wecc-admin', 'wecc_admin', [
                'ajax_url' => admin_url('admin-ajax.php'),
                'nonce' => wp_create_nonce('wecc_admin_nonce'),
                'i18n' => [
                    'confirm_delete' => __('¿Estás seguro de eliminar este elemento?', 'wc-enhanced-customers-credit'),
                    'loading' => __('Cargando...', 'wc-enhanced-customers-credit'),
                    'error' => __('Error al procesar la solicitud', 'wc-enhanced-customers-credit'),
                ]
            ]);
            
            error_log('WECC Plugin Assets: Assets encolados correctamente');
        } else {
            error_log('WECC Plugin Assets: No es página WECC');
        }
    }
    
    /**
     * Obtiene la versión del plugin
     */
    public function get_version(): string {
        return WECC_VERSION;
    }
}
