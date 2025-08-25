<?php
/**
 * Script de prueba para verificar el estado de los índices
 * Usar temporalmente para confirmar que la corrección funciona
 */

// Cambiar la ruta según tu configuración de WordPress
require_once '/Applications/MAMP/htdocs/computel.com.mx/wp-config.php';
require_once '/Applications/MAMP/htdocs/computel.com.mx/wp-content/plugins/wc-enhanced-customers-credit/includes/database/class-wecc-indexing-manager.php';

echo "🔍 Probando sistema de indexación WECC\n";
echo "==========================================\n\n";

// Probar método corregido
if (class_exists('WECC_Indexing_Manager')) {
    echo "✅ Clase WECC_Indexing_Manager cargada correctamente\n\n";
    
    // Obtener estado de índices
    $status = WECC_Indexing_Manager::get_index_status_summary();
    
    echo "📊 Resumen de índices:\n";
    echo "- Total esperado: {$status['total_expected']}\n";
    echo "- Total creado: {$status['total_created']}\n"; 
    echo "- Porcentaje: {$status['percentage']}%\n";
    echo "- Completamente indexado: " . ($status['is_fully_indexed'] ? 'Sí' : 'No') . "\n\n";
    
    echo "📋 Estado detallado por índice:\n";
    echo "=================================\n";
    
    foreach ($status['details'] as $index => $exists) {
        $status_icon = $exists ? '✅' : '❌';
        $status_text = $exists ? 'Creado' : 'Faltante';
        echo sprintf("%-35s %s %s\n", $index, $status_icon, $status_text);
    }
    
    echo "\n🔧 Verificación manual de algunos índices:\n";
    echo "============================================\n";
    
    global $wpdb;
    
    // Verificar manualmente algunos índices específicos
    $manual_checks = [
        'idx_wecc_ledger_overdue' => $wpdb->prefix . 'wecc_ledger',
        'idx_wecc_accounts_status' => $wpdb->prefix . 'wecc_credit_accounts',
        'idx_wecc_display_name' => $wpdb->users
    ];
    
    foreach ($manual_checks as $index => $table) {
        $exists = WECC_Indexing_Manager::index_exists($table, $index);
        $status_icon = $exists ? '✅' : '❌';
        echo sprintf("%-35s en %-25s %s\n", $index, $table, $status_icon);
    }
    
} else {
    echo "❌ Error: No se pudo cargar la clase WECC_Indexing_Manager\n";
}

echo "\n✨ Prueba completada.\n";
echo "Si los índices v1.1 ahora aparecen como '✅ Creado', la corrección funcionó.\n";
?>
