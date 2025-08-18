<?php
// Diagnóstico temporal para WECC
if (!defined('ABSPATH')) exit;

add_action('admin_notices', function() {
    if (!isset($_GET['page']) || $_GET['page'] !== 'wecc-dashboard') {
        return;
    }
    
    echo '<div class="notice notice-info">';
    echo '<h3>🔍 WECC Diagnóstico:</h3>';
    
    // 1. Verificar si wecc_service existe
    if (function_exists('wecc_service')) {
        echo '<p>✅ Función wecc_service() existe</p>';
        
        // 2. Verificar si el container está funcionando
        try {
            $container = wecc_container();
            echo '<p>✅ Container disponible</p>';
            
            // 3. Verificar servicios específicos
            $services = ['customer_service', 'balance_service'];
            foreach ($services as $service) {
                try {
                    if ($container->has($service)) {
                        echo "<p>✅ {$service} registrado en container</p>";
                        
                        $instance = $container->get($service);
                        if ($instance) {
                            echo "<p>✅ {$service} instancia creada: " . get_class($instance) . "</p>";
                        } else {
                            echo "<p>❌ {$service} instancia es null</p>";
                        }
                    } else {
                        echo "<p>❌ {$service} NO registrado en container</p>";
                    }
                } catch (Exception $e) {
                    echo "<p>❌ Error obteniendo {$service}: " . $e->getMessage() . "</p>";
                }
            }
            
        } catch (Exception $e) {
            echo '<p>❌ Error con container: ' . $e->getMessage() . '</p>';
        }
        
    } else {
        echo '<p>❌ Función wecc_service() NO existe</p>';
    }
    
    // 4. Verificar clases
    $classes = ['WECC_Customer_Service', 'WECC_Balance_Service'];
    foreach ($classes as $class) {
        if (class_exists($class)) {
            echo "<p>✅ Clase {$class} existe</p>";
        } else {
            echo "<p>❌ Clase {$class} NO existe</p>";
        }
    }
    
    echo '</div>';
});
