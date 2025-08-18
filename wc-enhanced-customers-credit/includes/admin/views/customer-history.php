<?php
if (!defined('ABSPATH')) exit;

/**
 * Vista: Historial completo de cliente
 * Variables disponibles: $customer, $profile, $account, $balance, $movements, $has_overdue
 */

// Obtener datos WECC específicos usando el servicio unificado
$wecc_data = [];
if (class_exists('WECC_Unified_Customer_Service')) {
    try {
        $unified_service = new WECC_Unified_Customer_Service();
        $wecc_data = $unified_service->get_wecc_specific_data($customer->ID);
    } catch (Exception $e) {
        error_log('Error loading WECC unified data: ' . $e->getMessage());
    }
}

// Combinar con profile para compatibilidad
$profile = array_merge($profile ?: [], $wecc_data);
?>

<div class="wecc-customer-history">
    <!-- Header con datos del cliente -->
    <div class="wecc-customer-header" style="background: white; padding: 20px; border: 1px solid #c3c4c7; border-radius: 4px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div class="wecc-customer-info">
                <h2 style="margin: 0 0 10px 0;">
                    <?php echo esc_html($profile['full_name'] ?: $customer->display_name); ?>
                    <small style="font-weight: normal; color: #666;">(ID: <?php echo $customer->ID; ?>)</small>
                </h2>
                
                <!-- Grid de información horizontal -->
                <div style="display: flex; gap: 20px; margin-bottom: 15px; flex-wrap: wrap;">
                    <!-- Contacto -->
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #2271b1; flex: 1; min-width: 300px;">
                        <h4 style="margin: 0 0 10px 0; color: #2271b1; font-size: 14px; display: flex; align-items: center;">
                            <span class="dashicons dashicons-phone" style="margin-right: 8px; font-size: 16px;"></span>
                            CONTACTO
                        </h4>
                        <div style="font-size: 13px; line-height: 1.5;">
                            <strong>Email:</strong> <a href="mailto:<?php echo esc_attr($customer->user_email); ?>"><?php echo esc_html($customer->user_email); ?></a><br>
                            <?php 
                            // Usar directamente campos de WooCommerce
                            $billing_phone = get_user_meta($customer->ID, 'billing_phone', true);
                            $billing_company = get_user_meta($customer->ID, 'billing_company', true);
                            ?>
                            <?php if ($billing_phone): ?>
                                <strong>Teléfono:</strong> <?php echo esc_html($billing_phone); ?><br>
                            <?php endif; ?>
                            <?php if ($billing_company): ?>
                                <strong>Empresa:</strong> <?php echo esc_html($billing_company); ?><br>
                            <?php endif; ?>
                            <?php 
                            // Dirección completa de WooCommerce
                            $address_parts = [];
                            $billing_address_1 = get_user_meta($customer->ID, 'billing_address_1', true);
                            $billing_city = get_user_meta($customer->ID, 'billing_city', true);
                            $billing_state = get_user_meta($customer->ID, 'billing_state', true);
                            $billing_postcode = get_user_meta($customer->ID, 'billing_postcode', true);
                            
                            if ($billing_address_1) $address_parts[] = $billing_address_1;
                            if ($billing_city) $address_parts[] = $billing_city;
                            if ($billing_state) $address_parts[] = $billing_state;
                            if ($billing_postcode) $address_parts[] = $billing_postcode;
                            
                            if (!empty($address_parts)): ?>
                                <strong>Dirección:</strong> <?php echo esc_html(implode(', ', $address_parts)); ?>
                            <?php endif; ?>
                        </div>
                    </div>
                    
                    <!-- Datos Fiscales -->
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #00a32a; flex: 1; min-width: 300px;">
                        <h4 style="margin: 0 0 10px 0; color: #00a32a; font-size: 14px; display: flex; align-items: center;">
                            <span class="dashicons dashicons-building" style="margin-right: 8px; font-size: 16px;"></span>
                            FISCAL
                        </h4>
                        <div style="font-size: 13px; line-height: 1.5;">
                            <?php if ($profile['rfc']): ?>
                                <strong>RFC:</strong> <?php echo esc_html($profile['rfc']); ?><br>
                            <?php endif; ?>
                            <?php if ($billing_company): ?>
                                <strong>Razón Social:</strong> <?php echo esc_html($billing_company); ?><br>
                            <?php endif; ?>
                            <?php if ($profile['customer_type']): ?>
                                <strong>Tipo:</strong> 
                                <span style="background: #2271b1; color: white; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">
                                    <?php echo esc_html($profile['customer_type']); ?>
                                </span>
                            <?php endif; ?>
                        </div>
                    </div>
                    
                    <!-- Gestión -->
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #dba617; flex: 1; min-width: 300px;">
                        <h4 style="margin: 0 0 10px 0; color: #dba617; font-size: 14px; display: flex; align-items: center;">
                            <span class="dashicons dashicons-admin-users" style="margin-right: 8px; font-size: 16px;"></span>
                            GESTIÓN
                        </h4>
                        <div style="font-size: 13px; line-height: 1.5;">
                            <?php if ($profile['sales_rep']): ?>
                                <?php $sales_rep = get_user_by('id', $profile['sales_rep']); ?>
                                <strong>Vendedor:</strong> <?php echo $sales_rep ? esc_html($sales_rep->display_name) : 'N/A'; ?><br>
                            <?php endif; ?>
                            <?php if ($profile['customer_since']): ?>
                                <strong>Cliente desde:</strong> <?php echo date_i18n('d/m/Y', strtotime($profile['customer_since'])); ?><br>
                            <?php endif; ?>
                            <?php if ($profile['customer_number']): ?>
                                <strong>Número:</strong> <?php echo esc_html($profile['customer_number']); ?><br>
                            <?php endif; ?>
                            <?php if ($profile['credit_notes']): ?>
                                <strong>Notas:</strong> <em><?php echo esc_html(substr($profile['credit_notes'], 0, 40)); ?><?php echo strlen($profile['credit_notes']) > 40 ? '...' : ''; ?></em>
                            <?php endif; ?>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="wecc-quick-actions">
                <a href="<?php echo admin_url('admin.php?page=wecc-dashboard&tab=customers'); ?>" class="button">
                    <span class="dashicons dashicons-arrow-left-alt" style="line-height: 1.2; margin-right: 5px;"></span>
                    <?php _e('Volver a lista', 'wc-enhanced-customers-credit'); ?>
                </a>
                <a href="<?php echo admin_url("admin.php?page=wecc-dashboard&tab=customers&action=edit&user_id={$customer->ID}"); ?>" class="button">
                    <span class="dashicons dashicons-edit" style="line-height: 1.2; margin-right: 5px;"></span>
                    <?php _e('Editar datos', 'wc-enhanced-customers-credit'); ?>
                </a>
                <?php if ($account && $account->credit_limit > 0): ?>
                    <a href="<?php echo admin_url("admin.php?page=wecc-dashboard&tab=credit&action=enable&user_id={$customer->ID}"); ?>" class="button">
                        <span class="dashicons dashicons-admin-settings" style="line-height: 1.2; margin-right: 5px;"></span>
                        <?php _e('Configurar crédito', 'wc-enhanced-customers-credit'); ?>
                    </a>
                <?php endif; ?>
            </div>
        </div>
    </div>

    <!-- Resumen de crédito -->
    <?php if ($account && $account->credit_limit > 0): ?>
        <?php
        // Calcular saldo a favor con precisión correcta
        $positive_balance = 0;
        if (isset($balance['raw_balance']) && $balance['raw_balance'] < -0.01) {
            // Solo considerar saldo a favor si es mayor a 1 centavo
            $positive_balance = abs($balance['raw_balance']);
        }
        $effective_available = $balance['available_credit'] + $positive_balance;
        ?>
        <div class="wecc-credit-summary" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px; margin-bottom: 20px;">
            <!-- Estado -->
            <div style="background: white; padding: 15px; border: 1px solid #c3c4c7; border-radius: 4px; text-align: center;">
                <h4 style="margin: 0 0 10px 0; color: #666;">Estado</h4>
                <div style="font-size: 18px; font-weight: 600;">
                    <?php if ($has_overdue): ?>
                        <span style="color: #d63638;">🚫 Bloqueado</span>
                    <?php elseif ($account->status === 'active'): ?>
                        <span style="color: #00a32a;">✅ Activo</span>
                    <?php else: ?>
                        <span style="color: #dba617;">⏸️ Inactivo</span>
                    <?php endif; ?>
                </div>
            </div>
            
            <!-- Límite -->
            <div style="background: white; padding: 15px; border: 1px solid #c3c4c7; border-radius: 4px; text-align: center;">
                <h4 style="margin: 0 0 10px 0; color: #666;">Límite de Crédito</h4>
                <div style="font-size: 18px; font-weight: 600; color: #2271b1;">
                    <?php echo wc_price($account->credit_limit); ?>
                </div>
                <small style="color: #666;"><?php echo $account->payment_terms_days; ?> días</small>
            </div>
            
            <!-- Usado -->
            <div style="background: white; padding: 15px; border: 1px solid #c3c4c7; border-radius: 4px; text-align: center;">
                <h4 style="margin: 0 0 10px 0; color: #666;">Crédito Usado</h4>
                <div style="font-size: 18px; font-weight: 600; color: #d63638;">
                    <?php echo wc_price($balance['balance_used']); ?>
                </div>
                <small style="color: #666;">
                    <?php echo $account->credit_limit > 0 ? round(($balance['balance_used'] / $account->credit_limit) * 100, 1) : 0; ?>% del límite
                </small>
            </div>
            
            <!-- Saldo a Favor (si existe) -->
            <?php if ($positive_balance > 0): ?>
                <div style="background: linear-gradient(135deg, #00a32a, #00d084); padding: 15px; border: 1px solid #00a32a; border-radius: 4px; text-align: center; color: white;">
                    <h4 style="margin: 0 0 10px 0; color: white;">💰 Saldo a Favor</h4>
                    <div style="font-size: 18px; font-weight: 600;">
                        <?php echo wc_price($positive_balance); ?>
                    </div>
                    <small style="color: rgba(255,255,255,0.9);">Se aplica automáticamente</small>
                </div>
            <?php endif; ?>
            
            <!-- Disponible -->
            <div style="background: white; padding: 15px; border: 1px solid #c3c4c7; border-radius: 4px; text-align: center;">
                <h4 style="margin: 0 0 10px 0; color: #666;">Disponible Total</h4>
                <div style="font-size: 18px; font-weight: 600; color: #00a32a;">
                    <?php echo wc_price($effective_available); ?>
                </div>
                <small style="color: #666;">
                    <?php if ($positive_balance > 0): ?>
                        Crédito + Saldo a favor
                    <?php else: ?>
                        Para nuevas compras
                    <?php endif; ?>
                </small>
            </div>
        </div>
    <?php else: ?>
        <div style="background: #fcf9e8; border: 1px solid #dba617; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
            <p style="margin: 0; color: #966919;">
                ℹ️ <strong>Este cliente no tiene crédito habilitado.</strong>
                <a href="<?php echo admin_url("admin.php?page=wecc-dashboard&tab=credit&action=enable&user_id={$customer->ID}"); ?>">
                    Habilitar crédito →
                </a>
            </p>
        </div>
    <?php endif; ?>

    <!-- Historial de movimientos -->
    <div class="wecc-movements-section" style="background: white; padding: 20px; border: 1px solid #c3c4c7; border-radius: 4px;">
        <h3 style="margin: 0 0 20px 0; border-bottom: 2px solid #2271b1; padding-bottom: 10px;">
            📊 Historial de Movimientos
            <?php if ($balance && $balance['balance_used'] > 0): ?>
                <!-- Botón de acordeón para pago externo -->
                <button type="button" id="wecc-toggle-payment-form" class="button button-primary" style="float: right;">
                    💵 Pago Rápido
                </button>
            <?php endif; ?>
        </h3>
        
        <!-- Acordeón de pago externo -->
        <?php if ($balance && $balance['balance_used'] > 0): ?>
            <div id="wecc-payment-accordion" style="display: none; background: #f0f8ff; border: 2px solid #007cba; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <h4 style="margin: 0 0 15px 0; color: #007cba;">💵 Registrar Pago Externo</h4>
                <form method="post" id="wecc-quick-payment-form">
                    <?php wp_nonce_field('wecc_register_payment', 'wecc_payment_nonce'); ?>
                    <input type="hidden" name="wecc_action" value="register_payment">
                    <input type="hidden" name="user_id" value="<?php echo $customer->ID; ?>">
                    
                    <table class="form-table" style="margin: 0;">
                        <tr>
                            <th style="width: 150px;"><label for="payment_amount">Monto del Pago:</label></th>
                            <td>
                                <input type="number" id="payment_amount" name="payment_amount" 
                                       step="0.01" min="0.01" max="<?php echo $balance['balance_used']; ?>" 
                                       class="regular-text" required 
                                       placeholder="0.00" style="width: 150px;" 
                                       onchange="this.value = parseFloat(this.value).toFixed(2);">
                                <span style="margin-left: 10px; color: #666;">
                                    Máx: <?php echo wc_price($balance['balance_used']); ?>
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <th><label for="payment_notes">Notas:</label></th>
                            <td>
                                <textarea id="payment_notes" name="payment_notes" 
                                          class="regular-text" rows="3" 
                                          placeholder="Detalles del pago externo (opcional)..."></textarea>
                            </td>
                        </tr>
                    </table>
                    
                    <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #ddd;">
                        <button type="submit" class="button button-primary">
                            ✅ Aplicar Pago
                        </button>
                        <button type="button" id="wecc-cancel-payment" class="button" style="margin-left: 10px;">
                            ❌ Cancelar
                        </button>
                        <small style="display: block; margin-top: 10px; color: #666;">
                            📝 El pago se aplicará automáticamente a los cargos más antiguos
                        </small>
                    </div>
                </form>
            </div>
        <?php endif; ?>
        
        <?php if (!empty($movements)): ?>
            <table class="wp-list-table widefat fixed striped">
                <thead>
                    <tr>
                        <th style="width: 60px;">ID</th>
                        <th style="width: 80px;">Tipo</th>
                        <th style="width: 100px;">Monto</th>
                        <th style="width: 100px;">Restante</th>
                        <th style="width: 80px;">Estado</th>
                        <th style="width: 120px;">Vence / Días restantes</th>
                        <th style="width: 80px;">Pedido</th>
                        <th>Notas</th>
                        <th style="width: 80px;">Fecha</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($movements as $movement): ?>
                        <tr>
                            <!-- ID -->
                            <td><?php echo $movement['id']; ?></td>
                            
                            <!-- Tipo -->
                            <td>
                                <?php
                                $type_labels = [
                                    'charge' => 'Cargo',
                                    'payment' => 'Pago',
                                    'adjustment' => 'Ajuste',
                                    'refund' => 'Reembolso'
                                ];
                                $type_colors = [
                                    'charge' => '#d63638',
                                    'payment' => '#00a32a',
                                    'adjustment' => '#dba617',
                                    'refund' => '#72aee6'
                                ];
                                ?>
                                <span style="background: <?php echo $type_colors[$movement['type']] ?? '#8c8f94'; ?>; 
                                             color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px; font-weight: 600;">
                                    <?php echo $type_labels[$movement['type']] ?? $movement['type']; ?>
                                </span>
                            </td>
                            
                            <!-- Monto -->
                            <td>
                                <span style="color: <?php echo $movement['amount'] > 0 ? '#d63638' : '#00a32a'; ?>; font-weight: 600;">
                                    <?php echo wc_price($movement['amount']); ?>
                                </span>
                            </td>
                            
                            <!-- Restante -->
                            <td>
                                <?php if ($movement['type'] === 'charge' && $movement['remaining_amount'] > 0): ?>
                                    <span style="color: #d63638; font-weight: 600;">
                                        <?php echo wc_price($movement['remaining_amount']); ?>
                                    </span>
                                <?php else: ?>
                                    <span style="color: #8c8f94;">-</span>
                                <?php endif; ?>
                            </td>
                            
                            <!-- Estado -->
                            <td>
                                <?php if ($movement['type'] === 'charge'): ?>
                                    <?php 
                                    $remaining = $movement['remaining_amount'];
                                    $original = $movement['original_amount'];
                                    ?>
                                    <?php if ($remaining <= 0): ?>
                                        <span style="color: #00a32a; font-weight: 600;">✓ Pagado</span>
                                    <?php elseif ($remaining < $original): ?>
                                        <span style="color: #dba617; font-weight: 600;">🟡 Parcial</span>
                                    <?php elseif ($movement['is_overdue']): ?>
                                        <span style="color: #d63638; font-weight: 600;">🔴 Vencido</span>
                                    <?php else: ?>
                                        <span style="color: #dba617; font-weight: 600;">🟡 Pendiente</span>
                                    <?php endif; ?>
                                <?php elseif ($movement['type'] === 'payment'): ?>
                                    <?php if (!empty($movement['settles_ledger_id'])): ?>
                                        <span style="color: #00a32a; font-weight: 600;">→ Aplicado a #<?php echo $movement['settles_ledger_id']; ?></span>
                                    <?php else: ?>
                                        <span style="color: #72aee6; font-weight: 600;">💰 Saldo a favor</span>
                                    <?php endif; ?>
                                <?php else: ?>
                                    <span style="color: #8c8f94;">-</span>
                                <?php endif; ?>
                            </td>
                            
                            <!-- Vencimiento / Días -->
                            <td>
                                <?php if ($movement['type'] === 'charge' && $movement['due_date']): ?>
                                    <div>
                                        <small><?php echo date_i18n('d/m/Y', strtotime($movement['due_date'])); ?></small>
                                        <br>
                                        <?php if ($movement['days_remaining'] !== null): ?>
                                            <?php if ($movement['days_remaining'] < 0): ?>
                                                <span style="color: #d63638; font-weight: 600;">
                                                    Vencido hace <?php echo abs($movement['days_remaining']); ?> días
                                                </span>
                                            <?php elseif ($movement['days_remaining'] === 0): ?>
                                                <span style="color: #dba617; font-weight: 600;">Vence hoy</span>
                                            <?php else: ?>
                                                <span style="color: #00a32a;">
                                                    Faltan <?php echo $movement['days_remaining']; ?> días
                                                </span>
                                            <?php endif; ?>
                                        <?php endif; ?>
                                    </div>
                                <?php else: ?>
                                    <span style="color: #8c8f94;">-</span>
                                <?php endif; ?>
                            </td>
                            
                            <!-- Pedido -->
                            <td>
                                <?php if ($movement['order_id']): ?>
                                    <a href="<?php echo admin_url("post.php?post={$movement['order_id']}&action=edit"); ?>" target="_blank">
                                        #<?php echo $movement['order_id']; ?>
                                    </a>
                                <?php else: ?>
                                    <span style="color: #8c8f94;">-</span>
                                <?php endif; ?>
                            </td>
                            
                            <!-- Notas -->
                            <td>
                                <small><?php echo esc_html($movement['notes'] ?: $movement['description']); ?></small>
                            </td>
                            
                            <!-- Fecha - usar created_at que es por lo que ordenamos -->
                            <td>
                                <small><?php echo date_i18n('d/m/Y H:i', strtotime($movement['created_at'])); ?></small>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        <?php else: ?>
            <div style="text-align: center; padding: 40px; color: #666;">
                <p>📄 No hay movimientos registrados para este cliente.</p>
                <?php if ($account && $account->credit_limit > 0): ?>
                    <p>El cliente puede empezar a usar su crédito realizando compras.</p>
                <?php endif; ?>
            </div>
        <?php endif; ?>
    </div>
</div>

<style>
.wecc-customer-history h3 {
    color: #2271b1;
}

.wecc-customer-history .wp-list-table th,
.wecc-customer-history .wp-list-table td {
    vertical-align: top;
    padding: 8px 6px;
    font-size: 12px;
}

.wecc-customer-history .wp-list-table th {
    font-weight: 600;
}

/* Transición suave para el acordeón */
#wecc-payment-accordion {
    transition: all 0.3s ease;
}

/* Mejorar layout responsivo */
.wecc-customer-header {
    display: flex;
    flex-direction: column;
    gap: 15px;
}

@media (min-width: 1200px) {
    .wecc-customer-header {
        flex-direction: row;
        justify-content: space-between;
        align-items: flex-start;
    }
    
    .wecc-customer-info {
        flex: 1;
    }
    
    .wecc-quick-actions {
        flex-shrink: 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
        min-width: 200px;
    }
}

@media (max-width: 1199px) {
    .wecc-quick-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        border-top: 1px solid #ddd;
        padding-top: 15px;
        margin-top: 10px;
    }
}

/* Iconos de dashicons en botones */
.wecc-quick-actions .button .dashicons {
    font-size: 16px;
    width: 16px;
    height: 16px;
    vertical-align: middle;
}
</style>

<script type="text/javascript">
jQuery(document).ready(function($) {
    // Toggle acordeón de pago
    $('#wecc-toggle-payment-form').on('click', function() {
        const $accordion = $('#wecc-payment-accordion');
        const $button = $(this);
        
        if ($accordion.is(':visible')) {
            $accordion.slideUp(300);
            $button.text('💵 Pago Rápido');
        } else {
            $accordion.slideDown(300);
            $button.text('❌ Cerrar Formulario');
            // Focus en el campo de monto
            setTimeout(() => $('#payment_amount').focus(), 350);
        }
    });
    
    // Cancelar pago
    $('#wecc-cancel-payment').on('click', function() {
        const $accordion = $('#wecc-payment-accordion');
        const $button = $('#wecc-toggle-payment-form');
        
        $accordion.slideUp(300);
        $button.text('💵 Pago Rápido');
        
        // Limpiar formulario
        $('#wecc-quick-payment-form')[0].reset();
    });
    
    // Validación del formulario
    $('#wecc-quick-payment-form').on('submit', function(e) {
        const amount = parseFloat($('#payment_amount').val());
        const maxAmount = parseFloat($('#payment_amount').attr('max'));
        
        if (amount <= 0) {
            alert('El monto debe ser mayor a 0');
            e.preventDefault();
            return false;
        }
        
        if (amount > maxAmount) {
            alert('El monto no puede ser mayor al saldo pendiente');
            e.preventDefault();
            return false;
        }
        
        // Confirmación simple
        const message = `¿Confirmas el registro de un pago de ${amount.toFixed(2)}?`;
        
        if (!confirm(message)) {
            e.preventDefault();
            return false;
        }
        
        // Deshabilitar botón para evitar doble envío
        $(this).find('button[type="submit"]').prop('disabled', true).text('🔄 Procesando...');
    });
    
    // Formatear monto al perder foco
    $('#payment_amount').on('blur', function() {
        const value = parseFloat($(this).val());
        if (!isNaN(value)) {
            $(this).val(value.toFixed(2));
        }
    });
});
</script>
