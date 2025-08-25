<?php
if (!defined('ABSPATH')) exit;

/**
 * WECC Credit Controller
 * 
 * Maneja configuración de crédito, aprobaciones y límites
 */
class WECC_Credit_Controller {
    
    private $customer_service;
    private $balance_service;
    
    public function __construct() {
        $this->init_dependencies();
    }
    
    /**
     * Inicializar servicios
     */
    private function init_dependencies(): void {
        if (function_exists('wecc_service')) {
            try {
                $this->customer_service = wecc_service('customer_service');
                $this->balance_service = wecc_service('balance_service');
            } catch (Exception $e) {
                error_log('WECC Credit Controller: Error inicializando servicios - ' . $e->getMessage());
            }
        }
    }
    
    /**
     * Renderiza página de configuración de crédito
     */
    public function render_credit_config(): void {
        echo '<div class="wecc-credit-config">';
        
        // Botones de acción - ARRIBA Y HORIZONTALES
        echo '<div style="display: flex; gap: 10px; margin-bottom: 20px; align-items: center; flex-wrap: wrap;">';
        echo '<a href="' . admin_url('admin.php?page=wecc-dashboard') . '" class="button">';
        echo '<span class="dashicons dashicons-arrow-left-alt" style="line-height: 1.2; margin-right: 5px;"></span>';
        echo __('Volver al Dashboard', 'wc-enhanced-customers-credit');
        echo '</a>';
        echo '<a href="' . admin_url('admin.php?page=wecc-dashboard&tab=customers') . '" class="button">';
        echo '<span class="dashicons dashicons-admin-users" style="line-height: 1.2; margin-right: 5px;"></span>';
        echo __('Ver Clientes', 'wc-enhanced-customers-credit');
        echo '</a>';
        echo '</div>';
        
        // Contenedor principal con diseño consistente
        echo '<div style="background: white; padding: 20px; border: 1px solid #c3c4c7; border-radius: 4px; margin-bottom: 20px;">';
        echo '<h3 style="margin-top: 0; color: #2271b1; border-bottom: 2px solid #2271b1; padding-bottom: 10px;">' . __('Configuración de Crédito', 'wc-enhanced-customers-credit') . '</h3>';
        echo '<p style="color: #666; margin-bottom: 20px;">' . __('Gestiona las líneas de crédito de tus clientes y habilita nuevos créditos.', 'wc-enhanced-customers-credit') . '</p>';
        
        // Buscador para habilitar crédito con diseño mejorado
        echo '<div style="background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #2271b1; margin-bottom: 20px;">';
        echo '<h4 style="margin: 0 0 15px 0; color: #2271b1; font-size: 14px; display: flex; align-items: center;">';
        echo '<span class="dashicons dashicons-plus-alt" style="margin-right: 6px; font-size: 14px;"></span>';
        echo __('Habilitar Crédito para Cliente', 'wc-enhanced-customers-credit');
        echo '</h4>';
        echo '<form method="get" style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">';
        echo '<input type="hidden" name="page" value="wecc-dashboard">';
        echo '<input type="hidden" name="tab" value="credit">';
        echo '<input type="hidden" name="action" value="enable">';
        echo '<input type="number" name="user_id" placeholder="' . __('ID del usuario...', 'wc-enhanced-customers-credit') . '" style="width: 150px; padding: 6px 10px; border: 1px solid #ccc; border-radius: 4px;" required>';
        echo '<button type="submit" class="button button-primary">';
        echo '<span class="dashicons dashicons-admin-settings" style="line-height: 1.2; margin-right: 5px;"></span>';
        echo __('Configurar Crédito', 'wc-enhanced-customers-credit');
        echo '</button>';
        echo '</form>';
        echo '<p class="description" style="margin-top: 10px; margin-bottom: 0; color: #666;">' . __('Introduce el ID del usuario para configurar su línea de crédito.', 'wc-enhanced-customers-credit') . '</p>';
        echo '</div>';
        
        echo '</div>'; // Cerrar contenedor principal
        
        // Lista básica de clientes con crédito
        $this->render_clients_with_credit();
        
        echo '</div>';
    }
    
    /**
     * Lista clientes que tienen crédito
     */
    private function render_clients_with_credit(): void {
        global $wpdb;
        
        $accounts = $wpdb->get_results(
            "SELECT a.*, u.display_name, u.user_email, p.full_name
             FROM {$wpdb->prefix}wecc_credit_accounts a
             LEFT JOIN {$wpdb->prefix}users u ON a.user_id = u.ID
             LEFT JOIN {$wpdb->prefix}wecc_customer_profiles p ON a.user_id = p.user_id
             WHERE a.credit_limit > 0
             ORDER BY a.created_at DESC
             LIMIT 20",
            ARRAY_A
        );
        
        echo '<div style="background: white; padding: 20px; border: 1px solid #c3c4c7; border-radius: 4px;">';
        echo '<h3 style="margin-top: 0; color: #2271b1; border-bottom: 2px solid #2271b1; padding-bottom: 10px;">' . __('Clientes con Crédito Habilitado', 'wc-enhanced-customers-credit') . '</h3>';
        
        if (!empty($accounts)) {
            echo '<table class="wp-list-table widefat fixed striped" style="margin-top: 15px;">';
            echo '<thead>';
            echo '<tr>';
            echo '<th style="padding: 10px;">' . __('Cliente', 'wc-enhanced-customers-credit') . '</th>';
            echo '<th style="padding: 10px;">' . __('Límite', 'wc-enhanced-customers-credit') . '</th>';
            echo '<th style="padding: 10px;">' . __('Usado', 'wc-enhanced-customers-credit') . '</th>';
            echo '<th style="padding: 10px;">' . __('Estado', 'wc-enhanced-customers-credit') . '</th>';
            echo '<th style="padding: 10px;">' . __('Acciones', 'wc-enhanced-customers-credit') . '</th>';
            echo '</tr>';
            echo '</thead>';
            echo '<tbody>';
            
            foreach ($accounts as $account) {
                echo '<tr>';
                echo '<td style="padding: 10px;">' . esc_html($account['full_name'] ?: $account['display_name']) . '<br><small style="color: #666;">' . esc_html($account['user_email']) . '</small></td>';
                echo '<td style="padding: 10px; font-weight: 600;">' . wc_price($account['credit_limit']) . '</td>';
                echo '<td style="padding: 10px; color: #d63638; font-weight: 600;">' . wc_price($account['balance_used']) . '</td>';
                echo '<td style="padding: 10px;">';
                if ($account['status'] === 'active') {
                    echo '<span style="background: #00a32a; color: white; padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: 600;">✅ Activo</span>';
                } else {
                    echo '<span style="background: #d63638; color: white; padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: 600;">❌ Inactivo</span>';
                }
                echo '</td>';
                echo '<td style="padding: 10px;">';
                echo '<a href="' . admin_url("admin.php?page=wecc-dashboard&tab=credit&action=enable&user_id={$account['user_id']}") . '" class="button button-small" style="margin-right: 5px;">';
                echo '<span class="dashicons dashicons-admin-settings" style="line-height: 1.2; margin-right: 3px; font-size: 14px;"></span>';
                echo __('Configurar', 'wc-enhanced-customers-credit');
                echo '</a>';
                echo '<a href="' . admin_url("admin.php?page=wecc-dashboard&tab=customers&action=view&user_id={$account['user_id']}") . '" class="button button-small">';
                echo '<span class="dashicons dashicons-visibility" style="line-height: 1.2; margin-right: 3px; font-size: 14px;"></span>';
                echo __('Ver', 'wc-enhanced-customers-credit');
                echo '</a>';
                echo '</td>';
                echo '</tr>';
            }
            
            echo '</tbody>';
            echo '</table>';
        } else {
            echo '<div style="text-align: center; padding: 40px; color: #666; background: #f8f9fa; border-radius: 6px; margin-top: 15px;">';
            echo '<span class="dashicons dashicons-info" style="font-size: 24px; margin-bottom: 10px; display: block;"></span>';
            echo '<p style="margin: 0; font-size: 14px;">' . __('No hay clientes con crédito habilitado aún.', 'wc-enhanced-customers-credit') . '</p>';
            echo '<p style="margin: 8px 0 0 0; font-size: 13px; color: #888;">' . __('Usa el formulario de arriba para habilitar crédito a un cliente.', 'wc-enhanced-customers-credit') . '</p>';
            echo '</div>';
        }
        
        echo '</div>';
    }
    
    /**
     * Renderiza formulario para habilitar/configurar crédito de un cliente
     */
    public function render_enable_credit_form(): void {
        $user_id = (int) ($_GET['user_id'] ?? 0);
        
        // Si no hay user_id, redirect a lista de clientes
        if (!$user_id) {
            wp_redirect(admin_url('admin.php?page=wecc-dashboard&tab=customers'));
            exit;
        }
        
        $user = get_user_by('id', $user_id);
        if (!$user) {
            echo '<div class="notice notice-error"><p>' . __('Usuario no encontrado.', 'wc-enhanced-customers-credit') . '</p></div>';
            wp_redirect(admin_url('admin.php?page=wecc-dashboard&tab=customers'));
            exit;
        }
        
        $account = wecc_get_or_create_account($user_id);
        $profile = null;
        if ($this->customer_service) {
            $profile = $this->customer_service->get_profile_by_user($user_id);
        }
        
        echo '<div class="wecc-enable-credit-form">';
        
        echo '<h3 style="margin: 20px 0 20px 0; color: #2271b1; border-bottom: 2px solid #2271b1; padding-bottom: 10px;">' . sprintf(__('Configurar Crédito para %s', 'wc-enhanced-customers-credit'), esc_html($user->display_name)) . '</h3>';
        
        // Botones de acción - ARRIBA Y HORIZONTALES
        echo '<div style="display: flex; gap: 10px; margin-bottom: 20px; align-items: center; flex-wrap: wrap;">';
        echo '<a href="' . admin_url("admin.php?page=wecc-dashboard&tab=customers&action=view&user_id={$user_id}") . '" class="button">';
        echo '<span class="dashicons dashicons-visibility" style="line-height: 1.2; margin-right: 5px;"></span>';
        echo __('Ver Historial', 'wc-enhanced-customers-credit');
        echo '</a>';
        echo '</div>';
        
        // Contenedor principal con fondo blanco
        echo '<div style="background: white; padding: 20px; border: 1px solid #c3c4c7; border-radius: 4px; margin-bottom: 20px;">';
        
        // Información del cliente en bloque estilo card MEJORADO
        echo '<div style="background: white; border: 1px solid #ddd; border-radius: 8px; border-left: 4px solid #2271b1; overflow: hidden; margin-bottom: 20px;">';
        echo '<div style="background: #f8f9fa; padding: 12px 15px; border-bottom: 1px solid #eee;">';
        echo '<h4 style="margin: 0; color: #2271b1; font-size: 13px; font-weight: 600; display: flex; align-items: center;">';
        echo '<span class="dashicons dashicons-admin-users" style="margin-right: 6px; font-size: 14px;"></span>';
        echo 'INFORMACIÓN DEL CLIENTE';
        echo '</h4>';
        echo '</div>';
        echo '<div style="padding: 15px; font-size: 13px; line-height: 1.6;">';
        echo '<div style="margin-bottom: 8px;">';
        echo '<strong style="color: #555; display: inline-block; min-width: 80px;">Nombre:</strong>';
        echo '<span style="color: #333;">' . esc_html($user->display_name) . '</span>';
        echo '</div>';
        echo '<div style="margin-bottom: 8px;">';
        echo '<strong style="color: #555; display: inline-block; min-width: 80px;">Email:</strong>';
        echo '<span style="color: #333;">' . esc_html($user->user_email) . '</span>';
        echo '</div>';
        if ($account && $account->credit_limit > 0) {
            echo '<div style="margin-bottom: 8px;">';
            echo '<strong style="color: #555; display: inline-block; min-width: 80px;">Estado:</strong>';
            echo '<span style="background: #00a32a; color: white; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 600;">✅ Crédito habilitado</span>';
            echo '</div>';
            echo '<div style="margin-bottom: 8px;">';
            echo '<strong style="color: #555; display: inline-block; min-width: 80px;">Límite:</strong>';
            echo '<span style="color: #333;">' . wc_price($account->credit_limit) . '</span>';
            echo '</div>';
            echo '<div style="margin-bottom: 8px;">';
            echo '<strong style="color: #555; display: inline-block; min-width: 80px;">Usado:</strong>';
            echo '<span style="color: #333;">' . wc_price($account->balance_used) . '</span>';
            echo '</div>';
        } else {
            echo '<div style="margin-bottom: 8px;">';
            echo '<strong style="color: #555; display: inline-block; min-width: 80px;">Estado:</strong>';
            echo '<span style="background: #d63638; color: white; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 600;">❌ Sin crédito</span>';
            echo '</div>';
        }
        echo '</div>';
        echo '</div>';
        
        echo '<form method="post">';
        wp_nonce_field('wecc_enable_credit', 'wecc_credit_nonce');
        echo '<input type="hidden" name="user_id" value="' . $user_id . '">';
        
        echo '<table class="form-table" style="background: white;">';
        
        // Habilitar crédito
        echo '<tr>';
        echo '<th scope="row"><label for="enable_credit">' . __('Habilitar Crédito', 'wc-enhanced-customers-credit') . '</label></th>';
        echo '<td>';
        echo '<label for="enable_credit" style="display: flex; align-items: center; gap: 8px;">';
        echo '<input type="checkbox" name="enable_credit" id="enable_credit" value="1" ' . checked($account && $account->credit_limit > 0, true, false) . '>';
        echo '<span>' . __('Habilitar línea de crédito para este cliente', 'wc-enhanced-customers-credit') . '</span>';
        echo '</label>';
        echo '<p class="description">' . __('Permite al cliente realizar compras a crédito hasta el límite establecido.', 'wc-enhanced-customers-credit') . '</p>';
        echo '</td>';
        echo '</tr>';
        
        // Límite de crédito
        echo '<tr>';
        echo '<th scope="row"><label for="credit_limit">' . __('Límite de Crédito', 'wc-enhanced-customers-credit') . '</label></th>';
        echo '<td>';
        echo '<input type="number" name="credit_limit" id="credit_limit" value="' . esc_attr($account ? $account->credit_limit : '') . '" class="regular-text" step="0.01" min="0" style="width: 200px;">';
        echo '<p class="description">' . __('Monto máximo que el cliente puede deber. Formato: 1000.00', 'wc-enhanced-customers-credit') . '</p>';
        echo '</td>';
        echo '</tr>';
        
        // Días de crédito
        echo '<tr>';
        echo '<th scope="row"><label for="payment_terms_days">' . __('Días de Crédito', 'wc-enhanced-customers-credit') . '</label></th>';
        echo '<td>';
        echo '<input type="number" name="payment_terms_days" id="payment_terms_days" value="' . esc_attr($account ? $account->payment_terms_days : 30) . '" class="small-text" min="1" max="365" style="width: 100px;">';
        echo ' <span style="color: #666;">días</span>';
        echo '<p class="description">' . __('Plazo que tiene el cliente para pagar desde la fecha de compra.', 'wc-enhanced-customers-credit') . '</p>';
        echo '</td>';
        echo '</tr>';
        
        // NUEVO: Configuración de bloqueo total por adeudos vencidos
        echo '<tr>';
        echo '<th scope="row">' . __('Bloqueo por Adeudos', 'wc-enhanced-customers-credit') . '</th>';
        echo '<td>';
        
        $block_setting = isset($account->block_all_purchases_when_overdue) ? (bool) $account->block_all_purchases_when_overdue : true;
        
        echo '<fieldset>';
        echo '<legend class="screen-reader-text"><span>' . __('Comportamiento cuando hay adeudos vencidos', 'wc-enhanced-customers-credit') . '</span></legend>';
        
        // Opción 1: Solo bloquear crédito
        echo '<label style="display: block; margin-bottom: 8px;">';
        echo '<input type="radio" name="block_all_purchases_when_overdue" value="0" ' . checked($block_setting, false, false) . ' style="margin-right: 8px;">';
        echo '<strong>' . __('Solo bloquear pagos con crédito', 'wc-enhanced-customers-credit') . '</strong>';
        echo '<br><span style="color: #666; font-size: 13px; margin-left: 20px;">' . __('El cliente puede seguir comprando con otros métodos de pago', 'wc-enhanced-customers-credit') . '</span>';
        echo '</label>';
        
        // Opción 2: Bloquear todas las compras
        echo '<label style="display: block; margin-bottom: 8px;">';
        echo '<input type="radio" name="block_all_purchases_when_overdue" value="1" ' . checked($block_setting, true, false) . ' style="margin-right: 8px;">';
        echo '<strong style="color: #d63638;">' . __('🔒 Bloquear todas las compras hasta pagar adeudos', 'wc-enhanced-customers-credit') . '</strong>';
        echo '<br><span style="color: #666; font-size: 13px; margin-left: 20px;">' . __('El cliente NO puede comprar nada hasta regularizar su situación', 'wc-enhanced-customers-credit') . '</span>';
        echo '</label>';
        
        echo '</fieldset>';
        echo '<p class="description" style="margin-top: 10px;">' . __('Define qué sucede cuando el cliente tiene pagos vencidos. <strong>Recomendado</strong>: Bloquear todas las compras para mejor control de cartera.', 'wc-enhanced-customers-credit') . '</p>';
        echo '</td>';
        echo '</tr>';
        
        echo '</table>';
        
        echo '<input type="hidden" name="wecc_action" value="enable_credit">';
        
        // Botones del formulario con iconos
        echo '<div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd;">';
        echo '<button type="submit" class="button button-primary" style="margin-right: 10px;">';
        echo '<span class="dashicons dashicons-yes-alt" style="line-height: 1.2; margin-right: 5px;"></span>';
        echo __('Guardar Configuración', 'wc-enhanced-customers-credit');
        echo '</button>';
        echo '<a href="' . admin_url("admin.php?page=wecc-dashboard&tab=customers&action=view&user_id={$user_id}") . '" class="button">';
        echo '<span class="dashicons dashicons-visibility" style="line-height: 1.2; margin-right: 5px;"></span>';
        echo __('Ver Historial', 'wc-enhanced-customers-credit');
        echo '</a>';
        echo '</div>';
        
        echo '</form>';
        echo '</div>'; // Cerrar contenedor blanco
        echo '</div>'; // Cerrar wecc-enable-credit-form
    }
    
    /**
     * Maneja habilitación de crédito
     */
    public function handle_enable_credit(): void {
        if (!wp_verify_nonce($_POST['wecc_credit_nonce'] ?? '', 'wecc_enable_credit')) {
            wp_redirect(add_query_arg('message', 'error_permissions', wp_get_referer()));
            exit;
        }
        
        $user_id = (int) ($_POST['user_id'] ?? 0);
        if (!$user_id) {
            wp_redirect(add_query_arg('message', 'error_saving', wp_get_referer()));
            exit;
        }
        
        try {
            $enable_credit = isset($_POST['enable_credit']) && $_POST['enable_credit'] === '1';
            $credit_limit = $enable_credit ? (float) ($_POST['credit_limit'] ?? 0) : 0;
            $payment_terms_days = max(1, min(365, (int) ($_POST['payment_terms_days'] ?? 30)));
            
            // NUEVA CONFIGURACIÓN: Bloqueo total por adeudos vencidos
            $block_all_purchases = isset($_POST['block_all_purchases_when_overdue']) ? (int) $_POST['block_all_purchases_when_overdue'] : 1;
            
            // Crear o actualizar cuenta
            $account = wecc_get_or_create_account($user_id);
            
            global $wpdb;
            $result = $wpdb->update(
                $wpdb->prefix . 'wecc_credit_accounts',
                [
                    'credit_limit' => $credit_limit,
                    'payment_terms_days' => $payment_terms_days,
                    'block_all_purchases_when_overdue' => $block_all_purchases,  // NUEVO CAMPO
                    'available_credit' => max(0, $credit_limit - ($account->balance_used ?? 0)),
                    'status' => $enable_credit ? 'active' : 'inactive',
                    'updated_at' => current_time('mysql')
                ],
                ['user_id' => $user_id],
                ['%f', '%d', '%d', '%f', '%s', '%s'],  // ACTUALIZADO: agregamos %d para el nuevo campo
                ['%d']
            );
            
            if ($result === false) {
                throw new Exception('Error actualizando configuración de crédito');
            }
            
            // Log para debug
            error_log("WECC: Configuración de crédito actualizada - Usuario: $user_id, Bloqueo total: $block_all_purchases");
            
            // Redirigir a la misma página con mensaje de éxito
            $redirect_url = admin_url("admin.php?page=wecc-dashboard&tab=credit&user_id={$user_id}&message=credit_saved");
            wp_redirect($redirect_url);
            exit;
            
        } catch (Exception $e) {
            error_log('Error enabling credit: ' . $e->getMessage());
            wp_redirect(add_query_arg('message', 'error_saving', wp_get_referer()));
            exit;
        }
    }
    
    /**
     * Maneja actualización de límites de crédito
     */
    public function handle_update_limits(): void {
        // TODO: Implementar actualización masiva de límites
    }
}
