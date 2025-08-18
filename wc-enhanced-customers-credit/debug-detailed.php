<?php
/**
 * Script para verificar TODOS los movimientos del usuario 81
 */

if (!defined('ABSPATH')) {
    // require_once('wp-config.php'); // Descomenta si ejecutas fuera de WP
    exit('Ejecutar desde WordPress admin');
}

function debug_ledger_user_81() {
    global $wpdb;
    
    echo "<h2>🔍 DEBUG COMPLETO - Usuario 81</h2>";
    
    // 1. CUENTA
    $account = $wpdb->get_row("SELECT * FROM {$wpdb->prefix}wecc_credit_accounts WHERE user_id = 81");
    echo "<h3>📊 Cuenta:</h3>";
    echo "<p>ID: {$account->id} | Límite: {$account->credit_limit} | Usado: {$account->balance_used} | Disponible: {$account->available_credit}</p>";
    
    // 2. TODOS LOS MOVIMIENTOS
    $movements = $wpdb->get_results("
        SELECT l.*, 'ledger' as source 
        FROM {$wpdb->prefix}wecc_ledger l 
        WHERE l.account_id = {$account->id} 
        ORDER BY l.id ASC
    ");
    
    echo "<h3>📋 MOVIMIENTOS EN LEDGER:</h3>";
    echo "<table border='1' style='border-collapse: collapse; width: 100%; font-size: 12px;'>";
    echo "<tr style='background: #f0f0f0;'>";
    echo "<th>ID</th><th>Tipo</th><th>Monto</th><th>Settles</th><th>Order</th><th>Fecha</th><th>Notas</th>";
    echo "</tr>";
    
    $total = 0;
    foreach ($movements as $mov) {
        $total += $mov->amount;
        $color = $mov->amount > 0 ? '#ffe6e6' : '#e6ffe6'; // Rojo para cargos, verde para pagos
        
        echo "<tr style='background: {$color};'>";
        echo "<td>{$mov->id}</td>";
        echo "<td>{$mov->type}</td>";
        echo "<td><strong>" . number_format($mov->amount, 2) . "</strong></td>";
        echo "<td>{$mov->settles_ledger_id}</td>";
        echo "<td>{$mov->order_id}</td>";
        echo "<td>" . substr($mov->created_at, 5, 11) . "</td>"; // Solo mes-día hora
        echo "<td>" . substr($mov->notes, 0, 50) . "...</td>";
        echo "</tr>";
    }
    
    echo "<tr style='background: #fff3cd; font-weight: bold;'>";
    echo "<td colspan='2'>TOTAL CALCULADO</td>";
    echo "<td>" . number_format($total, 2) . "</td>";
    echo "<td colspan='4'>" . ($total < 0 ? "SALDO A FAVOR: " . number_format(abs($total), 2) : "DEUDA: " . number_format($total, 2)) . "</td>";
    echo "</tr>";
    
    echo "</table>";
    
    // 3. VERIFICAR SI HAY DISCREPANCIAS
    echo "<h3>⚠️ VERIFICACIÓN:</h3>";
    if ($total == 0) {
        echo "<p style='color: orange;'>🔶 El total calculado es CERO. Esto sugiere que:</p>";
        echo "<ul>";
        echo "<li>Los pagos están cancelando exactamente los cargos</li>";
        echo "<li>O los movimientos se están eliminando/modificando</li>";
        echo "<li>O hay un problema en el cálculo</li>";
        echo "</ul>";
    } elseif ($total < 0) {
        echo "<p style='color: green;'>✅ HAY SALDO A FAVOR DE: " . number_format(abs($total), 2) . "</p>";
    } else {
        echo "<p style='color: red;'>❌ HAY DEUDA PENDIENTE DE: " . number_format($total, 2) . "</p>";
    }
    
    // 4. RECALCULAR BALANCE
    echo "<h3>🔧 RECALCULAR BALANCE:</h3>";
    if (function_exists('wecc_service')) {
        try {
            $balance_service = wecc_service('balance_service');
            $new_balance = $balance_service->recalculate_and_update_balance($account->id);
            echo "<p>Balance recalculado: {$new_balance}</p>";
            
            $detailed = $balance_service->get_detailed_balance($account->id);
            echo "<pre>" . print_r($detailed, true) . "</pre>";
        } catch (Exception $e) {
            echo "<p style='color: red;'>Error: " . $e->getMessage() . "</p>";
        }
    }
}

// Ejecutar debug
debug_ledger_user_81();
?>
