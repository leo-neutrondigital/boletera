<?php
if (!defined('ABSPATH')) exit;
?>

<!-- Dashboard integrado en el admin -->
     <h3 style="margin: 20px 0 20px 0; color: #2271b1; border-bottom: 2px solid #2271b1; padding-bottom: 10px;">
        <?php _e('Dashboard', 'wc-enhanced-customers-credit'); ?>
    </h3>
<div class="wecc-metrics-grid">
        
        <!-- 💰 Resumen Financiero -->
        <div class="wecc-card wecc-card-financial">
            <div class="wecc-card-header">
                <h2><span class="dashicons dashicons-money-alt"></span> Resumen Financiero</h2>
            </div>
            <div class="wecc-card-content">
                <div class="wecc-financial-grid">
                    <div class="wecc-metric">
                        <div class="wecc-metric-value"><?php echo wc_price($financial['total_credit_granted']); ?></div>
                        <div class="wecc-metric-label">Crédito Total Otorgado</div>
                    </div>
                    <div class="wecc-metric">
                        <div class="wecc-metric-value"><?php echo wc_price($financial['total_credit_used']); ?></div>
                        <div class="wecc-metric-label">Crédito Utilizado</div>
                        <div class="wecc-metric-secondary"><?php echo $financial['utilization_percentage']; ?>% utilización</div>
                    </div>
                    <div class="wecc-metric">
                        <div class="wecc-metric-value"><?php echo wc_price($financial['total_receivable']); ?></div>
                        <div class="wecc-metric-label">Por Cobrar</div>
                    </div>
                    <div class="wecc-metric wecc-metric-alert">
                        <div class="wecc-metric-value"><?php echo wc_price($financial['overdue_amount']); ?></div>
                        <div class="wecc-metric-label">Cartera Vencida</div>
                    </div>
                </div>
                
                <?php if ($financial['customer_favor_balance'] > 0): ?>
                <div class="wecc-metric-note">
                    <span class="dashicons dashicons-info"></span>
                    Saldo a favor de clientes: <?php echo wc_price($financial['customer_favor_balance']); ?>
                </div>
                <?php endif; ?>
            </div>
        </div>

        <!-- 👥 Clientes con Crédito -->
        <div class="wecc-card wecc-card-clients">
            <div class="wecc-card-header">
                <h2><span class="dashicons dashicons-groups"></span> Clientes con Crédito</h2>
            </div>
            <div class="wecc-card-content">
                <div class="wecc-clients-summary">
                    <div class="wecc-client-count">
                        <span class="wecc-big-number"><?php echo $clients['total_credit_clients']; ?></span>
                        <span class="wecc-label">Total con Crédito</span>
                    </div>
                    
                    <div class="wecc-client-breakdown">
                        <div class="wecc-status-item wecc-status-active">
                            <span class="wecc-status-count"><?php echo $clients['active_clients']; ?></span>
                            <span class="wecc-status-label">Activos</span>
                        </div>
                        <div class="wecc-status-item wecc-status-current">
                            <span class="wecc-status-count"><?php echo $clients['current_clients']; ?></span>
                            <span class="wecc-status-label">Al Corriente</span>
                        </div>
                        <div class="wecc-status-item wecc-status-blocked">
                            <span class="wecc-status-count"><?php echo $clients['blocked_clients']; ?></span>
                            <span class="wecc-status-label">Bloqueados</span>
                        </div>
                    </div>
                </div>
                
                <div class="wecc-client-stats">
                    <div class="wecc-stat">
                        <span class="wecc-stat-label">Promedio límite:</span>
                        <span class="wecc-stat-value"><?php echo wc_price($clients['avg_credit_limit']); ?></span>
                    </div>
                    <?php if ($clients['near_limit_clients'] > 0): ?>
                    <div class="wecc-stat wecc-stat-warning">
                        <span class="wecc-stat-label">Cerca del límite (>90%):</span>
                        <span class="wecc-stat-value"><?php echo $clients['near_limit_clients']; ?> clientes</span>
                    </div>
                    <?php endif; ?>
                </div>
            </div>
        </div>

        <!-- ⚠️ Alertas Críticas -->
        <div class="wecc-card wecc-card-alerts">
            <div class="wecc-card-header">
                <h2><span class="dashicons dashicons-warning"></span> Alertas Críticas</h2>
            </div>
            <div class="wecc-card-content">
                <?php if ($alerts['upcoming_due_count'] > 0 || $alerts['significant_overdue_clients'] > 0): ?>
                    
                    <?php if ($alerts['upcoming_due_count'] > 0): ?>
                    <div class="wecc-alert wecc-alert-warning">
                        <div class="wecc-alert-icon">⏰</div>
                        <div class="wecc-alert-content">
                            <div class="wecc-alert-title">Próximos Vencimientos</div>
                            <div class="wecc-alert-details">
                                <?php echo $alerts['upcoming_due_count']; ?> cargos vencen en 7 días
                                <span class="wecc-alert-amount"><?php echo wc_price($alerts['upcoming_due_amount']); ?></span>
                            </div>
                        </div>
                    </div>
                    <?php endif; ?>
                    
                    <?php if ($alerts['significant_overdue_clients'] > 0): ?>
                    <div class="wecc-alert wecc-alert-danger">
                        <div class="wecc-alert-icon">🔴</div>
                        <div class="wecc-alert-content">
                            <div class="wecc-alert-title">Adeudos Significativos</div>
                            <div class="wecc-alert-details">
                                <?php echo $alerts['significant_overdue_clients']; ?> clientes con vencidos >$1,000
                            </div>
                        </div>
                    </div>
                    <?php endif; ?>
                    
                <?php else: ?>
                    <div class="wecc-alert wecc-alert-success">
                        <div class="wecc-alert-icon">✅</div>
                        <div class="wecc-alert-content">
                            <div class="wecc-alert-title">Todo en Orden</div>
                            <div class="wecc-alert-details">No hay alertas críticas en este momento</div>
                        </div>
                    </div>
                <?php endif; ?>
            </div>
        </div>

        <!-- 📈 Tendencias Mensuales -->
        <div class="wecc-card wecc-card-trends">
            <div class="wecc-card-header">
                <h2><span class="dashicons dashicons-chart-line"></span> Tendencias del Mes</h2>
            </div>
            <div class="wecc-card-content">
                <div class="wecc-trends-grid">
                    
                    <div class="wecc-trend-item">
                        <div class="wecc-trend-header">
                            <span class="wecc-trend-label">Ventas a Crédito</span>
                            <span class="wecc-trend-growth <?php echo $trends['sales_growth_percent'] >= 0 ? 'positive' : 'negative'; ?>">
                                <?php echo $trends['sales_growth_percent'] >= 0 ? '↗' : '↘'; ?>
                                <?php echo abs($trends['sales_growth_percent']); ?>%
                            </span>
                        </div>
                        <div class="wecc-trend-values">
                            <div class="wecc-trend-current"><?php echo wc_price($trends['sales_current_month']); ?></div>
                            <div class="wecc-trend-previous">vs <?php echo wc_price($trends['sales_previous_month']); ?> anterior</div>
                        </div>
                    </div>
                    
                    <div class="wecc-trend-item">
                        <div class="wecc-trend-header">
                            <span class="wecc-trend-label">Pagos Recibidos</span>
                            <span class="wecc-trend-growth <?php echo $trends['payments_growth_percent'] >= 0 ? 'positive' : 'negative'; ?>">
                                <?php echo $trends['payments_growth_percent'] >= 0 ? '↗' : '↘'; ?>
                                <?php echo abs($trends['payments_growth_percent']); ?>%
                            </span>
                        </div>
                        <div class="wecc-trend-values">
                            <div class="wecc-trend-current"><?php echo wc_price($trends['payments_current_month']); ?></div>
                            <div class="wecc-trend-previous">vs <?php echo wc_price($trends['payments_previous_month']); ?> anterior</div>
                        </div>
                    </div>
                    
                </div>
            </div>
        </div>

        <!-- 🎯 Métricas de Calidad -->
        <div class="wecc-card wecc-card-quality">
            <div class="wecc-card-header">
                <h2><span class="dashicons dashicons-awards"></span> Métricas de Calidad</h2>
            </div>
            <div class="wecc-card-content">
                <div class="wecc-quality-metrics">
                    
                    <div class="wecc-quality-item">
                        <div class="wecc-quality-value <?php echo $quality['punctuality_percentage'] >= 80 ? 'good' : ($quality['punctuality_percentage'] >= 60 ? 'average' : 'poor'); ?>">
                            <?php echo $quality['punctuality_percentage']; ?>%
                        </div>
                        <div class="wecc-quality-label">Puntualidad en Pagos</div>
                        <div class="wecc-quality-detail">
                            <?php echo $quality['on_time_payments']; ?>/<?php echo $quality['total_evaluated_charges']; ?> pagos a tiempo
                        </div>
                    </div>
                    
                    <div class="wecc-quality-item">
                        <div class="wecc-quality-value <?php echo $quality['avg_overdue_days'] <= 15 ? 'good' : ($quality['avg_overdue_days'] <= 30 ? 'average' : 'poor'); ?>">
                            <?php echo $quality['avg_overdue_days']; ?> días
                        </div>
                        <div class="wecc-quality-label">Promedio Días Vencido</div>
                        <div class="wecc-quality-detail">
                            Para cargos pendientes de pago
                        </div>
                    </div>
                    
                </div>
            </div>
        </div>

    </div> <!-- /wecc-metrics-grid -->
