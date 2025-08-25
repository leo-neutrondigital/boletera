<?php
if (!defined('ABSPATH')) exit;

/**
 * WECC Balance Service - LISTO ✅
 * 
 * Maneja saldo positivo/negativo y lógica FIFO de asignación
 */
class WECC_Balance_Service {
    
    private $table_accounts;
    private $table_ledger;
    
    public function __construct() {
        global $wpdb;
        $this->table_accounts = $wpdb->prefix . 'wecc_credit_accounts';
        $this->table_ledger = $wpdb->prefix . 'wecc_ledger';
        
        add_action('wecc_ledger_entry_created', [$this, 'maybe_auto_apply_positive_balance'], 20, 1);
    }
    
    /**
     * Aplica pago directo a un cargo específico (NO usa FIFO)
     */
    public function apply_direct_payment(int $account_id, int $target_ledger_id, float $amount, ?int $order_id = null, string $notes = '', array $metadata = []): array {
        global $wpdb;
        
        error_log("WECC Direct Payment: Aplicando pago directo de {$amount} al cargo {$target_ledger_id}");
        
        // Verificar que el cargo existe y pertenece a la cuenta
        $target_charge = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$this->table_ledger} 
             WHERE id = %d AND account_id = %d AND type = 'charge'",
            $target_ledger_id, $account_id
        ));
        
        if (!$target_charge) {
            throw new Exception("Cargo {$target_ledger_id} no encontrado o no pertenece a la cuenta");
        }
        
        // Calcular monto restante del cargo
        $paid_amount = (float) $wpdb->get_var($wpdb->prepare(
            "SELECT COALESCE(SUM(ABS(amount)), 0) 
             FROM {$this->table_ledger} 
             WHERE type = 'payment' AND settles_ledger_id = %d",
            $target_ledger_id
        ));
        
        $remaining = max(0, $target_charge->amount - $paid_amount);
        
        if ($remaining <= 0) {
            throw new Exception("El cargo {$target_ledger_id} ya está completamente pagado");
        }
        
        // Determinar monto a aplicar (no puede ser mayor al restante)
        $payment_amount = min($amount, $remaining);
        $excess_amount = $amount - $payment_amount;
        
        // Registrar pago directo
        $payment_result = $wpdb->insert(
            $this->table_ledger,
            [
                'account_id' => $account_id,
                'type' => 'payment',
                'amount' => -abs($payment_amount),
                'settles_ledger_id' => $target_ledger_id,
                'order_id' => $order_id,
                'description' => "Pago directo a cargo #{$target_ledger_id}",
                'notes' => $notes,
                'transaction_date' => wecc_current_datetime(),
                'due_date' => null,
                'metadata' => wp_json_encode(array_merge($metadata, [
                    'payment_type' => 'direct',
                    'target_charge_id' => $target_ledger_id
                ])),
                'created_at' => wecc_current_datetime(),
                'created_by' => get_current_user_id() ?: 0
            ],
            ['%d', '%s', '%f', '%d', '%d', '%s', '%s', '%s', '%s', '%s', '%s', '%d']
        );
        
        if ($payment_result === false) {
            throw new Exception('Error registrando pago directo: ' . $wpdb->last_error);
        }
        
        $payment_id = $wpdb->insert_id;
        error_log("WECC Direct Payment: Pago directo {$payment_id} registrado exitosamente");
        
        $result = [
            'payment_id' => $payment_id,
            'amount_applied' => $payment_amount,
            'target_charge_id' => $target_ledger_id,
            'excess_amount' => $excess_amount
        ];
        
        // Si hay exceso, manejarlo como saldo a favor
        if ($excess_amount > 0) {
            error_log("WECC Direct Payment: Exceso de {$excess_amount}, creando saldo a favor");
            
            $excess_result = $wpdb->insert(
                $this->table_ledger,
                [
                    'account_id' => $account_id,
                    'type' => 'payment',
                    'amount' => -abs($excess_amount),
                    'settles_ledger_id' => null,
                    'order_id' => $order_id,
                    'description' => 'Exceso de pago directo - Saldo a favor',
                    'notes' => "Exceso del pago directo al cargo #{$target_ledger_id}. {$notes}",
                    'transaction_date' => wecc_current_datetime(),
                    'due_date' => null,
                    'metadata' => wp_json_encode(array_merge($metadata, [
                        'payment_type' => 'excess',
                        'original_target_charge_id' => $target_ledger_id
                    ])),
                    'created_at' => wecc_current_datetime(),
                    'created_by' => get_current_user_id() ?: 0
                ],
                ['%d', '%s', '%f', '%d', '%d', '%s', '%s', '%s', '%s', '%s', '%s', '%d']
            );
            
            if ($excess_result !== false) {
                $result['excess_payment_id'] = $wpdb->insert_id;
            }
        }
        
        // Recalcular balance
        $this->recalculate_and_update_balance($account_id);
        
        // Trigger hook
        do_action('wecc_direct_payment_processed', $payment_id, $account_id, $target_ledger_id, $payment_amount);
        
        return $result;
    }
    
    /**
     * Calcula el saldo detallado de una cuenta con precisión decimal correcta
     */
    public function get_detailed_balance(int $account_id): array {
        global $wpdb;
        
        $total_balance_raw = (float) $wpdb->get_var($wpdb->prepare(
            "SELECT COALESCE(SUM(amount), 0) FROM {$this->table_ledger} WHERE account_id = %d", $account_id
        ));
        
        // ARREGLAR PRECISIÓN DECIMAL - redondear a 2 decimales
        $total_balance = round($total_balance_raw, 2);
        
        $has_positive_balance = $total_balance < 0;
        $positive_amount = $has_positive_balance ? abs($total_balance) : 0.0;
        $balance_used = max(0, $total_balance);
        
        return [
            'balance_used' => round($balance_used, 2),
            'has_positive_balance' => $has_positive_balance,
            'positive_amount' => round($positive_amount, 2),
            'raw_balance' => $total_balance,
            'raw_balance_unrounded' => $total_balance_raw  // Para debug
        ];
    }
    
    /**
     * Actualiza el balance_used en la tabla accounts
     */
    public function recalculate_and_update_balance(int $account_id): float {
        $balance = $this->get_detailed_balance($account_id);
        
        global $wpdb;
        $wpdb->update($this->table_accounts, ['balance_used' => $balance['balance_used']], 
                     ['id' => $account_id], ['%f'], ['%d']);
        
        return $balance['balance_used'];
    }
    
    /**
     * Auto-aplica saldo a favor cuando se crea un nuevo cargo
     */
    public function maybe_auto_apply_positive_balance(int $entry_id): void {
        global $wpdb;
        
        $entry = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$this->table_ledger} WHERE id = %d", $entry_id));
        if (!$entry || $entry->type !== 'charge') return;
        
        $account_id = (int) $entry->account_id;
        $balance = $this->get_detailed_balance($account_id);
        
        if (!$balance['has_positive_balance'] || $balance['positive_amount'] <= 0) return;
        
        $amount_to_apply = min($balance['positive_amount'], (float) $entry->amount);
        if ($amount_to_apply <= 0) return;
        
        $payment_id = $this->create_auto_payment($account_id, $amount_to_apply, $entry->order_id,
            sprintf(__('Auto-aplicación de saldo a favor (%s disponible)', 'wc-enhanced-customers-credit'), 
                   wc_price($balance['positive_amount'])));
        
        if ($payment_id) {
            $this->link_payment_to_charge($payment_id, $entry_id, $entry->order_id);
            do_action('wecc_positive_balance_auto_applied', $account_id, $amount_to_apply, $entry_id, $payment_id);
        }
    }
    
    /**
     * Asigna un pago general usando lógica FIFO
     */
    public function allocate_general_payment(int $account_id, float $amount, ?int $order_id = null, string $notes = '', array $metadata = []): array {
        $amount = (float) wc_format_decimal($amount, 2);
        if ($amount <= 0) return ['success' => false, 'error' => 'Monto inválido'];
        
        error_log("WECC FIFO: Iniciando asignación de pago - Account: {$account_id}, Monto: {$amount}");
        
        $balance = $this->get_detailed_balance($account_id);
        if ($balance['balance_used'] <= 0) {
            error_log("WECC FIFO: No hay saldo pendiente");
            return ['success' => false, 'error' => 'No hay saldo pendiente'];
        }
        
        $monto_max = min($amount, $balance['balance_used']);
        $saldo_disponible = $monto_max;
        $cargos_pendientes = $this->get_open_charges($account_id);
        $payments_created = [];
        
        error_log("WECC FIFO: Cargos pendientes encontrados: " . count($cargos_pendientes));
        
        foreach ($cargos_pendientes as $cargo) {
            if ($saldo_disponible <= 0) break;
            
            $restante = $this->get_charge_remaining_amount($cargo);
            error_log("WECC FIFO: Cargo ID {$cargo->id}, Restante: {$restante}");
            
            if ($restante > 0) {
                $aplicar = min($saldo_disponible, $restante);
                
                error_log("WECC FIFO: Aplicando {$aplicar} al cargo {$cargo->id}");
                
                // Crear pago específico para este cargo
                $payment_notes = $notes ?: __('Abono general aplicado automáticamente', 'wc-enhanced-customers-credit');
                $payment_notes .= " - Aplicado a cargo #{$cargo->id}";
                
                $payment_id = $this->create_payment_for_charge(
                    $account_id, 
                    $aplicar, 
                    $cargo->id,
                    $cargo->order_id, 
                    $payment_notes,
                    $metadata
                );
                
                if ($payment_id) {
                    $payments_created[] = [
                        'payment_id' => $payment_id,
                        'charge_id' => $cargo->id,
                        'amount' => $aplicar
                    ];
                    error_log("WECC FIFO: Pago {$payment_id} creado y vinculado al cargo {$cargo->id}");
                } else {
                    error_log("WECC FIFO: Error creando pago para cargo {$cargo->id}");
                }
                
                $saldo_disponible -= $aplicar;
            }
        }
        
        // Si queda saldo sin asignar, crear un pago general
        if ($saldo_disponible > 0) {
            error_log("WECC FIFO: Saldo no asignado: {$saldo_disponible} - Creando pago general");
            $general_payment_id = $this->create_auto_payment(
                $account_id, 
                $saldo_disponible, 
                $order_id,
                ($notes ?: 'Pago general') . ' - Saldo a favor'
            );
            
            if ($general_payment_id) {
                $payments_created[] = [
                    'payment_id' => $general_payment_id,
                    'charge_id' => null,
                    'amount' => $saldo_disponible
                ];
            }
        }
        
        $result = [
            'success' => true,
            'payments_created' => $payments_created,
            'amount_allocated' => $monto_max - $saldo_disponible,
            'remaining_amount' => $saldo_disponible
        ];
        
        error_log("WECC FIFO: Resultado final: " . print_r($result, true));
        
        return $result;
    }
    
    /**
     * Registra un abono que genera saldo a favor
     */
    public function add_positive_balance_adjustment(int $account_id, float $amount, string $notes = '', ?int $created_by = null): ?int {
        if ($amount <= 0) return null;
        
        global $wpdb;
        $result = $wpdb->insert($this->table_ledger, [
            'account_id' => $account_id, 'type' => 'adjustment', 'amount' => -abs($amount),
            'notes' => $notes ?: __('Ajuste manual - saldo a favor', 'wc-enhanced-customers-credit'),
            'created_at' => current_time('mysql'), 'created_by' => $created_by
        ], ['%d', '%s', '%f', '%s', '%s', '%d']);
        
        if ($result === false) return null;
        
        $entry_id = $wpdb->insert_id;
        $this->recalculate_and_update_balance($account_id);
        do_action('wecc_positive_balance_created', $account_id, $amount, $entry_id);
        return $entry_id;
    }
    
    /**
     * Asegura que las columnas settles existan
     */
    public function ensure_settles_columns(): void {
        global $wpdb;
        
        $col1 = $wpdb->get_var($wpdb->prepare("SHOW COLUMNS FROM {$this->table_ledger} LIKE %s", 'settles_ledger_id'));
        if (!$col1) {
            $wpdb->query("ALTER TABLE {$this->table_ledger} ADD COLUMN settles_ledger_id BIGINT UNSIGNED NULL");
            $wpdb->query("ALTER TABLE {$this->table_ledger} ADD INDEX idx_settles_ledger_id (settles_ledger_id)");
        }
        
        $col2 = $wpdb->get_var($wpdb->prepare("SHOW COLUMNS FROM {$this->table_ledger} LIKE %s", 'settles_order_id'));
        if (!$col2) {
            $wpdb->query("ALTER TABLE {$this->table_ledger} ADD COLUMN settles_order_id BIGINT UNSIGNED NULL");
            $wpdb->query("ALTER TABLE {$this->table_ledger} ADD INDEX idx_settles_order_id (settles_order_id)");
        }
    }
    
    // ========================================
    // MÉTODOS PRIVADOS
    // ========================================
    
    private function create_auto_payment(int $account_id, float $amount, ?int $order_id, string $notes): ?int {
        global $wpdb;
        
        $result = $wpdb->insert($this->table_ledger, [
            'account_id' => $account_id, 'order_id' => $order_id, 'type' => 'payment',
            'amount' => -abs($amount), 'notes' => $notes, 'created_at' => current_time('mysql'), 'created_by' => null
        ], ['%d', '%d', '%s', '%f', '%s', '%s', '%d']);
        
        if ($result === false) return null;
        
        $payment_id = $wpdb->insert_id;
        $this->recalculate_and_update_balance($account_id);
        do_action('wecc_ledger_entry_created', $payment_id);
        return $payment_id;
    }
    
    /**
     * Crea un pago específico vinculado a un cargo
     */
    private function create_payment_for_charge(int $account_id, float $amount, int $charge_id, ?int $order_id, string $notes, array $metadata = []): ?int {
        global $wpdb;
        
        $this->ensure_settles_columns();
        
                // Crear una versión sin metadata para admin_quick_payment
                $clean_metadata = $metadata;
                
                // Si es admin_quick_payment, no incluir la metadata en las notas
                if (isset($metadata['payment_method']) && $metadata['payment_method'] === 'admin_quick_payment') {
                    $final_notes = $notes; // Sin metadata
                } else {
                    // Para otros tipos de pago, mantener metadata
                    $final_notes = $notes;
                    if (!empty($metadata)) {
                        $final_notes .= ' | Metadata: ' . wp_json_encode($metadata);
                    }
                }
        
        $result = $wpdb->insert($this->table_ledger, [
            'account_id' => $account_id,
            'order_id' => $order_id,
            'type' => 'payment',
            'amount' => -abs($amount),
            'notes' => $final_notes,
            'settles_ledger_id' => $charge_id,  // VINCULACIÓN DIRECTA
            'settles_order_id' => $order_id,
            'created_at' => current_time('mysql'),
            'created_by' => get_current_user_id()
        ], ['%d', '%d', '%s', '%f', '%s', '%d', '%d', '%s', '%d']);
        
        if ($result === false) {
            error_log("WECC FIFO: Error insertando pago: " . $wpdb->last_error);
            return null;
        }
        
        $payment_id = $wpdb->insert_id;
        
        // Recalcular balance
        $this->recalculate_and_update_balance($account_id);
        
        // Disparar evento
        do_action('wecc_ledger_entry_created', $payment_id);
        
        error_log("WECC FIFO: Pago {$payment_id} creado exitosamente para cargo {$charge_id}");
        
        return $payment_id;
    }
    
    private function link_payment_to_charge(int $payment_id, int $charge_id, ?int $charge_order_id): void {
        global $wpdb;
        $this->ensure_settles_columns();
        $wpdb->update($this->table_ledger, 
            ['settles_ledger_id' => $charge_id, 'settles_order_id' => $charge_order_id],
            ['id' => $payment_id], ['%d', '%d'], ['%d']);
    }
    
    private function get_open_charges(int $account_id): array {
        global $wpdb;
        
        // Obtener cargos pendientes ordenados por fecha (FIFO)
        $charges = $wpdb->get_results($wpdb->prepare("
            SELECT l.*, 
                   l.amount as original_amount,
                   COALESCE(
                       (SELECT SUM(ABS(p.amount)) 
                        FROM {$this->table_ledger} p 
                        WHERE p.settles_ledger_id = l.id AND p.type = 'payment'), 
                       0
                   ) as paid_amount
            FROM {$this->table_ledger} l
            WHERE l.account_id = %d 
              AND l.type = 'charge'
              AND l.amount > 0
            HAVING (l.amount - paid_amount) > 0
            ORDER BY l.due_date ASC, l.created_at ASC
        ", $account_id));
        
        error_log("WECC FIFO: Cargos abiertos encontrados: " . count($charges));
        foreach ($charges as $charge) {
            $remaining = $charge->original_amount - $charge->paid_amount;
            error_log("WECC FIFO: Cargo ID {$charge->id}, Original: {$charge->original_amount}, Pagado: {$charge->paid_amount}, Restante: {$remaining}");
        }
        
        return $charges;
    }
    
    private function get_charge_remaining_amount($charge_row): float {
        if (!$charge_row || empty($charge_row->id)) return 0.0;
        
        global $wpdb;
        $charge_amount = (float) $charge_row->amount;
        
        $adj_sum = 0.0;
        if (!empty($charge_row->order_id)) {
            $adj_sum = (float) $wpdb->get_var($wpdb->prepare(
                "SELECT COALESCE(SUM(amount),0) FROM {$this->table_ledger} WHERE type='adjustment' AND order_id=%d",
                (int) $charge_row->order_id));
        }
        
        $paid_sum = (float) $wpdb->get_var($wpdb->prepare(
            "SELECT COALESCE(SUM(ABS(amount)),0) FROM {$this->table_ledger} WHERE type='payment' AND settles_ledger_id=%d",
            (int) $charge_row->id));
        
        $remaining = max(0, $charge_amount + min(0.0, $adj_sum) - $paid_sum);
        return (float) wc_format_decimal($remaining, 2);
    }
}
