/**
 * WECC My Credit Frontend JavaScript
 */

jQuery(document).ready(function($) {
    
    // Confirmar pagos
    $('.wecc-pay-all').on('click', function(e) {
        if (!confirm(wecc_my_credit.i18n.confirm_pay_all)) {
            e.preventDefault();
            return false;
        }
    });
    
    $('.wecc-pay-charge').on('click', function(e) {
        if (!confirm(wecc_my_credit.i18n.confirm_pay_charge)) {
            e.preventDefault();
            return false;
        }
    });
    
    // Manejo de errores de pago
    if (window.location.search.includes('wecc_payment_error')) {
        $('<div class="woocommerce-error">' + wecc_my_credit.i18n.error + '</div>')
            .prependTo('.wecc-my-credit');
    }
    
    // Manejo de éxito de pago
    if (window.location.search.includes('wecc_payment_success')) {
        $('<div class="woocommerce-message">' + wecc_my_credit.i18n.success + '</div>')
            .prependTo('.wecc-my-credit');
    }
    
    // Auto-refrescar después de pago exitoso
    if (window.location.search.includes('wecc_payment_success')) {
        setTimeout(function() {
            window.location.href = window.location.pathname;
        }, 3000);
    }
    
});
