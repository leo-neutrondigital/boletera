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
        echo '<h3>' . __('Configuración de Crédito', 'wc-enhanced-customers-credit') . '</h3>';
        echo '<p>' . __('Aquí podrás habilitar crédito para clientes y gestionar aprobaciones.', 'wc-enhanced-customers-credit') . '</p>';
        
        // Buscador para habilitar crédito
        echo '<div class="wecc-enable-credit" style="background: white; padding: 20px; border: 1px solid #c3c4c7; border-radius: 4px; margin-bottom: 20px;">';
        echo '<h4>' . __('Habilitar Crédito para Cliente', 'wc-enhanced-customers-credit') . '</h4>';
        echo '<form method="get">';
        echo '<input type="hidden" name="page" value="wecc-dashboard">';
        echo '<input type="hidden" name="tab" value="credit">';
        echo '<input type="hidden" name="action" value="enable">';
        echo '<p>';
        echo '<input type="number" name="user_id" placeholder="' . __('ID del usuario...', 'wc-enhanced-customers-credit') . '" style="width: 200px;">';
        echo '<input type="submit" value="' . __('Configurar Crédito', 'wc-enhanced-customers-credit') . '" class="button button-primary">';
        echo '</p>';
        echo '</form>';
        echo '</div>';
        
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
        echo '<h4>' . __('Clientes con Crédito Habilitado', 'wc-enhanced-customers-credit') . '</h4>';
        
        if (!empty($accounts)) {
            echo '<table class="wp-list-table widefat fixed striped">';
            echo '<thead>';
            echo '<tr>';
            echo '<th>' . __('Cliente', 'wc-enhanced-customers-credit') . '</th>';
            echo '<th>' . __('Límite', 'wc-enhanced-customers-credit') . '</th>';
            echo '<th>' . __('Usado', 'wc-enhanced-customers-credit') . '</th>';
            echo '<th>' . __('Estado', 'wc-enhanced-customers-credit') . '</th>';
            echo '<th>' . __('Acciones', 'wc-enhanced-customers-credit') . '</th>';
            echo '</tr>';
            echo '</thead>';
            echo '<tbody>';
            
            foreach ($accounts as $account) {
                echo '<tr>';
                echo '<td>' . esc_html($account['full_name'] ?: $account['display_name']) . '<br><small>' . esc_html($account['user_email']) . '</small></td>';
                echo '<td>' . wc_price($account['credit_limit']) . '</td>';
                echo '<td>' . wc_price($account['balance_used']) . '</td>';
                echo '<td>' . esc_html($account['status']) . '</td>';
                echo '<td>';
                echo '<a href="' . admin_url("admin.php?page=wecc-dashboard&tab=credit&action=enable&user_id={$account['user_id']}") . '" class="button button-small">' . __('Configurar', 'wc-enhanced-customers-credit') . '</a>';
                echo '</td>';
                echo '</tr>';
            }
            
            echo '</tbody>';
            echo '</table>';
        } else {
            echo '<p>' . __('No hay clientes con crédito habilitado aún.', 'wc-enhanced-customers-credit') . '</p>';
        }
        
        echo '</div>';
    }
    
    /**
     * Renderiza formulario para habilitar/configurar crédito de un cliente
     */
    public function render_enable_credit_form(): void {
        $user_id = (int) ($_GET['user_id'] ?? 0);
        
        if (!$user_id) {
            echo '<div class="notice notice-error"><p>' . __('ID de usuario requerido.', 'wc-enhanced-customers-credit') . '</p></div>';
            return;
        }
        
        $user = get_user_by('id', $user_id);
        if (!$user) {
            echo '<div class="notice notice-error"><p>' . __('Usuario no encontrado.', 'wc-enhanced-customers-credit') . '</p></div>';
            return;
        }
        
        $account = wecc_get_or_create_account($user_id);
        $profile = null;
        if ($this->customer_service) {
            $profile = $this->customer_service->get_profile_by_user($user_id);
        }
        
        echo '<div class="wecc-enable-credit-form">';
        echo '<h3>' . sprintf(__('Configurar Crédito para %s', 'wc-enhanced-customers-credit'), $user->display_name) . '</h3>';
        
        echo '<form method="post">';
        wp_nonce_field('wecc_enable_credit', 'wecc_credit_nonce');
        echo '<input type="hidden" name="user_id" value="' . $user_id . '">';
        
        echo '<table class="form-table">';
        
        // Info del usuario
        echo '<tr>';
        echo '<th>' . __('Usuario', 'wc-enhanced-customers-credit') . '</th>';
        echo '<td><strong>' . esc_html($user->display_name) . '</strong> (' . esc_html($user->user_email) . ')</td>';
        echo '</tr>';
        
        // Estado actual
        echo '<tr>';
        echo '<th>' . __('Estado Actual', 'wc-enhanced-customers-credit') . '</th>';
        echo '<td>';
        if ($account && $account->credit_limit > 0) {
            echo '<span style="color: #00a32a;">✅ Crédito habilitado</span><br>';
            echo 'Límite: ' . wc_price($account->credit_limit) . '<br>';
            echo 'Usado: ' . wc_price($account->balance_used);
        } else {
            echo '<span style="color: #d63638;">❌ Sin crédito</span>';
        }
        echo '</td>';
        echo '</tr>';
        
        // Habilitar crédito
        echo '<tr>';
        echo '<th><label for="enable_credit">' . __('Habilitar Crédito', 'wc-enhanced-customers-credit') . '</label></th>';
        echo '<td>';
        echo '<label><input type="checkbox" name="enable_credit" id="enable_credit" value="1" ' . checked($account && $account->credit_limit > 0, true, false) . '> ' . __('Habilitar línea de crédito', 'wc-enhanced-customers-credit') . '</label>';
        echo '</td>';
        echo '</tr>';
        
        // Límite de crédito
        echo '<tr>';
        echo '<th><label for="credit_limit">' . __('Límite de Crédito', 'wc-enhanced-customers-credit') . '</label></th>';
        echo '<td>';
        echo '<input type="number" name="credit_limit" id="credit_limit" value="' . esc_attr($account ? $account->credit_limit : '') . '" class="regular-text" step="0.01" min="0">';
        echo '<p class="description">' . __('Monto máximo que el cliente puede deber.', 'wc-enhanced-customers-credit') . '</p>';
        echo '</td>';
        echo '</tr>';
        
        // Días de crédito
        echo '<tr>';
        echo '<th><label for="payment_terms_days">' . __('Días de Crédito', 'wc-enhanced-customers-credit') . '</label></th>';
        echo '<td>';
        echo '<input type="number" name="payment_terms_days" id="payment_terms_days" value="' . esc_attr($account ? $account->payment_terms_days : 30) . '" class="small-text" min="1" max="365">';
        echo '<p class="description">' . __('Días que tiene para pagar desde la compra.', 'wc-enhanced-customers-credit') . '</p>';
        echo '</td>';
        echo '</tr>';
        
        echo '</table>';
        
        echo '<input type="hidden" name="wecc_action" value="enable_credit">';
        submit_button(__('Guardar Configuración', 'wc-enhanced-customers-credit'));
        
        $back_url = admin_url('admin.php?page=wecc-dashboard&tab=credit');
        echo '<a href="' . esc_url($back_url) . '" class="button">' . __('Volver', 'wc-enhanced-customers-credit') . '</a>';
        
        echo '</form>';
        echo '</div>';
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
            
            // Crear o actualizar cuenta
            $account = wecc_get_or_create_account($user_id);
            
            global $wpdb;
            $result = $wpdb->update(
                $wpdb->prefix . 'wecc_credit_accounts',
                [
                    'credit_limit' => $credit_limit,
                    'payment_terms_days' => $payment_terms_days,
                    'available_credit' => max(0, $credit_limit - ($account->balance_used ?? 0)),
                    'status' => $enable_credit ? 'active' : 'inactive',
                    'updated_at' => current_time('mysql')
                ],
                ['user_id' => $user_id],
                ['%f', '%d', '%f', '%s', '%s'],
                ['%d']
            );
            
            if ($result === false) {
                throw new Exception('Error actualizando configuración de crédito');
            }
            
            $redirect_url = admin_url('admin.php?page=wecc-dashboard&tab=credit&message=credit_enabled');
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
    
    /**
     * Lista clientes pendientes de aprobación
     */
    public function render_pending_approvals(): void {
        // TODO: Implementar lista de pendientes
    }
}
