<?php
/**
 * Script para debuggear el saldo a favor
 * Ejecutar desde WordPress admin o agregar temporal al customer controller
 */

function debug_user_balance($user_id) {
    global $wpdb;
    
    echo "<h3>🔍 DEBUG SALDO USUARIO ID: {$user_id}</h3>";
    
    // 1. DATOS DE LA CUENTA
    $account = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}wecc_credit_accounts WHERE user_id = %d", 
        $user_id
    ));
    
    echo "<h4>📊 Cuenta de Crédito:</h4>";
    echo "<pre>" . print_r($account, true) . "</pre>";
    
    // 2. TODOS LOS MOVIMIENTOS
    $movements = $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}wecc_ledger l 
         WHERE l.account_id = %d 
         ORDER BY l.created_at ASC", 
        $account->id
    ));
    
    echo "<h4>📋 Todos los Movimientos:</h4>";
    echo "<table border='1' style='border-collapse: collapse; width: 100%;'>";
    echo "<tr><th>ID</th><th>Tipo</th><th>Monto</th><th>Settles</th><th>Fecha</th><th>Notas</th></tr>";
    
    $total_balance = 0;
    foreach ($movements as $mov) {
        $total_balance += $mov->amount;
        echo "<tr>";
        echo "<td>{$mov->id}</td>";
        echo "<td>{$mov->type}</td>";
        echo "<td>" . number_format($mov->amount, 2) . "</td>";
        echo "<td>{$mov->settles_ledger_id}</td>";
        echo "<td>{$mov->created_at}</td>";
        echo "<td>" . substr($mov->notes, 0, 50) . "...</td>";
        echo "</tr>";
    }
    echo "</table>";
    
    // 3. CÁLCULOS
    echo "<h4>🧮 Cálculos:</h4>";
    echo "<p><strong>Balance Total (suma de amounts):</strong> " . number_format($total_balance, 2) . "</p>";
    echo "<p><strong>Balance en tabla accounts:</strong> " . number_format($account->balance_used, 2) . "</p>";
    
    // 4. SALDO A FAVOR
    $positive_balance = 0;
    if ($total_balance < 0) {
        $positive_balance = abs($total_balance);
        echo "<p style='color: green;'><strong>💰 SALDO A FAVOR DETECTADO:</strong> " . number_format($positive_balance, 2) . "</p>";
    } else {
        echo "<p><strong>Sin saldo a favor</strong> (balance = {$total_balance})</p>";
    }
    
    // 5. USANDO BALANCE SERVICE
    if (function_exists('wecc_service')) {
        try {
            $balance_service = wecc_service('balance_service');
            $detailed = $balance_service->get_detailed_balance($account->id);
            
            echo "<h4>🔧 Balance Service Result:</h4>";
            echo "<pre>" . print_r($detailed, true) . "</pre>";
        } catch (Exception $e) {
            echo "<p style='color: red;'>Error con balance service: " . $e->getMessage() . "</p>";
        }
    }
    
    // 6. USANDO FUNCIÓN HELPER
    $helper_balance = wecc_get_user_balance($user_id);
    echo "<h4>🛠️ Helper wecc_get_user_balance():</h4>";
    echo "<pre>" . print_r($helper_balance, true) . "</pre>";
}

// EJEMPLO DE USO:
// debug_user_balance(81);
?>
