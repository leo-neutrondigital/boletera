<?php
/**
 * Plugin Name: WC Enhanced Customers Credit
 * Plugin URI: https://github.com/tu-usuario/wc-enhanced-customers-credit
 * Description: Sistema completo de crédito para WooCommerce con perfiles robustos de cliente, saldo positivo, importación CSV y gestión FIFO.
 * Version: 2.0.0
 * Author: Tu Nombre
 * Text Domain: wc-enhanced-customers-credit
 * Domain Path: /languages
 * Requires at least: 5.0
 * Tested up to: 6.4
 * Requires PHP: 7.4
 * WC requires at least: 5.0
 * WC tested up to: 8.0
 * License: GPL-2.0+
 * License URI: http://www.gnu.org/licenses/gpl-2.0.txt
 */

// Prevenir acceso directo
if (!defined('ABSPATH')) {
    exit;
}

// Constantes del plugin
define('WECC_VERSION', '2.0.0');
define('WECC_PLUGIN_FILE', __FILE__);
define('WECC_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('WECC_PLUGIN_URL', plugin_dir_url(__FILE__));
define('WECC_DB_VERSION', '2.0.0');
define('WECC_PLUGIN_BASENAME', plugin_basename(__FILE__));

// Verificación de dependencias
register_activation_hook(__FILE__, 'wecc_check_dependencies');
function wecc_check_dependencies() {
    if (!class_exists('WooCommerce')) {
        deactivate_plugins(plugin_basename(__FILE__));
        wp_die(
            __('WC Enhanced Customers Credit requiere WooCommerce para funcionar.', 'wc-enhanced-customers-credit'),
            __('Error de dependencia', 'wc-enhanced-customers-credit'),
            ['back_link' => true]
        );
    }
}

// Activación del plugin
register_activation_hook(__FILE__, 'wecc_activate');
function wecc_activate() {
    require_once WECC_PLUGIN_DIR . 'includes/class-wecc-activator.php';
    WECC_Activator::activate();
}

// Desactivación del plugin
register_deactivation_hook(__FILE__, 'wecc_deactivate');
function wecc_deactivate() {
    // Cleanup básico si es necesario
    wp_clear_scheduled_hook('wecc_daily_reminders');
}

// Inicializar el plugin
add_action('plugins_loaded', 'wecc_init_plugin', 20);
function wecc_init_plugin() {
    // Verificar WooCommerce
    if (!class_exists('WooCommerce')) {
        add_action('admin_notices', function() {
            echo '<div class="notice notice-error"><p>';
            echo '<strong>WC Enhanced Customers Credit</strong>: ';
            echo __('WooCommerce es requerido para que este plugin funcione.', 'wc-enhanced-customers-credit');
            echo '</p></div>';
        });
        return;
    }

    // Verificar versión de DB y actualizar si es necesario
    $installed_version = get_option('wecc_db_version', '0.0.0');
    if (version_compare($installed_version, WECC_DB_VERSION, '<')) {
        // Cargar database manager
        require_once WECC_PLUGIN_DIR . 'includes/class-wecc-database-manager.php';
        
        // Ejecutar migración
        WECC_Database_Manager::init();
        
        // Ejecutar activador legacy si existe
        if (file_exists(WECC_PLUGIN_DIR . 'includes/class-wecc-activator.php')) {
            require_once WECC_PLUGIN_DIR . 'includes/class-wecc-activator.php';
            WECC_Activator::upgrade_database();
        }
        
        error_log('WECC: Base de datos migrada de v' . $installed_version . ' a v' . WECC_DB_VERSION);
    }

    // Cargar el plugin principal
    require_once WECC_PLUGIN_DIR . 'includes/class-wecc-plugin.php';
    WECC_Plugin::instance();
}

// Hook para añadir enlaces en la página de plugins
add_filter('plugin_action_links_' . WECC_PLUGIN_BASENAME, 'wecc_plugin_action_links');
function wecc_plugin_action_links($links) {
    $settings_link = '<a href="' . admin_url('admin.php?page=wecc-dashboard') . '">' . 
                     __('Configuración', 'wc-enhanced-customers-credit') . '</a>';
    array_unshift($links, $settings_link);
    return $links;
}

// Declarar compatibilidad con HPOS (High-Performance Order Storage)
add_action('before_woocommerce_init', function() {
    if (class_exists('\Automattic\WooCommerce\Utilities\FeaturesUtil')) {
        \Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility(
            'custom_order_tables', 
            __FILE__, 
            true
        );
    }
});
