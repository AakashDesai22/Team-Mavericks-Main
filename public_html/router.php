<?php
/**
 * Local Development Router for PHP Built-in Web Server
 * 
 * This file mimics the Apache mod_rewrite rules defined in public_html/api/.htaccess
 * when running the project locally without Apache (e.g., using `php -S`).
 */

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$file = __DIR__ . $uri;

// If it's a real file or directory, let the built-in server serve it directly.
if ($uri !== '/' && (file_exists($file) && !is_dir($file))) {
    return false;
}

// If the request is for an API endpoint (/api/*)
if (strpos($uri, '/api/') === 0) {
    // Extract the route parameter
    // e.g. /api/events -> events
    $route = substr($uri, 5);
    $_GET['route'] = $route;
    
    // Dispatch to the main index.php gateway
    require_once __DIR__ . '/api/index.php';
} else {
    // Otherwise, serve index.html (frontend)
    if (file_exists(__DIR__ . '/index.html')) {
        readfile(__DIR__ . '/index.html');
    } else {
        return false;
    }
}
