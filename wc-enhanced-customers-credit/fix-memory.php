<?php
/**
 * CONFIGURACIÓN TEMPORAL DE MEMORIA
 * 
 * Agregar estas líneas a wp-config.php ANTES de "require_once(ABSPATH . 'wp-settings.php');"
 */

// Aumentar límite de memoria de WordPress
define('WP_MEMORY_LIMIT', '512M');

// También aumentar límite de PHP
ini_set('memory_limit', '512M');

// Limite para el admin
define('WP_MAX_MEMORY_LIMIT', '512M');

echo "
INSTRUCCIONES:
===============

1. Abre el archivo wp-config.php de tu sitio
2. Busca la línea: require_once(ABSPATH . 'wp-settings.php');
3. ANTES de esa línea, agrega:

define('WP_MEMORY_LIMIT', '512M');
ini_set('memory_limit', '512M');
define('WP_MAX_MEMORY_LIMIT', '512M');

4. Guarda y recarga la página

O en MAMP:
===========
1. Ve a MAMP > Preferences > PHP
2. Busca 'memory_limit' 
3. Cambia de 128M a 512M
4. Reinicia MAMP
";
