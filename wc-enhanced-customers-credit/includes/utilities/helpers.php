<?php
// Helpers - funciones auxiliares
if (!defined('ABSPATH')) exit;

/**
 * Obtiene o crea cuenta de crédito para un usuario
 */
function wecc_get_or_create_account(int $user_id): ?object {
    global $wpdb;
    $table = $wpdb->prefix . 'wecc_credit_accounts';
    
    // Buscar cuenta existente
    $account = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM {$table} WHERE user_id = %d", $user_id
    ));
    
    if ($account) {
        return $account;
    }
    
    // Crear nueva cuenta
    $result = $wpdb->insert($table, [
        'user_id' => $user_id,
        'credit_limit' => 0.00,
        'current_balance' => 0.00,
        'balance_used' => 0.00,
        'available_credit' => 0.00,
        'status' => 'active',
        'payment_terms_days' => 30,
        'created_at' => current_time('mysql'),
        'updated_at' => current_time('mysql')
    ], ['%d', '%f', '%f', '%f', '%f', '%s', '%d', '%s', '%s']);
    
    if ($result === false) {
        return null;
    }
    
    return $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM {$table} WHERE id = %d", $wpdb->insert_id
    ));
}

/**
 * Formatea cantidad como precio
 */
function wecc_format_price(float $amount): string {
    return wc_price($amount);
}

/**
 * Obtiene balance detallado de usuario
 */
function wecc_get_user_balance(int $user_id): array {
    $account = wecc_get_or_create_account($user_id);
    if (!$account) {
        return [
            'balance_used' => 0.0,
            'credit_limit' => 0.0,
            'available_credit' => 0.0,
            'has_positive_balance' => false,
            'positive_amount' => 0.0
        ];
    }
    
    $balance_service = wecc_service('balance_service');
    $detailed = $balance_service->get_detailed_balance($account->id);
    
    return [
        'balance_used' => $detailed['balance_used'],
        'credit_limit' => (float) $account->credit_limit,
        'available_credit' => max(0, (float) $account->credit_limit - $detailed['balance_used']),
        'has_positive_balance' => $detailed['has_positive_balance'],
        'positive_amount' => $detailed['positive_amount']
    ];
}

/**
 * Genera nonce para acciones de WECC
 */
function wecc_create_nonce(string $action): string {
    return wp_create_nonce('wecc_' . $action);
}

/**
 * Verifica nonce de WECC
 */
function wecc_verify_nonce(string $nonce, string $action): bool {
    return wp_verify_nonce($nonce, 'wecc_' . $action);
}

/**
 * Obtiene URL para acción de pago
 */
function wecc_get_payment_url(string $action, array $params = []): string {
    // Usar el endpoint correcto dentro de Mi Cuenta
    $base_url = wc_get_endpoint_url('mi-credito', '', wc_get_page_permalink('myaccount'));
    $params['_wecc_nonce'] = wecc_create_nonce('pay_nonce');
    
    return add_query_arg($params, $base_url);
}

/**
 * Registra entrada en el log de WECC
 */
function wecc_log(string $message, string $level = 'info'): void {
    if (defined('WP_DEBUG') && WP_DEBUG) {
        error_log("WECC [{$level}]: {$message}");
    }
}

/**
 * Obtiene timestamp actual en zona horaria local para base de datos
 */
function wecc_current_datetime(): string {
    return current_time('mysql');
}

/**
 * Obtiene fecha actual para mostrar en frontend
 */
function wecc_format_datetime(string $datetime, string $format = null): string {
    if (!$format) {
        $format = get_option('date_format') . ' ' . get_option('time_format');
    }
    
    return date_i18n($format, strtotime($datetime));
}

/**
 * Convierte fecha UTC a hora local
 */
function wecc_utc_to_local(string $utc_datetime): string {
    $timestamp = strtotime($utc_datetime);
    return date('Y-m-d H:i:s', $timestamp + (get_option('gmt_offset') * HOUR_IN_SECONDS));
}

/**
 * Obtiene movimientos de cuenta de usuario con paginación
 */
function wecc_get_user_ledger(int $user_id, int $limit = 20, int $offset = 0): array {
    global $wpdb;
    
    $account = wecc_get_or_create_account($user_id);
    if (!$account) {
        return [];
    }
    
    // USAR EL MISMO ORDENAMIENTO QUE EN ADMIN: created_at DESC para mostrar más recientes primero
    return $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}wecc_ledger 
         WHERE account_id = %d 
         ORDER BY created_at DESC, id DESC 
         LIMIT %d OFFSET %d",
        $account->id, $limit, $offset
    ), ARRAY_A);
}
