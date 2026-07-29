<?php
/**
 * Automated Local Database Initializer
 */
declare(strict_types=1);

$host = '127.0.0.1';
$port = 3306;
$user = 'root';
$pass = 'aakki';
$dbname = 'mavericks-main';

try {
    // 1. Connect without dbname to create database if not exists
    $pdo = new PDO("mysql:host={$host};port={$port}", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);

    $pdo->exec("CREATE DATABASE IF NOT EXISTS `{$dbname}` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;");
    echo "[SUCCESS] Database '{$dbname}' created / verified.\n";

    // 2. Reconnect to database
    $pdo = new PDO("mysql:host={$host};port={$port};dbname={$dbname}", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);

    // 3. Sequential SQL Schema files to import
    $sqlFiles = [
        __DIR__ . '/schema.sql',
        __DIR__ . '/migration_phase1.sql',
        __DIR__ . '/migration_phase2.sql',
        __DIR__ . '/migration_phase3.sql',
        __DIR__ . '/migration_phase4.sql',
    ];

    foreach ($sqlFiles as $file) {
        if (!file_exists($file)) {
            echo "[WARN] File not found: {$file}\n";
            continue;
        }

        $sql = file_get_contents($file);
        if (trim($sql) === '') continue;

        // Split multi-statement SQL strings
        $pdo->exec($sql);
        echo "[SUCCESS] Imported " . basename($file) . "\n";
    }

    echo "==================================================\n";
    echo "  Local Database Setup Complete!\n";
    echo "==================================================\n";

} catch (\Throwable $e) {
    echo "[ERROR] " . $e->getMessage() . "\n";
}
