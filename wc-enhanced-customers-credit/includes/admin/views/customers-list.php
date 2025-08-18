<?php
if (!defined('ABSPATH')) exit;

/**
 * Vista: Lista de clientes con acciones rápidas
 * Variables disponibles: $customers, $search, $pagination
 */
?>

<div class="wecc-customers-list">
    <!-- Búsqueda y filtros -->
    <div class="wecc-list-header" style="display: flex; justify-content: space-between; align-items: center; margin: 20px 0;">
        <div class="wecc-search-form">
            <form method="get" style="display: flex; gap: 10px;">
                <input type="hidden" name="page" value="wecc-dashboard">
                <input type="hidden" name="tab" value="customers">
                <input type="search" name="s" value="<?php echo esc_attr($search); ?>" 
                       placeholder="<?php echo esc_attr__('Buscar clientes...', 'wc-enhanced-customers-credit'); ?>" 
                       style="width: 300px;">
                <?php submit_button(__('Buscar', 'wc-enhanced-customers-credit'), 'secondary', false, false, ['style' => 'margin: 0;']); ?>
                <?php if ($search): ?>
                    <a href="<?php echo admin_url('admin.php?page=wecc-dashboard&tab=customers'); ?>" class="button"><?php _e('Limpiar', 'wc-enhanced-customers-credit'); ?></a>
                <?php endif; ?>
            </form>
        </div>
        
        <div class="wecc-actions">
            <a href="<?php echo admin_url('admin.php?page=wecc-dashboard&tab=customers&action=edit'); ?>" 
               class="button button-primary">
                <?php _e('Nuevo Cliente', 'wc-enhanced-customers-credit'); ?>
            </a>
        </div>
    </div>
    
    <!-- Tabla principal -->
    <div class="wecc-table-wrapper">
        <table class="wp-list-table widefat fixed striped">
            <thead>
                <tr>
                    <th style="width: 200px;"><?php _e('Cliente', 'wc-enhanced-customers-credit'); ?></th>
                    <th style="width: 200px;"><?php _e('Email', 'wc-enhanced-customers-credit'); ?></th>
                    <th style="width: 100px;"><?php _e('Estado', 'wc-enhanced-customers-credit'); ?></th>
                    <th style="width: 100px;"><?php _e('Límite', 'wc-enhanced-customers-credit'); ?></th>
                    <th style="width: 100px;"><?php _e('Usado', 'wc-enhanced-customers-credit'); ?></th>
                    <th style="width: 100px;"><?php _e('Disponible', 'wc-enhanced-customers-credit'); ?></th>
                    <th style="width: 100px;"><?php _e('Vencido', 'wc-enhanced-customers-credit'); ?></th>
                    <th style="width: 150px;"><?php _e('Acciones', 'wc-enhanced-customers-credit'); ?></th>
                </tr>
            </thead>
            <tbody>
                <?php if (!empty($customers)): ?>
                    <?php foreach ($customers as $customer): ?>
                        <?php
                        $user = $customer['user'];
                        $profile = $customer['profile'];
                        $account = $customer['account'];
                        $balance = $customer['balance'];
                        $status = $customer['status'];
                        $has_overdue = $customer['has_overdue'];
                        
                        // URLs de acciones
                        $view_url = admin_url("admin.php?page=wecc-dashboard&tab=customers&action=view&user_id={$user->ID}");
                        $edit_url = admin_url("admin.php?page=wecc-dashboard&tab=customers&action=edit&user_id={$user->ID}");
                        $payment_url = admin_url("admin.php?page=wecc-dashboard&tab=payments&action=register&user_id={$user->ID}");
                        ?>
                        <tr class="wecc-customer-row" data-user-id="<?php echo $user->ID; ?>">
                            <!-- Cliente -->
                            <td>
                                <strong>
                                    <a href="<?php echo esc_url($view_url); ?>" class="row-title">
                                        <?php echo esc_html($profile['full_name'] ?: $user->display_name); ?>
                                    </a>
                                </strong>
                                <br><small>ID: <?php echo $user->ID; ?></small>
                                <?php if ($profile['rfc']): ?>
                                    <br><small>RFC: <?php echo esc_html($profile['rfc']); ?></small>
                                <?php endif; ?>
                                
                                <!-- Row actions (aparecen al hover) -->
                                <div class="row-actions">
                                    <span class="view">
                                        <a href="<?php echo esc_url($view_url); ?>" aria-label="Ver historial de <?php echo esc_attr($profile['full_name'] ?: $user->display_name); ?>">
                                            Ver historial
                                        </a> |
                                    </span>
                                    <?php if ($account && $account->credit_limit > 0): ?>
                                        <span class="configure">
                                            <a href="<?php echo admin_url("admin.php?page=wecc-dashboard&tab=credit&action=enable&user_id={$user->ID}"); ?>" 
                                               aria-label="Configurar crédito de <?php echo esc_attr($profile['full_name'] ?: $user->display_name); ?>">
                                                Configurar crédito
                                            </a> |
                                        </span>
                                    <?php else: ?>
                                        <span class="activate">
                                            <a href="<?php echo admin_url("admin.php?page=wecc-dashboard&tab=credit&action=enable&user_id={$user->ID}"); ?>" 
                                               aria-label="Activar crédito para <?php echo esc_attr($profile['full_name'] ?: $user->display_name); ?>"
                                               style="color: #2271b1; font-weight: 600;">
                                                Activar crédito
                                            </a> |
                                        </span>
                                    <?php endif; ?>
                                    <?php if ($balance && $balance['balance_used'] > 0): ?>
                                        <span class="payment">
                                            <a href="<?php echo esc_url($payment_url); ?>" 
                                               aria-label="Registrar pago de <?php echo esc_attr($profile['full_name'] ?: $user->display_name); ?>">
                                                Registrar pago
                                            </a> |
                                        </span>
                                    <?php endif; ?>
                                    <span class="edit">
                                        <a href="<?php echo esc_url($edit_url); ?>" 
                                           aria-label="Editar <?php echo esc_attr($profile['full_name'] ?: $user->display_name); ?>">
                                            Editar
                                        </a>
                                    </span>
                                </div>
                            </td>
                            
                            <!-- Email -->
                            <td>
                                <a href="<?php echo esc_url($view_url); ?>" class="row-title">
                                    <?php echo esc_html($user->user_email); ?>
                                </a>
                                <?php if ($profile['phone']): ?>
                                    <br><small><?php echo esc_html($profile['phone']); ?></small>
                                <?php endif; ?>
                            </td>
                            
                            <!-- Estado -->
                            <td>
                                <span class="wecc-status wecc-status-<?php echo esc_attr($status['class']); ?>" 
                                      style="padding: 4px 8px; border-radius: 3px; font-size: 11px; font-weight: 600;
                                             <?php 
                                             switch($status['class']) {
                                                 case 'active': echo 'background: #00a32a; color: white;'; break;
                                                 case 'blocked': echo 'background: #d63638; color: white;'; break;
                                                 case 'inactive': echo 'background: #dba617; color: white;'; break;
                                                 default: echo 'background: #8c8f94; color: white;';
                                             }
                                             ?>">
                                    <?php echo esc_html($status['text']); ?>
                                </span>
                                <?php if ($has_overdue): ?>
                                    <br><small style="color: #d63638;">⚠️ Con vencidos</small>
                                <?php endif; ?>
                            </td>
                            
                            <!-- Límite -->
                            <td>
                                <?php if ($account && $account->credit_limit > 0): ?>
                                    <strong><?php echo wc_price($account->credit_limit); ?></strong>
                                    <?php if ($account->payment_terms_days): ?>
                                        <br><small><?php echo $account->payment_terms_days; ?> días</small>
                                    <?php endif; ?>
                                <?php else: ?>
                                    <span style="color: #8c8f94;">-</span>
                                <?php endif; ?>
                            </td>
                            
                            <!-- Usado -->
                            <td>
                                <?php if ($balance && $balance['balance_used'] > 0): ?>
                                    <span style="color: #d63638; font-weight: 600;">
                                        <?php echo wc_price($balance['balance_used']); ?>
                                    </span>
                                <?php else: ?>
                                    <span style="color: #8c8f94;"><?php echo wc_price(0); ?></span>
                                <?php endif; ?>
                            </td>
                            
                            <!-- Disponible -->
                            <td>
                                <?php if ($balance): ?>
                                    <span style="color: #00a32a; font-weight: 600;">
                                        <?php echo wc_price($balance['available_credit']); ?>
                                    </span>
                                <?php else: ?>
                                    <span style="color: #8c8f94;">-</span>
                                <?php endif; ?>
                            </td>
                            
                            <!-- Vencido -->
                            <td>
                                <?php if ($has_overdue): ?>
                                    <?php
                                    // Calcular monto vencido
                                    global $wpdb;
                                    $overdue_amount = (float) $wpdb->get_var($wpdb->prepare(
                                        "SELECT SUM(remaining_amount) FROM {$wpdb->prefix}wecc_ledger l
                                         LEFT JOIN {$wpdb->prefix}wecc_credit_accounts a ON l.account_id = a.id
                                         WHERE a.user_id = %d AND l.type = 'charge' AND l.due_date < NOW() AND l.remaining_amount > 0",
                                        $user->ID
                                    ));
                                    ?>
                                    <span style="color: #d63638; font-weight: 600;">
                                        <?php echo wc_price($overdue_amount); ?>
                                    </span>
                                <?php else: ?>
                                    <span style="color: #8c8f94;"><?php echo wc_price(0); ?></span>
                                <?php endif; ?>
                            </td>
                            
                            <!-- Acciones -->
                            <td>
                                <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                                    <!-- Ver historial -->
                                    <a href="<?php echo esc_url($view_url); ?>" 
                                       class="button button-small" 
                                       title="<?php esc_attr_e('Ver historial completo', 'wc-enhanced-customers-credit'); ?>">
                                        <span class="dashicons dashicons-visibility" style="font-size: 13px; width: 13px; height: 13px;"></span>
                                    </a>
                                    
                                    <!-- Configurar crédito -->
                                    <?php if ($account && $account->credit_limit > 0): ?>
                                        <a href="<?php echo admin_url("admin.php?page=wecc-dashboard&tab=credit&action=enable&user_id={$user->ID}"); ?>" 
                                           class="button button-small" 
                                           title="<?php esc_attr_e('Configurar crédito', 'wc-enhanced-customers-credit'); ?>">
                                            <span class="dashicons dashicons-admin-settings" style="font-size: 13px; width: 13px; height: 13px;"></span>
                                        </a>
                                    <?php else: ?>
                                        <a href="<?php echo admin_url("admin.php?page=wecc-dashboard&tab=credit&action=enable&user_id={$user->ID}"); ?>" 
                                           class="button button-small button-primary" 
                                           title="<?php esc_attr_e('Activar crédito', 'wc-enhanced-customers-credit'); ?>">
                                            <span class="dashicons dashicons-yes-alt" style="font-size: 13px; width: 13px; height: 13px; color: white;"></span>
                                        </a>
                                    <?php endif; ?>
                                    
                                    <!-- Registrar pago (solo si tiene deuda) -->
                                    <?php if ($balance && $balance['balance_used'] > 0): ?>
                                        <a href="<?php echo esc_url($payment_url); ?>" 
                                           class="button button-small" 
                                           title="<?php esc_attr_e('Registrar pago', 'wc-enhanced-customers-credit'); ?>">
                                            <span class="dashicons dashicons-money-alt" style="font-size: 13px; width: 13px; height: 13px;"></span>
                                        </a>
                                    <?php endif; ?>
                                    
                                    <!-- Editar -->
                                    <a href="<?php echo esc_url($edit_url); ?>" 
                                       class="button button-small" 
                                       title="<?php esc_attr_e('Editar datos', 'wc-enhanced-customers-credit'); ?>">
                                        <span class="dashicons dashicons-edit" style="font-size: 13px; width: 13px; height: 13px;"></span>
                                    </a>
                                </div>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                <?php else: ?>
                    <tr>
                        <td colspan="8" style="text-align: center; padding: 40px;">
                            <?php if ($search): ?>
                                <?php printf(__('No se encontraron clientes con "%s".', 'wc-enhanced-customers-credit'), esc_html($search)); ?>
                            <?php else: ?>
                                <?php _e('No hay clientes registrados aún.', 'wc-enhanced-customers-credit'); ?>
                            <?php endif; ?>
                        </td>
                    </tr>
                <?php endif; ?>
            </tbody>
        </table>
    </div>
    
    <!-- Paginación -->
    <?php if ($pagination['total_pages'] > 1): ?>
        <div class="wecc-pagination" style="margin: 20px 0;">
            <div class="tablenav-pages">
                <span class="displaying-num">
                    <?php printf(__('%s elementos'), number_format_i18n($pagination['total_items'])); ?>
                </span>
                
                <?php
                $current = $pagination['current_page'];
                $total = $pagination['total_pages'];
                
                for ($i = 1; $i <= $total; $i++):
                    $url = add_query_arg([
                        'page' => 'wecc-dashboard',
                        'tab' => 'customers',
                        'paged' => $i,
                        's' => $search
                    ], admin_url('admin.php'));
                    
                    $class = $i === $current ? 'page-numbers current' : 'page-numbers';
                ?>
                    <a href="<?php echo esc_url($url); ?>" class="<?php echo $class; ?>">
                        <?php echo $i; ?>
                    </a>
                <?php endfor; ?>
            </div>
        </div>
    <?php endif; ?>
</div>

<style>
/* Estilos adicionales para la tabla */
.wecc-customers-list .wp-list-table th,
.wecc-customers-list .wp-list-table td {
    vertical-align: top;
    padding: 12px 8px;
}

.wecc-customers-list .button-small {
    padding: 4px 8px;
    font-size: 12px;
    line-height: 1;
    min-height: 26px;
}

.wecc-pagination .tablenav-pages {
    float: none;
    text-align: center;
}

.wecc-pagination .page-numbers {
    display: inline-block;
    padding: 6px 10px;
    margin: 0 2px;
    text-decoration: none;
    border: 1px solid #ddd;
    border-radius: 3px;
}

.wecc-pagination .page-numbers.current {
    background: #2271b1;
    color: white;
    border-color: #2271b1;
}

/* Row actions estilo WordPress */
.wecc-customer-row .row-actions {
    visibility: hidden;
    padding: 2px 0 0;
    color: #ddd;
}

.wecc-customer-row:hover .row-actions {
    visibility: visible;
    color: #000;
}

.wecc-customer-row .row-actions span {
    display: inline;
}

.wecc-customer-row .row-actions a {
    color: #2271b1;
    text-decoration: none;
}

.wecc-customer-row .row-actions a:hover {
    color: #135e96;
}

/* Estilo de título clickeable */
.wecc-customer-row .row-title {
    font-weight: 600;
    color: #2271b1;
    text-decoration: none;
}

.wecc-customer-row .row-title:hover {
    color: #135e96;
}

/* Botones con dashicons */
.wecc-customers-list .button-small .dashicons {
    vertical-align: middle;
    margin-top: -2px;
}
</style>
