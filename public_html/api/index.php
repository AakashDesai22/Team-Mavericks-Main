<?php
/**
 * ============================================================================
 * BODHANTRA EVENT OS — Central API Gateway / Front-Controller
 * ============================================================================
 *
 * Every HTTP request to /api/* lands here after the .htaccess rewrite.
 * This file is responsible for:
 *
 *   1. Injecting strict CORS headers (cross-origin isolation).
 *   2. Parsing the incoming route and HTTP method.
 *   3. Decoding JSON request bodies.
 *   4. Dispatching to the appropriate controller.
 *   5. Wrapping all output in a consistent JSON envelope.
 *   6. Catching unhandled exceptions and returning safe error responses.
 *   7. Writing every request to the audit ledger.
 *
 * @package BodhantraOS
 */

declare(strict_types=1);

// ---------------------------------------------------------------------------
// 0.  BOOT — Error reporting & output buffering
// ---------------------------------------------------------------------------
// In production, set display_errors to 0 and log_errors to 1.
// During development you may flip display_errors to 1.
ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

// Start output buffering so that accidental echo/print in controllers
// doesn't corrupt the JSON response.
ob_start();

// ---------------------------------------------------------------------------
// 1.  CORS — Cross-Origin Isolation
// ---------------------------------------------------------------------------
// Whitelist of allowed frontend origins.  Add your Hostinger production
// domain and any local dev server URLs here.
$allowedOrigins = [
    'http://localhost:5173',         // Vite dev server
    'http://localhost:3000',         // Alternate dev port
    'https://bodhantra.com',         // Production domain (update as needed)
    'https://www.bodhantra.com',     // www variant
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if (in_array($origin, $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: {$origin}");
    header('Access-Control-Allow-Credentials: true');
} else {
    // For non-browser clients (Postman, cURL, server-to-server) the Origin
    // header is absent.  We still serve the response but without the ACAO
    // header, so browsers will block cross-origin reads.
    // In strict-lockdown mode you could return 403 here instead.
}

header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Max-Age: 86400');  // Cache preflight for 24 h
header('Content-Type: application/json; charset=utf-8');

// Handle CORS preflight requests immediately — no further processing needed.
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    ob_end_clean();
    exit;
}

// ---------------------------------------------------------------------------
// 2.  DEPENDENCIES
// ---------------------------------------------------------------------------
require_once __DIR__ . '/db.php';

// ---------------------------------------------------------------------------
// 3.  HELPER UTILITIES
// ---------------------------------------------------------------------------

/**
 * Send a JSON response and terminate.
 *
 * @param int   $statusCode  HTTP status code.
 * @param array $payload     Associative array to encode as JSON.
 */
function jsonResponse(int $statusCode, array $payload): void
{
    // Discard any stray output that leaked from controllers.
    ob_end_clean();

    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/**
 * Read and decode the raw JSON request body.
 *
 * @return array  Decoded associative array (empty array if body is absent
 *                or not valid JSON).
 */
function parseJsonBody(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === '' || $raw === false) {
        return [];
    }

    $decoded = json_decode($raw, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        jsonResponse(400, [
            'success' => false,
            'error'   => 'Malformed JSON in request body.',
            'detail'  => json_last_error_msg(),
        ]);
    }

    return $decoded;
}

/**
 * Extract the Bearer token from the Authorization header.
 *
 * @return string|null  The raw token string, or null if absent.
 */
function extractBearerToken(): ?string
{
    $header = $_SERVER['HTTP_AUTHORIZATION']
           ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
           ?? '';

    if (preg_match('/^Bearer\s+(.+)$/i', $header, $matches)) {
        return $matches[1];
    }

    return null;
}

/**
 * Resolve the client's real IP address, accounting for common proxy headers.
 *
 * @return string  Best-guess client IP.
 */
function getClientIp(): string
{
    foreach (['HTTP_CF_CONNECTING_IP', 'HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP', 'REMOTE_ADDR'] as $key) {
        if (!empty($_SERVER[$key])) {
            // X-Forwarded-For can contain a chain; take the first (client) IP.
            $ip = explode(',', $_SERVER[$key])[0];
            return trim($ip);
        }
    }
    return '0.0.0.0';
}

/**
 * Write an entry to the audit_ledger table.
 *
 * This is a fire-and-forget utility — failures are logged but never
 * bubble up to the client.  We don't want audit logging issues to break
 * real user workflows.
 *
 * @param int|null $actorId     The authenticated user's ID (null for anonymous).
 * @param string   $action      Human-readable description of the action.
 * @param string   $endpoint    The API route that was hit.
 * @param string   $clientIp    Client IP address.
 */
function writeAuditLog(?int $actorId, string $action, string $endpoint, string $clientIp): void
{
    try {
        $pdo  = Database::connect();
        $stmt = $pdo->prepare(
            'INSERT INTO audit_ledger (actor_user_id, action_description, targeted_endpoint, client_ip, server_timestamp)
             VALUES (:actor_id, :action, :endpoint, :ip, NOW())'
        );
        $stmt->execute([
            ':actor_id'  => $actorId,
            ':action'    => mb_substr($action, 0, 500),
            ':endpoint'  => mb_substr($endpoint, 0, 255),
            ':ip'        => $clientIp,
        ]);
    } catch (\Throwable $e) {
        error_log('[BodhantraOS][AuditLog] Failed to write: ' . $e->getMessage());
    }
}


// ---------------------------------------------------------------------------
// 4.  ROUTE RESOLUTION
// ---------------------------------------------------------------------------

// The .htaccess RewriteRule passes the path segment as ?route=...
$route  = trim($_GET['route'] ?? '', '/');

// If the route is a public upload, serve the static file directly
if (strpos($route, 'public/uploads/') === 0) {
    $realFile = dirname(__DIR__) . '/' . $route; // Resolves to public_html/public/uploads/...
    $realFile = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $realFile);
    if (file_exists($realFile) && !is_dir($realFile)) {
        $ext = strtolower(pathinfo($realFile, PATHINFO_EXTENSION));
        $mimeTypes = [
            'jpg'  => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'png'  => 'image/png',
            'gif'  => 'image/gif',
            'webp' => 'image/webp',
            'pdf'  => 'application/pdf',
        ];
        $contentType = $mimeTypes[$ext] ?? 'application/octet-stream';
        
        while (ob_get_level()) {
            ob_end_clean();
        }
        
        header("Content-Type: $contentType");
        header("Content-Length: " . filesize($realFile));
        readfile($realFile);
        exit;
    } else {
        error_log("[BodhantraOS][FileServe] Static upload file not found: " . $realFile);
    }
}

$method = strtoupper($_SERVER['REQUEST_METHOD']);
$body   = parseJsonBody();
$token  = extractBearerToken();
$ip     = getClientIp();

// ---------------------------------------------------------------------------
// 5.  ROUTE TABLE & DISPATCH
// ---------------------------------------------------------------------------
// Each entry maps a "{METHOD}:{route}" key to a controller file and the
// function to invoke inside that file.
//
// Controller files return their responses by calling jsonResponse() directly.
// If they need the parsed body or token they receive them via the $ctx array.
//
// Routes are checked in declaration order; first match wins.
// ---------------------------------------------------------------------------

/**
 * Context array passed into every controller function.
 * Controllers never touch $_POST / $_GET / php://input directly.
 */
$ctx = [
    'method' => $method,
    'route'  => $route,
    'body'   => $body,
    'token'  => $token,
    'ip'     => $ip,
    'query'  => $_GET,
    'files'  => $_FILES,
];

try {
    // ------------------------------------------------------------------
    // Static route map.
    //
    // Format:
    //   'HTTP_METHOD:path/segment' => [
    //       'controller' => 'filename.php',     (inside controllers/)
    //       'action'     => 'functionName',
    //       'audit'      => 'Human-readable log message',
    //   ]
    //
    // Dynamic segments (e.g., /events/{id}) are handled further below
    // with regex matching.
    // ------------------------------------------------------------------
    $staticRoutes = [

        // --- Health Check ------------------------------------------------
        'GET:health' => [
            'handler' => function (array $ctx): void {
                jsonResponse(200, [
                    'success' => true,
                    'message' => 'Bodhantra Event OS API is operational.',
                    'server_time' => date('c'),
                    'php_version' => PHP_VERSION,
                ]);
            },
            'audit' => 'Health check ping',
        ],

        // --- Authentication / Registration --------------------------------
        // Legacy registration endpoint (DEPRECATED — use /register/initiate + /register/verify-otp).
        // Kept for backward compatibility during transition.
        'POST:register' => [
            'controller' => 'register.php',
            'action'     => 'handleRegistration',
            'audit'      => '[DEPRECATED] Legacy user registration attempt',
        ],

        // New OTP-verified registration flow (Phase 1).
        'POST:register/initiate' => [
            'controller' => 'public_register.php',
            'action'     => 'handleInitiateRegistration',
            'audit'      => 'OTP registration initiation',
        ],

        'POST:register/verify-otp' => [
            'controller' => 'public_register.php',
            'action'     => 'handleVerifyOtp',
            'audit'      => 'OTP verification + account creation',
        ],

        'POST:auth/login' => [
            'controller' => 'auth.php',
            'action'     => 'handleLogin',
            'audit'      => 'Login attempt',
        ],

        'POST:auth/logout' => [
            'controller' => 'auth.php',
            'action'     => 'handleLogout',
            'audit'      => 'Logout',
        ],

        'GET:auth/me' => [
            'controller' => 'auth.php',
            'action'     => 'handleGetCurrentUser',
            'audit'      => 'Fetch current user profile',
        ],

        // --- Events -------------------------------------------------------
        'GET:events' => [
            'controller' => 'events.php',
            'action'     => 'handleListEvents',
            'audit'      => 'List events',
        ],

        'POST:events' => [
            'controller' => 'events.php',
            'action'     => 'handleCreateEvent',
            'audit'      => 'Create event',
        ],

        // --- Voucher Upload -----------------------------------------------
        'POST:upload/voucher' => [
            'controller' => 'upload_voucher.php',
            'action'     => 'handleVoucherUpload',
            'audit'      => 'Payment voucher upload',
        ],

        // --- Poster Upload ------------------------------------------------
        'POST:upload/poster' => [
            'controller' => 'upload_poster.php',
            'action'     => 'handlePosterUpload',
            'audit'      => 'Event poster upload',
        ],

        // --- QR Upload ----------------------------------------------------
        'POST:upload/qr' => [
            'controller' => 'upload_qr.php',
            'action'     => 'handleQrUpload',
            'audit'      => 'Event QR upload',
        ],

        // --- Registration Dynamic File Upload -----------------------------
        'POST:upload/registration-file' => [
            'controller' => 'upload_registration_file.php',
            'action'     => 'handleRegistrationFileUpload',
            'audit'      => 'Registration file upload',
        ],

        // --- Registration Management (Admin/Member) -----------------------
        'GET:registrations' => [
            'controller' => 'registrations.php',
            'action'     => 'handleListRegistrations',
            'audit'      => 'List registrations',
        ],

        'PATCH:registrations/approve' => [
            'controller' => 'registrations.php',
            'action'     => 'handleApproveRegistration',
            'audit'      => 'Approve registration',
        ],

        'PATCH:registrations/reject' => [
            'controller' => 'registrations.php',
            'action'     => 'handleRejectRegistration',
            'audit'      => 'Reject registration',
        ],

        // --- Seating & Allocation Engine ----------------------------------
        'GET:seating/grid' => [
            'controller' => 'seating_engine.php',
            'action'     => 'handleGetGrid',
            'audit'      => 'Fetch seating grid',
        ],

        'POST:seating/grid' => [
            'controller' => 'seating_engine.php',
            'action'     => 'handleUpdateGrid',
            'audit'      => 'Update seating grid layout',
        ],

        'POST:allocation/run' => [
            'controller' => 'seating_engine.php',
            'action'     => 'handleRunAllocation',
            'audit'      => 'Execute allocation engine',
        ],

        'POST:allocation/reroll' => [
            'controller' => 'seating_engine.php',
            'action'     => 'handleSingleReRoll',
            'audit'      => 'Single participant re-roll',
        ],

        'POST:allocation/reveal' => [
            'controller' => 'seating_engine.php',
            'action'     => 'handleReveal',
            'audit'      => 'Reveal allocation for participant',
        ],

        // --- Check-In ----------------------------------------------------
        'POST:checkin' => [
            'controller' => 'checkin.php',
            'action'     => 'handleCheckIn',
            'audit'      => 'Participant check-in',
        ],

        // --- User Invitations (Phase 3) ----------------------------------
        'POST:users/invite' => [
            'controller' => 'users.php',
            'action'     => 'handleInviteUser',
            'audit'      => 'Invite new teammates',
        ],

        'GET:users' => [
            'controller' => 'users.php',
            'action'     => 'handleListUsers',
            'audit'      => 'List all users',
        ],

        // --- Audit Ledger (Admin) ----------------------------------------
        'GET:admin/audit-log' => [
            'controller' => 'audit_logger.php',
            'action'     => 'handleGetAuditLog',
            'audit'      => 'View audit ledger',
        ],

        // --- Presentation Engine (fetch reveal data) ---------------------
        'GET:presentation/reveal-data' => [
            'controller' => 'presentation.php',
            'action'     => 'handleGetRevealData',
            'audit'      => 'Fetch presentation reveal data',
        ],

        // --- Certificate Coordinate Storage (Admin) ----------------------
        'POST:certificates/template' => [
            'controller' => 'certificates.php',
            'action'     => 'handleSaveTemplate',
            'audit'      => 'Save certificate template coordinates',
        ],

        'GET:certificates/template' => [
            'controller' => 'certificates.php',
            'action'     => 'handleGetTemplate',
            'audit'      => 'Fetch certificate template',
        ],

        'GET:certificates/verify' => [
            'controller' => 'certificates.php',
            'action'     => 'handleVerifyCertificate',
            'audit'      => 'Certificate QR verification',
        ],

        // --- Attendance & Check-In (Phase 2) -----------------------------
        'POST:attendance/log' => [
            'controller' => 'attendance.php',
            'action'     => 'handleLogAttendance',
            'audit'      => 'Log high-throughput session attendance',
        ],

        'GET:attendance/export' => [
            'controller' => 'attendance.php',
            'action'     => 'handleExportAttendance',
            'audit'      => 'Export event attendance CSV',
        ],

        // --- Custom Feedback & Assessments (Phase 2) ---------------------
        'POST:feedback/submit' => [
            'controller' => 'feedback.php',
            'action'     => 'handleSubmitFeedback',
            'audit'      => 'Submit participant assessment feedback',
        ],

        // --- Sub-Events & Workshops -----------------------------------------
        'GET:sub-events' => [
            'controller' => 'sub_events.php',
            'action'     => 'handleListSubEvents',
            'audit'      => 'List sub-events/workshops',
        ],
        'POST:sub-events' => [
            'controller' => 'sub_events.php',
            'action'     => 'handleCreateSubEvent',
            'audit'      => 'Create sub-event',
        ],

        // --- Competition & Interview Panels --------------------------------
        'GET:panels' => [
            'controller' => 'panels.php',
            'action'     => 'handleListPanels',
            'audit'      => 'List panels',
        ],
        'POST:panels' => [
            'controller' => 'panels.php',
            'action'     => 'handleCreatePanel',
            'audit'      => 'Create panel',
        ],
        'GET:panels/topics' => [
            'controller' => 'panels.php',
            'action'     => 'handleListTopics',
            'audit'      => 'List panel topics',
        ],
        'POST:panels/topics' => [
            'controller' => 'panels.php',
            'action'     => 'handleCreateTopic',
            'audit'      => 'Create panel topic',
        ],

        // --- Interviews & Recruitment -------------------------------------
        'GET:interviews/candidates' => [
            'controller' => 'interviews.php',
            'action'     => 'handleListCandidates',
            'audit'      => 'List recruitment candidates',
        ],
        'GET:interviews/slots' => [
            'controller' => 'interviews.php',
            'action'     => 'handleListSlots',
            'audit'      => 'List interview slots',
        ],
        'POST:interviews/slots' => [
            'controller' => 'interviews.php',
            'action'     => 'handleCreateSlot',
            'audit'      => 'Create interview slot',
        ],
        'GET:interviews/evaluations' => [
            'controller' => 'interviews.php',
            'action'     => 'handleListEvaluations',
            'audit'      => 'List interview evaluations',
        ],
        'POST:interviews/evaluations' => [
            'controller' => 'interviews.php',
            'action'     => 'handleCreateEvaluation',
            'audit'      => 'Create interview evaluation',
        ],
    ];

    // ------------------------------------------------------------------
    // Dynamic route patterns (regex-based).
    // Captures are injected into $ctx['params'].
    // ------------------------------------------------------------------
    $dynamicRoutes = [
        // GET /events/{id}
        [
            'pattern'    => '#^GET:events/(\d+)$#',
            'controller' => 'events.php',
            'action'     => 'handleGetEvent',
            'audit'      => 'Fetch single event',
            'paramNames' => ['event_id'],
        ],
        // PUT /events/{id}
        [
            'pattern'    => '#^PUT:events/(\d+)$#',
            'controller' => 'events.php',
            'action'     => 'handleUpdateEvent',
            'audit'      => 'Update event',
            'paramNames' => ['event_id'],
        ],
        // DELETE /events/{id}
        [
            'pattern'    => '#^DELETE:events/(\d+)$#',
            'controller' => 'events.php',
            'action'     => 'handleDeleteEvent',
            'audit'      => 'Delete event',
            'paramNames' => ['event_id'],
        ],
        // GET /allocations/event/{id}
        [
            'pattern'    => '#^GET:allocations/event/(\d+)$#',
            'controller' => 'seating_engine.php',
            'action'     => 'handleGetAllocationsForEvent',
            'audit'      => 'Fetch allocations for event',
            'paramNames' => ['event_id'],
        ],
        // GET /users/{id}
        [
            'pattern'    => '#^GET:users/(\d+)$#',
            'controller' => 'users.php',
            'action'     => 'handleGetUser',
            'audit'      => 'Fetch user profile',
            'paramNames' => ['user_id'],
        ],
        // PATCH /users/{id}/role
        [
            'pattern'    => '#^PATCH:users/(\d+)/role$#',
            'controller' => 'users.php',
            'action'     => 'handleUpdateUserRole',
            'audit'      => 'Update user role',
            'paramNames' => ['user_id'],
        ],
        // DELETE /users/{id}
        [
            'pattern'    => '#^DELETE:users/(\d+)$#',
            'controller' => 'users.php',
            'action'     => 'handleDeleteUser',
            'audit'      => 'Delete user account',
            'paramNames' => ['user_id'],
        ],
        // PUT /users/{id}
        [
            'pattern'    => '#^PUT:users/(\d+)$#',
            'controller' => 'users.php',
            'action'     => 'handleUpdateUser',
            'audit'      => 'Update user details',
            'paramNames' => ['user_id'],
        ],
        // POST /events/{id}/register — Event-scoped participant signup (Phase 1)
        [
            'pattern'    => '#^POST:events/(\d+)/register$#',
            'controller' => 'public_register.php',
            'action'     => 'handleEventSignup',
            'audit'      => 'Event participant registration',
            'paramNames' => ['event_id'],
        ],
        // POST /events/{id}/register/initiate — Guest event registration OTP initiation
        [
            'pattern'    => '#^POST:events/(\d+)/register/initiate$#',
            'controller' => 'public_register.php',
            'action'     => 'handleEventSignupInitiate',
            'audit'      => 'Guest event registration OTP initiation',
            'paramNames' => ['event_id'],
        ],
        // POST /events/{id}/register/verify — Guest event registration OTP verification
        [
            'pattern'    => '#^POST:events/(\d+)/register/verify$#',
            'controller' => 'public_register.php',
            'action'     => 'handleEventSignupVerify',
            'audit'      => 'Guest event registration OTP verification',
            'paramNames' => ['event_id'],
        ],
        // GET /attendance/export/{id} — Dynamic CSV export path (Phase 2)
        [
            'pattern'    => '#^GET:attendance/export/(\d+)$#',
            'controller' => 'attendance.php',
            'action'     => 'handleExportAttendance',
            'audit'      => 'Export event attendance CSV',
            'paramNames' => ['event_id'],
        ],
        // GET /admin/events/{id}/feedback — Dynamic feedback details path
        [
            'pattern'    => '#^GET:admin/events/(\d+)/feedback$#',
            'controller' => 'feedback.php',
            'action'     => 'handleGetEventFeedback',
            'audit'      => 'Fetch event feedback submissions',
            'paramNames' => ['event_id'],
        ],
        // PUT /sub-events/{id}
        [
            'pattern'    => '#^PUT:sub-events/(\d+)$#',
            'controller' => 'sub_events.php',
            'action'     => 'handleUpdateSubEvent',
            'audit'      => 'Update sub-event',
            'paramNames' => ['sub_event_id'],
        ],
        // DELETE /sub-events/{id}
        [
            'pattern'    => '#^DELETE:sub-events/(\d+)$#',
            'controller' => 'sub_events.php',
            'action'     => 'handleDeleteSubEvent',
            'audit'      => 'Delete sub-event',
            'paramNames' => ['sub_event_id'],
        ],
        // POST /panels/{id}/allocate
        [
            'pattern'    => '#^POST:panels/(\d+)/allocate$#',
            'controller' => 'panels.php',
            'action'     => 'handleAllocateCandidates',
            'audit'      => 'Allocate candidates to panel',
            'paramNames' => ['panel_id'],
        ],
        // POST /panels/{id}/judges
        [
            'pattern'    => '#^POST:panels/(\d+)/judges$#',
            'controller' => 'panels.php',
            'action'     => 'handleAssignJudges',
            'audit'      => 'Assign judge to panel',
            'paramNames' => ['panel_id'],
        ],
        // POST /interviews/slots/{id}/book
        [
            'pattern'    => '#^POST:interviews/slots/(\d+)/book$#',
            'controller' => 'interviews.php',
            'action'     => 'handleBookSlot',
            'audit'      => 'Book interview slot',
            'paramNames' => ['slot_id'],
        ],
        // PUT /interviews/candidates/{id}/stage
        [
            'pattern'    => '#^PUT:interviews/candidates/(\d+)/stage$#',
            'controller' => 'interviews.php',
            'action'     => 'handleUpdateCandidateStage',
            'audit'      => 'Update candidate recruitment stage',
            'paramNames' => ['candidate_user_id'],
        ],
    ];

    // ------------------------------------------------------------------
    // Lookup key for static routes
    // ------------------------------------------------------------------
    $routeKey = "{$method}:{$route}";

    // Try static routes first.
    if (isset($staticRoutes[$routeKey])) {
        $match = $staticRoutes[$routeKey];

        // Write audit log before dispatching.
        writeAuditLog(null, $match['audit'] ?? $routeKey, "/api/{$route}", $ip);

        // Inline handler (e.g., health check).
        if (isset($match['handler']) && is_callable($match['handler'])) {
            ($match['handler'])($ctx);
            // If the handler didn't call jsonResponse / exit, fall through.
            jsonResponse(204, []);
        }

        // File-based controller dispatch.
        $controllerFile = __DIR__ . '/controllers/' . $match['controller'];
        if (!file_exists($controllerFile)) {
            jsonResponse(501, [
                'success' => false,
                'error'   => "Controller '{$match['controller']}' is not implemented yet.",
            ]);
        }

        require_once $controllerFile;
        $fn = $match['action'];

        if (!function_exists($fn)) {
            jsonResponse(501, [
                'success' => false,
                'error'   => "Action '{$fn}' is not implemented in '{$match['controller']}'.",
            ]);
        }

        $fn($ctx);

        // Safety net — if the controller forgot to call jsonResponse().
        jsonResponse(204, []);
    }

    // Try dynamic routes.
    foreach ($dynamicRoutes as $dynRoute) {
        if (preg_match($dynRoute['pattern'], $routeKey, $matches)) {
            // Inject captured parameters into context.
            $ctx['params'] = [];
            foreach ($dynRoute['paramNames'] as $i => $name) {
                $ctx['params'][$name] = $matches[$i + 1];
            }

            writeAuditLog(null, $dynRoute['audit'] ?? $routeKey, "/api/{$route}", $ip);

            $controllerFile = __DIR__ . '/controllers/' . $dynRoute['controller'];
            if (!file_exists($controllerFile)) {
                jsonResponse(501, [
                    'success' => false,
                    'error'   => "Controller '{$dynRoute['controller']}' is not implemented yet.",
                ]);
            }

            require_once $controllerFile;
            $fn = $dynRoute['action'];

            if (!function_exists($fn)) {
                jsonResponse(501, [
                    'success' => false,
                    'error'   => "Action '{$fn}' is not implemented in '{$dynRoute['controller']}'.",
                ]);
            }

            $fn($ctx);
            jsonResponse(204, []);
        }
    }

    // ------------------------------------------------------------------
    // No route matched — 404.
    // ------------------------------------------------------------------
    writeAuditLog(null, "404 — Route not found: {$method} /api/{$route}", "/api/{$route}", $ip);

    jsonResponse(404, [
        'success' => false,
        'error'   => 'Endpoint not found.',
        'route'   => "/api/{$route}",
        'method'  => $method,
    ]);

} catch (\RuntimeException $e) {
    // Known application-level errors (e.g., DB connection failure).
    error_log('[BodhantraOS][Gateway] RuntimeException: ' . $e->getMessage());

    jsonResponse($e->getCode() ?: 500, [
        'success' => false,
        'error'   => $e->getMessage(),
    ]);
} catch (\Throwable $e) {
    // Unexpected / uncaught errors — log full details, return a safe message.
    error_log(sprintf(
        '[BodhantraOS][Gateway] Unhandled %s in %s:%d — %s',
        get_class($e),
        $e->getFile(),
        $e->getLine(),
        $e->getMessage()
    ));

    jsonResponse(500, [
        'success' => false,
        'error'   => 'An internal server error occurred. Please try again later.',
    ]);
}
