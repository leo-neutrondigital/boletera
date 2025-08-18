<?php
if (!defined('ABSPATH')) exit;

/**
 * WECC Email Service
 * 
 * Maneja todas las notificaciones por email del sistema de crédito
 */
class WECC_Email_Service {
    
    public function __construct() {
        // Hooks para eventos de crédito
        add_action('wecc_credit_charge_created', [$this, 'send_charge_notification'], 10, 4);
        add_action('wecc_credit_payment_completed', [$this, 'send_payment_confirmation'], 10, 3);
        add_action('wecc_credit_limit_updated', [$this, 'send_limit_update_notification'], 10, 3);
        
        // Recordatorios programados
        add_action('wecc_daily_reminders', [$this, 'send_daily_reminders']);
        add_action('wecc_overdue_alerts', [$this, 'send_overdue_alerts']);
        
        // Programar tareas si no existen
        if (!wp_next_scheduled('wecc_daily_reminders')) {
            wp_schedule_event(strtotime('tomorrow 9:00'), 'daily', 'wecc_daily_reminders');
        }
        
        if (!wp_next_scheduled('wecc_overdue_alerts')) {
            wp_schedule_event(strtotime('tomorrow 10:00'), 'daily', 'wecc_overdue_alerts');
        }
        
        // Filtros para personalizar emails
        add_filter('wp_mail_content_type', [$this, 'set_html_content_type']);
    }
    
    /**
     * Envía notificación cuando se crea un cargo
     */
    public function send_charge_notification(int $charge_id, int $order_id, int $user_id, float $amount): void {
        $user = get_user_by('id', $user_id);
        if (!$user) return;
        
        $order = wc_get_order($order_id);
        if (!$order) return;
        
        $balance = wecc_get_user_balance($user_id);
        
        $subject = sprintf(
            __('[%s] Nuevo cargo en tu cuenta de crédito', 'wc-enhanced-customers-credit'),
            get_bloginfo('name')
        );
        
        $message = $this->get_email_template('charge_notification', [
            'user' => $user,
            'order' => $order,
            'charge_amount' => $amount,
            'balance' => $balance,
            'charge_id' => $charge_id,
            'my_credit_url' => wc_get_account_endpoint_url('mi-credito')
        ]);
        
        $this->send_email($user->user_email, $subject, $message);
    }
    
    /**
     * Envía confirmación cuando se completa un pago
     */
    public function send_payment_confirmation(int $user_id, float $amount, int $order_id): void {
        $user = get_user_by('id', $user_id);
        if (!$user) return;
        
        $balance = wecc_get_user_balance($user_id);
        
        $subject = sprintf(
            __('[%s] Pago de crédito procesado', 'wc-enhanced-customers-credit'),
            get_bloginfo('name')
        );
        
        $message = $this->get_email_template('payment_confirmation', [
            'user' => $user,
            'payment_amount' => $amount,
            'balance' => $balance,
            'order_id' => $order_id,
            'my_credit_url' => wc_get_account_endpoint_url('mi-credito')
        ]);
        
        $this->send_email($user->user_email, $subject, $message);
    }
    
    /**
     * Envía notificación cuando se actualiza el límite de crédito
     */
    public function send_limit_update_notification(int $user_id, float $new_limit, float $available_credit): void {
        $user = get_user_by('id', $user_id);
        if (!$user) return;
        
        $subject = sprintf(
            __('[%s] Tu límite de crédito ha sido actualizado', 'wc-enhanced-customers-credit'),
            get_bloginfo('name')
        );
        
        $message = $this->get_email_template('limit_update', [
            'user' => $user,
            'new_limit' => $new_limit,
            'available_credit' => $available_credit,
            'my_credit_url' => wc_get_account_endpoint_url('mi-credito')
        ]);
        
        $this->send_email($user->user_email, $subject, $message);
    }
    
    /**
     * Envía recordatorios diarios
     */
    public function send_daily_reminders(): void {
        $users_with_pending = $this->get_users_with_pending_charges();
        
        foreach ($users_with_pending as $user_data) {
            $user = get_user_by('id', $user_data['user_id']);
            if (!$user) continue;
            
            // Solo enviar recordatorio cada 7 días
            $last_reminder = get_user_meta($user->ID, '_wecc_last_reminder', true);
            if ($last_reminder && (time() - strtotime($last_reminder)) < (7 * DAY_IN_SECONDS)) {
                continue;
            }
            
            $balance = wecc_get_user_balance($user->ID);
            if ($balance['balance_used'] <= 0) continue;
            
            $subject = sprintf(
                __('[%s] Recordatorio: Tienes saldo pendiente', 'wc-enhanced-customers-credit'),
                get_bloginfo('name')
            );
            
            $message = $this->get_email_template('reminder', [
                'user' => $user,
                'balance' => $balance,
                'pending_charges' => $this->get_user_pending_charges($user->ID),
                'my_credit_url' => wc_get_account_endpoint_url('mi-credito'),
                'pay_all_url' => wecc_get_payment_url('pay_all', ['wecc_pay_all' => '1'])
            ]);
            
            if ($this->send_email($user->user_email, $subject, $message)) {
                update_user_meta($user->ID, '_wecc_last_reminder', current_time('mysql'));
            }
        }
    }
    
    /**
     * Envía alertas de cuentas vencidas
     */
    public function send_overdue_alerts(): void {
        $overdue_users = $this->get_users_with_overdue_charges();
        
        foreach ($overdue_users as $user_data) {
            $user = get_user_by('id', $user_data['user_id']);
            if (!$user) continue;
            
            // Enviar alerta máximo una vez por semana por cuenta vencida
            $last_alert = get_user_meta($user->ID, '_wecc_last_overdue_alert', true);
            if ($last_alert && (time() - strtotime($last_alert)) < (7 * DAY_IN_SECONDS)) {
                continue;
            }
            
            $balance = wecc_get_user_balance($user->ID);
            $overdue_amount = $user_data['overdue_amount'];
            
            $subject = sprintf(
                __('[%s] ⚠️ URGENTE: Cuenta vencida', 'wc-enhanced-customers-credit'),
                get_bloginfo('name')
            );
            
            $message = $this->get_email_template('overdue_alert', [
                'user' => $user,
                'balance' => $balance,
                'overdue_amount' => $overdue_amount,
                'days_overdue' => $user_data['days_overdue'],
                'my_credit_url' => wc_get_account_endpoint_url('mi-credito'),
                'pay_all_url' => wecc_get_payment_url('pay_all', ['wecc_pay_all' => '1'])
            ]);
            
            if ($this->send_email($user->user_email, $subject, $message)) {
                update_user_meta($user->ID, '_wecc_last_overdue_alert', current_time('mysql'));
                
                // También notificar al admin
                $this->send_admin_overdue_notification($user, $overdue_amount, $user_data['days_overdue']);
            }
        }
    }
    
    /**
     * Obtiene usuarios con cargos pendientes
     */
    private function get_users_with_pending_charges(): array {
        global $wpdb;
        
        return $wpdb->get_results(
            "SELECT DISTINCT a.user_id 
             FROM {$wpdb->prefix}wecc_credit_accounts a
             WHERE a.balance_used > 0 AND a.status = 'active'",
            ARRAY_A
        );
    }
    
    /**
     * Obtiene usuarios con cargos vencidos
     */
    private function get_users_with_overdue_charges(): array {
        global $wpdb;
        
        return $wpdb->get_results(
            "SELECT l.user_id, 
                    SUM(l.amount) as overdue_amount,
                    DATEDIFF(NOW(), MIN(l.due_date)) as days_overdue
             FROM {$wpdb->prefix}wecc_ledger l
             JOIN {$wpdb->prefix}wecc_credit_accounts a ON l.account_id = a.id
             WHERE l.type = 'charge' 
               AND l.due_date < NOW() 
               AND a.balance_used > 0
               AND a.status = 'active'
             GROUP BY l.user_id
             HAVING overdue_amount > 0",
            ARRAY_A
        );
    }
    
    /**
     * Obtiene cargos pendientes de un usuario
     */
    private function get_user_pending_charges(int $user_id): array {
        global $wpdb;
        
        $account = wecc_get_or_create_account($user_id);
        if (!$account) return [];
        
        return $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}wecc_ledger 
             WHERE account_id = %d AND type = 'charge'
             ORDER BY due_date ASC, transaction_date ASC
             LIMIT 5",
            $account->id
        ), ARRAY_A);
    }
    
    /**
     * Envía notificación al admin sobre cuenta vencida
     */
    private function send_admin_overdue_notification(WP_User $user, float $overdue_amount, int $days_overdue): void {
        $admin_email = get_option('admin_email');
        
        $subject = sprintf(
            __('[%s] Alerta Admin: Cuenta vencida - %s', 'wc-enhanced-customers-credit'),
            get_bloginfo('name'),
            $user->display_name
        );
        
        $message = sprintf(
            __("Estimado administrador,\n\nLa cuenta del cliente %s tiene un saldo vencido:\n\n" .
               "Cliente: %s (%s)\n" .
               "Monto vencido: %s\n" .
               "Días de retraso: %d\n\n" .
               "Por favor, contacta al cliente para resolver esta situación.\n\n" .
               "Ver detalles: %s\n\n" .
               "Saludos,\nSistema de Crédito WECC", 'wc-enhanced-customers-credit'),
            $user->display_name,
            $user->display_name,
            $user->user_email,
            wc_price($overdue_amount),
            $days_overdue,
            admin_url('admin.php?page=wecc-dashboard&tab=customers&action=edit&user_id=' . $user->ID)
        );
        
        wp_mail($admin_email, $subject, $message);
    }
    
    /**
     * Obtiene template de email
     */
    private function get_email_template(string $template_name, array $vars): string {
        extract($vars);
        
        switch ($template_name) {
            case 'charge_notification':
                return $this->render_charge_notification_template($vars);
                
            case 'payment_confirmation':
                return $this->render_payment_confirmation_template($vars);
                
            case 'limit_update':
                return $this->render_limit_update_template($vars);
                
            case 'reminder':
                return $this->render_reminder_template($vars);
                
            case 'overdue_alert':
                return $this->render_overdue_alert_template($vars);
                
            default:
                return '';
        }
    }
    
    /**
     * Template: Notificación de cargo
     */
    private function render_charge_notification_template(array $vars): string {
        extract($vars);
        
        return sprintf(
            __("Hola %s,\n\n" .
               "Se ha creado un nuevo cargo en tu cuenta de crédito:\n\n" .
               "Orden: #%d\n" .
               "Monto: %s\n" .
               "Tu saldo actual: %s\n" .
               "Crédito disponible: %s\n\n" .
               "Puedes ver los detalles y pagar en:\n%s\n\n" .
               "Gracias por tu compra.\n\n" .
               "Saludos,\n%s", 'wc-enhanced-customers-credit'),
            $user->display_name,
            $order->get_id(),
            wc_price($charge_amount),
            wc_price($balance['balance_used']),
            wc_price($balance['available_credit']),
            $my_credit_url,
            get_bloginfo('name')
        );
    }
    
    /**
     * Template: Confirmación de pago
     */
    private function render_payment_confirmation_template(array $vars): string {
        extract($vars);
        
        return sprintf(
            __("Hola %s,\n\n" .
               "Tu pago de crédito ha sido procesado exitosamente:\n\n" .
               "Monto pagado: %s\n" .
               "Saldo restante: %s\n" .
               "Crédito disponible: %s\n\n" .
               "Ver detalles en: %s\n\n" .
               "¡Gracias por tu pago!\n\n" .
               "Saludos,\n%s", 'wc-enhanced-customers-credit'),
            $user->display_name,
            wc_price($payment_amount),
            wc_price($balance['balance_used']),
            wc_price($balance['available_credit']),
            $my_credit_url,
            get_bloginfo('name')
        );
    }
    
    /**
     * Template: Actualización de límite
     */
    private function render_limit_update_template(array $vars): string {
        extract($vars);
        
        return sprintf(
            __("Hola %s,\n\n" .
               "Tu límite de crédito ha sido actualizado:\n\n" .
               "Nuevo límite: %s\n" .
               "Crédito disponible: %s\n\n" .
               "Ver detalles en: %s\n\n" .
               "Saludos,\n%s", 'wc-enhanced-customers-credit'),
            $user->display_name,
            wc_price($new_limit),
            wc_price($available_credit),
            $my_credit_url,
            get_bloginfo('name')
        );
    }
    
    /**
     * Template: Recordatorio
     */
    private function render_reminder_template(array $vars): string {
        extract($vars);
        
        $charges_text = '';
        if (!empty($pending_charges)) {
            $charges_text = "\nCargos pendientes:\n";
            foreach (array_slice($pending_charges, 0, 3) as $charge) {
                $charges_text .= sprintf("- %s: %s\n", 
                    $charge['description'], 
                    wc_price($charge['amount'])
                );
            }
        }
        
        return sprintf(
            __("Hola %s,\n\n" .
               "Recordatorio amigable: tienes saldo pendiente en tu cuenta de crédito.\n\n" .
               "Saldo actual: %s\n" .
               "Crédito disponible: %s\n%s\n" .
               "Puedes pagar fácilmente en: %s\n\n" .
               "O pagar todo tu saldo aquí: %s\n\n" .
               "¡Gracias!\n\n" .
               "Saludos,\n%s", 'wc-enhanced-customers-credit'),
            $user->display_name,
            wc_price($balance['balance_used']),
            wc_price($balance['available_credit']),
            $charges_text,
            $my_credit_url,
            $pay_all_url,
            get_bloginfo('name')
        );
    }
    
    /**
     * Template: Alerta vencido
     */
    private function render_overdue_alert_template(array $vars): string {
        extract($vars);
        
        return sprintf(
            __("URGENTE - Hola %s,\n\n" .
               "Tu cuenta de crédito tiene saldo VENCIDO que requiere atención inmediata:\n\n" .
               "Monto vencido: %s\n" .
               "Días de retraso: %d\n" .
               "Saldo total: %s\n\n" .
               "Por favor, realiza tu pago lo antes posible para evitar restricciones en tu cuenta.\n\n" .
               "Pagar ahora: %s\n" .
               "Ver detalles: %s\n\n" .
               "Si tienes alguna pregunta, contáctanos.\n\n" .
               "Saludos,\n%s", 'wc-enhanced-customers-credit'),
            $user->display_name,
            wc_price($overdue_amount),
            $days_overdue,
            wc_price($balance['balance_used']),
            $pay_all_url,
            $my_credit_url,
            get_bloginfo('name')
        );
    }
    
    /**
     * Envía email
     */
    private function send_email(string $to, string $subject, string $message): bool {
        $headers = [
            'Content-Type: text/html; charset=UTF-8',
            'From: ' . get_bloginfo('name') . ' <' . get_option('admin_email') . '>'
        ];
        
        // Convertir saltos de línea a HTML
        $message = nl2br($message);
        
        // Wrap en template HTML básico
        $html_message = $this->wrap_in_html_template($message, $subject);
        
        return wp_mail($to, $subject, $html_message, $headers);
    }
    
    /**
     * Envuelve mensaje en template HTML básico
     */
    private function wrap_in_html_template(string $content, string $subject): string {
        return sprintf('
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>%s</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #667eea; color: white; padding: 20px; text-align: center; }
                    .content { padding: 20px; background: #f9f9f9; }
                    .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
                    a { color: #667eea; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>%s</h1>
                    </div>
                    <div class="content">
                        %s
                    </div>
                    <div class="footer">
                        <p>Este es un email automático del sistema de crédito de %s</p>
                    </div>
                </div>
            </body>
            </html>',
            esc_html($subject),
            get_bloginfo('name'),
            $content,
            get_bloginfo('name')
        );
    }
    
    /**
     * Establece content type HTML para emails
     */
    public function set_html_content_type(): string {
        return 'text/html';
    }
}
