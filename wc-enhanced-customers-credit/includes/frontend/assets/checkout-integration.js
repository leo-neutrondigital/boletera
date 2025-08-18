// WECC Checkout Integration JavaScript
jQuery(document).ready(function($) {
    
    let updateTimer;
    
    // Actualizar cuando cambia el checkout
    $(document.body).on('updated_checkout', function() {
        clearTimeout(updateTimer);
        updateTimer = setTimeout(updateCreditInfo, 500);
    });
    
    // Actualizar cuando cambia la cantidad
    $(document).on('change', '.qty, input[name^="quantity"]', function() {
        clearTimeout(updateTimer);
        updateTimer = setTimeout(updateCreditInfo, 1000);
    });
    
    // Actualizar cuando se aplican cupones
    $(document.body).on('applied_coupon removed_coupon', function() {
        setTimeout(updateCreditInfo, 1000);
    });
    
    // Highlight del método de pago según disponibilidad
    $(document).on('change', 'input[name="payment_method"]', function() {
        updatePaymentMethodHighlight();
    });
    
    // Inicializar
    updatePaymentMethodHighlight();
    
    /**
     * Actualiza la información de crédito dinámicamente
     */
    function updateCreditInfo() {
        if (!wecc_checkout_integration.user_id) {
            return;
        }
        
        const $creditSummary = $('.wecc-checkout-credit-summary');
        const $gatewayInfo = $('.wecc-gateway-credit-info');
        
        if ($creditSummary.length === 0) {
            return;
        }
        
        // Mostrar loading
        $creditSummary.addClass('wecc-updating');
        $gatewayInfo.addClass('wecc-updating');
        
        $.ajax({
            url: wecc_checkout_integration.ajax_url,
            type: 'POST',
            data: {
                action: 'wecc_update_credit_info',
                nonce: wecc_checkout_integration.nonce
            },
            success: function(response) {
                if (response.success && response.data) {
                    updateCreditDisplay(response.data);
                }
            },
            error: function() {
                console.log(wecc_checkout_integration.i18n.error);
            },
            complete: function() {
                $creditSummary.removeClass('wecc-updating');
                $gatewayInfo.removeClass('wecc-updating');
            }
        });
    }
    
    /**
     * Actualiza la visualización con los nuevos datos
     */
    function updateCreditDisplay(data) {
        // Actualizar resumen principal
        const $purchaseInfo = $('.wecc-purchase-info');
        
        if (data.can_pay) {
            $purchaseInfo.html(`
                <div class="wecc-can-pay">
                    <span class="dashicons dashicons-yes-alt"></span>
                    <strong>${wecc_checkout_integration.i18n.can_pay}</strong>
                </div>
            `);
        } else {
            const message = wecc_checkout_integration.i18n.cannot_pay.replace('%s', data.difference_formatted);
            $purchaseInfo.html(`
                <div class="wecc-cannot-pay">
                    <span class="dashicons dashicons-warning"></span>
                    <span>${message}</span>
                </div>
            `);
        }
        
        // Actualizar información del gateway
        const $availableAmount = $('.wecc-available-amount');
        if ($availableAmount.length) {
            $availableAmount.html(data.available_credit_formatted);
        }
        
        const $insufficientNotice = $('.wecc-insufficient-notice');
        if (data.can_pay) {
            $insufficientNotice.hide();
        } else {
            const message = wecc_checkout_integration.i18n.cannot_pay.replace('%s', data.difference_formatted);
            $insufficientNotice.html('⚠️ ' + message).show();
        }
        
        // Actualizar info en el gateway de crédito
        $('.wecc-credit-info .wecc-order-total .amount').html(data.cart_total_formatted);
        
        // Actualizar clases del body para styling
        $('body').toggleClass('wecc-credit-available', data.can_pay);
        $('body').toggleClass('wecc-credit-insufficient', !data.can_pay);
        
        // Trigger evento personalizado
        $(document.body).trigger('wecc_credit_updated', [data]);
    }
    
    /**
     * Actualiza el highlight del método de pago
     */
    function updatePaymentMethodHighlight() {
        const isSelected = $('input[name="payment_method"]:checked').val() === 'wecc_credit';
        
        if (isSelected) {
            $('.wecc-checkout-credit-summary').addClass('active');
        } else {
            $('.wecc-checkout-credit-summary').removeClass('active');
        }
    }
    
    /**
     * Manejo de errores de validación
     */
    $(document).on('checkout_error', function() {
        // Si hay error y el método seleccionado es crédito, mostrar ayuda
        if ($('input[name="payment_method"]:checked').val() === 'wecc_credit') {
            const $errorNotice = $('.woocommerce-error:contains("crédito")');
            if ($errorNotice.length) {
                $errorNotice.addClass('wecc-credit-error');
                
                // Scroll a la información de crédito
                $('html, body').animate({
                    scrollTop: $('.wecc-checkout-credit-summary').offset().top - 50
                }, 500);
            }
        }
    });
    
    /**
     * Mejorar UX con animaciones
     */
    $(document).on('wecc_credit_updated', function(event, data) {
        // Animar cambios
        $('.wecc-purchase-info > div').fadeIn(300);
        
        // Si cambió la disponibilidad, destacar
        if (data.can_pay !== $('.wecc-can-pay').is(':visible')) {
            $('.wecc-purchase-info').addClass('wecc-status-changed');
            setTimeout(function() {
                $('.wecc-purchase-info').removeClass('wecc-status-changed');
            }, 2000);
        }
    });
});
