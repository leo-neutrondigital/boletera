<?php
if (!defined('ABSPATH')) exit;

/**
 * Vista: Formulario unificado de cliente
 * Usa campos WC directamente + campos específicos WECC
 */

$user_id = (int) ($_GET['user_id'] ?? 0);
$user = $user_id ? get_user_by('id', $user_id) : null;

// Obtener datos WECC específicos
$wecc_data = [];
if ($user_id && class_exists('WECC_Unified_Customer_Service')) {
    try {
        $unified_service = new WECC_Unified_Customer_Service();
        $wecc_data = $unified_service->get_wecc_specific_data($user_id);
    } catch (Exception $e) {
        error_log('Error loading WECC data: ' . $e->getMessage());
    }
}
?>

<div class="wecc-unified-customer-form">
    <h3><?php echo $user ? __('Editar Cliente', 'wc-enhanced-customers-credit') : __('Nuevo Cliente', 'wc-enhanced-customers-credit'); ?></h3>
    
    <?php if (isset($_GET['message']) && $_GET['message'] === 'customer_saved'): ?>
        <div class="notice notice-success is-dismissible">
            <p><strong>✅ Cliente actualizado correctamente.</strong> Los cambios han sido guardados.</p>
        </div>
    <?php endif; ?>
    
    <form method="post" id="wecc-unified-form">
        <?php wp_nonce_field('wecc_save_unified_customer', 'wecc_unified_nonce'); ?>
        <input type="hidden" name="wecc_action" value="save_unified_customer">
        
        <?php if ($user): ?>
            <input type="hidden" name="user_id" value="<?php echo $user->ID; ?>">
            
            <!-- Información de WordPress -->
            <?php include 'partials/user-info-section.php'; ?>
            
            <!-- Información de WooCommerce -->
            <?php include 'partials/woocommerce-fields-section.php'; ?>
            
            <!-- Campos específicos de WECC -->
            <?php include 'partials/wecc-fields-section.php'; ?>
            
        <?php else: ?>
            <!-- Selector de usuario para nuevo cliente -->
            <?php include 'partials/user-selector-section.php'; ?>
        <?php endif; ?>
        
        <!-- Botón único -->
        <div class="submit-buttons" style="display: flex; align-items: center; gap: 15px; margin-top: 20px; padding: 15px 0; border-top: 1px solid #ddd;">
            <?php submit_button($user ? __('Actualizar Cliente', 'wc-enhanced-customers-credit') : __('Crear Cliente', 'wc-enhanced-customers-credit'), 'primary', 'submit', false); ?>
            
            <?php if ($user): ?>
                <a href="<?php echo admin_url("admin.php?page=wecc-dashboard&tab=customers&action=view&user_id={$user->ID}"); ?>" 
                   class="button" style="margin: 0;">
                    <span class="dashicons dashicons-visibility" style="line-height: 1.2; margin-right: 5px;"></span>
                    <?php _e('Ver Historial', 'wc-enhanced-customers-credit'); ?>
                </a>
            <?php endif; ?>
            
            <a href="<?php echo admin_url('admin.php?page=wecc-dashboard&tab=customers'); ?>" 
               class="button" style="margin: 0;">
                <span class="dashicons dashicons-arrow-left-alt" style="line-height: 1.2; margin-right: 5px;"></span>
                <?php _e('Volver a lista', 'wc-enhanced-customers-credit'); ?>
            </a>
        </div>
    </form>
</div>

<?php include 'partials/form-scripts.php'; ?>
<?php include 'partials/form-styles.php'; ?>
