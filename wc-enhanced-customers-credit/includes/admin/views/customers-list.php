<?php
if (!defined('ABSPATH')) exit;

/**
 * Vista: Lista de clientes con acciones rápidas
 * Variables disponibles: $customers, $search, $pagination
 */
?>

<div class="wecc-customers-list">
    <h3 style="margin: 20px 0 20px 0; color: #2271b1; border-bottom: 2px solid #2271b1; padding-bottom: 10px;">
        <?php _e('Gestión de Clientes', 'wc-enhanced-customers-credit'); ?>
    </h3>
    
    <!-- Tarjetas de estadísticas -->
    <div class="wecc-stats-cards" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px; margin-bottom: 30px;">
        
        <!-- Crédito Utilizado -->
        <div style="background: white; padding: 15px; border: 1px solid #c3c4c7; border-radius: 4px; text-align: center;">
            <h4 style="margin: 0 0 10px 0; color: #666; font-size: 14px;">Crédito Utilizado</h4>
            <div style="font-size: 20px; font-weight: 600; color: #d63638;">
                <?php echo wc_price($stats['total_credit_used']); ?>
            </div>
            <small style="color: #666;">Total en uso</small>
        </div>
        
        <!-- Monto Vencido -->
        <div style="background: white; padding: 15px; border: 1px solid #c3c4c7; border-radius: 4px; text-align: center;">
            <h4 style="margin: 0 0 10px 0; color: #666; font-size: 14px;">Monto Vencido</h4>
            <div style="font-size: 20px; font-weight: 600; color: <?php echo $stats['total_overdue_amount'] > 0 ? '#d63638' : '#8c8f94'; ?>;">
                <?php echo wc_price($stats['total_overdue_amount']); ?>
            </div>
            <small style="color: #666;">Pagos pendientes</small>
        </div>
        
        <!-- Clientes con Vencidos -->
        <div style="background: white; padding: 15px; border: 1px solid #c3c4c7; border-radius: 4px; text-align: center;">
            <h4 style="margin: 0 0 10px 0; color: #666; font-size: 14px;">Clientes con Vencidos</h4>
            <div style="font-size: 20px; font-weight: 600; color: <?php echo $stats['clients_with_overdue'] > 0 ? '#d63638' : '#00a32a'; ?>;">
                <?php echo number_format($stats['clients_with_overdue']); ?>
            </div>
            <small style="color: #666;">Requieren atención</small>
        </div>
        
        <!-- Clientes con Crédito -->
        <div style="background: white; padding: 15px; border: 1px solid #c3c4c7; border-radius: 4px; text-align: center;">
            <h4 style="margin: 0 0 10px 0; color: #666; font-size: 14px;">Clientes con Crédito</h4>
            <div style="font-size: 20px; font-weight: 600; color: #2271b1;">
                <?php echo number_format($stats['clients_with_credit']); ?>
            </div>
            <small style="color: #666;">Crédito habilitado</small>
        </div>
        
    </div>
    <!-- Búsqueda y filtros -->
    <div class="wecc-list-header" style="margin: 20px 0;">
        <!-- Barra de búsqueda y acción -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
            <div class="wecc-search-form">
                <form method="get" style="display: flex; gap: 10px;">
                    <input type="hidden" name="page" value="wecc-dashboard">
                    <input type="hidden" name="tab" value="customers">
                    <!-- Preservar filtros existentes -->
                    <input type="hidden" name="filter_credit_status" value="<?php echo esc_attr($filters['credit_status']); ?>">
                    <input type="hidden" name="filter_payment_status" value="<?php echo esc_attr($filters['payment_status']); ?>">
                    <input type="hidden" name="filter_limit_from" value="<?php echo esc_attr($filters['limit_from']); ?>">
                    <input type="hidden" name="filter_limit_to" value="<?php echo esc_attr($filters['limit_to']); ?>">
                    <input type="hidden" name="orderby" value="<?php echo esc_attr($orderby); ?>">
                    <input type="hidden" name="order" value="<?php echo esc_attr($order); ?>">
                    
                    <input type="search" name="s" value="<?php echo esc_attr($search); ?>" 
                           placeholder="<?php echo esc_attr__('Buscar clientes...', 'wc-enhanced-customers-credit'); ?>" 
                           style="width: 300px;">
                    <?php submit_button(__('Buscar', 'wc-enhanced-customers-credit'), 'secondary', false, false, ['style' => 'margin: 0;']); ?>
                    <?php if ($search): ?>
                        <a href="<?php echo remove_query_arg('s'); ?>" class="button"><?php _e('Limpiar', 'wc-enhanced-customers-credit'); ?></a>
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
        
        <!-- Panel de filtros -->
        <div class="wecc-filters-panel" style="background: white; padding: 15px; border: 1px solid #ddd; border-radius: 4px;">
            <h4 style="margin: 0 0 15px 0; color: #2271b1; display: flex; align-items: center;">
                <span class="dashicons dashicons-filter" style="margin-right: 8px;"></span>
                Filtros
                <?php if (!empty(array_filter($filters))): ?>
                    <span style="background: #00a32a; color: white; padding: 2px 8px; border-radius: 10px; font-size: 11px; margin-left: 10px;">
                        Activos
                    </span>
                <?php endif; ?>
            </h4>
            
            <form method="get" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; align-items: end;">
                <!-- Preservar parámetros existentes -->
                <input type="hidden" name="page" value="wecc-dashboard">
                <input type="hidden" name="tab" value="customers">
                <input type="hidden" name="s" value="<?php echo esc_attr($search); ?>">
                <input type="hidden" name="orderby" value="<?php echo esc_attr($orderby); ?>">
                <input type="hidden" name="order" value="<?php echo esc_attr($order); ?>">
                
                <!-- Filtro por estado de crédito -->
                <div>
                    <label for="filter_credit_status" style="display: block; font-weight: 600; margin-bottom: 5px; color: #555;">Estado de Crédito:</label>
                    <select name="filter_credit_status" id="filter_credit_status" style="width: 100%; padding: 6px 8px; border: 1px solid #ddd; border-radius: 3px;">
                        <option value="">Todos los estados</option>
                        <option value="no-credit" <?php selected($filters['credit_status'], 'no-credit'); ?>>Sin Crédito</option>
                        <option value="active" <?php selected($filters['credit_status'], 'active'); ?>>Activo</option>
                        <option value="blocked" <?php selected($filters['credit_status'], 'blocked'); ?>>Bloqueado</option>
                        <option value="inactive" <?php selected($filters['credit_status'], 'inactive'); ?>>Inactivo</option>
                    </select>
                </div>
                
                <!-- Filtro por situación de pago -->
                <div>
                    <label for="filter_payment_status" style="display: block; font-weight: 600; margin-bottom: 5px; color: #555;">Situación de Pago:</label>
                    <select name="filter_payment_status" id="filter_payment_status" style="width: 100%; padding: 6px 8px; border: 1px solid #ddd; border-radius: 3px;">
                        <option value="">Todas las situaciones</option>
                        <option value="no-debt" <?php selected($filters['payment_status'], 'no-debt'); ?>>Sin Deuda</option>
                        <option value="with-debt" <?php selected($filters['payment_status'], 'with-debt'); ?>>Con Crédito Usado</option>
                        <option value="overdue" <?php selected($filters['payment_status'], 'overdue'); ?>>Con Pagos Vencidos</option>
                    </select>
                </div>
                
                <!-- Filtro límite desde -->
                <div>
                    <label for="filter_limit_from" style="display: block; font-weight: 600; margin-bottom: 5px; color: #555;">Límite Desde:</label>
                    <input type="number" name="filter_limit_from" id="filter_limit_from" 
                           value="<?php echo esc_attr($filters['limit_from'] > 0 ? $filters['limit_from'] : ''); ?>"
                           placeholder="0.00" step="0.01" min="0"
                           style="width: 100%; padding: 6px 8px; border: 1px solid #ddd; border-radius: 3px;">
                </div>
                
                <!-- Filtro límite hasta -->
                <div>
                    <label for="filter_limit_to" style="display: block; font-weight: 600; margin-bottom: 5px; color: #555;">Límite Hasta:</label>
                    <input type="number" name="filter_limit_to" id="filter_limit_to" 
                           value="<?php echo esc_attr($filters['limit_to'] > 0 ? $filters['limit_to'] : ''); ?>"
                           placeholder="0.00" step="0.01" min="0"
                           style="width: 100%; padding: 6px 8px; border: 1px solid #ddd; border-radius: 3px;">
                </div>
                
                <!-- Botones -->
                <div style="display: flex; gap: 8px;">
                    <button type="submit" class="button button-primary" style="display: flex; align-items: center; gap: 5px;">
                        <span class="dashicons dashicons-filter" style="font-size: 16px; line-height: 1;"></span>
                        Filtrar
                    </button>
                    
                    <?php if (!empty(array_filter($filters))): ?>
                        <a href="<?php echo remove_query_arg(['filter_credit_status', 'filter_payment_status', 'filter_limit_from', 'filter_limit_to', 'paged', 'orderby', 'order']); ?>" 
                           class="button" style="display: flex; align-items: center; gap: 5px;">
                            <span class="dashicons dashicons-dismiss" style="font-size: 16px; line-height: 1;"></span>
                            Limpiar
                        </a>
                    <?php endif; ?>
                </div>
            </form>
        </div>
    </div>
    
    <!-- Tabla principal -->
    <div class="wecc-table-wrapper">
        <table class="wp-list-table widefat fixed striped">
            <thead>
                <tr>
                    <?php
                    // Función helper para crear headers ordenables
                    function wecc_sortable_header($column_key, $label, $current_orderby, $current_order, $search, $filters) {
                        $base_url = admin_url('admin.php');
                        $params = [
                            'page' => 'wecc-dashboard',
                            'tab' => 'customers',
                            's' => $search,
                            'filter_credit_status' => $filters['credit_status'],
                            'filter_payment_status' => $filters['payment_status'],
                            'filter_limit_from' => $filters['limit_from'],
                            'filter_limit_to' => $filters['limit_to']
                        ];
                        
                        // Determinar el nuevo orden
                        if ($current_orderby === $column_key) {
                            $new_order = $current_order === 'ASC' ? 'DESC' : 'ASC';
                            $arrow = $current_order === 'ASC' ? ' ▲' : ' ▼';
                        } else {
                            $new_order = 'ASC';
                            $arrow = '';
                        }
                        
                        $params['orderby'] = $column_key;
                        $params['order'] = $new_order;
                        
                        $url = add_query_arg($params, $base_url);
                        
                        echo '<th><a href="' . esc_url($url) . '" style="text-decoration: none; color: inherit; font-weight: 600;">' . 
                             esc_html($label) . '<span style="color: #2271b1;">' . $arrow . '</span></a></th>';
                    }
                    ?>
                    
                    <?php wecc_sortable_header('name', __('Cliente', 'wc-enhanced-customers-credit'), $orderby, $order, $search, $filters); ?>
                    <?php wecc_sortable_header('email', __('Email', 'wc-enhanced-customers-credit'), $orderby, $order, $search, $filters); ?>
                    <?php wecc_sortable_header('status', __('Estado', 'wc-enhanced-customers-credit'), $orderby, $order, $search, $filters); ?>
                    <?php wecc_sortable_header('limit', __('Límite', 'wc-enhanced-customers-credit'), $orderby, $order, $search, $filters); ?>
                    <?php wecc_sortable_header('used', __('Usado', 'wc-enhanced-customers-credit'), $orderby, $order, $search, $filters); ?>
                    <?php wecc_sortable_header('available', __('Disponible', 'wc-enhanced-customers-credit'), $orderby, $order, $search, $filters); ?>
                    <?php wecc_sortable_header('overdue', __('Vencido', 'wc-enhanced-customers-credit'), $orderby, $order, $search, $filters); ?>
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
                                            <a href="<?php echo admin_url("admin.php?page=wecc-dashboard&tab=credit&user_id={$user->ID}"); ?>" 
                                               aria-label="Configurar crédito de <?php echo esc_attr($profile['full_name'] ?: $user->display_name); ?>">
                                                Configurar crédito
                                            </a> |
                                        </span>
                                    <?php else: ?>
                                        <span class="activate">
                                            <a href="<?php echo admin_url("admin.php?page=wecc-dashboard&tab=credit&user_id={$user->ID}"); ?>" 
                                               aria-label="Activar crédito para <?php echo esc_attr($profile['full_name'] ?: $user->display_name); ?>"
                                               style="color: #2271b1; font-weight: 600;">
                                                Activar crédito
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
                                    // Calcular monto vencido dinámicamente - CORREGIDO
                                    global $wpdb;
                                    $overdue_amount = (float) $wpdb->get_var($wpdb->prepare(
                                        "SELECT SUM(GREATEST(l.amount - COALESCE(payments.paid_amount, 0), 0)) as total_overdue
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
                                        $user->ID
                                    ));
                                    ?>
                                    <span style="color: #d63638; font-weight: 600;">
                                        <?php echo wc_price($overdue_amount ?: 0); ?>
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
                                        <a href="<?php echo admin_url("admin.php?page=wecc-dashboard&tab=credit&user_id={$user->ID}"); ?>" 
                                           class="button button-small" 
                                           title="<?php esc_attr_e('Configurar crédito', 'wc-enhanced-customers-credit'); ?>">
                                            <span class="dashicons dashicons-money-alt" style="font-size: 13px; width: 13px; height: 13px;"></span>
                                        </a>
                                    <?php else: ?>
                                        <a href="<?php echo admin_url("admin.php?page=wecc-dashboard&tab=credit&user_id={$user->ID}"); ?>" 
                                           class="button button-small button-primary" 
                                           title="<?php esc_attr_e('Activar crédito', 'wc-enhanced-customers-credit'); ?>">
                                            <span class="dashicons dashicons-money-alt" style="font-size: 13px; width: 13px; height: 13px; color: white;"></span>
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
                            <?php if ($search || !empty(array_filter($filters))): ?>
                                <?php if ($search && !empty(array_filter($filters))): ?>
                                    <?php printf(__('No se encontraron clientes con "%s" y los filtros aplicados.', 'wc-enhanced-customers-credit'), esc_html($search)); ?>
                                <?php elseif ($search): ?>
                                    <?php printf(__('No se encontraron clientes con "%s".', 'wc-enhanced-customers-credit'), esc_html($search)); ?>
                                <?php else: ?>
                                    <?php _e('No se encontraron clientes con los filtros aplicados.', 'wc-enhanced-customers-credit'); ?>
                                <?php endif; ?>
                                <br><br>
                                <a href="<?php echo remove_query_arg(['s', 'filter_credit_status', 'filter_payment_status', 'filter_limit_from', 'filter_limit_to', 'paged', 'orderby', 'order']); ?>" class="button">
                                    <?php _e('Limpiar búsqueda y filtros', 'wc-enhanced-customers-credit'); ?>
                                </a>
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
                    <?php if ($pagination['showing_filtered']): ?>
                        <?php printf(__('%s elementos filtrados'), number_format_i18n($pagination['total_items'])); ?>
                    <?php else: ?>
                        <?php printf(__('%s elementos'), number_format_i18n($pagination['total_items'])); ?>
                    <?php endif; ?>
                </span>
                
                <?php
                $current = $pagination['current_page'];
                $total = $pagination['total_pages'];
                
                for ($i = 1; $i <= $total; $i++):
                    $url = add_query_arg([
                        'page' => 'wecc-dashboard',
                        'tab' => 'customers',
                        'paged' => $i,
                        's' => $search,
                        'filter_credit_status' => $filters['credit_status'],
                        'filter_payment_status' => $filters['payment_status'],
                        'filter_limit_from' => $filters['limit_from'],
                        'filter_limit_to' => $filters['limit_to'],
                        'orderby' => $orderby,
                        'order' => $order
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

<script type="text/javascript">
jQuery(document).ready(function($) {
    // Aplicar filtros automáticamente cuando cambian los dropdowns
    $('#filter_credit_status, #filter_payment_status').on('change', function() {
        // Obtener el formulario de filtros
        var $form = $(this).closest('form');
        
        // Resetear página a 1 cuando se aplican filtros
        $form.find('input[name="paged"]').remove();
        
        // Enviar formulario automáticamente
        $form.submit();
    });
    
    // Para los campos numéricos, aplicar filtro después de un pequeño delay
    var filterTimeout;
    $('#filter_limit_from, #filter_limit_to').on('input', function() {
        var $form = $(this).closest('form');
        
        // Limpiar timeout anterior
        if (filterTimeout) {
            clearTimeout(filterTimeout);
        }
        
        // Aplicar filtro después de 1 segundo de inactividad
        filterTimeout = setTimeout(function() {
            // Resetear página a 1
            $form.find('input[name="paged"]').remove();
            
            // Solo enviar si hay algún valor
            var fromValue = $('#filter_limit_from').val();
            var toValue = $('#filter_limit_to').val();
            
            if (fromValue || toValue) {
                $form.submit();
            }
        }, 1000);
    });
});
</script>
