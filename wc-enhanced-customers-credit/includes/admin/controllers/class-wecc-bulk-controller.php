<?php
if (!defined('ABSPATH')) exit;

/**
 * WECC Bulk Controller
 * 
 * Maneja carga masiva de clientes y configuraciones de crédito
 */
class WECC_Bulk_Controller {
    
    private $import_service;
    private $customer_service;
    
    public function __construct() {
        $this->init_dependencies();
    }
    
    /**
     * Inicializar servicios
     */
    private function init_dependencies(): void {
        if (function_exists('wecc_service')) {
            try {
                $this->import_service = wecc_service('import_service');
                $this->customer_service = wecc_service('customer_service');
            } catch (Exception $e) {
                error_log('WECC Bulk Controller: Error inicializando servicios - ' . $e->getMessage());
                // No detener la ejecución, solo registrar el error
            }
        }
    }
    
    /**
     * Renderiza página de carga masiva
     */
    public function render_bulk_page(): void {
        echo '<div class="wecc-bulk-operations">';
        
        echo '<h3 style="margin: 20px 0 20px 0; color: #2271b1; border-bottom: 2px solid #2271b1; padding-bottom: 10px;">' . __('Carga Masiva', 'wc-enhanced-customers-credit') . '</h3>';
        echo '<p>' . __('Importa y exporta clientes con configuraciones de crédito en lotes.', 'wc-enhanced-customers-credit') . '</p>';
        
        // Pestañas
        $current_tab = $_GET['bulk_tab'] ?? 'import';
        $this->render_bulk_tabs($current_tab);
        
        // Contenido según pestaña
        switch ($current_tab) {
            case 'export':
                $this->render_export_section();
                break;
            case 'history':
                $this->render_history_section();
                break;
            default:
                $this->render_import_section();
                break;
        }
        
        echo '</div>';
    }
    
    /**
     * Renderiza pestañas de carga masiva
     */
    private function render_bulk_tabs(string $current): void {
        $tabs = [
            'import' => __('Importar', 'wc-enhanced-customers-credit'),
            'export' => __('Exportar', 'wc-enhanced-customers-credit'),
            'history' => __('Historial', 'wc-enhanced-customers-credit')
        ];
        
        echo '<div class="wecc-bulk-tabs" style="margin-bottom: 20px;">';
        foreach ($tabs as $tab_key => $tab_label) {
            $url = admin_url("admin.php?page=wecc-dashboard&tab=bulk&bulk_tab={$tab_key}");
            $active = $current === $tab_key ? 'nav-tab-active' : '';
            echo "<a href='{$url}' class='nav-tab {$active}'>{$tab_label}</a>";
        }
        echo '</div>';
    }
    
    /**
     * Sección de importación
     */
    private function render_import_section(): void {
        echo '<div class="wecc-import-section">';
        
        // Mostrar estadísticas de última importación
        $stats = get_transient('wecc_import_stats');
        if ($stats) {
            echo '<div class="notice notice-success is-dismissible" style="margin-bottom: 20px;">';
            echo '<h4 style="margin-top: 10px;">✅ Importación Completada</h4>';
            echo '<p><strong>Filas procesadas:</strong> ' . $stats['processed'] . '</p>';
            echo '<p><strong>Usuarios creados:</strong> ' . $stats['created'] . '</p>';
            echo '<p><strong>Usuarios actualizados:</strong> ' . $stats['updated'] . '</p>';
            
            // Mostrar registros saltados si los hay
            if (isset($stats['skipped']) && $stats['skipped'] > 0) {
                echo '<p><strong style="color: #f0ad4e;">Registros saltados:</strong> ' . $stats['skipped'] . '</p>';
                if (!empty($stats['skipped_details'])) {
                    echo '<details style="margin-top: 10px;">';
                    echo '<summary>Ver detalles de registros saltados</summary>';
                    echo '<ul style="margin: 10px 0; padding-left: 20px; color: #f0ad4e;">';
                    foreach (array_slice($stats['skipped_details'], 0, 10) as $skipped) {
                        echo '<li>' . esc_html($skipped) . '</li>';
                    }
                    if (count($stats['skipped_details']) > 10) {
                        echo '<li><em>... y ' . (count($stats['skipped_details']) - 10) . ' registros saltados más.</em></li>';
                    }
                    echo '</ul>';
                    echo '</details>';
                }
            }
            
            if ($stats['errors'] > 0) {
                echo '<p><strong style="color: #d63638;">Errores:</strong> ' . $stats['errors'] . '</p>';
                if (!empty($stats['error_details'])) {
                    echo '<details style="margin-top: 10px;">';
                    echo '<summary>Ver detalles de errores</summary>';
                    echo '<ul style="margin: 10px 0; padding-left: 20px;">';
                    foreach (array_slice($stats['error_details'], 0, 10) as $error) {
                        echo '<li>' . esc_html($error) . '</li>';
                    }
                    if (count($stats['error_details']) > 10) {
                        echo '<li><em>... y ' . (count($stats['error_details']) - 10) . ' errores más.</em></li>';
                    }
                    echo '</ul>';
                    echo '</details>';
                }
            }
            
            echo '</div>';
            
            // Limpiar transient después de mostrar
            delete_transient('wecc_import_stats');
        }
        
        // Descarga de template
        echo '<div style="background: white; padding: 20px; border: 1px solid #c3c4c7; border-radius: 4px; margin-bottom: 20px;">';
        echo '<h4>' . __('1. Descargar Template', 'wc-enhanced-customers-credit') . '</h4>';
        echo '<p>' . __('Descarga el archivo CSV template con las columnas correctas.', 'wc-enhanced-customers-credit') . '</p>';
        echo '<a href="' . admin_url('admin.php?page=wecc-dashboard&tab=bulk&action=download_template') . '" class="button button-secondary">📥 ' . __('Descargar Template CSV', 'wc-enhanced-customers-credit') . '</a>';
        echo '</div>';
        
        // Formulario de importación
        echo '<div style="background: white; padding: 20px; border: 1px solid #c3c4c7; border-radius: 4px;">';
        echo '<h4>' . __('2. Subir Archivo', 'wc-enhanced-customers-credit') . '</h4>';
        
        echo '<form method="post" enctype="multipart/form-data">';
        wp_nonce_field('wecc_bulk_import', 'wecc_import_nonce');
        
        echo '<table class="form-table">';
        
        // Archivo CSV
        echo '<tr>';
        echo '<th><label for="import_file">' . __('Archivo CSV', 'wc-enhanced-customers-credit') . '</label></th>';
        echo '<td>';
        echo '<input type="file" name="import_file" id="import_file" accept=".csv" required>';
        echo '<p class="description">' . __('Archivo CSV con los datos de clientes y crédito. <strong>Delimitadores soportados:</strong> punto y coma (;), coma (,), tabulación o barra vertical (|). El sistema detecta automáticamente el delimitador.', 'wc-enhanced-customers-credit') . '</p>';
        echo '</td>';
        echo '</tr>';
        
        // Opciones de importación
        echo '<tr>';
        echo '<th>' . __('Opciones', 'wc-enhanced-customers-credit') . '</th>';
        echo '<td>';
        echo '<label><input type="checkbox" name="create_users" value="1" checked> ' . __('Crear usuarios si no existen', 'wc-enhanced-customers-credit') . '</label><br>';
        echo '<label><input type="checkbox" name="update_existing" value="1" checked> ' . __('Actualizar datos existentes', 'wc-enhanced-customers-credit') . '</label><br>';
        echo '<label><input type="checkbox" name="create_empty_credit_accounts" value="1"> ' . __('Crear cuentas de crédito vacías (para clientes sin límite)', 'wc-enhanced-customers-credit') . '</label><br>';
        echo '<label><input type="checkbox" name="skip_duplicates" value="1"> ' . __('Saltar duplicados en lugar de fallar', 'wc-enhanced-customers-credit') . '</label>';
        echo '<p class="description">' . __('El crédito se habilita automáticamente solo si credit_limit > 0. Si está marcado "Crear cuentas vacías", se crearán cuentas con límite 0 para clientes sin crédito.', 'wc-enhanced-customers-credit') . '</p>';
        echo '</td>';
        echo '</tr>';
        
        echo '</table>';
        
        echo '<input type="hidden" name="wecc_action" value="bulk_import">';
        submit_button(__('Procesar Importación', 'wc-enhanced-customers-credit'));
        
        echo '</form>';
        echo '</div>';
        
        echo '</div>';
    }
    
    /**
     * Sección de exportación
     */
    private function render_export_section(): void {
        echo '<div class="wecc-export-section">';
        echo '<div style="background: white; padding: 20px; border: 1px solid #c3c4c7; border-radius: 4px;">';
        echo '<h4>' . __('Exportar Datos', 'wc-enhanced-customers-credit') . '</h4>';
        
        echo '<form method="post">';
        wp_nonce_field('wecc_bulk_export', 'wecc_export_nonce');
        
        echo '<table class="form-table">';
        
        // Qué exportar
        echo '<tr>';
        echo '<th>' . __('Datos a Exportar', 'wc-enhanced-customers-credit') . '</th>';
        echo '<td>';
        echo '<label><input type="checkbox" name="export_profiles" value="1" checked> ' . __('Perfiles de clientes', 'wc-enhanced-customers-credit') . '</label><br>';
        echo '<label><input type="checkbox" name="export_credit" value="1" checked> ' . __('Configuraciones de crédito', 'wc-enhanced-customers-credit') . '</label><br>';
        echo '<label><input type="checkbox" name="export_balances" value="1"> ' . __('Saldos actuales', 'wc-enhanced-customers-credit') . '</label>';
        echo '</td>';
        echo '</tr>';
        
        // Filtros
        echo '<tr>';
        echo '<th>' . __('Filtros', 'wc-enhanced-customers-credit') . '</th>';
        echo '<td>';
        echo '<label><input type="radio" name="filter_type" value="all" checked> ' . __('Todos los clientes', 'wc-enhanced-customers-credit') . '</label><br>';
        echo '<label><input type="radio" name="filter_type" value="with_credit"> ' . __('Solo con crédito habilitado', 'wc-enhanced-customers-credit') . '</label><br>';
        echo '<label><input type="radio" name="filter_type" value="with_debt"> ' . __('Solo con deudas pendientes', 'wc-enhanced-customers-credit') . '</label>';
        echo '</td>';
        echo '</tr>';
        
        echo '</table>';
        
        echo '<input type="hidden" name="wecc_action" value="bulk_export">';
        submit_button(__('Generar y Descargar CSV', 'wc-enhanced-customers-credit'));
        
        echo '</form>';
        echo '</div>';
        echo '</div>';
    }
    
    /**
     * Sección de historial
     */
    private function render_history_section(): void {
        echo '<div class="wecc-history-section">';
        echo '<div style="background: white; padding: 20px; border: 1px solid #c3c4c7; border-radius: 4px;">';
        echo '<h4>' . __('Historial de Importaciones', 'wc-enhanced-customers-credit') . '</h4>';
        echo '<p>' . __('Aquí aparecerá el historial de importaciones realizadas.', 'wc-enhanced-customers-credit') . '</p>';
        echo '<p><em>' . __('Funcionalidad pendiente de implementar.', 'wc-enhanced-customers-credit') . '</em></p>';
        echo '</div>';
        echo '</div>';
    }
    
    /**
     * Renderiza formulario de importación
     */
    public function render_import_form(): void {
        // Método delegado a render_import_section
        $this->render_import_section();
    }
    
    /**
     * Maneja importación de archivo CSV
     */
    public function handle_import(): void {
        if (!wp_verify_nonce($_POST['wecc_import_nonce'] ?? '', 'wecc_bulk_import')) {
            wp_redirect(add_query_arg('message', 'error_permissions', wp_get_referer()));
            exit;
        }
        
        if (!isset($_FILES['import_file']) || $_FILES['import_file']['error'] !== UPLOAD_ERR_OK) {
            wp_redirect(add_query_arg('message', 'error_saving', wp_get_referer()));
            exit;
        }
        
        try {
            // Opciones de importación
            $create_users = isset($_POST['create_users']);
            $update_existing = isset($_POST['update_existing']);
            $create_empty_credit_accounts = isset($_POST['create_empty_credit_accounts']);
            $skip_duplicates = isset($_POST['skip_duplicates']);
            
            error_log("WECC Import: Opciones - create_users: {$create_users}, update_existing: {$update_existing}, create_empty_credit_accounts: {$create_empty_credit_accounts}, skip_duplicates: {$skip_duplicates}");
            
            // Leer archivo CSV
            $file_path = $_FILES['import_file']['tmp_name'];
            $handle = fopen($file_path, 'r');
            
            if (!$handle) {
                throw new Exception('No se pudo leer el archivo CSV');
            }
            
            // DETECTAR DELIMITADOR AUTOMÁTICAMENTE
            $delimiter = $this->detect_csv_delimiter($file_path);
            error_log("WECC Import: Delimitador detectado: '{$delimiter}'");
            
            // Leer encabezados con delimitador detectado
            $headers = fgetcsv($handle, 0, $delimiter);
            if (!$headers) {
                throw new Exception('Archivo CSV vacío o inválido');
            }
            
            // LIMPIAR BOM (Byte Order Mark) del primer header
            if (!empty($headers[0])) {
                $headers[0] = $this->remove_bom($headers[0]);
            }
            
            // DEBUG: Mostrar headers detectados
            error_log('WECC DEBUG: Headers detectados (' . count($headers) . '): ' . implode(', ', array_slice($headers, 0, 5)) . '...');
            error_log('WECC DEBUG: Primer header limpio: "' . $headers[0] . '"');
            
            // Validar que tenemos los headers mínimos necesarios
            if (!in_array('user_email', $headers)) {
                error_log('WECC DEBUG: Headers completos: ' . print_r($headers, true));
                throw new Exception('Columna obligatoria "user_email" no encontrada. Headers encontrados: ' . implode(', ', $headers));
            }
            
            // Mapear columnas
            $column_map = array_flip($headers);
            
            // Contadores
            $processed = 0;
            $created = 0;
            $updated = 0;
            $skipped = 0;
            $errors = 0;
            $error_details = [];
            $skipped_details = [];
            
            // Procesar filas
            while (($row = fgetcsv($handle, 0, $delimiter)) !== false) {  // USAR DELIMITADOR DETECTADO
                // Saltar filas vacías o de comentarios
                if (empty($row[0]) || strpos($row[0], '#') === 0) {
                    continue;
                }
                
                $processed++;
                
                // DEBUG: Mostrar primera fila para verificar parsing
                if ($processed === 1) {
                    error_log('WECC DEBUG: Primera fila parseada (' . count($row) . ' campos): ' . implode(' | ', array_slice($row, 0, 3)) . '...');
                }
                
                try {
                    $result = $this->process_csv_row($row, $column_map, $create_users, $update_existing, $create_empty_credit_accounts, $skip_duplicates);
                    
                    if ($result['created']) {
                        $created++;
                    } elseif ($result['updated']) {
                        $updated++;
                    } elseif ($result['skipped']) {
                        $skipped++;
                        $skipped_details[] = "Fila {$processed}: {$result['skip_reason']}";
                    }
                    
                } catch (Exception $e) {
                    $errors++;
                    $error_details[] = "Fila {$processed}: " . $e->getMessage();
                    error_log("WECC Import Error - Fila {$processed}: " . $e->getMessage());
                }
            }
            
            fclose($handle);
            
            // Guardar estadísticas en transients para mostrar
            set_transient('wecc_import_stats', [
                'processed' => $processed,
                'created' => $created,
                'updated' => $updated,
                'skipped' => $skipped,
                'errors' => $errors,
                'error_details' => $error_details,
                'skipped_details' => $skipped_details
            ], 300); // 5 minutos
            
            error_log("WECC Import completed: {$processed} procesadas, {$created} creadas, {$updated} actualizadas, {$errors} errores");
            
            $redirect_url = admin_url('admin.php?page=wecc-dashboard&tab=bulk&message=import_completed');
            wp_redirect($redirect_url);
            exit;
            
        } catch (Exception $e) {
            error_log('Error en importación: ' . $e->getMessage());
            wp_redirect(add_query_arg('message', 'error_saving', wp_get_referer()));
            exit;
        }
    }
    
    /**
     * Procesa una fila individual del CSV
     */
    private function process_csv_row(array $row, array $column_map, bool $create_users, bool $update_existing, bool $create_empty_credit_accounts, bool $skip_duplicates = false): array {
        $row_number = $row[0] ?? 'N/A'; // Para identificar errores
        
        // 1. VALIDAR EMAIL (obligatorio)
        $email = $this->get_csv_value($row, $column_map, 'user_email');
        
        // DEBUG TEMPORAL: Ver qué está pasando con el email
        error_log('WECC DEBUG EMAIL: Fila procesando');
        error_log('WECC DEBUG EMAIL: Email crudo = "' . var_export($email, true) . '"');
        error_log('WECC DEBUG EMAIL: Email length = ' . strlen($email));
        error_log('WECC DEBUG EMAIL: Email trimmed = "' . trim($email) . '"');
        error_log('WECC DEBUG EMAIL: is_email() result = ' . var_export(is_email($email), true));
        error_log('WECC DEBUG EMAIL: empty() result = ' . var_export(empty($email), true));
        
        if (empty($email) || !is_email($email)) {
            throw new Exception('Email inválido o faltante: "' . $email . '" (length: ' . strlen($email) . ')');
        }
        
        // 2. VALIDAR CUSTOMER_NUMBER (si se proporciona)
        $customer_number = $this->get_csv_value($row, $column_map, 'customer_number');
        if (!empty($customer_number)) {
            $duplicate_check = $this->check_customer_number_duplicate($customer_number, $email);
            if ($duplicate_check['exists']) {
                if ($skip_duplicates) {
                    return [
                        'created' => false,
                        'updated' => false,
                        'skipped' => true,
                        'skip_reason' => "Customer number '{$customer_number}' duplicado (existe para: {$duplicate_check['existing_email']})"
                    ];
                } else {
                    throw new Exception("Número de cliente '{$customer_number}' ya existe para: {$duplicate_check['existing_email']}");
                }
            }
        }
        
        // 3. VALIDAR RFC (si se proporciona)
        $rfc = $this->get_csv_value($row, $column_map, 'rfc');
        if (!empty($rfc)) {
            if (!$this->validate_rfc_format($rfc)) {
                if ($skip_duplicates) {
                    return [
                        'created' => false,
                        'updated' => false,
                        'skipped' => true,
                        'skip_reason' => "RFC inválido: '{$rfc}' (formato incorrecto)"
                    ];
                } else {
                    throw new Exception("RFC inválido: '{$rfc}' (formato incorrecto)");
                }
            }
            
            $rfc_duplicate = $this->check_rfc_duplicate($rfc, $email);
            if ($rfc_duplicate['exists']) {
                if ($skip_duplicates) {
                    return [
                        'created' => false,
                        'updated' => false,
                        'skipped' => true,
                        'skip_reason' => "RFC '{$rfc}' duplicado (existe para: {$rfc_duplicate['existing_email']})"
                    ];
                } else {
                    throw new Exception("RFC '{$rfc}' ya existe para: {$rfc_duplicate['existing_email']}");
                }
            }
        }
        
        // 4. VALIDAR SALES_REP (si se proporciona)
        $sales_rep = $this->get_csv_value($row, $column_map, 'sales_rep');
        if (!empty($sales_rep) && !$this->validate_sales_rep_exists($sales_rep)) {
            throw new Exception("Vendedor con ID '{$sales_rep}' no existe");
        }
        
        // 5. VALIDAR FECHA CUSTOMER_SINCE
        $customer_since = $this->get_csv_value($row, $column_map, 'customer_since');
        if (!empty($customer_since)) {
            $normalized_date = $this->normalize_date_format($customer_since);
            if (!$normalized_date) {
                throw new Exception("Fecha inválida: '{$customer_since}' (formatos soportados: YYYY-MM-DD, DD/MM/YY, DD/MM/YYYY, DD-MM-YYYY)");
            }
            // Actualizar la fecha normalizada para uso posterior
            $customer_since = $normalized_date;
            error_log("WECC Import: Fecha convertida: '{$this->get_csv_value($row, $column_map, 'customer_since')}' -> '{$customer_since}'");
        }
        
        // 6. VALIDAR CRÉDITO
        $credit_limit = $this->get_csv_value($row, $column_map, 'credit_limit');
        if (!empty($credit_limit)) {
            $credit_limit_float = (float) $credit_limit;
            if ($credit_limit_float < 0) {
                throw new Exception("Límite de crédito inválido: '{$credit_limit}' (debe ser positivo)");
            }
            if ($credit_limit_float > 10000000) { // 10M límite razonable
                throw new Exception("Límite de crédito muy alto: '{$credit_limit}' (máximo 10,000,000)");
            }
        }
        
        $payment_terms = $this->get_csv_value($row, $column_map, 'payment_terms_days');
        if (!empty($payment_terms)) {
            $payment_terms_int = (int) $payment_terms;
            if ($payment_terms_int < 1 || $payment_terms_int > 365) {
                throw new Exception("Días de pago inválidos: '{$payment_terms}' (rango: 1-365)");
            }
        }
        
        // CONTINUAR CON PROCESAMIENTO ORIGINAL...
        
        error_log("WECC Import: Iniciando procesamiento de usuario para email: {$email}");
        
        // Buscar usuario existente
        $user = get_user_by('email', $email);
        $user_created = false;
        $user_updated = false;
        
        if (!$user) {
            if (!$create_users) {
                throw new Exception('Usuario no existe y creación deshabilitada: ' . $email);
            }
            
            error_log("WECC Import: Creando nuevo usuario: {$email}");
            
            // Crear usuario
            $user_data = [
                'user_login' => $email,
                'user_email' => $email,
                'display_name' => $this->get_csv_value($row, $column_map, 'display_name') ?: $email,
                'role' => 'customer'
            ];
            
            $user_id = wp_insert_user($user_data);
            if (is_wp_error($user_id)) {
                throw new Exception('Error creando usuario: ' . $user_id->get_error_message());
            }
            
            $user = get_user_by('id', $user_id);
            $user_created = true;
            
            error_log("WECC Import: Usuario creado exitosamente con ID: {$user_id}");
            
        } else {
            if (!$update_existing) {
                throw new Exception('Usuario existe y actualización deshabilitada: ' . $email);
            }
            $user_updated = true;
            error_log("WECC Import: Actualizando usuario existente ID: {$user->ID}");
        }
        
        // Actualizar datos de WooCommerce
        $wc_fields = [
            'billing_first_name', 'billing_last_name', 'billing_company',
            'billing_phone', 'billing_address_1', 'billing_address_2', 
            'billing_city', 'billing_state', 'billing_postcode'
        ];
        
        error_log("WECC Import: Actualizando campos WooCommerce para usuario {$user->ID}");
        
        foreach ($wc_fields as $field) {
            $value = $this->get_csv_value($row, $column_map, $field);
            if (!empty($value)) {
                $result = update_user_meta($user->ID, $field, sanitize_text_field($value));
                if (!$result) {
                    error_log("WECC Import: Warning - No se pudo actualizar {$field} para usuario {$user->ID}");
                }
            }
        }
        
        error_log("WECC Import: Campos WooCommerce actualizados para usuario {$user->ID}");
        
        // Guardar datos WECC usando el servicio unificado
        if (class_exists('WECC_Unified_Customer_Service')) {
            error_log("WECC Import: Iniciando guardado de datos WECC para usuario {$user->ID}");
            
            $unified_service = new WECC_Unified_Customer_Service();
            
            $wecc_data = [
                'rfc' => $this->get_csv_value($row, $column_map, 'rfc'),
                'customer_type' => $this->get_csv_value($row, $column_map, 'customer_type'),
                'customer_number' => $this->get_csv_value($row, $column_map, 'customer_number'),
                'sales_rep' => $this->get_csv_value($row, $column_map, 'sales_rep'),
                'customer_since' => $customer_since,  // Usar fecha normalizada
                'credit_notes' => $this->get_csv_value($row, $column_map, 'credit_notes')
            ];
            
            // Limpiar valores vacíos
            $wecc_data = array_map(function($value) {
                return $value === '' ? null : sanitize_text_field($value);
            }, $wecc_data);
            
            error_log("WECC Import: Datos WECC a guardar: " . json_encode($wecc_data));
            
            try {
                $unified_service->save_wecc_specific_data($user->ID, $wecc_data);
                error_log("WECC Import: Datos WECC guardados exitosamente para usuario {$user->ID}");
            } catch (Exception $e) {
                error_log("WECC Import: Error guardando datos WECC: " . $e->getMessage());
                throw new Exception("Error guardando datos WECC: " . $e->getMessage());
            }
        } else {
            error_log("WECC Import: Warning - WECC_Unified_Customer_Service no disponible");
        }
        
        // CONFIGURAR CRÉDITO - NUEVA LÓGICA INTELIGENTE
        $credit_limit = (float) $this->get_csv_value($row, $column_map, 'credit_limit');
        $payment_terms = (int) $this->get_csv_value($row, $column_map, 'payment_terms_days', 30);
        
        error_log("WECC Import: Configurando crédito - Limit: {$credit_limit}, Terms: {$payment_terms}");
        
        // LÓGICA INTELIGENTE:
        // 1. Si credit_limit > 0 -> SIEMPRE habilitar crédito con ese límite
        // 2. Si credit_limit = 0 o vacío Y create_empty_credit_accounts = true -> Crear cuenta con límite 0
        // 3. Si credit_limit = 0 o vacío Y create_empty_credit_accounts = false -> NO crear cuenta
        
        $should_create_credit_account = false;
        $final_credit_limit = 0;
        $final_status = 'inactive';
        
        if ($credit_limit > 0) {
            // Caso 1: Cliente CON crédito
            $should_create_credit_account = true;
            $final_credit_limit = $credit_limit;
            $final_status = 'active';
            error_log("WECC Import: Usuario {$user->ID} - Habilitando crédito: {$final_credit_limit}");
        } elseif ($create_empty_credit_accounts) {
            // Caso 2: Cliente SIN crédito pero crear cuenta vacía
            $should_create_credit_account = true;
            $final_credit_limit = 0;
            $final_status = 'inactive';
            error_log("WECC Import: Usuario {$user->ID} - Creando cuenta vacía");
        } else {
            // Caso 3: Cliente SIN crédito y NO crear cuenta
            $should_create_credit_account = false;
            error_log("WECC Import: Usuario {$user->ID} - Sin crédito, no se crea cuenta");
        }
        
        if ($should_create_credit_account) {
            try {
                error_log("WECC Import: Creando/actualizando cuenta de crédito para usuario {$user->ID}");
                
                $account = wecc_get_or_create_account($user->ID);
                
                error_log("WECC Import: Cuenta obtenida/creada - ID: {$account->id}");
                
                global $wpdb;
                $result = $wpdb->update(
                    $wpdb->prefix . 'wecc_credit_accounts',
                    [
                        'credit_limit' => $final_credit_limit,
                        'payment_terms_days' => $payment_terms,
                        'available_credit' => $final_credit_limit,
                        'status' => $final_status,
                        'updated_at' => current_time('mysql')
                    ],
                    ['user_id' => $user->ID],
                    ['%f', '%d', '%f', '%s', '%s'],
                    ['%d']
                );
                
                if ($result === false) {
                    error_log("WECC Import: Error actualizando cuenta de crédito. Error BD: " . $wpdb->last_error);
                    throw new Exception("Error actualizando cuenta de crédito: " . $wpdb->last_error);
                }
                
                error_log("WECC Import: Cuenta de crédito actualizada exitosamente - Filas afectadas: {$result}");
                
            } catch (Exception $e) {
                error_log("WECC Import: Error en configuración de crédito: " . $e->getMessage());
                throw new Exception("Error configurando crédito: " . $e->getMessage());
            }
        }
        
        error_log("WECC Import: Procesamiento completado exitosamente para usuario {$user->ID}");
        
        return [
            'created' => $user_created,
            'updated' => $user_updated
        ];
    }
    
    /**
     * Obtiene valor de CSV con validación
     */
    private function get_csv_value(array $row, array $column_map, string $column, $default = ''): string {
        if (!isset($column_map[$column])) {
            error_log("WECC DEBUG CSV: Columna '{$column}' no encontrada en headers");
            return $default;
        }
        
        $index = $column_map[$column];
        $value = isset($row[$index]) ? trim($row[$index]) : $default;
        
        // DEBUG TEMPORAL: Log para columnas importantes
        if (in_array($column, ['user_email', 'rfc', 'customer_number'])) {
            error_log("WECC DEBUG CSV: Columna '{$column}' -> Index {$index} -> Valor '" . var_export($value, true) . "'");
        }
        
        return $value;
    }
    
    /**
     * Verifica si un customer_number ya existe
     */
    private function check_customer_number_duplicate(string $customer_number, string $current_email): array {
        global $wpdb;
        
        $existing = $wpdb->get_row($wpdb->prepare(
            "SELECT p.user_id, u.user_email 
             FROM {$wpdb->prefix}wecc_customer_profiles p 
             LEFT JOIN {$wpdb->users} u ON p.user_id = u.ID 
             WHERE p.customer_number = %s AND u.user_email != %s",
            $customer_number,
            $current_email
        ));
        
        return [
            'exists' => !empty($existing),
            'existing_email' => $existing ? $existing->user_email : null
        ];
    }
    
    /**
     * Verifica si un RFC ya existe
     */
    private function check_rfc_duplicate(string $rfc, string $current_email): array {
        global $wpdb;
        
        $existing = $wpdb->get_row($wpdb->prepare(
            "SELECT p.user_id, u.user_email 
             FROM {$wpdb->prefix}wecc_customer_profiles p 
             LEFT JOIN {$wpdb->users} u ON p.user_id = u.ID 
             WHERE p.rfc = %s AND u.user_email != %s",
            $rfc,
            $current_email
        ));
        
        return [
            'exists' => !empty($existing),
            'existing_email' => $existing ? $existing->user_email : null
        ];
    }
    
    /**
     * Valida formato de RFC mexicano
     */
    private function validate_rfc_format(string $rfc): bool {
        // RFC persona física: 4 letras + 6 dígitos + 3 caracteres
        // RFC persona moral: 3 letras + 6 dígitos + 3 caracteres
        $pattern_fisica = '/^[A-Z]{4}[0-9]{6}[A-Z0-9]{3}$/';
        $pattern_moral = '/^[A-Z]{3}[0-9]{6}[A-Z0-9]{3}$/';
        
        return preg_match($pattern_fisica, strtoupper($rfc)) || preg_match($pattern_moral, strtoupper($rfc));
    }
    
    /**
     * Valida que exista un vendedor con el ID proporcionado
     */
    private function validate_sales_rep_exists(string $sales_rep_id): bool {
        $user = get_user_by('id', (int) $sales_rep_id);
        
        // Verificar que el usuario existe y tiene un rol apropiado
        if (!$user) {
            return false;
        }
        
        $allowed_roles = ['shop_manager', 'administrator', 'editor'];
        return !empty(array_intersect($allowed_roles, $user->roles));
    }
    
    /**
     * Valida formato de fecha YYYY-MM-DD
     */
    private function validate_date_format(string $date): bool {
        $parsed = DateTime::createFromFormat('Y-m-d', $date);
        return $parsed !== false && $parsed->format('Y-m-d') === $date;
    }
    
    /**
     * Renderiza formulario de exportación
     */
    public function render_export_form(): void {
        // Método delegado a render_export_section
        $this->render_export_section();
    }
    
    /**
     * Maneja exportación de datos
     */
    public function handle_export(): void {
        if (!wp_verify_nonce($_POST['wecc_export_nonce'] ?? '', 'wecc_bulk_export')) {
            wp_redirect(add_query_arg('message', 'error_permissions', wp_get_referer()));
            exit;
        }
        
        try {
            // TODO: Implementar lógica de exportación
            
            error_log('WECC: Exportación iniciada');
            
            // Por ahora redireccionar de vuelta
            wp_redirect(add_query_arg('message', 'export_completed', wp_get_referer()));
            exit;
            
        } catch (Exception $e) {
            error_log('Error en exportación: ' . $e->getMessage());
            wp_redirect(add_query_arg('message', 'error_saving', wp_get_referer()));
            exit;
        }
    }
    
    /**
     * Descarga template CSV
     */
    public function download_template(): void {
        error_log('WECC Bulk: download_template iniciado');
        
        // Limpiar cualquier output previo
        if (ob_get_level()) {
            ob_end_clean();
        }
        
        // Crear CSV template con las columnas necesarias PARA EL NUEVO SISTEMA UNIFICADO
        $headers = [
            // Datos WordPress (obligatorios)
            'user_email',           // Para identificar/crear usuario
            'display_name',         // Nombre completo para WordPress
            
            // Datos WooCommerce (billing)
            'billing_first_name',   // Nombre
            'billing_last_name',    // Apellidos
            'billing_company',      // Empresa
            'billing_phone',        // Teléfono
            'billing_address_1',    // Dirección principal
            'billing_address_2',    // Dirección secundaria
            'billing_city',         // Ciudad
            'billing_state',        // Estado (código 2-3 letras)
            'billing_postcode',     // Código postal
            
            // Datos WECC (customer_profiles)
            'rfc',                  // RFC fiscal
            'customer_type',        // Tipo cliente (mayorista, detallista, etc.)
            'customer_number',      // Número único
            'sales_rep',            // ID del vendedor (número)
            'customer_since',       // Fecha cliente (YYYY-MM-DD)
            'credit_notes',         // Notas de crédito
            
            // Datos de Crédito (credit_accounts)
            'credit_limit',         // Límite de crédito
            'payment_terms_days'    // Días de pago
        ];
        
        error_log('WECC Bulk: Headers count = ' . count($headers));
        
        // Ejemplo de datos realistas - CLIENTE CON CRÉDITO
        $example_data_with_credit = [
            // WordPress
            'cliente-credito@empresa.com',
            'Juan Pérez García',
            
            // WooCommerce
            'Juan',
            'Pérez García', 
            'Empresa Ejemplo SA de CV',
            '999-123-4567',
            'Av. Principal 123',
            'Oficina 4B',
            'Guadalajara',
            'JAL',
            '44100',
            
            // WECC
            'PEGJ850528ABC',
            'Mayorista',
            'CLI-001',
            '2',  // ID del vendedor
            '2024-01-15',
            'Cliente preferencial con descuentos especiales',
            
            // Crédito - CON CRÉDITO
            '50000.00',
            '30'
        ];
        
        // Ejemplo de cliente SIN crédito
        $example_data_no_credit = [
            // WordPress
            'cliente-sin-credito@empresa.com',
            'María López Sánchez',
            
            // WooCommerce
            'María',
            'López Sánchez',
            'Compras Menores SA de CV',
            '999-987-6543',
            'Calle Secundaria 456',
            '',
            'Monterrey',
            'NL',
            '64000',
            
            // WECC
            'LOSM900312XYZ',
            'Detallista',
            'CLI-002',
            '',  // Sin vendedor asignado
            '2024-02-20',
            'Cliente de contado, sin necesidad de crédito',
            
            // Sin crédito - CAMPOS VACÍOS
            '',
            ''
        ];
        
        // Preparar descarga
        $filename = 'wecc_clientes_template_' . date('Y-m-d') . '.csv';
        error_log('WECC Bulk: Filename = ' . $filename);
        
        // Headers para descarga
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Pragma: no-cache');
        header('Expires: 0');
        
        error_log('WECC Bulk: Headers enviados');
        
        $output = fopen('php://output', 'w');
        
        // BOM para UTF-8 (Excel compatibility)
        fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF));
        
        // Escribir headers
        fputcsv($output, $headers);
        
        // Escribir ejemplos (CON crédito y SIN crédito)
        fputcsv($output, $example_data_with_credit);
        fputcsv($output, $example_data_no_credit);
        
        // Agregar comentarios informativos como filas adicionales
        fputcsv($output, []); // Fila vacía
        fputcsv($output, ['# INSTRUCCIONES:', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);
        fputcsv($output, ['# user_email: OBLIGATORIO - Email único para identificar usuario', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);
        fputcsv($output, ['# customer_type: mayorista, detallista, corporativo, etc.', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);
        fputcsv($output, ['# sales_rep: ID numérico del vendedor (opcional)', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);
        fputcsv($output, ['# customer_since: Formato YYYY-MM-DD (ej: 2024-01-15)', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);
        fputcsv($output, ['# billing_state: Código de 2-3 letras (ej: CDMX, JAL, NL)', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);
        fputcsv($output, ['# credit_limit: Monto para habilitar crédito (ej: 50000.00) - Dejar vacío si NO tiene crédito', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);
        fputcsv($output, ['# payment_terms_days: Días de pago solo si credit_limit > 0 (ej: 30)', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);
        fputcsv($output, ['# IMPORTANTE: Credit_limit > 0 = Cliente CON crédito, vacío/0 = Cliente SIN crédito', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);
        
        fclose($output);
        error_log('WECC Bulk: Archivo generado, terminando');
        exit;
    }
    
    /**
     * Detecta automáticamente el delimitador del CSV
     */
    private function detect_csv_delimiter(string $file_path): string {
        $delimiters = [';', ',', "\t", '|'];  // Orden de prioridad
        $file_handle = fopen($file_path, 'r');
        
        if (!$file_handle) {
            return ';';  // Fallback por defecto
        }
        
        // Leer las primeras líneas para análisis
        $sample_lines = [];
        for ($i = 0; $i < 3 && !feof($file_handle); $i++) {
            $line = fgets($file_handle);
            if ($line) {
                $sample_lines[] = trim($line);
            }
        }
        fclose($file_handle);
        
        if (empty($sample_lines)) {
            return ';';
        }
        
        $scores = [];
        
        foreach ($delimiters as $delimiter) {
            $score = 0;
            $field_counts = [];
            
            foreach ($sample_lines as $line) {
                // Saltar líneas de comentarios
                if (strpos($line, '#') === 0) {
                    continue;
                }
                
                $fields = str_getcsv($line, $delimiter);
                $field_count = count($fields);
                $field_counts[] = $field_count;
                
                // Bonificar si encontramos 'user_email' (header esperado)
                if (in_array('user_email', $fields)) {
                    $score += 10;
                }
                
                // Bonificar número de campos razonable (15-25 campos esperados)
                if ($field_count >= 15 && $field_count <= 25) {
                    $score += 5;
                }
                
                // Penalizar muy pocos campos (probablemente delimitador incorrecto)
                if ($field_count < 5) {
                    $score -= 3;
                }
            }
            
            // Bonificar consistencia en número de campos
            if (count(array_unique($field_counts)) <= 2) {  // Máximo 2 variaciones diferentes
                $score += 3;
            }
            
            $scores[$delimiter] = $score;
            
            error_log("WECC Delimiter Detection: '{$delimiter}' -> Score: {$score}, Field counts: " . implode(',', $field_counts));
        }
        
        // Encontrar el delimitador con mayor puntaje
        arsort($scores);
        $best_delimiter = array_key_first($scores);
        
        error_log('WECC Delimiter Detection: Scores finales: ' . json_encode($scores));
        error_log("WECC Delimiter Detection: Mejor delimitador: '{$best_delimiter}'");
        
        return $best_delimiter;
    }
    
    /**
     * Remueve BOM (Byte Order Mark) de una cadena
     */
    private function remove_bom(string $text): string {
        // BOM UTF-8: EF BB BF
        $bom = "\xEF\xBB\xBF";
        
        if (substr($text, 0, 3) === $bom) {
            error_log('WECC BOM: BOM UTF-8 detectado y removido');
            return substr($text, 3);
        }
        
        // BOM UTF-16 BE: FE FF
        if (substr($text, 0, 2) === "\xFE\xFF") {
            error_log('WECC BOM: BOM UTF-16 BE detectado y removido');
            return substr($text, 2);
        }
        
        // BOM UTF-16 LE: FF FE
        if (substr($text, 0, 2) === "\xFF\xFE") {
            error_log('WECC BOM: BOM UTF-16 LE detectado y removido');
            return substr($text, 2);
        }
        
        return $text;
    }
    
    /**
     * Normaliza diferentes formatos de fecha a YYYY-MM-DD
     */
    private function normalize_date_format(string $date_string): ?string {
        $date_string = trim($date_string);
        
        if (empty($date_string)) {
            return null;
        }
        
        // Lista de formatos soportados
        $formats = [
            'Y-m-d',        // 2024-01-15 (ya correcto)
            'Y-n-j',        // 2024-1-15 (año completo, mes y día variables)
            'd/m/Y',        // 15/01/2024
            'j/n/Y',        // 15/1/2024 (día y mes variables)
            'd/m/y',        // 15/01/24
            'j/n/y',        // 15/1/24 (día y mes variables) ← TU CASO
            'd-m-Y',        // 15-01-2024
            'j-n-Y',        // 15-1-2024 (día y mes variables)
            'd-m-y',        // 15-01-24
            'j-n-y',        // 15-1-24 (día y mes variables)
            'm/d/Y',        // 01/15/2024 (formato US)
            'n/j/Y',        // 1/15/2024 (formato US, variables)
            'm/d/y',        // 01/15/24 (formato US)
            'n/j/y',        // 1/15/24 (formato US, variables)
            'Y/m/d',        // 2024/01/15
            'Y/n/j',        // 2024/1/15 (variables)
            'd.m.Y',        // 15.01.2024
            'j.n.Y',        // 15.1.2024 (variables)
            'd.m.y',        // 15.01.24
            'j.n.y'         // 15.1.24 (variables)
        ];
        
        foreach ($formats as $format) {
            $parsed = DateTime::createFromFormat($format, $date_string);
            
            if ($parsed !== false) {
                // Verificar que la fecha parseada coincida con el string original
                // Esto evita fechas como "99/99/99" que podrían ser parseadas incorrectamente
                if ($parsed->format($format) === $date_string) {
                    $normalized = $parsed->format('Y-m-d');
                    error_log("WECC Date: '{$date_string}' (formato: {$format}) -> '{$normalized}'");
                    return $normalized;
                }
            }
        }
        
        // Si no se pudo parsear con ningún formato
        error_log("WECC Date: No se pudo parsear '{$date_string}' con ningún formato soportado");
        return null;
    }
}
