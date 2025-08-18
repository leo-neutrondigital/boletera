<!-- Información de WooCommerce -->
<div class="card" style="margin-bottom: 20px;">
    <h3>🏪 Datos de WooCommerce</h3>
    <p class="description">Estos campos se guardan directamente en WooCommerce. <a href="<?php echo admin_url("user-edit.php?user_id={$user->ID}#billing_first_name"); ?>" target="_blank">Ver en perfil de usuario</a></p>
    
    <table class="form-table">
        <tr>
        <th><label for="billing_first_name">Nombre Completo</label></th>
        <td>
        <input type="text" id="billing_first_name" name="billing_first_name" 
        value="<?php echo esc_attr(get_user_meta($user->ID, 'billing_first_name', true)); ?>" 
        class="regular-text" placeholder="Nombre(s)" />
        </td>
        </tr>
        <tr>
        <th><label for="billing_last_name">Apellidos</label></th>
            <td>
                            <input type="text" id="billing_last_name" name="billing_last_name" 
                                   value="<?php echo esc_attr(get_user_meta($user->ID, 'billing_last_name', true)); ?>" 
                                   class="regular-text" placeholder="Apellido(s)" />
                        </td>
                    </tr>
        <tr>
            <th><label for="billing_company">Empresa/Razón Social</label></th>
            <td>
                <input type="text" id="billing_company" name="billing_company" 
                       value="<?php echo esc_attr(get_user_meta($user->ID, 'billing_company', true)); ?>" 
                       class="regular-text" />
            </td>
        </tr>
        <tr>
            <th><label for="billing_phone">Teléfono</label></th>
            <td>
                <input type="tel" id="billing_phone" name="billing_phone" 
                       value="<?php echo esc_attr(get_user_meta($user->ID, 'billing_phone', true)); ?>" 
                       class="regular-text" />
            </td>
        </tr>
        <tr>
            <th><label for="billing_address_1">Dirección</label></th>
            <td>
                <input type="text" id="billing_address_1" name="billing_address_1" 
                       value="<?php echo esc_attr(get_user_meta($user->ID, 'billing_address_1', true)); ?>" 
                       class="regular-text" placeholder="Calle y número" /><br>
                <input type="text" name="billing_address_2" 
                       value="<?php echo esc_attr(get_user_meta($user->ID, 'billing_address_2', true)); ?>" 
                       class="regular-text" placeholder="Línea 2 (opcional)" style="margin-top: 5px;" />
            </td>
        </tr>
        <tr>
            <th><label for="billing_city">Ciudad</label></th>
            <td>
                <input type="text" id="billing_city" name="billing_city" 
                       value="<?php echo esc_attr(get_user_meta($user->ID, 'billing_city', true)); ?>" 
                       class="regular-text" />
            </td>
        </tr>
        <tr>
            <th><label for="billing_state">Estado</label></th>
            <td>
                <select id="billing_state" name="billing_state" class="regular-text">
                    <option value="">Seleccionar estado...</option>
                    <?php 
                    $states = [
                        'AG' => 'Aguascalientes', 'BC' => 'Baja California', 'BS' => 'Baja California Sur',
                        'CM' => 'Campeche', 'CS' => 'Chiapas', 'CH' => 'Chihuahua', 'CO' => 'Coahuila',
                        'CL' => 'Colima', 'DF' => 'Ciudad de México', 'DG' => 'Durango', 'GT' => 'Guanajuato',
                        'GR' => 'Guerrero', 'HG' => 'Hidalgo', 'JA' => 'Jalisco', 'EM' => 'Estado de México',
                        'MI' => 'Michoacán', 'MO' => 'Morelos', 'NA' => 'Nayarit', 'NL' => 'Nuevo León',
                        'OA' => 'Oaxaca', 'PU' => 'Puebla', 'QT' => 'Querétaro', 'QR' => 'Quintana Roo',
                        'SL' => 'San Luis Potosí', 'SI' => 'Sinaloa', 'SO' => 'Sonora', 'TB' => 'Tabasco',
                        'TM' => 'Tamaulipas', 'TL' => 'Tlaxcala', 'VE' => 'Veracruz', 'YU' => 'Yucatán', 'ZA' => 'Zacatecas'
                    ];
                    $current_state = get_user_meta($user->ID, 'billing_state', true);
                    foreach ($states as $code => $name) {
                        $selected = selected($current_state, $code, false);
                        echo "<option value='{$code}' {$selected}>{$name}</option>";
                    }
                    ?>
                </select>
            </td>
        </tr>
        <tr>
            <th><label for="billing_postcode">Código Postal</label></th>
            <td>
                <input type="text" id="billing_postcode" name="billing_postcode" 
                       value="<?php echo esc_attr(get_user_meta($user->ID, 'billing_postcode', true)); ?>" 
                       class="regular-text" maxlength="5" pattern="[0-9]{5}" />
            </td>
        </tr>
    </table>
</div>
