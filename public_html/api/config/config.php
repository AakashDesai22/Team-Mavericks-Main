<?php
/**
 * ============================================================================
 * BODHANTRA EVENT OS — Central Environment Loader & Configurator
 * ============================================================================
 *
 * Automatically detects the environment (Localhost vs. Hostinger Production)
 * and configures settings/flags to ensure seamless operation.
 * */

declare(strict_types=1);

// ---------------------------------------------------------------------------
// 1. ENVIRONMENT DETECTION
// ---------------------------------------------------------------------------
$serverName = $_SERVER['SERVER_NAME'] ?? '';
$httpHost = $_SERVER['HTTP_HOST'] ?? '';
$isLocal = false;

if (
    in_array($serverName, ['localhost', '127.0.0.1', '::1'], true) ||
    in_array($httpHost, ['localhost', '127.0.0.1', '::1'], true) ||
    PHP_SAPI === 'cli-server' ||
    PHP_SAPI === 'cli' ||
    getenv('APP_ENV') === 'local' ||
    (isset($_ENV['APP_ENV']) && $_ENV['APP_ENV'] === 'local')
) {
    $isLocal = true;
}

// ---------------------------------------------------------------------------
// 2. CONFIGURE ENVIRONMENT FLAGS AND LOAD CONFIGS
// ---------------------------------------------------------------------------
if ($isLocal) {
    // Set APP_ENV to local by default if not set
    if (getenv('APP_ENV') === false) {
        putenv('APP_ENV=local');
        $_ENV['APP_ENV'] = 'local';
        $_SERVER['APP_ENV'] = 'local';
    }
    define('APP_ENV', 'local'); // Define the global constant

    // Load .env variables locally
    $envPath = dirname(__DIR__, 3) . '/.env';
    if (!file_exists($envPath)) {
        $envPath = dirname(__DIR__, 2) . '/.env';
    }
    if (file_exists($envPath)) {
        $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || strpos($line, '#') === 0) {
                continue;
            }
            $parts = explode('=', $line, 2);
            if (count($parts) === 2) {
                $name = trim($parts[0]);
                $value = trim($parts[1]);
                // Strip wrapping quotes if any
                if (preg_match('/^"(.+)"$/', $value, $matches) || preg_match('/^\'(.+)\'$/', $value, $matches)) {
                    $value = $matches[1];
                }
                
                // Set the environment variable
                putenv("{$name}={$value}");
                $_ENV[$name] = $value;
                $_SERVER[$name] = $value;
            }
        }
    }

    // Map your local array variables to constants if your codebase expects them
    if (isset($_ENV['DB_HOST']) && !defined('DB_HOST')) {
        define('DB_HOST', $_ENV['DB_HOST']);
        define('DB_NAME', $_ENV['DB_NAME']);
        define('DB_USER', $_ENV['DB_USER']);
        define('DB_PASS', $_ENV['DB_PASS']);
    }

} else {
    // -----------------------------------------------------------------------
    // 3. HOSTINGER PRODUCTION ENVIRONMENT SETUP
    // -----------------------------------------------------------------------
    putenv('APP_ENV=production');
    $_ENV['APP_ENV'] = 'production';
    $_SERVER['APP_ENV'] = 'production';
    define('APP_ENV', 'production'); // Define the global constant

    // Database Credentials for Hostinger Production
    $productionDbSettings = [
        'DB_HOST' => 'localhost',
        'DB_NAME' => 'u714635531_main_db',
        'DB_USER' => 'u714635531_main_admin',
        'DB_PASS' => 'eEPD@gP4',
    ];

    foreach ($productionDbSettings as $name => $value) {
        putenv("{$name}={$value}");
        $_ENV[$name] = $value;
        $_SERVER[$name] = $value;
        define($name, $value); // Force defining constants like DB_HOST, DB_NAME
    }

    // Override or set mailer configurations for Hostinger email structure.
    $productionMailSettings = [
        'MAIL_FROM_NAME'    => 'Mavericks Verification',
        'MAIL_FROM_ADDRESS' => 'no-reply@teammavericks.org',
        'MAIL_REPLY_TO'     => 'support@teammavericks.org',
        'SMTP_HOST'         => 'smtp.hostinger.com',
        'SMTP_PORT'         => '465',
        'SMTP_SECURE'       => 'ssl',
        'SMTP_USER'         => 'no-reply@teammavericks.org',
        'SMTP_PASS'         => '@Bcw8&dz',
    ];

    foreach ($productionMailSettings as $name => $value) {
        putenv("{$name}={$value}");
        $_ENV[$name] = $value;
        $_SERVER[$name] = $value;
        define($name, $value); // Force defining mail constants
    }
}