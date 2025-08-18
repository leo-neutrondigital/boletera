<?php
// Ejemplo de formulario mejorado

echo '<table class="form-table">';

// Usuario (readonly - viene de WP)
echo '<tr>';
echo '<th>' . __('Datos de WordPress', 'wc-enhanced-customers-credit') . '</th>';
echo '<td>';
echo '<strong>Nombre:</strong> ' . esc_html($user->display_name) . '<br>';
echo '<strong>Email:</strong> ' . esc_html($user->user_email) . '<br>';
echo '<p class="description">Estos datos se obtienen automáticamente de WordPress.</p>';
echo '</td>';
echo '</tr>';

// Separador visual
echo '<tr><td colspan="2"><hr><h4>Datos Específicos del Crédito</h4></td></tr>';

// Solo campos específicos del crédito
$credit_specific_fields = [
    'customer_number', 'rfc', 'regfiscal', 'phone', 
    'street', 'colonia', 'city', 'state3', 'zip',
    'type', 'flete', 'seller'
];

foreach ($credit_specific_fields as $field_key) {
    if (isset($fields[$field_key])) {
        $field_config = $fields[$field_key];
        $value = $profile ? ($profile[$field_key] ?? '') : '';
        
        echo '<tr>';
        echo '<th><label for="' . esc_attr($field_key) . '">' . esc_html($field_config['label']) . '</label></th>';
        echo '<td>';
        $this->render_form_field($field_key, $field_config, $value);
        if (!empty($field_config['description'])) {
            echo '<p class="description">' . esc_html($field_config['description']) . '</p>';
        }
        echo '</td>';
        echo '</tr>';
    }
}

echo '</table>';
?>
