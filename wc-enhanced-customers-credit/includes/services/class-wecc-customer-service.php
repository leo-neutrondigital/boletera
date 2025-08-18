<?php
if (!defined('ABSPATH')) {
    exit;
}

/**
 * WECC Customer Service
 * 
 * Gestiona perfiles robustos de clientes con todos los datos
 * fiscales y operativos necesarios para el sistema de crédito
 */
class WECC_Customer_Service {
    
    private $table_name;
    
    public function __construct() {
        global $wpdb;
        $this->table_name = $wpdb->prefix . 'wecc_customer_profiles';
    }
    
    /**
     * Obtiene perfil completo por user_id
     */
    public function get_profile_by_user(int $user_id): ?array {
        global $wpdb;
        
        $profile = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$this->table_name} WHERE user_id = %d LIMIT 1",
            $user_id
        ), ARRAY_A);
        
        if (!$profile) {
            return null;
        }
        
        // Decodificar custom_fields si existe
        if (!empty($profile['custom_fields'])) {
            $profile['custom_fields'] = json_decode($profile['custom_fields'], true) ?: [];
        } else {
            $profile['custom_fields'] = [];
        }
        
        return $profile;
    }
    
    /**
     * Obtiene perfil por número de cliente
     */
    public function get_profile_by_customer_number(string $customer_number): ?array {
        global $wpdb;
        
        $profile = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$this->table_name} WHERE customer_number = %s LIMIT 1",
            $customer_number
        ), ARRAY_A);
        
        return $profile ? $this->format_profile($profile) : null;
    }
    
    /**
     * Guarda o actualiza perfil de cliente
     */
    public function save_profile(int $user_id, array $data): array {
        global $wpdb;
        
        // Validar datos
        $validation_result = $this->validate_profile_data($data);
        if (!$validation_result['valid']) {
            throw new Exception('Datos inválidos: ' . implode(', ', $validation_result['errors']));
        }
        
        // Preparar datos para DB
        $profile_data = $this->prepare_profile_data($user_id, $data);
        
        // Verificar si existe
        $existing = $this->get_profile_by_user($user_id);
        
        if ($existing) {
            // Actualizar
            $profile_data['updated_at'] = current_time('mysql');
            
            $result = $wpdb->update(
                $this->table_name,
                $profile_data,
                ['user_id' => $user_id]
            );
            
            if ($result === false) {
                throw new Exception('Error actualizando perfil: ' . $wpdb->last_error);
            }
            
            $profile_id = $existing['id'];
        } else {
            // Crear nuevo
            $profile_data['created_at'] = current_time('mysql');
            $profile_data['updated_at'] = current_time('mysql');
            
            $result = $wpdb->insert($this->table_name, $profile_data);
            
            if ($result === false) {
                throw new Exception('Error creando perfil: ' . $wpdb->last_error);
            }
            
            $profile_id = $wpdb->insert_id;
        }
        
        // Disparar evento
        do_action('wecc_customer_profile_saved', $user_id, $profile_data, $existing ? 'updated' : 'created');
        
        // Devolver perfil completo
        return $this->get_profile_by_user($user_id);
    }
    
    /**
     * Busca clientes con filtros avanzados
     */
    public function search_customers(array $filters = [], int $page = 1, int $per_page = 20): array {
        global $wpdb;
        
        $where_clauses = [];
        $params = [];
        
        // Filtro de búsqueda general
        if (!empty($filters['search'])) {
            $search = '%' . $wpdb->esc_like($filters['search']) . '%';
            $where_clauses[] = "(full_name LIKE %s OR customer_number LIKE %s OR rfc LIKE %s OR phone LIKE %s)";
            $params = array_merge($params, [$search, $search, $search, $search]);
        }
        
        // Filtros específicos
        $specific_filters = ['state3', 'type', 'seller'];
        foreach ($specific_filters as $filter) {
            if (!empty($filters[$filter])) {
                $where_clauses[] = "{$filter} = %s";
                $params[] = $filters[$filter];
            }
        }
        
        $where_sql = !empty($where_clauses) ? 'WHERE ' . implode(' AND ', $where_clauses) : '';
        
        // Contar total
        $count_sql = "SELECT COUNT(*) FROM {$this->table_name} {$where_sql}";
        $total = (int) $wpdb->get_var($wpdb->prepare($count_sql, $params));
        
        // Obtener resultados paginados
        $offset = ($page - 1) * $per_page;
        $results_sql = "
            SELECT p.*, u.user_email, u.display_name as wp_display_name
            FROM {$this->table_name} p
            LEFT JOIN {$wpdb->users} u ON u.ID = p.user_id
            {$where_sql}
            ORDER BY p.full_name ASC
            LIMIT %d OFFSET %d
        ";
        $params[] = $per_page;
        $params[] = $offset;
        
        $results = $wpdb->get_results($wpdb->prepare($results_sql, $params), ARRAY_A);
        
        // Formatear resultados
        $profiles = array_map([$this, 'format_profile'], $results);
        
        return [
            'profiles' => $profiles,
            'total' => $total,
            'pages' => ceil($total / $per_page),
            'current_page' => $page,
            'per_page' => $per_page
        ];
    }
    
    /**
     * Elimina perfil de cliente
     */
    public function delete_profile(int $user_id): bool {
        global $wpdb;
        
        $result = $wpdb->delete(
            $this->table_name,
            ['user_id' => $user_id],
            ['%d']
        );
        
        if ($result !== false) {
            do_action('wecc_customer_profile_deleted', $user_id);
            return true;
        }
        
        return false;
    }
    
    /**
     * Obtiene definiciones de campos configurables
     * SOLO campos específicos del crédito (no duplicar datos de WP)
     */
    public function get_field_definitions(): array {
        $fields = [
            // Campos específicos del negocio/crédito
            'customer_number' => [
                'label' => __('Número de cliente', 'wc-enhanced-customers-credit'),
                'type' => 'text',
                'required' => false,
                'unique' => true,
                'placeholder' => 'C-001',
                'description' => __('Número único del cliente en el sistema', 'wc-enhanced-customers-credit'),
                'max_length' => 50
            ],
            
            // ❌ ELIMINADO: 'full_name' - se usa $user->display_name de WP
            
            // Dirección (WP no tiene campos nativos para esto)
            'street' => [
                'label' => __('Calle', 'wc-enhanced-customers-credit'),
                'type' => 'text',
                'required' => false,
                'placeholder' => 'Av. Reforma 123',
                'max_length' => 255
            ],
            'colonia' => [
                'label' => __('Colonia', 'wc-enhanced-customers-credit'),
                'type' => 'text',
                'required' => false,
                'placeholder' => 'Centro',
                'max_length' => 100
            ],
            'city' => [
                'label' => __('Ciudad', 'wc-enhanced-customers-credit'),
                'type' => 'text',
                'required' => false,
                'placeholder' => 'Villahermosa',
                'max_length' => 100
            ],
            'state3' => [
                'label' => __('Estado (3 letras)', 'wc-enhanced-customers-credit'),
                'type' => 'select',
                'required' => false,
                'options' => $this->get_mx_states(),
                'description' => __('Código de 3 letras del estado', 'wc-enhanced-customers-credit')
            ],
            'zip' => [
                'label' => __('Código Postal', 'wc-enhanced-customers-credit'),
                'type' => 'text',
                'required' => false,
                'pattern' => '\d{5}',
                'placeholder' => '86000',
                'max_length' => 10
            ],
            
            // Datos fiscales
            'rfc' => [
                'label' => __('RFC', 'wc-enhanced-customers-credit'),
                'type' => 'text',
                'required' => false,
                'pattern' => '[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{2,3}',
                'placeholder' => 'PERJ800101ABC',
                'description' => __('Registro Federal de Contribuyentes', 'wc-enhanced-customers-credit'),
                'max_length' => 20
            ],
            'regfiscal' => [
                'label' => __('REGFISCAL (3 dígitos)', 'wc-enhanced-customers-credit'),
                'type' => 'text',
                'required' => false,
                'pattern' => '\d{3}',
                'placeholder' => '123',
                'max_length' => 3
            ],
            
            // Contacto (WP no tiene phone nativo)
            'phone' => [
                'label' => __('Teléfono', 'wc-enhanced-customers-credit'),
                'type' => 'tel',
                'required' => false,
                'placeholder' => '993-123-4567',
                'max_length' => 20
            ],
            
            // Categorización del negocio
            'type' => [
                'label' => __('Tipo de cliente', 'wc-enhanced-customers-credit'),
                'type' => 'select',
                'required' => false,
                'options' => [
                    'regular' => __('Regular', 'wc-enhanced-customers-credit'),
                    'vip' => __('VIP', 'wc-enhanced-customers-credit'),
                    'mayorista' => __('Mayorista', 'wc-enhanced-customers-credit'),
                    'distribuidor' => __('Distribuidor', 'wc-enhanced-customers-credit')
                ]
            ],
            'flete' => [
                'label' => __('Tipo de flete', 'wc-enhanced-customers-credit'),
                'type' => 'select',
                'required' => false,
                'options' => [
                    'normal' => __('Normal', 'wc-enhanced-customers-credit'),
                    'express' => __('Express', 'wc-enhanced-customers-credit'),
                    'pickup' => __('Recolección en tienda', 'wc-enhanced-customers-credit')
                ]
            ],
            'seller' => [
                'label' => __('Vendedor asignado', 'wc-enhanced-customers-credit'),
                'type' => 'user_select',
                'required' => false,
                'role' => 'shop_manager',
                'description' => __('Vendedor responsable de esta cuenta', 'wc-enhanced-customers-credit')
            ]
        ];
        
        // Permitir extensión via filtro
        return apply_filters('wecc_customer_field_definitions', $fields);
    }
    
    /**
     * Valida datos del perfil
     */
    private function validate_profile_data(array $data): array {
        $errors = [];
        $validator = wecc_service('validator');
        $fields = $this->get_field_definitions();
        
        foreach ($fields as $field_key => $field_config) {
            $value = $data[$field_key] ?? '';
            
            // Campo requerido
            if ($field_config['required'] && empty($value)) {
                $errors[] = sprintf(__('El campo %s es requerido', 'wc-enhanced-customers-credit'), $field_config['label']);
                continue;
            }
            
            // Si está vacío y no es requerido, continuar
            if (empty($value)) {
                continue;
            }
            
            // Validaciones específicas
            switch ($field_key) {
                case 'rfc':
                    if (!$validator->is_valid_rfc($value)) {
                        $errors[] = __('RFC inválido', 'wc-enhanced-customers-credit');
                    }
                    break;
                
                case 'state3':
                    if (!$validator->is_valid_state3($value)) {
                        $errors[] = __('Estado debe ser código de 3 letras válido', 'wc-enhanced-customers-credit');
                    }
                    break;
                
                case 'regfiscal':
                    if (!$validator->is_valid_regfiscal($value)) {
                        $errors[] = __('REGFISCAL debe tener exactamente 3 dígitos', 'wc-enhanced-customers-credit');
                    }
                    break;
                
                case 'customer_number':
                    // Verificar unicidad
                    if ($this->customer_number_exists($value, $data['user_id'] ?? 0)) {
                        $errors[] = __('Este número de cliente ya existe', 'wc-enhanced-customers-credit');
                    }
                    break;
            }
            
            // Validación de longitud
            if (isset($field_config['max_length']) && strlen($value) > $field_config['max_length']) {
                $errors[] = sprintf(
                    __('El campo %s no puede tener más de %d caracteres', 'wc-enhanced-customers-credit'),
                    $field_config['label'],
                    $field_config['max_length']
                );
            }
        }
        
        return [
            'valid' => empty($errors),
            'errors' => $errors
        ];
    }
    
    /**
     * Prepara datos para insertar/actualizar en DB
     */
    private function prepare_profile_data(int $user_id, array $data): array {
        $fields = array_keys($this->get_field_definitions());
        $profile_data = ['user_id' => $user_id];
        
        foreach ($fields as $field) {
            $value = $data[$field] ?? '';
            
            // Manejar customer_number como NULL si está vacío para evitar duplicate entries
            if ($field === 'customer_number' && empty($value)) {
                $profile_data[$field] = null;
            } else {
                $profile_data[$field] = sanitize_text_field($value);
            }
        }
        
        // Manejar custom_fields
        $custom_fields = $data['custom_fields'] ?? [];
        if (!empty($custom_fields) && is_array($custom_fields)) {
            $profile_data['custom_fields'] = wp_json_encode($custom_fields);
        } else {
            $profile_data['custom_fields'] = wp_json_encode([]);
        }
        
        return $profile_data;
    }
    
    /**
     * Formatea perfil para uso en templates
     */
    private function format_profile(array $profile): array {
        // Decodificar custom_fields
        if (!empty($profile['custom_fields'])) {
            $profile['custom_fields'] = json_decode($profile['custom_fields'], true) ?: [];
        } else {
            $profile['custom_fields'] = [];
        }
        
        return $profile;
    }
    
    /**
     * Verifica si un número de cliente ya existe
     */
    private function customer_number_exists(string $customer_number, int $exclude_user_id = 0): bool {
        global $wpdb;
        
        $query = "SELECT COUNT(*) FROM {$this->table_name} WHERE customer_number = %s";
        $params = [$customer_number];
        
        if ($exclude_user_id > 0) {
            $query .= " AND user_id != %d";
            $params[] = $exclude_user_id;
        }
        
        $count = $wpdb->get_var($wpdb->prepare($query, $params));
        
        return $count > 0;
    }
    
    /**
     * Obtiene valor formateado para mostrar
     */
    public function format_field_value(string $field_key, $value, array $profile = []): string {
        if (empty($value)) {
            return '-';
        }
        
        $fields = $this->get_field_definitions();
        $field_def = $fields[$field_key] ?? null;
        
        if (!$field_def) {
            return esc_html($value);
        }
        
        switch ($field_def['type']) {
            case 'select':
                $options = $field_def['options'] ?? [];
                return esc_html($options[$value] ?? $value);
            
            case 'user_select':
                $user = get_user_by('id', $value);
                return $user ? esc_html($user->display_name) : '-';
            
            case 'tel':
                return '<a href="tel:' . esc_attr($value) . '">' . esc_html($value) . '</a>';
            
            default:
                return esc_html($value);
        }
    }
    
    /**
     * Obtiene estadísticas básicas de clientes
     */
    public function get_customer_stats(): array {
        global $wpdb;
        
        $stats = [];
        
        // Total de clientes con perfil
        $stats['total_customers'] = (int) $wpdb->get_var(
            "SELECT COUNT(*) FROM {$this->table_name}"
        );
        
        // Por tipo de cliente
        $stats['by_type'] = $wpdb->get_results(
            "SELECT type, COUNT(*) as count FROM {$this->table_name} WHERE type IS NOT NULL AND type != '' GROUP BY type",
            ARRAY_A
        );
        
        // Por estado
        $stats['by_state'] = $wpdb->get_results(
            "SELECT state3, COUNT(*) as count FROM {$this->table_name} WHERE state3 IS NOT NULL AND state3 != '' GROUP BY state3 ORDER BY count DESC LIMIT 10",
            ARRAY_A
        );
        
        // Últimos registrados
        $stats['recent_customers'] = $wpdb->get_results(
            "SELECT customer_number, created_at FROM {$this->table_name} ORDER BY created_at DESC LIMIT 5",
            ARRAY_A
        );
        
        return $stats;
    }
    
    /**
     * Helper: Estados mexicanos
     */
    private function get_mx_states(): array {
        return [
            'AGU' => 'Aguascalientes',
            'BCN' => 'Baja California',
            'BCS' => 'Baja California Sur',
            'CAM' => 'Campeche',
            'CHP' => 'Chiapas',
            'CHH' => 'Chihuahua',
            'COA' => 'Coahuila',
            'COL' => 'Colima',
            'DIF' => 'Ciudad de México',
            'DUR' => 'Durango',
            'GUA' => 'Guanajuato',
            'GUE' => 'Guerrero',
            'HID' => 'Hidalgo',
            'JAL' => 'Jalisco',
            'MEX' => 'Estado de México',
            'MIC' => 'Michoacán',
            'MOR' => 'Morelos',
            'NAY' => 'Nayarit',
            'NLE' => 'Nuevo León',
            'OAX' => 'Oaxaca',
            'PUE' => 'Puebla',
            'QUE' => 'Querétaro',
            'ROO' => 'Quintana Roo',
            'SLP' => 'San Luis Potosí',
            'SIN' => 'Sinaloa',
            'SON' => 'Sonora',
            'TAB' => 'Tabasco',
            'TAM' => 'Tamaulipas',
            'TLA' => 'Tlaxcala',
            'VER' => 'Veracruz',
            'YUC' => 'Yucatán',
            'ZAC' => 'Zacatecas'
        ];
    }
}
