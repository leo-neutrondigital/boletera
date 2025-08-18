<script type="text/javascript">
jQuery(document).ready(function($) {
    // Validación RFC
    $('#rfc').on('input', function() {
        const rfc = $(this).val().toUpperCase();
        $(this).val(rfc);
        
        // Validación básica RFC
        const rfcPattern = /^[A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3}$/;
        if (rfc.length > 0 && !rfcPattern.test(rfc)) {
            $(this).css('border-color', '#d63638');
        } else {
            $(this).css('border-color', '');
        }
    });
    
    // Validación número de cliente en tiempo real (MEJORADA)
    let customerNumberTimeout;
    const $customerNumberField = $('#customer_number');
    const $validationDiv = $('#customer-number-validation');
    
    $customerNumberField.on('input', function() {
        const customerNumber = $(this).val().trim();
        
        // Limpiar timeout anterior
        clearTimeout(customerNumberTimeout);
        
        // Resetear validación
        $validationDiv.removeClass('success error').hide();
        $(this).css('border-color', '');
        
        if (customerNumber.length === 0) {
            return; // Campo vacío es válido
        }
        
        if (customerNumber.length < 3) {
            $validationDiv.removeClass('success').addClass('error')
                          .text('🔍 Mínimo 3 caracteres').show();
            return;
        }
        
        // Mostrar "verificando" mientras espera
        $validationDiv.removeClass('success error')
                      .css({background: '#fff3cd', color: '#856404', border: '1px solid #ffeaa7'})
                      .text('🔄 Verificando disponibilidad...').show();
        
        // Verificar disponibilidad con delay
        customerNumberTimeout = setTimeout(function() {
            $.ajax({
                url: ajaxurl,
                type: 'POST',
                data: {
                    action: 'wecc_check_customer_number',
                    customer_number: customerNumber,
                    user_id: $('input[name="user_id"]').val(),
                    nonce: '<?php echo wp_create_nonce('wecc_admin_nonce'); ?>'
                },
                success: function(response) {
                    if (response.success) {
                        if (response.data.exists) {
                            $customerNumberField.css('border-color', '#d63638');
                            $validationDiv.removeClass('success').addClass('error')
                                          .text('⚠️ Ya usado por: ' + response.data.user_name).show();
                        } else {
                            $customerNumberField.css('border-color', '#00a32a');
                            $validationDiv.removeClass('error').addClass('success')
                                          .text('✅ Número disponible').show();
                        }
                    } else {
                        $validationDiv.removeClass('success error')
                                      .css({background: '#f8d7da', color: '#721c24'})
                                      .text('❌ Error verificando').show();
                    }
                },
                error: function() {
                    $validationDiv.removeClass('success error')
                                  .css({background: '#f8d7da', color: '#721c24'})
                                  .text('❌ Error de conexión').show();
                }
            });
        }, 800); // Esperar 800ms después de que deje de escribir
    });
    
    // Validación al enfocar (para mostrar estado actual)
    $customerNumberField.on('focus', function() {
        const customerNumber = $(this).val().trim();
        if (customerNumber.length >= 3) {
            $(this).trigger('input'); // Re-validar
        }
    });
    
    // Validación código postal
    $('#billing_postcode').on('input', function() {
        const cp = $(this).val().replace(/[^0-9]/g, '');
        $(this).val(cp);
    });
    
    // Validación de formulario antes de enviar (MEJORADA)
    $('#wecc-unified-form').on('submit', function(e) {
        const customerNumber = $('#customer_number').val().trim();
        const $validationDiv = $('#customer-number-validation');
        
        // Si hay número de cliente, verificar que no tenga error
        if (customerNumber && $validationDiv.hasClass('error')) {
            e.preventDefault();
            alert('⚠️ Por favor corrige el número de cliente antes de guardar.');
            $('#customer_number').focus();
            return false;
        }
        
        // Si está verificando, esperar
        if (customerNumber && $validationDiv.text().includes('Verificando')) {
            e.preventDefault();
            
            const $submitBtn = $(this).find('input[type="submit"]');
            const originalText = $submitBtn.val();
            $submitBtn.val('Verificando número...');
            
            // Esperar a que termine la verificación
            const checkValidation = setInterval(function() {
                if (!$validationDiv.text().includes('Verificando')) {
                    clearInterval(checkValidation);
                    $submitBtn.val(originalText);
                    
                    if (!$validationDiv.hasClass('error')) {
                        $('#wecc-unified-form').off('submit').submit();
                    } else {
                        alert('⚠️ El número de cliente no está disponible.');
                        $('#customer_number').focus();
                    }
                }
            }, 200);
            
            return false;
        }
        
        // Si todo está bien, permitir envío normal
    });
    
    // Autocomplete de usuarios (si es nuevo cliente)
    <?php if (!$user): ?>
    if (typeof $.fn.autocomplete !== 'undefined') {
        $('#wecc_user_search').autocomplete({
            source: function(request, response) {
                $.ajax({
                    url: ajaxurl,
                    type: 'POST',
                    dataType: 'json',
                    data: {
                        action: 'wecc_user_search',
                        term: request.term,
                        nonce: '<?php echo wp_create_nonce('wecc_admin_nonce'); ?>'
                    },
                    success: function(data) {
                        if (data.success && data.data) {
                            response(data.data);
                        } else {
                            response([]);
                        }
                    }
                });
            },
            minLength: 2,
            select: function(event, ui) {
                $('#wecc_user_id').val(ui.item.id);
                $(this).val(ui.item.label);
                return false;
            }
        });
    }
    <?php endif; ?>
});
</script>
