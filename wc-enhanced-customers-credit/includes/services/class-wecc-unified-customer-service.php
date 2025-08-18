<?php
if (!defined('ABSPATH')) exit;

/**
 * WECC Unified Customer Service
 * 
 * Usa campos de WooCommerce directamente en lugar de duplicar datos
 */
class WECC_Unified_Customer_Service {
    
    private $wecc_table;
    
    public function __construct() {
        global $wpdb;
        $this->wecc_table = $wpdb->prefix . 'wecc_customer_profiles';
    }
    
    /**
     * Obtiene perfil unificado combinando WC + WECC
     */
    public function get_unified_profile(int $user_id): array {
        $user = get_user_by('id', $user_id);
        if (!$user) {
            return [];
        }
        
        // Datos básicos de WordPress
        $profile = [
            'user_id' => $user_id,
            'display_name' => $user->display_name,
            'user_email' => $user->user_email,
            'user_login' => $user->user_login,
        ];
        
        // Datos de WooCommerce (dirección, contacto)
        $wc_fields = [
            'billing_first_name',
            'billing_last_name', 
            'billing_company',
            'billing_address_1',
            'billing_address_2',
            'billing_city',
            'billing_state',
            'billing_postcode',
            'billing_country',
            'billing_phone',
            'billing_email',
            'shipping_first_name',
            'shipping_last_name',
            'shipping_company', 
            'shipping_address_1',
            'shipping_address_2',
            'shipping_city',
            'shipping_state',
            'shipping_postcode',
            'shipping_country'
        ];
        
        foreach ($wc_fields as $field) {
            $profile[$field] = get_user_meta($user_id, $field, true);
        }
        
        // Datos específicos de WECC (solo los que NO tiene WooCommerce)
        $wecc_data = $this->get_wecc_specific_data($user_id);
        $profile = array_merge($profile, $wecc_data);
        
        return $profile;
    }
    
    /**
     * Obtiene solo los datos específicos de WECC (no duplicados con WC)
     */
    public function get_wecc_specific_data(int $user_id): array {
        global $wpdb;
        
        $wecc_data = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$this->wecc_table} WHERE user_id = %d LIMIT 1",
            $user_id
        ), ARRAY_A);
        
        if (!$wecc_data) {
            return $this->get_default_wecc_data();
        }
        
        // Solo devolver campos específicos de WECC
        $specific_fields = [
            'rfc',
            'customer_type', 
            'customer_number',
            'sales_rep',
            'customer_since',
            'credit_notes',
            'payment_terms_preference',
            'credit_rating',
            'internal_notes'
        ];
        
        $result = [];
        foreach ($specific_fields as $field) {
            $result[$field] = $wecc_data[$field] ?? '';
        }
        
        return $result;
    }
    
    /**
     * Guarda solo datos específicos de WECC (WC se guarda en su lugar natural)
     */
    public function save_wecc_specific_data(int $user_id, array $data): bool {
        global $wpdb;
        
        // Solo procesar campos específicos de WECC
        $wecc_fields = $this->get_wecc_field_definitions();
        $wecc_data = ['user_id' => $user_id];
        
        foreach ($wecc_fields as $field => $config) {
            $value = $data[$field] ?? '';
            $wecc_data[$field] = sanitize_text_field($value);
        }
        
        // Verificar si existe registro
        $existing = $wpdb->get_var($wpdb->prepare(
            "SELECT id FROM {$this->wecc_table} WHERE user_id = %d",
            $user_id
        ));
        
        error_log("WECC Unified Save: Usuario {$user_id}, Existe registro: " . ($existing ? 'SI (ID: ' . $existing . ')' : 'NO'));
        error_log("WECC Unified Save: Datos a guardar: " . print_r($wecc_data, true));
        
        if ($existing) {
            // Actualizar
            $wecc_data['updated_at'] = current_time('mysql');
            $result = $wpdb->update(
                $this->wecc_table,
                $wecc_data,
                ['user_id' => $user_id]
            );
            
            if ($result === false) {
                error_log("WECC Unified Save: ERROR en UPDATE - " . $wpdb->last_error);
            } else {
                error_log("WECC Unified Save: UPDATE exitoso, filas afectadas: " . $result);
            }
        } else {
            // Crear
            $wecc_data['created_at'] = current_time('mysql');
            $wecc_data['updated_at'] = current_time('mysql');
            $result = $wpdb->insert($this->wecc_table, $wecc_data);
            
            if ($result === false) {
                error_log("WECC Unified Save: ERROR en INSERT - " . $wpdb->last_error);
            } else {
                error_log("WECC Unified Save: INSERT exitoso, nuevo ID: " . $wpdb->insert_id);
            }
        }
        
        if ($result !== false) {
            // Sincronizar customer_type a user meta para descuentos
            if (!empty($data['customer_type'])) {
                update_user_meta($user_id, 'wecc_customer_type', $data['customer_type']);
                update_user_meta($user_id, 'customer_type', $data['customer_type']);
            }
            
            do_action('wecc_specific_data_saved', $user_id, $wecc_data);
            return true;
        }
        
        return false;
    }
    
    /**
     * Campos específicos de WECC (que NO tiene WooCommerce)
     */
    public function get_wecc_field_definitions(): array {
        return [
            'rfc' => [
                'label' => __('RFC', 'wc-enhanced-customers-credit'),
                'type' => 'text',
                'description' => __('Registro Federal de Contribuyentes', 'wc-enhanced-customers-credit'),
                'placeholder' => 'ABC123456789',
                'pattern' => '[A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3}',
                'maxlength' => 13
            ],
            'customer_type' => [
                'label' => __('Tipo de Cliente', 'wc-enhanced-customers-credit'),
                'type' => 'select',
                'options' => [
                    '' => __('Sin asignar', 'wc-enhanced-customers-credit'),
                    'mayorista' => __('Mayorista', 'wc-enhanced-customers-credit'),
                    'distribuidor' => __('Distribuidor', 'wc-enhanced-customers-credit'),
                    'minorista' => __('Minorista', 'wc-enhanced-customers-credit'),
                    'corporativo' => __('Corporativo', 'wc-enhanced-customers-credit'),
                    'gobierno' => __('Gobierno', 'wc-enhanced-customers-credit'),
                    'especial' => __('Cliente Especial', 'wc-enhanced-customers-credit')
                ],
                'description' => __('Tipo de cliente para aplicar descuentos específicos', 'wc-enhanced-customers-credit')
            ],
            'customer_number' => [
                'label' => __('Número de Cliente', 'wc-enhanced-customers-credit'),
                'type' => 'text',
                'description' => __('Número único del cliente en el sistema', 'wc-enhanced-customers-credit'),
                'placeholder' => 'CLI-001'
            ],
            'sales_rep' => [
                'label' => __('Vendedor Asignado', 'wc-enhanced-customers-credit'),
                'type' => 'user_select',
                'role' => 'shop_manager',
                'description' => __('Vendedor responsable de esta cuenta', 'wc-enhanced-customers-credit')
            ],
            'customer_since' => [
                'label' => __('Cliente desde', 'wc-enhanced-customers-credit'),
                'type' => 'date',
                'description' => __('Fecha en que se convirtió en cliente', 'wc-enhanced-customers-credit')
            ],
            'credit_notes' => [
                'label' => __('Notas de Crédito', 'wc-enhanced-customers-credit'),
                'type' => 'textarea',
                'description' => __('Notas internas sobre el crédito del cliente', 'wc-enhanced-customers-credit'),
                'rows' => 3
            ],
            'payment_terms_preference' => [
                'label' => __('Preferencia de Pago', 'wc-enhanced-customers-credit'),
                'type' => 'select',
                'options' => [
                    '' => __('Sin preferencia', 'wc-enhanced-customers-credit'),
                    'efectivo' => __('Efectivo', 'wc-enhanced-customers-credit'),
                    'transferencia' => __('Transferencia', 'wc-enhanced-customers-credit'),
                    'cheque' => __('Cheque', 'wc-enhanced-customers-credit'),
                    'tarjeta' => __('Tarjeta', 'wc-enhanced-customers-credit')
                ]
            ],
            'credit_rating' => [
                'label' => __('Calificación Crediticia', 'wc-enhanced-customers-credit'),
                'type' => 'select',
                'options' => [
                    '' => __('Sin calificar', 'wc-enhanced-customers-credit'),
                    'excelente' => __('Excelente', 'wc-enhanced-customers-credit'),
                    'bueno' => __('Bueno', 'wc-enhanced-customers-credit'),
                    'regular' => __('Regular', 'wc-enhanced-customers-credit'),
                    'malo' => __('Malo', 'wc-enhanced-customers-credit')
                ]
            ],
            'internal_notes' => [
                'label' => __('Notas Internas', 'wc-enhanced-customers-credit'),
                'type' => 'textarea',
                'description' => __('Notas internas del equipo (no visible al cliente)', 'wc-enhanced-customers-credit'),
                'rows' => 2
            ]
        ];
    }
    
    /**
     * Obtiene datos por defecto para WECC
     */
    private function get_default_wecc_data(): array {
        $fields = array_keys($this->get_wecc_field_definitions());
        return array_fill_keys($fields, '');
    }
    
    /**
     * Formatea dirección completa desde campos WC
     */
    public function get_formatted_address(int $user_id, string $type = 'billing'): string {
        $address_parts = [];
        
        $fields = [
            $type . '_address_1',
            $type . '_address_2',
            $type . '_city',
            $type . '_state', 
            $type . '_postcode',
            $type . '_country'
        ];
        
        foreach ($fields as $field) {
            $value = get_user_meta($user_id, $field, true);
            if (!empty($value)) {
                $address_parts[] = $value;
            }
        }
        
        return implode(', ', $address_parts);
    }
    
    /**
     * Obtiene nombre completo desde WC
     */
    public function get_full_name(int $user_id): string {
        $first_name = get_user_meta($user_id, 'billing_first_name', true);
        $last_name = get_user_meta($user_id, 'billing_last_name', true);
        
        if ($first_name || $last_name) {
            return trim($first_name . ' ' . $last_name);
        }
        
        // Fallback a display_name de WordPress
        $user = get_user_by('id', $user_id);
        return $user ? $user->display_name : '';
    }
    
    /**
     * Busca clientes (combinando WC + WECC)
     */
    public function search_customers(array $filters = [], int $page = 1, int $per_page = 20): array {
        global $wpdb;
        
        $where_clauses = ['u.ID > 0'];
        $params = [];
        
        // Filtro de búsqueda general
        if (!empty($filters['search'])) {
            $search = '%' . $wpdb->esc_like($filters['search']) . '%';
            $where_clauses[] = "(
                u.display_name LIKE %s OR 
                u.user_email LIKE %s OR
                um_phone.meta_value LIKE %s OR
                um_company.meta_value LIKE %s OR
                p.rfc LIKE %s OR
                p.customer_number LIKE %s
            )";
            $params = array_merge($params, [$search, $search, $search, $search, $search, $search]);
        }
        
        // Filtro por tipo de cliente
        if (!empty($filters['customer_type'])) {
            $where_clauses[] = "p.customer_type = %s";
            $params[] = $filters['customer_type'];
        }
        
        $where_sql = 'WHERE ' . implode(' AND ', $where_clauses);
        
        // Contar total
        $count_sql = "
            SELECT COUNT(DISTINCT u.ID)
            FROM {$wpdb->users} u
            LEFT JOIN {$this->wecc_table} p ON u.ID = p.user_id
            LEFT JOIN {$wpdb->usermeta} um_phone ON u.ID = um_phone.user_id AND um_phone.meta_key = 'billing_phone'
            LEFT JOIN {$wpdb->usermeta} um_company ON u.ID = um_company.user_id AND um_company.meta_key = 'billing_company'
            {$where_sql}
        ";
        
        $total = (int) $wpdb->get_var($wpdb->prepare($count_sql, $params));
        
        // Obtener resultados paginados
        $offset = ($page - 1) * $per_page;
        $results_sql = "
            SELECT DISTINCT u.ID as user_id
            FROM {$wpdb->users} u
            LEFT JOIN {$this->wecc_table} p ON u.ID = p.user_id
            LEFT JOIN {$wpdb->usermeta} um_phone ON u.ID = um_phone.user_id AND um_phone.meta_key = 'billing_phone'
            LEFT JOIN {$wpdb->usermeta} um_company ON u.ID = um_company.user_id AND um_company.meta_key = 'billing_company'
            {$where_sql}
            ORDER BY u.display_name ASC
            LIMIT %d OFFSET %d
        ";
        
        $params[] = $per_page;
        $params[] = $offset;
        
        $user_ids = $wpdb->get_col($wpdb->prepare($results_sql, $params));
        
        // Obtener perfiles completos
        $profiles = [];
        foreach ($user_ids as $user_id) {
            $profiles[] = $this->get_unified_profile($user_id);
        }
        
        return [
            'profiles' => $profiles,
            'total' => $total,
            'pages' => ceil($total / $per_page),
            'current_page' => $page,
            'per_page' => $per_page
        ];
    }
}
