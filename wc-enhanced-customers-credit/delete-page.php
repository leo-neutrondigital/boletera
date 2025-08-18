<?php
/**
 * Script para eliminar la página física "Mi Crédito" que interfiere con el endpoint
 */

// Cargar WordPress
require_once dirname(__FILE__) . '/../../../../wp-config.php';

echo '<h1>🔧 WECC - Eliminar Página Conflictiva</h1>';

// Buscar la página "Mi Crédito"
$page = get_page_by_title('Mi Crédito');

if ($page) {
    echo '<h2>⚠️ Página encontrada:</h2>';
    echo '<p><strong>ID:</strong> ' . $page->ID . '</p>';
    echo '<p><strong>Título:</strong> ' . $page->post_title . '</p>';
    echo '<p><strong>Slug:</strong> ' . $page->post_name . '</p>';
    echo '<p><strong>URL:</strong> ' . get_permalink($page->ID) . '</p>';
    echo '<p><strong>Autor:</strong> ' . get_userdata($page->post_author)->display_name . '</p>';
    
    // Eliminar la página
    $deleted = wp_delete_post($page->ID, true); // true = eliminar permanentemente
    
    if ($deleted) {
        echo '<h2>✅ Página eliminada exitosamente</h2>';
        
        // Registrar endpoint
        add_rewrite_endpoint('mi-credito', EP_ROOT | EP_PAGES);
        echo '<p>✅ Endpoint mi-credito re-registrado</p>';
        
        // Flush rules
        flush_rewrite_rules(false);
        echo '<p>✅ Rewrite rules actualizadas</p>';
        
        echo '<h2>🧪 Probar ahora:</h2>';
        echo '<p><a href="' . wc_get_page_permalink('myaccount') . '" target="_blank">🔗 Ir a Mi Cuenta</a></p>';
        echo '<p><strong>El enlace "Mi Crédito" debería funcionar correctamente ahora</strong></p>';
        
    } else {
        echo '<h2>❌ Error eliminando la página</h2>';
        echo '<p>Puedes eliminarla manualmente desde WordPress Admin → Páginas</p>';
    }
    
} else {
    echo '<h2>🔍 No se encontró la página "Mi Crédito"</h2>';
    echo '<p>Verificando endpoints...</p>';
    
    // Registrar endpoint
    add_rewrite_endpoint('mi-credito', EP_ROOT | EP_PAGES);
    echo '<p>✅ Endpoint mi-credito registrado</p>';
    
    // Flush rules
    flush_rewrite_rules(false);
    echo '<p>✅ Rewrite rules actualizadas</p>';
}

echo '<hr>';
echo '<p><strong>🗑️ Puedes borrar este archivo después de usarlo</strong></p>';
