<?php
if (!defined('ABSPATH')) exit;

/**
 * WECC Dashboard Controller
 * Maneja las métricas ejecutivas del dashboard principal
 */
class WECC_Dashboard_Controller {
    
    private $table_accounts;
    private $table_ledger;
    private $table_profiles;
    
    public function __construct() {
        global $wpdb;
        $this->table_accounts = $wpdb->prefix . 'wecc_credit_accounts';
        $this->table_ledger = $wpdb->prefix . 'wecc_ledger';
        $this->table_profiles = $wpdb->prefix . 'wecc_customer_profiles';
    }
    
    /**
     * Obtiene todas las métricas del dashboard
     */
    public function get_dashboard_metrics(): array {
        return [
            'financial_summary' => $this->get_financial_summary(),
            'client_metrics' => $this->get_client_metrics(),
            'critical_alerts' => $this->get_critical_alerts(),
            'monthly_trends' => $this->get_monthly_trends(),
            'quality_metrics' => $this->get_quality_metrics(),
            'last_updated' => current_time('mysql')
        ];
    }
    
    /**
     * ⚠️ Alertas Críticas
     */
    private function get_critical_alerts(): array {
        global $wpdb;
        
        $upcoming_due = $wpdb->get_row("
            SELECT 
                COUNT(*) as charges_count,
                COALESCE(SUM(GREATEST(l.amount - COALESCE(payments.paid_amount, 0), 0)), 0) as total_amount
            FROM {$this->table_ledger} l
            LEFT JOIN (
                SELECT settles_ledger_id, SUM(ABS(amount)) as paid_amount
                FROM {$this->table_ledger} 
                WHERE type = 'payment' AND settles_ledger_id IS NOT NULL
                GROUP BY settles_ledger_id
            ) payments ON l.id = payments.settles_ledger_id
            WHERE l.type = 'charge'
            AND l.due_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 7 DAY)
            AND (l.amount - COALESCE(payments.paid_amount, 0)) > 0
        ");
        
        $significant_overdue = $wpdb->get_var("
            SELECT COUNT(DISTINCT l.account_id)
            FROM {$this->table_ledger} l
            LEFT JOIN (
                SELECT settles_ledger_id, SUM(ABS(amount)) as paid_amount
                FROM {$this->table_ledger} 
                WHERE type = 'payment' AND settles_ledger_id IS NOT NULL
                GROUP BY settles_ledger_id
            ) payments ON l.id = payments.settles_ledger_id
            WHERE l.type = 'charge' AND l.due_date < NOW()
            AND (l.amount - COALESCE(payments.paid_amount, 0)) > 1000
        ");
        
        return [
            'upcoming_due_count' => (int) ($upcoming_due->charges_count ?? 0),
            'upcoming_due_amount' => (float) ($upcoming_due->total_amount ?? 0),
            'significant_overdue_clients' => (int) $significant_overdue
        ];
    }
    
    /**
     * 📈 Tendencias Mensuales
     */
    private function get_monthly_trends(): array {
        global $wpdb;
        
        $current_month_start = date('Y-m-01 00:00:00');
        $last_month_start = date('Y-m-01 00:00:00', strtotime('-1 month'));
        $last_month_end = date('Y-m-t 23:59:59', strtotime('-1 month'));
        
        $sales_current = $wpdb->get_var($wpdb->prepare("
            SELECT COALESCE(SUM(amount), 0) FROM {$this->table_ledger}
            WHERE type = 'charge' AND transaction_date >= %s
        ", $current_month_start));
        
        $sales_previous = $wpdb->get_var($wpdb->prepare("
            SELECT COALESCE(SUM(amount), 0) FROM {$this->table_ledger}
            WHERE type = 'charge' AND transaction_date BETWEEN %s AND %s
        ", $last_month_start, $last_month_end));
        
        $payments_current = $wpdb->get_var($wpdb->prepare("
            SELECT COALESCE(SUM(ABS(amount)), 0) FROM {$this->table_ledger}
            WHERE type = 'payment' AND transaction_date >= %s
        ", $current_month_start));
        
        $payments_previous = $wpdb->get_var($wpdb->prepare("
            SELECT COALESCE(SUM(ABS(amount)), 0) FROM {$this->table_ledger}
            WHERE type = 'payment' AND transaction_date BETWEEN %s AND %s
        ", $last_month_start, $last_month_end));
        
        return [
            'sales_current_month' => (float) $sales_current,
            'sales_previous_month' => (float) $sales_previous,
            'sales_growth_percent' => $this->calculate_growth_percentage($sales_previous, $sales_current),
            'payments_current_month' => (float) $payments_current,
            'payments_previous_month' => (float) $payments_previous,
            'payments_growth_percent' => $this->calculate_growth_percentage($payments_previous, $payments_current)
        ];
    }
    
    /**
     * 🎯 Métricas de Calidad
     */
    private function get_quality_metrics(): array {
        global $wpdb;
        
        $avg_overdue_days = $wpdb->get_var("
            SELECT AVG(DATEDIFF(NOW(), l.due_date))
            FROM {$this->table_ledger} l
            LEFT JOIN (
                SELECT settles_ledger_id, SUM(ABS(amount)) as paid_amount
                FROM {$this->table_ledger} 
                WHERE type = 'payment' AND settles_ledger_id IS NOT NULL
                GROUP BY settles_ledger_id
            ) payments ON l.id = payments.settles_ledger_id
            WHERE l.type = 'charge' AND l.due_date < NOW()
            AND (l.amount - COALESCE(payments.paid_amount, 0)) > 0
        ");
        
        $punctuality_data = $wpdb->get_row("
            SELECT 
                COUNT(*) as total_charges,
                COUNT(CASE WHEN payments.payment_date <= l.due_date THEN 1 END) as on_time_payments
            FROM {$this->table_ledger} l
            INNER JOIN (
                SELECT settles_ledger_id, MIN(transaction_date) as payment_date
                FROM {$this->table_ledger} 
                WHERE type = 'payment' AND settles_ledger_id IS NOT NULL
                GROUP BY settles_ledger_id
            ) payments ON l.id = payments.settles_ledger_id
            WHERE l.type = 'charge'
        ");
        
        $total_charges = (int) ($punctuality_data->total_charges ?? 0);
        $on_time_payments = (int) ($punctuality_data->on_time_payments ?? 0);
        $punctuality_percent = $total_charges > 0 ? round(($on_time_payments / $total_charges) * 100, 1) : 0;
        
        return [
            'avg_overdue_days' => round((float) ($avg_overdue_days ?? 0), 1),
            'punctuality_percentage' => $punctuality_percent,
            'total_evaluated_charges' => $total_charges,
            'on_time_payments' => $on_time_payments
        ];
    }
    
    /**
     * Calcula porcentaje de crecimiento
     */
    private function calculate_growth_percentage(float $previous, float $current): float {
        if ($previous == 0) {
            return $current > 0 ? 100.0 : 0.0;
        }
        return round((($current - $previous) / $previous) * 100, 1);
    }
    
    /**
     * 💰 Resumen Financiero Total
     */
    private function get_financial_summary(): array {
        global $wpdb;
        
        // Total crédito otorgado vs utilizado
        $credit_summary = $wpdb->get_row("
            SELECT 
                SUM(credit_limit) as total_credit_granted,
                SUM(balance_used) as total_credit_used,
                SUM(GREATEST(credit_limit - balance_used, 0)) as total_available_credit
            FROM {$this->table_accounts} 
            WHERE credit_limit > 0 AND status = 'active'
        ");
        
        // Saldo total por cobrar y saldo a favor
        $balance_summary = $wpdb->get_row("
            SELECT 
                SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as total_charges,
                SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as total_payments,
                SUM(amount) as net_balance
            FROM {$this->table_ledger}
        ");
        
        // Cartera vencida
        $overdue_amount = $wpdb->get_var("
            SELECT COALESCE(SUM(
                GREATEST(l.amount - COALESCE(payments.paid_amount, 0), 0)
            ), 0)
            FROM {$this->table_ledger} l
            LEFT JOIN (
                SELECT settles_ledger_id, SUM(ABS(amount)) as paid_amount
                FROM {$this->table_ledger} 
                WHERE type = 'payment' AND settles_ledger_id IS NOT NULL
                GROUP BY settles_ledger_id
            ) payments ON l.id = payments.settles_ledger_id
            WHERE l.type = 'charge' AND l.due_date < NOW()
        ");
        
        $total_credit_granted = (float) ($credit_summary->total_credit_granted ?? 0);
        $total_credit_used = (float) ($credit_summary->total_credit_used ?? 0);
        $net_balance = (float) ($balance_summary->net_balance ?? 0);
        
        return [
            'total_credit_granted' => $total_credit_granted,
            'total_credit_used' => $total_credit_used,
            'total_available_credit' => (float) ($credit_summary->total_available_credit ?? 0),
            'utilization_percentage' => $total_credit_granted > 0 ? round(($total_credit_used / $total_credit_granted) * 100, 1) : 0,
            'total_receivable' => max(0, $net_balance),
            'customer_favor_balance' => max(0, -$net_balance),
            'overdue_amount' => (float) $overdue_amount
        ];
    }
    
    /**
     * 👥 Métricas de Clientes - CORREGIDO PARA USAR LÓGICA DE VENCIDOS
     */
    private function get_client_metrics(): array {
        global $wpdb;
        
        // 1. Estadísticas básicas de cuentas (aprovecha idx_wecc_accounts_status)
        $client_summary = $wpdb->get_row("
            SELECT 
                COUNT(*) as total_credit_clients,
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active_accounts,
                AVG(credit_limit) as avg_credit_limit
            FROM {$this->table_accounts} 
            WHERE credit_limit > 0"
        );
        
        // 2. Clientes cerca del límite (90% o más)
        $near_limit_count = $wpdb->get_var("
            SELECT COUNT(*) 
            FROM {$this->table_accounts} 
            WHERE credit_limit > 0 AND status = 'active'
            AND (balance_used / credit_limit) > 0.9"
        );
        
        // 3. Obtener todos los usuarios con crédito para clasificar correctamente
        $users_with_credit = $wpdb->get_col("
            SELECT user_id 
            FROM {$this->table_accounts} 
            WHERE credit_limit > 0"
        );
        
        // 4. Clasificar clientes usando lógica corregida de vencidos
        $active_clients = 0;
        $blocked_clients = 0;
        $current_clients = 0;
        
        foreach ($users_with_credit as $user_id) {
            $account = wecc_get_or_create_account($user_id);
            $has_overdue = wecc_user_has_overdue_charges($user_id);
            
            if ($account && $account->credit_limit > 0) {
                if ($has_overdue) {
                    $blocked_clients++; // Bloqueado por vencidos reales
                } elseif ($account->status === 'active') {
                    $active_clients++; // Activo sin vencidos
                    $current_clients++; // Al corriente
                }
                // Los inactivos no se cuentan en ninguna categoría
            }
        }
        
        return [
            'total_credit_clients' => (int) ($client_summary->total_credit_clients ?? 0),
            'active_clients' => $active_clients, // CORREGIDO: sin vencidos
            'blocked_clients' => $blocked_clients, // CORREGIDO: con vencidos reales
            'current_clients' => $current_clients, // Al corriente (activos sin vencidos)
            'near_limit_clients' => (int) $near_limit_count,
            'avg_credit_limit' => (float) ($client_summary->avg_credit_limit ?? 0)
        ];
    }
}
