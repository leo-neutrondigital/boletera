<?php
/**
 * Helper functions para pagos de WECC
 */

if (!function_exists('wecc_get_payment_url')) {
    /**
     * Genera URL para iniciar proceso de pago
     */
    function wecc_get_payment_url(string $type, array $params = []): string {
        $base_url = wc_get_page_permalink('myaccount') . 'mi-credito/';
        
        return add_query_arg($params, $base_url);
    }
}

if (!function_exists('wecc_format_payment_amount')) {
    /**
     * Formatea monto para mostrar en pagos
     */
    function wecc_format_payment_amount(float $amount): string {
        return wc_price($amount);
    }
}

if (!function_exists('wecc_is_payment_enabled')) {
    /**
     * Verifica si los pagos están habilitados
     */
    function wecc_is_payment_enabled(): bool {
        return get_option('wecc_enable_frontend_payments', 'yes') === 'yes';
    }
}
