<?php
if (!defined('ABSPATH')) exit;

/**
 * WECC Customers Controller
 * 
 * Maneja la lista de clientes, vista individual y acciones básicas
 */
class WECC_Customers_Controller {
    
    private $customer_service;
    private $balance_service;
    
    public function __construct() {
        $this->init_dependencies();
    }
    
    /**
     * Inicializar servicios
     */
    private function init_dependencies(): void {
        if (function_exists('wecc_service')) {
            try {
                // Usar el servicio unificado para búsquedas y gestión de clientes
                $this->customer_service = wecc_service('unified_customer_service');
                $this->balance_service = wecc_service('balance_service');
            } catch (Exception $e) {
                error_log('WECC Customers Controller: Error inicializando servicios - ' . $e->getMessage());
            }
        }
    }
    
    /**
     * Renderiza la lista de clientes con acciones rápidas
     */
    public function render_customers_list(): void {
        // Verificar que el servicio esté disponible
        if (!$this->customer_service) {
            echo '<div class="notice notice-error"><p>' . __('Error: Servicio de clientes no disponible. Recarga la página.', 'wc-enhanced-customers-credit') . '</p></div>';
            return;
        }
        
        // Obtener parámetros de búsqueda, filtros y ordenamiento
        $search = sanitize_text_field($_GET['s'] ?? '');
        $page = max(1, (int) ($_GET['paged'] ?? 1));
        $per_page = 20;
        
        // Parámetros de ordenamiento
        $orderby = sanitize_text_field($_GET['orderby'] ?? '');
        $order = strtoupper(sanitize_text_field($_GET['order'] ?? 'ASC'));
        if (!in_array($order, ['ASC', 'DESC'])) {
            $order = 'ASC';
        }
        
        // Obtener filtros específicos para clientes
        $filters = [
            'credit_status' => sanitize_text_field($_GET['filter_credit_status'] ?? ''),
            'payment_status' => sanitize_text_field($_GET['filter_payment_status'] ?? ''),
            'limit_from' => (float) ($_GET['filter_limit_from'] ?? 0),
            'limit_to' => (float) ($_GET['filter_limit_to'] ?? 0)
        ];
        
        // Si hay filtros aplicados o se requiere ordenamiento, necesitamos obtener TODOS los clientes
        $has_filters = !empty(array_filter($filters));
        $needs_sorting = !empty($orderby);
        
        if ($has_filters || $needs_sorting) {
            // Obtener todos los clientes cuando hay filtros o se requiere ordenamiento global
            $results = $this->customer_service->search_customers(['search' => $search], 1, 999999);
            
            // Enriquecer con datos de crédito y aplicar filtros
            $enriched_customers = $this->enrich_customers_with_credit_data($results['profiles'] ?? []);
            $filtered_customers = $this->apply_customer_filters($enriched_customers, $filters);
            
            // Aplicar ordenamiento a los resultados filtrados
            $sorted_customers = $this->sort_customers($filtered_customers, $orderby, $order);
            
            // Aplicar paginación manual a los resultados filtrados y ordenados
            $total_filtered = count($sorted_customers);
            $total_pages = ceil($total_filtered / $per_page);
            $offset = ($page - 1) * $per_page;
            $paginated_customers = array_slice($sorted_customers, $offset, $per_page);
            
            $pagination = [
                'current_page' => $page,
                'total_pages' => max(1, $total_pages),
                'total_items' => $total_filtered,
                'showing_filtered' => $has_filters // Solo mostrar como filtrado si hay filtros reales
            ];
        } else {
            // Sin filtros, usar la paginación del servicio directamente
            $results = $this->customer_service->search_customers(['search' => $search], $page, $per_page);
            $enriched_customers = $this->enrich_customers_with_credit_data($results['profiles'] ?? []);
            
            // Aplicar ordenamiento
            $paginated_customers = $this->sort_customers($enriched_customers, $orderby, $order);
            
            $pagination = [
                'current_page' => $page,
                'total_pages' => $results['pages'] ?? 1,
                'total_items' => $results['total'] ?? 0,
                'showing_filtered' => false
            ];
        }
        
        // Variables para la vista
        $view_data = [
            'customers' => $paginated_customers,
            'search' => $search,
            'filters' => $filters,
            'pagination' => $pagination,
            'stats' => $this->calculate_global_stats(),
            'orderby' => $orderby,
            'order' => $order
        ];
        
        // Cargar vista
        $this->load_view('customers-list', $view_data);
    }
    
    /**
     * Aplica filtros a la lista de clientes enriquecidos
     */
    private function apply_customer_filters(array $customers, array $filters): array {
        $filtered = $customers;
        
        // DEBUG TEMPORAL - solo para credit_status
        if (!empty($filters['credit_status'])) {
            error_log("WECC DEBUG FILTRO: Buscando clientes con status '{$filters['credit_status']}'");
            error_log("WECC DEBUG FILTRO: Total clientes antes = " . count($filtered));
        }
        
        // Filtro por estado de crédito
        if (!empty($filters['credit_status'])) {
            $filtered = array_filter($filtered, function($customer) use ($filters) {
                $status_class = $customer['status']['class'];
                $matches = $status_class === $filters['credit_status'];
                
                // DEBUG TEMPORAL - solo para clientes que coinciden
                if ($matches) {
                    error_log("WECC DEBUG FILTRO: Cliente {$customer['user_id']} coincide - status class: {$status_class}");
                }
                
                return $matches;
            });
            
            error_log("WECC DEBUG FILTRO: Total clientes después = " . count($filtered));
        }
        
        // Filtro por situación de pago
        if (!empty($filters['payment_status'])) {
            $filtered = array_filter($filtered, function($customer) use ($filters) {
                $balance = $customer['balance'];
                $has_overdue = $customer['has_overdue'];
                
                switch ($filters['payment_status']) {
                    case 'with-debt':
                        return $balance['balance_used'] > 0;
                    case 'overdue':
                        return $has_overdue;
                    case 'no-debt':
                        return $balance['balance_used'] <= 0;
                    default:
                        return true;
                }
            });
        }
        
        // Filtro por rango de límite de crédito
        if ($filters['limit_from'] > 0 || $filters['limit_to'] > 0) {
            $filtered = array_filter($filtered, function($customer) use ($filters) {
                $account = $customer['account'];
                if (!$account) return false;
                
                $limit = $account->credit_limit;
                
                // Verificar límite mínimo
                if ($filters['limit_from'] > 0 && $limit < $filters['limit_from']) {
                    return false;
                }
                
                // Verificar límite máximo
                if ($filters['limit_to'] > 0 && $limit > $filters['limit_to']) {
                    return false;
                }
                
                return true;
            });
        }
        
        return array_values($filtered); // Reindexar array
    }
    
    /**
     * Ordena la lista de clientes según el criterio especificado
     */
    private function sort_customers(array $customers, string $orderby, string $order): array {
        if (empty($orderby) || empty($customers)) {
            return $customers;
        }
        
        usort($customers, function($a, $b) use ($orderby, $order) {
            $value_a = $this->get_sort_value($a, $orderby);
            $value_b = $this->get_sort_value($b, $orderby);
            
            // Comparación
            if ($value_a == $value_b) {
                return 0;
            }
            
            $result = $value_a < $value_b ? -1 : 1;
            
            // Invertir si es descendente
            return $order === 'DESC' ? -$result : $result;
        });
        
        return $customers;
    }
    
    /**
     * Obtiene el valor para ordenamiento según el criterio
     */
    private function get_sort_value(array $customer, string $orderby) {
        switch ($orderby) {
            case 'name':
                return strtolower($customer['profile']['full_name'] ?: $customer['user']->display_name);
                
            case 'email':
                return strtolower($customer['user']->user_email);
                
            case 'status':
                // Orden: activo, inactivo, bloqueado, sin crédito
                $status_order = [
                    'active' => 1,
                    'inactive' => 2, 
                    'blocked' => 3,
                    'no-credit' => 4
                ];
                return $status_order[$customer['status']['class']] ?? 5;
                
            case 'limit':
                return (float) ($customer['account']->credit_limit ?? 0);
                
            case 'used':
                return (float) ($customer['balance']['balance_used'] ?? 0);
                
            case 'available':
                return (float) ($customer['balance']['available_credit'] ?? 0);
                
            case 'overdue':
                return $customer['has_overdue'] ? $this->get_customer_overdue_amount($customer['user_id']) : 0;
                
            default:
                return 0;
        }
    }
    
    /**
     * Enriquece datos de clientes con información de crédito
     */
    private function enrich_customers_with_credit_data(array $profiles): array {
        $enriched = [];
        
        foreach ($profiles as $profile) {
            $user_id = $profile['user_id'];
            $user = get_user_by('id', $user_id);
            
            // Obtener datos de crédito
            $account = wecc_get_or_create_account($user_id);
            $balance = wecc_get_user_balance($user_id);
            
            // Verificar si tiene cargos vencidos
            $has_overdue = $this->has_overdue_charges($user_id);
            
            // El servicio unificado ya incluye todos los datos necesarios
            // Combinar nombre completo para compatibilidad
            $full_name = '';
            if (!empty($profile['billing_first_name']) || !empty($profile['billing_last_name'])) {
                $full_name = trim($profile['billing_first_name'] . ' ' . $profile['billing_last_name']);
            }
            if (empty($full_name)) {
                $full_name = $profile['display_name'];
            }
            
            // Agregar campos calculados para compatibilidad
            $profile['full_name'] = $full_name;
            $profile['phone'] = $profile['billing_phone'] ?? '';
            
            $enriched[] = [
                'user_id' => $user_id,
                'user' => $user,
                'profile' => $profile,
                'account' => $account,
                'balance' => $balance,
                'has_overdue' => $has_overdue,
                'status' => $this->get_customer_status($account, $has_overdue)
            ];
        }
        
        return $enriched;
    }
    
    /**
     * Verifica si tiene cargos vencidos - VERSIÓN CORREGIDA
     */
    private function has_overdue_charges(int $user_id): bool {
        // Usar la función helper corregida
        return wecc_user_has_overdue_charges($user_id);
    }
    
    /**
     * Determina el estado visual del cliente
     */
    private function get_customer_status($account, bool $has_overdue): array {
        // DEBUG TEMPORAL
        $debug_info = [
            'account_exists' => !empty($account),
            'credit_limit' => $account ? $account->credit_limit : 0,
            'account_status' => $account ? $account->status : 'null',
            'has_overdue' => $has_overdue
        ];
        error_log('WECC DEBUG get_customer_status: ' . print_r($debug_info, true));
        
        // Si no tiene cuenta, es sin crédito
        if (!$account) {
            error_log('WECC DEBUG: Cliente clasificado como no-credit (sin cuenta)');
            return ['text' => 'Sin Crédito', 'class' => 'no-credit'];
        }
        
        // Si tiene vencidos, siempre es bloqueado (prioridad más alta)
        if ($has_overdue) {
            error_log('WECC DEBUG: Cliente clasificado como blocked (tiene vencidos)');
            return ['text' => 'Bloqueado', 'class' => 'blocked'];
        }
        
        // Si no tiene límite configurado, es sin crédito
        if ($account->credit_limit <= 0) {
            error_log('WECC DEBUG: Cliente clasificado como no-credit (sin límite)');
            return ['text' => 'Sin Crédito', 'class' => 'no-credit'];
        }
        
        // Si tiene límite, verificar si el crédito está activado (checkbox)
        if ($account->status === 'active') {
            error_log('WECC DEBUG: Cliente clasificado como active (crédito activado)');
            return ['text' => 'Activo', 'class' => 'active'];
        } else {
            error_log('WECC DEBUG: Cliente clasificado como inactive (crédito desactivado)');
            return ['text' => 'Inactivo', 'class' => 'inactive'];
        }
    }
    
    /**
     * Renderiza la vista completa de historial de un cliente
     */
    public function render_customer_history(): void {
        $user_id = (int) ($_GET['user_id'] ?? 0);
        
        if (!$user_id) {
            wp_redirect(admin_url('admin.php?page=wecc-dashboard&tab=customers'));
            exit;
        }
        
        if (!$this->customer_service) {
            echo '<div class="notice notice-error"><p>' . __('Error: Servicio no disponible.', 'wc-enhanced-customers-credit') . '</p></div>';
            return;
        }
        
        // Procesar formulario de pago rápido
        if (isset($_POST['wecc_action']) && $_POST['wecc_action'] === 'register_payment') {
            $this->process_quick_payment($_POST);
        }
        
        // Mostrar mensaje de éxito si viene desde pago
        if (isset($_GET['message']) && $_GET['message'] === 'payment_registered') {
            echo '<div class="notice notice-success is-dismissible"><p><strong>✅ Pago registrado exitosamente.</strong> El historial se ha actualizado.</p></div>';
        }
        
        // Mostrar errores si existen
        if (isset($_GET['error'])) {
            echo '<div class="notice notice-error is-dismissible"><p><strong>❌ Error:</strong> ' . esc_html(urldecode($_GET['error'])) . '</p></div>';
        }
        
        $user = get_user_by('id', $user_id);
        if (!$user) {
            echo '<div class="notice notice-error"><p>' . __('Usuario no encontrado.', 'wc-enhanced-customers-credit') . '</p></div>';
            return;
        }
        
        // Obtener datos completos incluyendo balance detallado  
        $profile = $this->customer_service->get_unified_profile($user_id);
        $account = wecc_get_or_create_account($user_id);
        $balance = wecc_get_user_balance($user_id);
        
        // Agregar campos calculados para compatibilidad con la vista
        if (!empty($profile)) {
            $full_name = '';
            if (!empty($profile['billing_first_name']) || !empty($profile['billing_last_name'])) {
                $full_name = trim($profile['billing_first_name'] . ' ' . $profile['billing_last_name']);
            }
            if (empty($full_name)) {
                $full_name = $profile['display_name'];
            }
            $profile['full_name'] = $full_name;
            $profile['phone'] = $profile['billing_phone'] ?? '';
        }
        
        // Obtener balance detallado si hay balance_service disponible
        if ($this->balance_service && $account) {
            $detailed_balance = $this->balance_service->get_detailed_balance($account->id);
            $balance = array_merge($balance, $detailed_balance);
            
            // DEBUG TEMPORAL
            if (WP_DEBUG && $user_id == 81) {
                echo "<div style='background: #f0f8ff; padding: 15px; margin: 20px 0; border: 1px solid #0073aa;'>";
                echo "<h4>🔍 DEBUG BALANCE USUARIO 81:</h4>";
                
                // Movimientos en ledger
                global $wpdb;
                $ledger_movements = $wpdb->get_results("SELECT * FROM {$wpdb->prefix}wecc_ledger WHERE account_id = {$account->id} ORDER BY id");
                $total_calculated = 0;
                
                echo "<table border='1' style='border-collapse: collapse; font-size: 11px;'>";
                echo "<tr><th>ID</th><th>Tipo</th><th>Monto</th><th>Settles</th><th>Notas</th></tr>";
                
                foreach ($ledger_movements as $mov) {
                    $total_calculated += $mov->amount;
                    $color = $mov->amount > 0 ? '#ffe6e6' : '#e6ffe6';
                    echo "<tr style='background: {$color};'>";
                    echo "<td>{$mov->id}</td>";
                    echo "<td>{$mov->type}</td>";
                    echo "<td><strong>" . number_format($mov->amount, 2) . "</strong></td>";
                    echo "<td>{$mov->settles_ledger_id}</td>";
                    echo "<td>" . substr($mov->notes, 0, 30) . "...</td>";
                    echo "</tr>";
                }
                
                echo "<tr style='background: #fff3cd; font-weight: bold;'>";
                echo "<td colspan='2'>TOTAL</td>";
                echo "<td>" . number_format($total_calculated, 2) . "</td>";
                echo "<td colspan='2'>";
                
                // Manejar precisión decimal
                if (abs($total_calculated) < 0.01) {
                    echo "BALANCE CERO (precisión: " . number_format($total_calculated, 15) . ")";
                } elseif ($total_calculated < 0) {
                    echo "SALDO A FAVOR: " . number_format(abs($total_calculated), 2);
                } else {
                    echo "DEUDA: " . number_format($total_calculated, 2);
                }
                
                echo "</td>";
                echo "</tr>";
                echo "</table>";
                
                error_log("WECC DEBUG: Balance original = " . print_r(wecc_get_user_balance($user_id), true));
                error_log("WECC DEBUG: Balance detallado = " . print_r($detailed_balance, true));
                error_log("WECC DEBUG: Balance final = " . print_r($balance, true));
                error_log("WECC DEBUG: Total calculado en ledger = " . $total_calculated);
                
                echo "</div>";
            }
        }
        
        // Obtener parámetros de paginación y filtros
        $current_page = max(1, (int) ($_GET['movements_page'] ?? 1));
        $per_page = 20; // Reducir de 50 a 20 para mejor navegación
        
        // Obtener filtros
        $filters = [
            'type' => sanitize_text_field($_GET['filter_type'] ?? ''),
            'date_from' => sanitize_text_field($_GET['filter_date_from'] ?? ''),
            'date_to' => sanitize_text_field($_GET['filter_date_to'] ?? ''),
            'search' => sanitize_text_field($_GET['filter_search'] ?? '')
        ];
        
        $movements_data = $this->get_customer_movements($user_id, $current_page, $per_page, $filters);
        $movements = $movements_data['movements'];
        
        $view_data = [
            'customer' => $user,
            'profile' => $profile,
            'account' => $account,
            'balance' => $balance,
            'movements' => $movements,
            'movements_pagination' => [
                'current_page' => $current_page,
                'total_pages' => $movements_data['total_pages'],
                'total_items' => $movements_data['total_items'],
                'per_page' => $per_page
            ],
            'movements_filters' => $filters,
            'has_overdue' => $this->has_overdue_charges($user_id)
        ];
        
        $this->load_view('customer-history', $view_data);
    }
    
    /**
     * Obtiene movimientos de un cliente con cálculo dinámico de restante
     */
    private function get_customer_movements(int $user_id, int $page = 1, int $per_page = 20, array $filters = []): array {
        global $wpdb;
        
        // Calcular offset para paginación
        $offset = ($page - 1) * $per_page;
        
        // Construir WHERE clause con filtros
        $where_conditions = ['a.user_id = %d'];
        $query_params = [$user_id];
        
        // Filtro por tipo
        if (!empty($filters['type'])) {
            $where_conditions[] = 'l.type = %s';
            $query_params[] = $filters['type'];
        }
        
        // Filtro por rango de fechas
        if (!empty($filters['date_from'])) {
            $where_conditions[] = 'DATE(l.created_at) >= %s';
            $query_params[] = $filters['date_from'];
        }
        
        if (!empty($filters['date_to'])) {
            $where_conditions[] = 'DATE(l.created_at) <= %s';
            $query_params[] = $filters['date_to'];
        }
        
        // Filtro de búsqueda en notas y pedidos
        if (!empty($filters['search'])) {
            $search_term = '%' . $wpdb->esc_like($filters['search']) . '%';
            $where_conditions[] = '(l.notes LIKE %s OR l.description LIKE %s OR o.ID LIKE %s)';
            $query_params[] = $search_term;
            $query_params[] = $search_term;
            $query_params[] = $search_term;
        }
        
        $where_clause = implode(' AND ', $where_conditions);
        
        // Obtener total de registros para paginación
        $count_query = "SELECT COUNT(*)
                        FROM {$wpdb->prefix}wecc_ledger l
                        LEFT JOIN {$wpdb->prefix}wecc_credit_accounts a ON l.account_id = a.id
                        LEFT JOIN {$wpdb->prefix}posts o ON l.order_id = o.ID
                        WHERE {$where_clause}";
        
        $total_items = (int) $wpdb->get_var($wpdb->prepare($count_query, $query_params));
        $total_pages = ceil($total_items / $per_page);
        
        // Consulta principal con filtros
        $main_query = "SELECT l.*, o.id as order_id, l.created_at
                      FROM {$wpdb->prefix}wecc_ledger l
                      LEFT JOIN {$wpdb->prefix}wecc_credit_accounts a ON l.account_id = a.id
                      LEFT JOIN {$wpdb->prefix}posts o ON l.order_id = o.ID
                      WHERE {$where_clause}
                      ORDER BY l.created_at DESC, l.id DESC
                      LIMIT %d OFFSET %d";
        
        $query_params[] = $per_page;
        $query_params[] = $offset;
        
        $movements = $wpdb->get_results($wpdb->prepare($main_query, $query_params), ARRAY_A);
        
        // Enriquecer con información adicional
        foreach ($movements as &$movement) {
            // PRIMERO: Calcular el monto restante para cargos
            if ($movement['type'] === 'charge') {
                $movement['remaining_amount'] = $this->calculate_charge_remaining_amount($movement);
                $movement['original_amount'] = (float) $movement['amount'];
            } else {
                // Para pagos, no hay restante
                $movement['remaining_amount'] = 0;
                $movement['original_amount'] = (float) $movement['amount'];
            }
            
            // DESPUÉS: Calcular días y vencimiento (que ahora usa remaining_amount)
            $movement['days_remaining'] = $this->calculate_days_remaining($movement);
            $movement['is_overdue'] = $this->is_movement_overdue($movement);
        }
        
        return [
            'movements' => $movements,
            'total_items' => $total_items,
            'total_pages' => $total_pages,
            'current_page' => $page,
            'per_page' => $per_page
        ];
    }
    
    /**
     * Calcula el monto restante de un cargo dinámicamente
     */
    private function calculate_charge_remaining_amount(array $charge): float {
        global $wpdb;
        
        $charge_id = (int) $charge['id'];
        $charge_amount = (float) $charge['amount'];
        $order_id = $charge['order_id'] ? (int) $charge['order_id'] : null;
        
        // Sumar ajustes negativos para este pedido (reembolsos/descuentos)
        $adjustments = 0.0;
        if ($order_id) {
            $adjustments = (float) $wpdb->get_var($wpdb->prepare(
                "SELECT COALESCE(SUM(amount), 0) 
                 FROM {$wpdb->prefix}wecc_ledger 
                 WHERE type = 'adjustment' AND order_id = %d AND amount < 0",
                $order_id
            ));
        }
        
        // Sumar pagos aplicados a este cargo específico
        $payments_applied = (float) $wpdb->get_var($wpdb->prepare(
            "SELECT COALESCE(SUM(ABS(amount)), 0) 
             FROM {$wpdb->prefix}wecc_ledger 
             WHERE type = 'payment' AND settles_ledger_id = %d",
            $charge_id
        ));
        
        // Cálculo: Cargo original + ajustes negativos - pagos aplicados
        $remaining = $charge_amount + $adjustments - $payments_applied;
        
        return max(0, $remaining);
    }
    
    /**
     * Calcula días restantes para un movimiento
     */
    private function calculate_days_remaining(array $movement): ?int {
        if (!$movement['due_date'] || $movement['type'] !== 'charge') {
            return null;
        }
        
        $due_date = new DateTime($movement['due_date']);
        $now = new DateTime();
        $diff = $now->diff($due_date);
        
        if ($due_date < $now) {
            return -$diff->days; // Negativo = vencido
        }
        
        return $diff->days;
    }
    
    /**
     * Verifica si un movimiento está vencido - CORREGIDO PARA CONSIDERAR PAGOS
     */
    private function is_movement_overdue(array $movement): bool {
        if (!$movement['due_date'] || $movement['type'] !== 'charge') {
            return false;
        }
        
        // Un cargo solo está vencido si tiene monto restante Y está pasada la fecha
        $remaining = $this->calculate_charge_remaining_amount($movement);
        return strtotime($movement['due_date']) < time() && $remaining > 0.01;
    }
    
    /**
     * Renderiza formulario de edición de datos básicos del cliente (UNIFICADO)
     */
    public function render_customer_edit(): void {
        error_log('WECC Customers Controller: Renderizando customer edit unificado');
        
        try {
            include WECC_PLUGIN_DIR . 'includes/admin/views/unified-customer-form.php';
        } catch (Exception $e) {
            echo '<div class="notice notice-error"><p>' . esc_html($e->getMessage()) . '</p></div>';
            error_log('WECC Error in customer edit: ' . $e->getMessage());
        }
    }
    
    /**
     * Renderiza formulario básico de cliente (sin crédito)
     */
    private function render_basic_customer_form($user, $profile): void {
        echo '<table class="form-table">';
        
        // Selector de usuario (solo para nuevo)
        if (!$user) {
            echo '<tr>';
            echo '<th><label for="wecc_user_search">' . __('Usuario', 'wc-enhanced-customers-credit') . '</label></th>';
            echo '<td>';
            echo '<input type="hidden" name="user_id" id="wecc_user_id" value="">';
            echo '<input type="text" id="wecc_user_search" class="regular-text" placeholder="' . __('Buscar usuario por email...', 'wc-enhanced-customers-credit') . '" autocomplete="off">';
            echo '<p class="description">' . __('Escribe para buscar usuarios existentes.', 'wc-enhanced-customers-credit') . '</p>';
            
            // JavaScript para autocomplete (temporal hasta mover assets)
            $this->render_user_search_script();
            echo '</td>';
            echo '</tr>';
        } else {
            echo '<input type="hidden" name="user_id" value="' . $user->ID . '">';
            
            // Mostrar datos de WordPress (readonly)
            echo '<tr>';
            echo '<th>' . __('Datos de WordPress', 'wc-enhanced-customers-credit') . '</th>';
            echo '<td style="background: #f8f9fa; padding: 15px; border-radius: 4px; border: 1px solid #e9ecef;">';
            echo '<div style="display: grid; grid-template-columns: auto 1fr; gap: 10px 20px; align-items: center;">';
            echo '<strong>Nombre:</strong> <span>' . esc_html($user->display_name) . '</span>';
            echo '<strong>Email:</strong> <span>' . esc_html($user->user_email) . '</span>';
            echo '<strong>Usuario:</strong> <span>' . esc_html($user->user_login) . '</span>';
            echo '</div>';
            echo '<p class="description" style="margin: 10px 0 0 0; font-style: italic; color: #666;">';
            echo '\u2139\ufe0f Estos datos se toman automáticamente de WordPress y no se pueden editar aquí.';
            echo '</p>';
            echo '</td>';
            echo '</tr>';
            
            // Separador visual
            echo '<tr><td colspan="2" style="padding: 0;"><hr style="margin: 20px 0; border: none; border-top: 2px solid #0073aa;"><h3 style="margin: 20px 0 10px 0; color: #0073aa;">\ud83d\udcbc Datos Específicos del Crédito</h3></td></tr>';
        }
        
        // Campos del perfil (SOLO los específicos del crédito)
        if ($this->customer_service) {
            $fields = $this->customer_service->get_field_definitions();
            foreach ($fields as $field_key => $field_config) {
                $value = $profile ? ($profile[$field_key] ?? '') : '';
                
                echo '<tr>';
                echo '<th><label for="' . esc_attr($field_key) . '">' . esc_html($field_config['label']) . '</label></th>';
                echo '<td>';
                $this->render_form_field($field_key, $field_config, $value);
                if (!empty($field_config['description'])) {
                    echo '<p class="description">' . esc_html($field_config['description']) . '</p>';
                }
                echo '</td>';
                echo '</tr>';
            }
        }
        
        echo '</table>';
    }
    
    /**
     * Renderiza un campo de formulario
     */
    private function render_form_field(string $field_key, array $field_config, $value): void {
        $field_name = esc_attr($field_key);
        $field_id = esc_attr($field_key);
        $field_value = esc_attr($value);
        
        switch ($field_config['type']) {
            case 'select':
                echo '<select name="' . $field_name . '" id="' . $field_id . '">';
                echo '<option value="">' . __('Seleccionar...', 'wc-enhanced-customers-credit') . '</option>';
                foreach ($field_config['options'] as $option_value => $option_label) {
                    $selected = selected($value, $option_value, false);
                    echo '<option value="' . esc_attr($option_value) . '" ' . $selected . '>' . esc_html($option_label) . '</option>';
                }
                echo '</select>';
                break;
                
            case 'user_select':
                echo '<select name="' . $field_name . '" id="' . $field_id . '">';
                echo '<option value="">' . __('Sin asignar', 'wc-enhanced-customers-credit') . '</option>';
                
                $users = get_users(['role' => $field_config['role'] ?? 'shop_manager']);
                foreach ($users as $user) {
                    $selected = selected($value, $user->ID, false);
                    echo '<option value="' . esc_attr($user->ID) . '" ' . $selected . '>' . esc_html($user->display_name) . '</option>';
                }
                echo '</select>';
                break;
                
            case 'tel':
                echo '<input type="tel" name="' . $field_name . '" id="' . $field_id . '" value="' . $field_value . '" class="regular-text"';
                if (!empty($field_config['placeholder'])) {
                    echo ' placeholder="' . esc_attr($field_config['placeholder']) . '"';
                }
                echo '>';
                break;
                
            default: // text
                echo '<input type="text" name="' . $field_name . '" id="' . $field_id . '" value="' . $field_value . '" class="regular-text"';
                if (!empty($field_config['placeholder'])) {
                    echo ' placeholder="' . esc_attr($field_config['placeholder']) . '"';
                }
                if (!empty($field_config['pattern'])) {
                    echo ' pattern="' . esc_attr($field_config['pattern']) . '"';
                }
                if (!empty($field_config['max_length'])) {
                    echo ' maxlength="' . esc_attr($field_config['max_length']) . '"';
                }
                echo '>';
                break;
        }
    }
    
    /**
     * Script temporal para búsqueda de usuarios
     */
    private function render_user_search_script(): void {
        // Asegurar que wecc_admin esté disponible
        wp_enqueue_script('jquery-ui-autocomplete');
        wp_localize_script('jquery', 'wecc_admin', [
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('wecc_admin_nonce')
        ]);
        
        add_action('admin_footer', function() {
            ?>
            <script type="text/javascript">
            jQuery(document).ready(function($) {
                if (typeof $.fn.autocomplete !== 'undefined' && typeof wecc_admin !== 'undefined') {
                    $('#wecc_user_search').autocomplete({
                        source: function(request, response) {
                            $.ajax({
                                url: wecc_admin.ajax_url,
                                type: 'POST',
                                dataType: 'json',
                                data: {
                                    action: 'wecc_user_search',
                                    term: request.term,
                                    nonce: wecc_admin.nonce
                                },
                                success: function(data) {
                                    if (data.success && data.data) {
                                        response(data.data);
                                    } else {
                                        response([]);
                                    }
                                },
                                error: function() {
                                    response([]);
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
            });
            </script>
            <?php
        });
    }
    
    /**
     * Maneja búsqueda AJAX de usuarios
     */
    public function ajax_user_search(): void {
        // Verificar permisos
        if (!current_user_can('manage_woocommerce')) {
            wp_send_json_error('Sin permisos');
        }
        
        // Verificar nonce
        $nonce = $_POST['nonce'] ?? '';
        if (!wp_verify_nonce($nonce, 'wecc_admin_nonce')) {
            wp_send_json_error('Nonce inválido');
        }
        
        $search = sanitize_text_field($_POST['term'] ?? '');
        
        if (strlen($search) < 2) {
            wp_send_json_success([]);
        }
        
        // Buscar usuarios
        $users = get_users([
            'search' => '*' . $search . '*',
            'search_columns' => ['user_email', 'display_name', 'user_login'],
            'number' => 10,
            'fields' => ['ID', 'display_name', 'user_email']
        ]);
        
        $results = [];
        foreach ($users as $user) {
            // Verificar si ya tiene perfil
            $has_profile = false;
            if ($this->customer_service) {
                $profile = $this->customer_service->get_profile_by_user($user->ID);
                $has_profile = !empty($profile);
            }
            
            $label = $user->display_name . ' (' . $user->user_email . ')';
            if ($has_profile) {
                $label .= ' [Ya tiene perfil]';
            }
            
            $results[] = [
                'id' => $user->ID,
                'label' => $label,
                'value' => $user->user_email
            ];
        }
        
        wp_send_json_success($results);
    }
    
    /**
     * Procesa el formulario de pago rápido
     */
    private function process_quick_payment(array $data): void {
        // Verificar nonce
        if (!wp_verify_nonce($data['wecc_payment_nonce'] ?? '', 'wecc_register_payment')) {
            wp_die(__('Error de seguridad. Inténtalo de nuevo.', 'wc-enhanced-customers-credit'));
        }
        
        // Verificar permisos
        if (!current_user_can('manage_woocommerce')) {
            wp_die(__('No tienes permisos para realizar esta acción.', 'wc-enhanced-customers-credit'));
        }
        
        $user_id = (int) ($data['user_id'] ?? 0);
        $amount = (float) ($data['payment_amount'] ?? 0);
        $notes = sanitize_textarea_field($data['payment_notes'] ?? '');
        
        if (!$user_id || $amount <= 0) {
            wp_die(__('Datos inválidos en el formulario.', 'wc-enhanced-customers-credit'));
        }
        
        try {
            // Reutilizar la lógica existente del balance service
            if ($this->balance_service) {
                $account = wecc_get_or_create_account($user_id);
                if (!$account) {
                    throw new Exception(__('No se pudo obtener la cuenta del cliente.', 'wc-enhanced-customers-credit'));
                }
                
                // Aplicar pago con lógica FIFO (reutilizando lógica existente)
                $result = $this->balance_service->allocate_general_payment(
                    $account->id, 
                    $amount, 
                    null, // sin order_id
                    $notes ?: 'Pago externo registrado desde admin', 
                    ['payment_method' => 'admin_quick_payment']
                );
                
                if ($result && $result['success']) {
                    // Redirigir con mensaje de éxito
                    $redirect_url = add_query_arg([
                        'page' => 'wecc-dashboard',
                        'tab' => 'customers',
                        'action' => 'view',
                        'user_id' => $user_id,
                        'message' => 'payment_registered'
                    ], admin_url('admin.php'));
                    
                    wp_redirect($redirect_url);
                    exit;
                } else {
                    throw new Exception(__('Error al procesar el pago.', 'wc-enhanced-customers-credit'));
                }
            } else {
                throw new Exception(__('Servicio de balance no disponible.', 'wc-enhanced-customers-credit'));
            }
            
        } catch (Exception $e) {
            // Mostrar error y redirigir
            $error_message = $e->getMessage();
            $redirect_url = add_query_arg([
                'page' => 'wecc-dashboard',
                'tab' => 'customers', 
                'action' => 'view',
                'user_id' => $user_id,
                'error' => urlencode($error_message)
            ], admin_url('admin.php'));
            
            wp_redirect($redirect_url);
            exit;
        }
    }
    
    /**
     * Calcula estadísticas globales optimizadas (independientes de filtros)
     */
    private function calculate_global_stats(): array {
        global $wpdb;
        
        // 1. Total de crédito usado (suma de todos los balances positivos)
        $total_credit_used = (float) $wpdb->get_var(
            "SELECT COALESCE(SUM(balance_used), 0) 
             FROM {$wpdb->prefix}wecc_credit_accounts 
             WHERE credit_limit > 0 AND balance_used > 0"
        );
        
        // 2. Total de monto vencido (usando índices optimizados)
        $total_overdue_amount = (float) $wpdb->get_var(
            "SELECT COALESCE(SUM(GREATEST(l.amount - COALESCE(payments.paid_amount, 0), 0)), 0) as total_overdue
             FROM {$wpdb->prefix}wecc_ledger l
             LEFT JOIN {$wpdb->prefix}wecc_credit_accounts a ON l.account_id = a.id
             LEFT JOIN (
                 SELECT 
                     settles_ledger_id,
                     SUM(ABS(amount)) as paid_amount
                 FROM {$wpdb->prefix}wecc_ledger 
                 WHERE type = 'payment' AND settles_ledger_id IS NOT NULL
                 GROUP BY settles_ledger_id
             ) payments ON l.id = payments.settles_ledger_id
             WHERE l.type = 'charge' 
             AND l.due_date < NOW()
             AND (l.amount - COALESCE(payments.paid_amount, 0)) > 0.01"
        );
        
        // 3. Número de clientes con vencidos (usando función helper optimizada)
        $clients_with_overdue = 0;
        $users_with_credit = $wpdb->get_col(
            "SELECT user_id 
             FROM {$wpdb->prefix}wecc_credit_accounts 
             WHERE credit_limit > 0"
        );
        
        foreach ($users_with_credit as $user_id) {
            if (wecc_user_has_overdue_charges($user_id)) {
                $clients_with_overdue++;
            }
        }
        
        // 4. Total de clientes con crédito habilitado
        $clients_with_credit = (int) $wpdb->get_var(
            "SELECT COUNT(*) 
             FROM {$wpdb->prefix}wecc_credit_accounts 
             WHERE credit_limit > 0"
        );
        
        return [
            'total_credit_used' => $total_credit_used,
            'total_overdue_amount' => $total_overdue_amount,
            'clients_with_overdue' => $clients_with_overdue,
            'clients_with_credit' => $clients_with_credit
        ];
    }
    
    /**
     * Obtiene el monto vencido de un cliente específico
     */
    private function get_customer_overdue_amount(int $user_id): float {
        global $wpdb;
        
        $overdue_amount = (float) $wpdb->get_var($wpdb->prepare(
            "SELECT SUM(GREATEST(l.amount - COALESCE(payments.paid_amount, 0), 0)) as total_overdue
             FROM {$wpdb->prefix}wecc_ledger l
             LEFT JOIN {$wpdb->prefix}wecc_credit_accounts a ON l.account_id = a.id
             LEFT JOIN (
                 SELECT 
                     settles_ledger_id,
                     SUM(ABS(amount)) as paid_amount
                 FROM {$wpdb->prefix}wecc_ledger 
                 WHERE type = 'payment' AND settles_ledger_id IS NOT NULL
                 GROUP BY settles_ledger_id
             ) payments ON l.id = payments.settles_ledger_id
             WHERE a.user_id = %d 
             AND l.type = 'charge' 
             AND l.due_date < NOW()
             AND (l.amount - COALESCE(payments.paid_amount, 0)) > 0.01",
            $user_id
        ));
        
        return $overdue_amount ?: 0;
    }
    
    /**
     * Carga una vista
     */
    private function load_view(string $view, array $data = []): void {
        extract($data);
        $view_file = WECC_PLUGIN_DIR . "includes/admin/views/{$view}.php";
        
        if (file_exists($view_file)) {
            include $view_file;
        } else {
            echo '<div class="notice notice-error"><p>Vista no encontrada: ' . esc_html($view) . '</p></div>';
        }
    }
}
