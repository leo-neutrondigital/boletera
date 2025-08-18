<?php
// Test rápido para verificar usuarios
if (!defined('ABSPATH')) exit;

add_action('admin_notices', function() {
    if (!isset($_GET['page']) || $_GET['page'] !== 'wecc-dashboard') {
        return;
    }
    
    if (!isset($_GET['wecc_test_users'])) {
        return;
    }
    
    echo '<div class="notice notice-info">';
    echo '<h3>🔍 WECC Test de Usuarios:</h3>';
    
    // Obtener usuarios de prueba
    $users = get_users([
        'number' => 5,
        'fields' => ['ID', 'display_name', 'user_email']
    ]);
    
    echo '<p>Total usuarios en el sistema: ' . count($users) . '</p>';
    
    if (!empty($users)) {
        echo '<p>Primeros 5 usuarios:</p><ul>';
        foreach ($users as $user) {
            echo '<li>' . $user->display_name . ' (' . $user->user_email . ') - ID: ' . $user->ID . '</li>';
        }
        echo '</ul>';
    } else {
        echo '<p>❌ No hay usuarios en el sistema</p>';
    }
    
    // Test de búsqueda
    if (!empty($users)) {
        $first_user = $users[0];
        $search_test = get_users([
            'search' => '*' . substr($first_user->user_email, 0, 3) . '*',
            'search_columns' => ['user_email', 'display_name'],
            'number' => 5
        ]);
        
        echo '<p>Test de búsqueda con "' . substr($first_user->user_email, 0, 3) . '": ' . count($search_test) . ' resultados</p>';
    }
    
    echo '</div>';
});
