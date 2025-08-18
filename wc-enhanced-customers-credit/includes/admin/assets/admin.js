jQuery(window).on('load', function() {
    var $ = jQuery;
    console.log('WECC: Script cargado');
    
    // Autocomplete para búsqueda de usuarios
    if ($('#wecc_user_search').length) {
        console.log('WECC: Campo #wecc_user_search encontrado');
        
        // Debug: Verificar que jQuery UI autocomplete esté disponible
        if (typeof $.fn.autocomplete === 'undefined') {
            console.error('WECC: jQuery UI Autocomplete no está cargado');
            alert('Error: jQuery UI Autocomplete no está disponible. Contacta al administrador.');
            return;
        }
        
        console.log('WECC: jQuery UI Autocomplete disponible');
        console.log('WECC: AJAX URL:', wecc_admin.ajax_url);
        console.log('WECC: Nonce:', wecc_admin.nonce);
        
        // Inicializar autocomplete
        $('#wecc_user_search').autocomplete({
            source: function(request, response) {
                console.log('WECC: Autocomplete source called with term:', request.term);
                
                $.ajax({
                    url: wecc_admin.ajax_url,
                    type: 'POST',
                    dataType: 'json',
                    data: {
                        action: 'wecc_user_search',
                        term: request.term,
                        nonce: wecc_admin.nonce
                    },
                    beforeSend: function() {
                        console.log('WECC: Sending AJAX request...');
                    },
                    success: function(data) {
                        console.log('WECC User search results:', data);
                        
                        // Manejar respuesta con success/data wrapper
                        if (data.success && data.data) {
                            console.log('WECC: Using data.data:', data.data);
                            response(data.data);
                        } else if (Array.isArray(data)) {
                            console.log('WECC: Using direct array:', data);
                            response(data);
                        } else {
                            console.error('WECC Unexpected response format:', data);
                            response([]);
                        }
                    },
                    error: function(xhr, status, error) {
                        console.error('WECC User search error:', {xhr, status, error});
                        console.error('WECC Response text:', xhr.responseText);
                        response([]);
                    }
                });
            },
            minLength: 2,
            delay: 300,
            select: function(event, ui) {
                console.log('Selected user:', ui.item);
                $('#wecc_user_id').val(ui.item.id);
                $(this).val(ui.item.label);
                
                // Mostrar información adicional
                if (ui.item.has_profile) {
                    alert('⚠️ Este usuario ya tiene un perfil WECC. Serás redirigido a editarlo.');
                }
                
                return false;
            },
            focus: function(event, ui) {
                $(this).val(ui.item.label);
                return false;
            }
        }).autocomplete("widget").addClass("wecc-autocomplete-results");
        
        // Limpiar selección si se borra el campo
        $('#wecc_user_search').on('input', function() {
            if ($(this).val() === '') {
                $('#wecc_user_id').val('');
            }
        });
        
    } else {
        console.log('WECC: Campo #wecc_user_search NO encontrado');
    }
    
    // Resto del código simplificado...
    $('.wecc-delete-action').on('click', function(e) {
        if (!confirm(wecc_admin.i18n.confirm_delete)) {
            e.preventDefault();
            return false;
        }
    });
});
