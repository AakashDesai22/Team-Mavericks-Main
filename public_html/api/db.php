<?php
/**
 * ============================================================================
 * BODHANTRA EVENT OS — Secure PDO Database Connection Singleton
 * ============================================================================
 *
 * Provides a single, reusable PDO connection to the MySQL database.
 *
 * Security constraints enforced:
 *   • PDO::ATTR_EMULATE_PREPARES = false  → forces the MySQL driver to use
 *     real server-side prepared statements, closing the primary vector for
 *     SQL injection even if a developer forgets to bind a parameter.
 *   • PDO::ATTR_ERRMODE = EXCEPTION       → surfaces query errors immediately
 *     instead of silently returning false.
 *   • utf8mb4 charset                     → full Unicode support including
 *     emoji (important for user-generated text fields).
 *
 * Usage from any controller:
 *     require_once __DIR__ . '/../db.php';
 *     $pdo = Database::connect();
 *     $stmt = $pdo->prepare('SELECT * FROM users WHERE id = :id');
 *     $stmt->execute([':id' => $userId]);
 *
 * @package BodhantraOS
 */

declare(strict_types=1);

// ---------------------------------------------------------------------------
// Configuration — In production, these values MUST be moved to environment
// variables or a file outside the web root.  The .htaccess rules already
// block direct HTTP access to this file, but belt-and-suspenders is the
// correct posture for credential storage.
// ---------------------------------------------------------------------------

/**
 * Database configuration array.
 *
 * On Hostinger shared hosting the typical defaults are:
 *   host     = localhost
 *   port     = 3306
 *   dbname   = u<account_id>_bodhantra
 *   username = u<account_id>_dbuser
 *   password = (set in Hostinger panel)
 *
 * Override via environment variables when available.
 */
function getDatabaseConfig(): array
{
    return [
        'host'     => getenv('DB_HOST')     ?: 'localhost',
        'port'     => getenv('DB_PORT')     ?: '3306',
        'dbname'   => getenv('DB_NAME')     ?: 'bodhantra_os',
        'username' => getenv('DB_USER')     ?: 'root',
        'password' => getenv('DB_PASS')     ?: '',
        'charset'  => 'utf8mb4',
        'collation'=> 'utf8mb4_unicode_ci',
    ];
}


/**
 * Singleton database wrapper.
 *
 * Why a singleton?  On shared hosting each PHP request is a short-lived
 * process.  Re-using the same PDO instance across multiple controller
 * calls within a single request avoids opening redundant TCP connections
 * to the MySQL socket.
 */
class Database
{
    /** @var PDO|null Cached connection instance */
    private static ?PDO $instance = null;

    /**
     * Return the shared PDO connection, creating it on first call.
     *
     * @return PDO  A configured, hardened PDO connection.
     *
     * @throws \RuntimeException  If the connection cannot be established
     *                            (wraps PDOException to avoid leaking DSN
     *                            details in stack traces on production).
     */
    public static function connect(): PDO
    {
        if (self::$instance === null) {
            $cfg = getDatabaseConfig();

            $dsn = sprintf(
                'mysql:host=%s;port=%s;dbname=%s;charset=%s',
                $cfg['host'],
                $cfg['port'],
                $cfg['dbname'],
                $cfg['charset']
            );

            // ------------------------------------------------------------------
            // PDO options — each setting is a deliberate security or performance
            // decision, not a default copy-paste.
            // ------------------------------------------------------------------
            $options = [
                // CRITICAL: Disable emulated prepares.  With this OFF, the
                // MySQL driver sends the query template and the bound values
                // in two separate protocol packets, making SQL injection via
                // parameter values structurally impossible.
                PDO::ATTR_EMULATE_PREPARES   => false,

                // Throw exceptions on errors so we can catch them in the
                // gateway's global try/catch and return clean JSON error
                // responses instead of partial HTML.
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,

                // Return associative arrays by default — cleaner than the
                // BOTH mode that wastes memory with duplicate numeric keys.
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,

                // Use strict data types when fetching — integers come back
                // as PHP int, not string.  Requires mysqlnd driver (standard
                // on all modern PHP 8+ builds).
                PDO::ATTR_STRINGIFY_FETCHES  => false,

                // Persistent connections: OFF.  On shared hosting, persistent
                // connections can leak across unrelated tenants on the same
                // Apache worker, creating both security and resource issues.
                PDO::ATTR_PERSISTENT         => false,

                // Connection timeout — fail fast if the DB is unreachable
                // rather than hanging the HTTP request for 30+ seconds.
                PDO::ATTR_TIMEOUT            => 5,
            ];

            try {
                self::$instance = new PDO($dsn, $cfg['username'], $cfg['password'], $options);

                // Set the collation at the session level to guarantee
                // consistent sorting/comparison behaviour regardless of
                // the server's global defaults.
                self::$instance->exec(
                    "SET NAMES '{$cfg['charset']}' COLLATE '{$cfg['collation']}'"
                );

                // Enforce strict SQL mode to catch truncation errors, invalid
                // dates, and division-by-zero at write time instead of
                // silently corrupting data.
                self::$instance->exec(
                    "SET SESSION sql_mode = 'STRICT_ALL_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION'"
                );
            } catch (\PDOException $e) {
                // In production, NEVER expose the raw PDOException message
                // because it contains the DSN string (host, port, db name).
                // Log the real error server-side and return a generic message.
                error_log('[BodhantraOS] Database connection failed: ' . $e->getMessage());

                throw new \RuntimeException(
                    'Database connection could not be established. Please contact the system administrator.',
                    500
                );
            }
        }

        return self::$instance;
    }

    /**
     * Tear down the connection (useful in long-running CLI scripts or tests).
     */
    public static function disconnect(): void
    {
        self::$instance = null;
    }

    // Prevent external instantiation / cloning of the singleton.
    private function __construct() {}
    private function __clone() {}
}
