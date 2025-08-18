// WECC Checkout JavaScript
jQuery(document).ready(function($) {
    
    // Actualizar información de crédito cuando cambia el total
    $(document.body).on('updated_checkout', function() {
        updateCreditInfo();
    });
    
    // Validar crédito al seleccionar el método de pago
    $(document).on('change', 'input[name="payment_method"]', function() {
        if ($(this).val() === 'wecc_credit') {
            validateCredit();
        }
    });
    
    /**
     * Actualiza la información de crédito disponible
     */
    function updateCreditInfo() {
        if ($('input[name="payment_method"]:checked').val() !== 'wecc_credit') {
            return;
        }
        
        const $creditInfo = $('.wecc-credit-info');
        if ($creditInfo.length === 0) {
            return;
        }
        
        // Mostrar loading
        $creditInfo.find('.wecc-order-total .amount').html(wecc_checkout.i18n.loading);
        
        // Obtener el nuevo total
        const newTotal = $('.order-total .amount').text();
        $creditInfo.find('.wecc-order-total .amount').html(newTotal);
        
        // Revalidar crédito
        setTimeout(validateCredit, 100);
    }
    
    /**
     * Valida si hay suficiente crédito
     */
    function validateCredit() {
        const $creditInfo = $('.wecc-credit-info');
        if ($creditInfo.length === 0) {
            return;
        }
        
        const availableCredit = parseFloat($creditInfo.find('.wecc-available-credit .amount').text().replace(/[^0-9.-]+/g, ""));
        const orderTotal = parseFloat($('.order-total .amount').text().replace(/[^0-9.-]+/g, ""));
        
        const $insufficientMsg = $creditInfo.find('.wecc-insufficient-credit');
        const $sufficientMsg = $creditInfo.find('.wecc-sufficient-credit');
        const $placeOrderBtn = $('#place_order');
        
        if (availableCredit < orderTotal) {
            $insufficientMsg.show();
            $sufficientMsg.hide();
            $placeOrderBtn.prop('disabled', true);
            
            // Actualizar mensaje con diferencia
            const difference = orderTotal - availableCredit;
            const formattedDiff = new Intl.NumberFormat('es-MX', {
                style: 'currency',
                currency: 'MXN'
            }).format(difference);
            
            $insufficientMsg.find('p').html(
                wecc_checkout.i18n.insufficient_credit.replace('%s', formattedDiff)
            );
        } else {
            $insufficientMsg.hide();
            $sufficientMsg.show();
            $placeOrderBtn.prop('disabled', false);
        }
    }
    
    // Validación adicional antes del submit
    $(document).on('submit', 'form.checkout', function() {
        if ($('input[name="payment_method"]:checked').val() === 'wecc_credit') {
            const $creditInfo = $('.wecc-credit-info');
            if ($creditInfo.find('.wecc-insufficient-credit:visible').length > 0) {
                alert(wecc_checkout.i18n.insufficient_credit);
                return false;
            }
        }
    });
});
