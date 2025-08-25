<?php
if (!defined('ABSPATH')) {
    exit;
}

/**
 * WECC Service Container
 * 
 * Dependency Injection container simple para gestionar servicios
 * Patrón Singleton + Service Locator ligero
 */
class WECC_Service_Container {
    
    private static $instance = null;
    private $services = [];
    private $singletons = [];
    
    public static function instance(): self {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        $this->register_core_services();
    }
    
    /**
     * Registra los servicios principales del sistema
     */
    private function register_core_services(): void {
        // Servicios core
        $this->register('customer_service', function() {
            return new WECC_Customer_Service();
        });
        
        // Servicio unificado para datos de clientes (WC + WECC)
        $this->register('unified_customer_service', function() {
            return new WECC_Unified_Customer_Service();
        });
        
        $this->register('balance_service', function() {
            return new WECC_Balance_Service();
        });
        
        $this->register('payment_service', function() {
            return new WECC_Payment_Service(
                $this->get('balance_service')
            );
        });
        
        $this->register('import_service', function() {
            return new WECC_Import_Service(
                $this->get('customer_service')
            );
        });
        
        $this->register('email_service', function() {
            return new WECC_Email_Service();
        });
        
        $this->register('validator', function() {
            return new WECC_Validator();
        });
    }
    
    /**
     * Registra un servicio en el container
     * 
     * @param string $key Identificador del servicio
     * @param callable $factory Función que crea el servicio
     * @param bool $singleton Si debe ser singleton (default: true)
     */
    public function register(string $key, callable $factory, bool $singleton = true): void {
        $this->services[$key] = [
            'factory' => $factory,
            'singleton' => $singleton
        ];
    }
    
    /**
     * Obtiene un servicio del container
     * 
     * @param string $key Identificador del servicio
     * @return mixed El servicio solicitado
     * @throws InvalidArgumentException Si el servicio no existe
     */
    public function get(string $key) {
        if (!isset($this->services[$key])) {
            throw new InvalidArgumentException("Servicio '{$key}' no registrado");
        }
        
        $service_config = $this->services[$key];
        
        // Si es singleton y ya existe, devolver la instancia
        if ($service_config['singleton'] && isset($this->singletons[$key])) {
            return $this->singletons[$key];
        }
        
        // Crear nueva instancia
        $service = call_user_func($service_config['factory']);
        
        // Guardar como singleton si aplica
        if ($service_config['singleton']) {
            $this->singletons[$key] = $service;
        }
        
        return $service;
    }
    
    /**
     * Verifica si un servicio está registrado
     */
    public function has(string $key): bool {
        return isset($this->services[$key]);
    }
    
    /**
     * Remueve un servicio del container (para testing)
     */
    public function remove(string $key): void {
        unset($this->services[$key]);
        unset($this->singletons[$key]);
    }
    
    /**
     * Obtiene la lista de servicios registrados
     */
    public function get_registered_services(): array {
        return array_keys($this->services);
    }
}

/**
 * Helper function para acceso global al container
 */
function wecc_container(): WECC_Service_Container {
    return WECC_Service_Container::instance();
}

/**
 * Helper function para obtener servicios rápidamente
 */
function wecc_service(string $key) {
    return wecc_container()->get($key);
}
