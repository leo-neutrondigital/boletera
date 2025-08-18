<!-- Campos específicos de WECC -->
<div class="card" style="margin-bottom: 20px;">
    <h3>💳 Datos Específicos de Crédito</h3>
    <p class="description">Estos campos son específicos del sistema de crédito y no existen en WooCommerce.</p>
    
    <table class="form-table">
        <tr>
            <th><label for="rfc">RFC</label></th>
            <td>
                <input type="text" id="rfc" name="rfc" 
                       value="<?php echo esc_attr($wecc_data['rfc'] ?? ''); ?>" 
                       class="regular-text" 
                       pattern="[A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3}" 
                       placeholder="ABC123456789" 
                       maxlength="13" />
                <p class="description">Registro Federal de Contribuyentes</p>
            </td>
        </tr>
        <tr>
            <th><label for="customer_type">Tipo de Cliente</label></th>
            <td>
                <select id="customer_type" name="customer_type" class="regular-text">
                    <option value="">Sin asignar</option>
                    <?php 
                    $types = [
                        'mayorista' => 'Mayorista',
                        'distribuidor' => 'Distribuidor', 
                        'minorista' => 'Minorista',
                        'corporativo' => 'Corporativo',
                        'gobierno' => 'Gobierno',
                        'especial' => 'Cliente Especial'
                    ];
                    $current_type = $wecc_data['customer_type'] ?? '';
                    foreach ($types as $value => $label) {
                        $selected = selected($current_type, $value, false);
                        echo "<option value='{$value}' {$selected}>{$label}</option>";
                    }
                    ?>
                </select>
                <p class="description">Tipo de cliente para aplicar descuentos específicos</p>
            </td>
        </tr>
        <tr>
            <th><label for="customer_number">Número de Cliente</label></th>
            <td>
                <input type="text" id="customer_number" name="customer_number" 
                       value="<?php echo esc_attr($wecc_data['customer_number'] ?? ''); ?>" 
                       class="regular-text" 
                       placeholder="CLI-001" />
                <div id="customer-number-validation" class="wecc-customer-number-validation"></div>
                <p class="description">Número único del cliente en el sistema</p>
            </td>
        </tr>
        <tr>
            <th><label for="sales_rep">Vendedor Asignado</label></th>
            <td>
                <select id="sales_rep" name="sales_rep" class="regular-text">
                    <option value="">Sin asignar</option>
                    <?php 
                    $sales_reps = get_users(['role' => 'shop_manager']);
                    $current_rep = $wecc_data['sales_rep'] ?? '';
                    foreach ($sales_reps as $rep) {
                        $selected = selected($current_rep, $rep->ID, false);
                        echo "<option value='{$rep->ID}' {$selected}>{$rep->display_name}</option>";
                    }
                    ?>
                </select>
            </td>
        </tr>
        <tr>
            <th><label for="customer_since">Cliente desde</label></th>
            <td>
                <input type="date" id="customer_since" name="customer_since" 
                       value="<?php echo esc_attr($wecc_data['customer_since'] ?? ''); ?>" 
                       class="regular-text" />
            </td>
        </tr>
        <tr>
            <th><label for="credit_notes">Notas de Crédito</label></th>
            <td>
                <textarea id="credit_notes" name="credit_notes" 
                          class="large-text" rows="3" 
                          placeholder="Notas internas sobre el crédito del cliente..."><?php echo esc_textarea($wecc_data['credit_notes'] ?? ''); ?></textarea>
            </td>
        </tr>
    </table>
</div>
