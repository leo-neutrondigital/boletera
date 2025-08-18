<?php
if (!defined('ABSPATH')) {
    exit;
}

/**
 * WECC Validator
 * 
 * Validaciones para RFC, estados, códigos postales, etc.
 */
class WECC_Validator {
    
    /**
     * Estados de México con códigos de 3 letras
     */
    private $mx_states = [
        'AGS' => 'Aguascalientes',
        'BCN' => 'Baja California Norte',
        'BCS' => 'Baja California Sur',
        'CAM' => 'Campeche',
        'CHP' => 'Chiapas',
        'CHH' => 'Chihuahua',
        'COA' => 'Coahuila',
        'COL' => 'Colima',
        'DIF' => 'Ciudad de México',
        'DUR' => 'Durango',
        'GTO' => 'Guanajuato',
        'GRO' => 'Guerrero',
        'HGO' => 'Hidalgo',
        'JAL' => 'Jalisco',
        'MEX' => 'Estado de México',
        'MIC' => 'Michoacán',
        'MOR' => 'Morelos',
        'NAY' => 'Nayarit',
        'NLE' => 'Nuevo León',
        'OAX' => 'Oaxaca',
        'PUE' => 'Puebla',
        'QRO' => 'Querétaro',
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
    
    /**
     * Valida RFC mexicano
     */
    public function is_valid_rfc(string $rfc): bool {
        $rfc = strtoupper(trim($rfc));
        
        // Patrón básico para RFC
        // Persona física: 4 letras + 6 números + 2 caracteres
        // Persona moral: 3 letras + 6 números + 2 caracteres
        $pattern = '/^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{2,3}$/';
        
        if (!preg_match($pattern, $rfc)) {
            return false;
        }
        
        // Verificar que no sea un RFC genérico inválido
        $invalid_rfcs = [
            'XAXX010101000',
            'XEXX010101000',
            'AAA010101AAA',
            'AAAA010101AAA'
        ];
        
        return !in_array($rfc, $invalid_rfcs);
    }
    
    /**
     * Valida código de estado de 3 letras
     */
    public function is_valid_state3(string $state3): bool {
        $state3 = strtoupper(trim($state3));
        return array_key_exists($state3, $this->mx_states);
    }
    
    /**
     * Valida REGFISCAL (debe ser 3 dígitos)
     */
    public function is_valid_regfiscal(string $regfiscal): bool {
        return preg_match('/^\d{3}$/', trim($regfiscal));
    }
    
    /**
     * Valida código postal mexicano
     */
    public function is_valid_zip(string $zip): bool {
        return preg_match('/^\d{5}$/', trim($zip));
    }
    
    /**
     * Valida número de teléfono mexicano
     */
    public function is_valid_phone(string $phone): bool {
        // Remover espacios, guiones, paréntesis
        $clean_phone = preg_replace('/[\s\-\(\)]/', '', $phone);
        
        // Verificar que solo tenga dígitos y + al inicio
        if (!preg_match('/^(\+52)?[\d]{10,10}$/', $clean_phone)) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Obtiene lista de estados mexicanos
     */
    public function get_mx_states(): array {
        return $this->mx_states;
    }
    
    /**
     * Obtiene nombre del estado por código
     */
    public function get_state_name(string $state3): string {
        $state3 = strtoupper(trim($state3));
        return $this->mx_states[$state3] ?? '';
    }
    
    /**
     * Valida email
     */
    public function is_valid_email(string $email): bool {
        return filter_var(trim($email), FILTER_VALIDATE_EMAIL) !== false;
    }
    
    /**
     * Valida que un string no esté vacío
     */
    public function is_not_empty(string $value): bool {
        return !empty(trim($value));
    }
    
    /**
     * Valida que un número esté en un rango
     */
    public function is_in_range(float $value, float $min, float $max): bool {
        return $value >= $min && $value <= $max;
    }
    
    /**
     * Valida que un string tenga una longitud específica
     */
    public function has_length(string $value, int $min_length, int $max_length = null): bool {
        $length = strlen(trim($value));
        
        if ($length < $min_length) {
            return false;
        }
        
        if ($max_length !== null && $length > $max_length) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Sanea un string para usar como slug
     */
    public function sanitize_slug(string $value): string {
        $value = trim($value);
        $value = strtolower($value);
        $value = preg_replace('/[^a-z0-9\-_]/', '-', $value);
        $value = preg_replace('/-+/', '-', $value);
        $value = trim($value, '-');
        
        return $value;
    }
    
    /**
     * Formatea RFC con guiones para display
     */
    public function format_rfc_display(string $rfc): string {
        $rfc = strtoupper(trim($rfc));
        
        if (strlen($rfc) === 12) {
            // Persona moral: ABC123456XX
            return substr($rfc, 0, 3) . '-' . substr($rfc, 3, 6) . '-' . substr($rfc, 9);
        } elseif (strlen($rfc) === 13) {
            // Persona física: ABCD123456XX
            return substr($rfc, 0, 4) . '-' . substr($rfc, 4, 6) . '-' . substr($rfc, 10);
        }
        
        return $rfc;
    }
    
    /**
     * Formatea teléfono para display
     */
    public function format_phone_display(string $phone): string {
        $clean = preg_replace('/[\s\-\(\)+]/', '', $phone);
        
        if (strlen($clean) === 10) {
            // Formato: (999) 123-4567
            return '(' . substr($clean, 0, 3) . ') ' . substr($clean, 3, 3) . '-' . substr($clean, 6);
        } elseif (strlen($clean) === 12 && substr($clean, 0, 2) === '52') {
            // Con código de país: +52 (999) 123-4567
            $number = substr($clean, 2);
            return '+52 (' . substr($number, 0, 3) . ') ' . substr($number, 3, 3) . '-' . substr($number, 6);
        }
        
        return $phone; // Devolver original si no coincide con formatos conocidos
    }
}
