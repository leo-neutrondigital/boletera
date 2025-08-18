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
        echo '<h3>' . __('Carga Masiva', 'wc-enhanced-customers-credit') . '</h3>';
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
        echo '<p class="description">' . __('Archivo CSV con los datos de clientes y crédito.', 'wc-enhanced-customers-credit') . '</p>';
        echo '</td>';
        echo '</tr>';
        
        // Opciones de importación
        echo '<tr>';
        echo '<th>' . __('Opciones', 'wc-enhanced-customers-credit') . '</th>';
        echo '<td>';
        echo '<label><input type="checkbox" name="create_users" value="1" checked> ' . __('Crear usuarios si no existen', 'wc-enhanced-customers-credit') . '</label><br>';
        echo '<label><input type="checkbox" name="update_existing" value="1" checked> ' . __('Actualizar datos existentes', 'wc-enhanced-customers-credit') . '</label><br>';
        echo '<label><input type="checkbox" name="enable_credit" value="1" checked> ' . __('Habilitar crédito automáticamente', 'wc-enhanced-customers-credit') . '</label>';
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
            // TODO: Implementar lógica de importación completa
            // Por ahora, solo un placeholder
            
            error_log('WECC: Importación iniciada - ' . $_FILES['import_file']['name']);
            
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
        // Crear CSV template con las columnas necesarias
        $headers = [
            'user_email',
            'display_name', 
            'full_name',
            'rfc',
            'phone',
            'address',
            'city',
            'state',
            'postal_code',
            'enable_credit',
            'credit_limit',
            'payment_terms_days',
            'customer_type',
            'notes'
        ];
        
        // Ejemplo de datos
        $example_data = [
            'cliente@ejemplo.com',
            'Cliente Ejemplo',
            'Cliente de Ejemplo SA de CV',
            'RFC123456789',
            '555-1234',
            'Calle Ejemplo 123',
            'Ciudad Ejemplo',
            'Estado Ejemplo',
            '12345',
            '1',
            '5000.00',
            '30',
            'corporate',
            'Cliente de ejemplo para importación'
        ];
        
        // Preparar descarga
        $filename = 'wecc_template_' . date('Y-m-d') . '.csv';
        
        header('Content-Type: text/csv');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Pragma: no-cache');
        header('Expires: 0');
        
        $output = fopen('php://output', 'w');
        
        // Escribir headers
        fputcsv($output, $headers);
        
        // Escribir ejemplo
        fputcsv($output, $example_data);
        
        fclose($output);
        exit;
    }
}
