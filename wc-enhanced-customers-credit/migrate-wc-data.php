<?php
if (!defined('ABSPATH')) exit;

/**
 * Script para migrar datos existentes de WooCommerce a WECC
 * Ejecutar UNA VEZ para sincronizar datos existentes
 */

// Cargar WordPress
require_once dirname(__FILE__) . '/../../../../wp-config.php';

echo '<h1>🔄 WECC - Migración de Datos WooCommerce → WECC</h1>';

if (!function_exists('wecc_service')) {
    echo '<div style="background: #f8d7da; padding: 15px; margin: 15px; border-radius: 8px; color: #721c24;">';
    echo '<h2>❌ Error</h2>';
    echo '<p>El servicio WECC no está disponible. Asegúrate de que el plugin esté activado.</p>';
    echo '</div>';
    exit;
}

try {
    $customer_service = wecc_service('customer_service');
    
    echo '<div style="background: #d1ecf1; padding: 15px; margin: 15px; border-radius: 8px; color: #0c5460;">';
    echo '<h2>🔍 Analizando usuarios con datos de WooCommerce...</h2>';
    echo '</div>';
    
    // Obtener todos los usuarios con datos de billing
    global $wpdb;
    
    $users_with_wc_data = $wpdb->get_results("
        SELECT DISTINCT u.ID, u.user_email, u.display_name
        FROM {$wpdb->users} u
        INNER JOIN {$wpdb->usermeta} um ON u.ID = um.user_id
        WHERE um.meta_key IN (
            'billing_phone', 'billing_address_1', 'billing_city', 
            'billing_state', 'billing_postcode', 'billing_company'
        )
        AND um.meta_value != ''
        ORDER BY u.ID
    ");
    
    echo '<p><strong>Usuarios encontrados con datos de WooCommerce: ' . count($users_with_wc_data) . '</strong></p>';
    
    if (empty($users_with_wc_data)) {
        echo '<div style="background: #fff3cd; padding: 15px; margin: 15px; border-radius: 8px; color: #856404;">';
        echo '<p>No se encontraron usuarios con datos de billing en WooCommerce.</p>';
        echo '</div>';
        exit;
    }
    
    echo '<table border="1" style="border-collapse: collapse; width: 100%; margin: 20px 0;">';
    echo '<tr style="background: #f8f9fa;">';
    echo '<th style="padding: 10px;">Usuario</th>';
    echo '<th style="padding: 10px;">Datos WC Encontrados</th>';
    echo '<th style="padding: 10px;">Perfil WECC</th>';
    echo '<th style="padding: 10px;">Acción</th>';
    echo '</tr>';
    
    $migrated_count = 0;
    $updated_count = 0;
    $skipped_count = 0;
    
    foreach ($users_with_wc_data as $user) {
        $user_id = $user->ID;
        
        echo '<tr>';
        echo '<td style="padding: 10px;">';
        echo '<strong>' . esc_html($user->display_name) . '</strong><br>';
        echo '<small>' . esc_html($user->user_email) . ' (ID: ' . $user_id . ')</small>';
        echo '</td>';
        
        // Obtener datos de WooCommerce
        $wc_data = [
            'billing_phone' => get_user_meta($user_id, 'billing_phone', true),
            'billing_address_1' => get_user_meta($user_id, 'billing_address_1', true),
            'billing_address_2' => get_user_meta($user_id, 'billing_address_2', true),
            'billing_city' => get_user_meta($user_id, 'billing_city', true),
            'billing_state' => get_user_meta($user_id, 'billing_state', true),
            'billing_postcode' => get_user_meta($user_id, 'billing_postcode', true),
            'billing_company' => get_user_meta($user_id, 'billing_company', true),
            'billing_country' => get_user_meta($user_id, 'billing_country', true),
        ];
        
        // Mostrar datos WC encontrados
        echo '<td style="padding: 10px; font-size: 12px;">';
        foreach ($wc_data as $key => $value) {
            if (!empty($value)) {
                echo '<strong>' . str_replace('billing_', '', $key) . ':</strong> ' . esc_html($value) . '<br>';
            }
        }
        echo '</td>';
        
        // Verificar perfil WECC existente
        $existing_profile = $customer_service->get_profile_by_user($user_id);
        
        echo '<td style="padding: 10px; font-size: 12px;">';
        if ($existing_profile) {
            echo '<span style="color: #28a745;">✓ Existe</span><br>';
            echo 'Teléfono: ' . ($existing_profile['phone'] ?? 'Vacío') . '<br>';
            echo 'Ciudad: ' . ($existing_profile['city'] ?? 'Vacío') . '<br>';
            echo 'Dirección: ' . ($existing_profile['street'] ?? 'Vacío');
        } else {
            echo '<span style="color: #6c757d;">Sin perfil WECC</span>';
        }
        echo '</td>';
        
        // Realizar migración
        echo '<td style="padding: 10px;">';
        
        try {
            // Mapear datos WC a formato WECC
            $wecc_data = [];
            
            // Mapeo básico
            if (!empty($wc_data['billing_phone'])) $wecc_data['phone'] = $wc_data['billing_phone'];
            if (!empty($wc_data['billing_address_1'])) $wecc_data['street'] = $wc_data['billing_address_1'];
            if (!empty($wc_data['billing_city'])) $wecc_data['city'] = $wc_data['billing_city'];
            if (!empty($wc_data['billing_postcode'])) $wecc_data['zip'] = $wc_data['billing_postcode'];
            
            // Mapear estado (si es código de 2 letras, intentar convertir a 3)
            if (!empty($wc_data['billing_state'])) {
                $state_map = [
                    'AG' => 'AGU', 'BC' => 'BCN', 'BS' => 'BCS', 'CM' => 'CAM',
                    'CS' => 'CHP', 'CH' => 'CHH', 'CO' => 'COA', 'CL' => 'COL',
                    'DF' => 'DIF', 'DG' => 'DUR', 'GT' => 'GUA', 'GR' => 'GUE',
                    'HG' => 'HID', 'JA' => 'JAL', 'EM' => 'MEX', 'MI' => 'MIC',
                    'MO' => 'MOR', 'NA' => 'NAY', 'NL' => 'NLE', 'OA' => 'OAX',
                    'PU' => 'PUE', 'QT' => 'QUE', 'QR' => 'ROO', 'SL' => 'SLP',
                    'SI' => 'SIN', 'SO' => 'SON', 'TB' => 'TAB', 'TM' => 'TAM',
                    'TL' => 'TLA', 'VE' => 'VER', 'YU' => 'YUC', 'ZA' => 'ZAC'
                ];
                
                $state = $wc_data['billing_state'];
                $wecc_data['state3'] = $state_map[$state] ?? $state;
            }
            
            if ($existing_profile) {
                // Actualizar solo campos vacíos en WECC
                $needs_update = false;
                $updated_fields = [];
                
                foreach ($wecc_data as $field => $value) {
                    if (empty($existing_profile[$field]) && !empty($value)) {
                        $existing_profile[$field] = $value;
                        $needs_update = true;
                        $updated_fields[] = $field;
                    }
                }
                
                if ($needs_update) {
                    $customer_service->save_profile($user_id, $existing_profile);
                    echo '<span style="color: #28a745;">✓ Actualizado</span><br>';
                    echo '<small>Campos: ' . implode(', ', $updated_fields) . '</small>';
                    $updated_count++;
                } else {
                    echo '<span style="color: #6c757d;">Sin cambios</span><br>';
                    echo '<small>Perfil WECC ya completo</small>';
                    $skipped_count++;
                }
            } else {
                // Crear nuevo perfil WECC
                if (!empty($wecc_data)) {
                    $customer_service->save_profile($user_id, $wecc_data);
                    echo '<span style="color: #007bff;">✓ Creado</span><br>';
                    echo '<small>Campos: ' . implode(', ', array_keys($wecc_data)) . '</small>';
                    $migrated_count++;
                } else {
                    echo '<span style="color: #ffc107;">⚠ Sin datos</span><br>';
                    echo '<small>No hay datos WC válidos</small>';
                    $skipped_count++;
                }
            }
            
        } catch (Exception $e) {
            echo '<span style="color: #dc3545;">❌ Error</span><br>';
            echo '<small>' . esc_html($e->getMessage()) . '</small>';
        }
        
        echo '</td>';
        echo '</tr>';
    }
    
    echo '</table>';
    
    // Resumen final
    echo '<div style="background: #d4edda; padding: 15px; margin: 15px; border-radius: 8px; color: #155724;">';
    echo '<h2>✅ Migración Completada</h2>';
    echo '<ul>';
    echo '<li><strong>Perfiles creados:</strong> ' . $migrated_count . '</li>';
    echo '<li><strong>Perfiles actualizados:</strong> ' . $updated_count . '</li>';
    echo '<li><strong>Sin cambios:</strong> ' . $skipped_count . '</li>';
    echo '<li><strong>Total procesado:</strong> ' . count($users_with_wc_data) . '</li>';
    echo '</ul>';
    echo '</div>';
    
} catch (Exception $e) {
    echo '<div style="background: #f8d7da; padding: 15px; margin: 15px; border-radius: 8px; color: #721c24;">';
    echo '<h2>❌ Error en la migración</h2>';
    echo '<p>' . esc_html($e->getMessage()) . '</p>';
    echo '</div>';
}

echo '<hr>';
echo '<p><strong>🗑️ Puedes borrar este archivo después de usarlo</strong></p>';
echo '<p><a href="' . admin_url('admin.php?page=wecc-dashboard&tab=customers') . '">← Volver al Dashboard</a></p>';
