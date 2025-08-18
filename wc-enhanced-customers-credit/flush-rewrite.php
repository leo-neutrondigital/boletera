<?php
/**
 * Script temporal para flush manual de rewrite rules
 * Ejecutar desde navegador: /flush-rewrite.php
 */

// Cargar WordPress
require_once dirname(__FILE__) . '/../../../../wp-config.php';

echo '<h1>WECC Rewrite Rules Flush</h1>';

// Verificar estado actual
echo '<h2>Estado Actual:</h2>';
echo '<p><strong>Mi Cuenta URL:</strong> ' . wc_get_page_permalink('myaccount') . '</p>';
echo '<p><strong>Endpoint URL:</strong> ' . wc_get_endpoint_url('mi-credito', '', wc_get_page_permalink('myaccount')) . '</p>';

// Registrar endpoint
add_rewrite_endpoint('mi-credito', EP_ROOT | EP_PAGES);
echo '<p>✅ Endpoint mi-credito registrado</p>';

// Flush rules
flush_rewrite_rules(false);
echo '<p>✅ Rewrite rules flushed</p>';

// Marcar como corregido
update_option('wecc_rewrite_fixed_v3', true);
echo '<p>✅ Opción actualizada</p>';

echo '<h2>Nuevas URLs:</h2>';
echo '<p><strong>Mi Cuenta URL:</strong> ' . wc_get_page_permalink('myaccount') . '</p>';
echo '<p><strong>Endpoint URL:</strong> ' . wc_get_endpoint_url('mi-credito', '', wc_get_page_permalink('myaccount')) . '</p>';

echo '<h2>Probar:</h2>';
echo '<p><a href="' . wc_get_page_permalink('myaccount') . '">Ir a Mi Cuenta</a></p>';
echo '<p><a href="' . wc_get_endpoint_url('mi-credito', '', wc_get_page_permalink('myaccount')) . '">Ir a Mi Crédito</a></p>';

echo '<hr>';
echo '<p><strong>¡Puedes borrar este archivo después de probarlo!</strong></p>';
