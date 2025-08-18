<?php
/**
 * Script para limpiar completamente los endpoints conflictivos
 * Ejecutar UNA SOLA VEZ
 */

// Cargar WordPress
require_once dirname(__FILE__) . '/../../../../wp-config.php';

echo '<h1>🧹 LIMPIEZA COMPLETA DE ENDPOINTS</h1>';

// 1. Limpiar options problemáticas
$options_to_delete = [
    'wecc_endpoints_flushed',
    'wecc_rewrite_fixed_v3', 
    'wecc_endpoint_added_v4',
    'rewrite_rules'
];

foreach ($options_to_delete as $option) {
    delete_option($option);
    echo "<p>✅ Eliminada opción: {$option}</p>";
}

// 2. Buscar y eliminar cualquier página "Mi Crédito" existente
$conflicting_pages = get_posts([
    'post_type' => 'page',
    'post_status' => 'any',
    'meta_query' => [
        'relation' => 'OR',
        [
            'key' => '_wp_page_template',
            'value' => 'mi-credito',
            'compare' => 'LIKE'
        ]
    ],
    'posts_per_page' => -1
]);

// También buscar por título
$pages_by_title = [];
$possible_titles = ['Mi Crédito', 'Mi Credito', 'mi-credito'];
foreach ($possible_titles as $title) {
    $page = get_page_by_title($title);
    if ($page) {
        $pages_by_title[] = $page;
    }
}

$all_conflicting = array_merge($conflicting_pages, $pages_by_title);

if (!empty($all_conflicting)) {
    foreach ($all_conflicting as $page) {
        wp_delete_post($page->ID, true);
        echo "<p>🗑️ Eliminada página: {$page->post_title} (ID: {$page->ID})</p>";
    }
} else {
    echo '<p>✅ No se encontraron páginas conflictivas</p>';
}

// 3. Limpiar rewrite rules completamente
global $wp_rewrite;
$wp_rewrite->flush_rules(true);
echo '<p>✅ Rewrite rules completamente limpiadas</p>';

// 4. Re-registrar SOLO el endpoint correcto
add_rewrite_endpoint('mi-credito', EP_PAGES); // SOLO EP_PAGES
echo '<p>✅ Endpoint mi-credito re-registrado (SOLO EP_PAGES)</p>';

// 5. Flush final
flush_rewrite_rules(false);
echo '<p>✅ Flush final ejecutado</p>';

echo '<hr>';
echo '<h2>🧪 TESTING:</h2>';
echo '<p><a href="' . wc_get_page_permalink('myaccount') . '" target="_blank">🔗 Ir a Mi Cuenta</a></p>';
echo '<p><strong>URL esperada al hacer clic en "Mi Crédito":</strong><br>';
echo '<code>' . wc_get_endpoint_url('mi-credito', '', wc_get_page_permalink('myaccount')) . '</code></p>';

echo '<hr>';
echo '<p><strong>⚠️ DESPUÉS DE EJECUTAR ESTE SCRIPT:</strong></p>';
echo '<ol>';
echo '<li>Desactiva y reactiva el plugin WECC</li>';
echo '<li>Ve a Mi Cuenta</li>';  
echo '<li>Haz clic en "Mi Crédito"</li>';
echo '<li>Debería aparecer la URL correcta CON contenido</li>';
echo '</ol>';

echo '<p><strong>🗑️ Puedes borrar este archivo después de usarlo</strong></p>';
