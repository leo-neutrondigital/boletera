<?php
// Script temporal para verificar y corregir la tabla
if (!defined('ABSPATH')) {
    require_once dirname(__FILE__) . '/../../../../wp-config.php';
}

echo '<h1>🔧 WECC - Verificación de Base de Datos</h1>';

global $wpdb;
$table_name = $wpdb->prefix . 'wecc_customer_profiles';

// 1. Verificar si la tabla existe
$table_exists = $wpdb->get_var("SHOW TABLES LIKE '$table_name'") == $table_name;

echo '<h2>📊 Estado de la Tabla</h2>';
if ($table_exists) {
    echo '<p style="color: green;">✅ La tabla existe: ' . $table_name . '</p>';
    
    // 2. Mostrar estructura actual
    $columns = $wpdb->get_results("DESCRIBE $table_name");
    echo '<h3>Columnas actuales:</h3>';
    echo '<ul>';
    foreach ($columns as $col) {
        echo '<li><strong>' . $col->Field . '</strong> (' . $col->Type . ') - ' . ($col->Null == 'YES' ? 'NULL' : 'NOT NULL') . '</li>';
    }
    echo '</ul>';
    
    // 3. Columnas que necesitamos
    $required_columns = [
        'customer_type' => 'VARCHAR(50)',
        'customer_number' => 'VARCHAR(50)',
        'sales_rep' => 'INT(11)',
        'customer_since' => 'DATE',
        'credit_notes' => 'TEXT',
        'payment_terms_preference' => 'VARCHAR(50)',
        'credit_rating' => 'VARCHAR(20)',
        'internal_notes' => 'TEXT'
    ];
    
    echo '<h3>Columnas faltantes:</h3>';
    $missing_columns = [];
    foreach ($required_columns as $col_name => $col_type) {
        $exists = false;
        foreach ($columns as $existing_col) {
            if ($existing_col->Field == $col_name) {
                $exists = true;
                break;
            }
        }
        
        if (!$exists) {
            $missing_columns[$col_name] = $col_type;
            echo '<li style="color: red;">❌ ' . $col_name . ' (' . $col_type . ')</li>';
        } else {
            echo '<li style="color: green;">✅ ' . $col_name . '</li>';
        }
    }
    
    // 4. Botón para agregar columnas faltantes
    if (!empty($missing_columns)) {
        echo '<h3>🔧 Reparar Tabla</h3>';
        echo '<form method="post">';
        echo '<input type="hidden" name="action" value="add_missing_columns">';
        echo '<button type="submit" style="background: #00a32a; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer;">';
        echo '🔧 Agregar Columnas Faltantes (' . count($missing_columns) . ')';
        echo '</button>';
        echo '</form>';
        
        // Procesar la adición de columnas
        if (isset($_POST['action']) && $_POST['action'] == 'add_missing_columns') {
            echo '<h3>🔄 Agregando columnas...</h3>';
            
            foreach ($missing_columns as $col_name => $col_type) {
                $sql = "ALTER TABLE $table_name ADD COLUMN $col_name $col_type NULL";
                $result = $wpdb->query($sql);
                
                if ($result !== false) {
                    echo '<p style="color: green;">✅ Agregada: ' . $col_name . '</p>';
                } else {
                    echo '<p style="color: red;">❌ Error agregando: ' . $col_name . ' - ' . $wpdb->last_error . '</p>';
                }
            }
            
            echo '<p><strong>🎉 ¡Listo! Recarga la página para verificar.</strong></p>';
            echo '<script>setTimeout(function(){ location.reload(); }, 2000);</script>';
        }
    } else {
        echo '<p style="color: green; font-size: 18px; background: #d4edda; padding: 15px; border-radius: 8px;">🎉 <strong>¡Tabla completa!</strong> Todas las columnas necesarias están presentes.</p>';
    }
    
} else {
    echo '<p style="color: red;">❌ La tabla NO existe: ' . $table_name . '</p>';
    echo '<p>Necesitas ejecutar el instalador del plugin.</p>';
}

echo '<hr>';
echo '<p><a href="' . admin_url('admin.php?page=wecc-dashboard&tab=customers') . '">← Volver al Dashboard</a></p>';
