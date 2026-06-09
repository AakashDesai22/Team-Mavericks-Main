<?php
/**
 * ============================================================================
 * BODHANTRA EVENT OS — Central Environment Loader & Configurator
 * ============================================================================
 *
 * Automatically detects the environment (Localhost vs. Hostinger Production)
 * and configures settings/flags to ensure seamless operation.
 */

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
    PHP_SAPI === 'cli-server'
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

    // Load .env variables locally
    $envPath = dirname(__DIR__, 2) . '/.env';
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
} else {
    // -----------------------------------------------------------------------
    // 3. HOSTINGER PRODUCTION ENVIRONMENT SETUP
    // -----------------------------------------------------------------------
    putenv('APP_ENV=production');
    $_ENV['APP_ENV'] = 'production';
    $_SERVER['APP_ENV'] = 'production';

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
    }

    // Override or set mailer configurations for Hostinger email structure.
    // Ensure native PHP mail() aligns with the verified sender domain.
    $productionMailSettings = [
        'MAIL_FROM_NAME'    => 'Mavericks Verification',
        'MAIL_FROM_ADDRESS' => 'no-reply@teammavericks.org',
        'MAIL_REPLY_TO'     => 'support@teammavericks.org',
    ];

    foreach ($productionMailSettings as $name => $value) {
        putenv("{$name}={$value}");
        $_ENV[$name] = $value;
        $_SERVER[$name] = $value;
    }
}
