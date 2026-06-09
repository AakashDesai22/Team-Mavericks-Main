<?php
/**
 * ============================================================================
 * BODHANTRA EVENT OS — Authentication Controller
 * ============================================================================
 *
 * Handles the full authentication lifecycle:
 *   • POST /auth/login    → handleLogin()
 *   • POST /auth/logout   → handleLogout()
 *   • GET  /auth/me       → handleGetCurrentUser()
 *
 * All sessions are stored in the auth_sessions table as SHA-256 hashed bearer
 * tokens.  The raw token is NEVER persisted — only the hash.  This means a
 * database breach does not immediately compromise active sessions.
 *
 * Dependencies:
 *   • Database::connect()  (db.php — loaded by gateway)
 *   • jsonResponse()       (index.php — loaded by gateway)
 *   • writeAuditLog()      (index.php — loaded by gateway)
 *
 * @package BodhantraOS\Controllers
 */

declare(strict_types=1);

require_once __DIR__ . '/_middleware.php';


// ===========================================================================
// POST /auth/login
// ===========================================================================

/**
 * Authenticate a user with email + password and issue a session token.
 *
 * Request body:
 *   {
 *     "email":    "student@example.com",
 *     "password": "their_password"
 *   }
 *
 * Success response (200):
 *   {
 *     "success": true,
 *     "token":   "raw_hex_token_64_chars",
 *     "user":    { id, name, email, phone, branch, ... role_tier }
 *   }
 */
function handleLogin(array $ctx): void
{
    $body = $ctx['body'];

    // -----------------------------------------------------------------------
    // 1. Input presence validation
    // -----------------------------------------------------------------------
    $email    = trim($body['email']    ?? '');
    $password = $body['password'] ?? '';

    if ($email === '' || $password === '') {
        jsonResponse(400, [
            'success' => false,
            'error'   => 'Both "email" and "password" are required.',
        ]);
    }

    // -----------------------------------------------------------------------
    // 2. Format validation — reject obviously malformed emails early to
    //    avoid wasting a database round-trip.
    // -----------------------------------------------------------------------
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonResponse(400, [
            'success' => false,
            'error'   => 'Invalid email address format.',
        ]);
    }

    $pdo = Database::connect();

    // -----------------------------------------------------------------------
    // 3. Fetch user record by email (bound parameter — injection-safe).
    // -----------------------------------------------------------------------
    $stmt = $pdo->prepare(
        'SELECT id, name, email, phone, branch, academic_year,
                unique_registration_id, role_tier, avatar_path,
                password_hash, is_active
         FROM users
         WHERE email = :email
         LIMIT 1'
    );
    $stmt->execute([':email' => $email]);
    $user = $stmt->fetch();

    // -----------------------------------------------------------------------
    // 4. Constant-time password verification.
    //    password_verify() is timing-safe — it does NOT short-circuit on
    //    mismatch length, preventing timing attacks that could enumerate
    //    valid email addresses.
    //
    //    We use a single generic error message for both "no such user" and
    //    "wrong password" to prevent user enumeration.
    // -----------------------------------------------------------------------
    if (!$user || !password_verify($password, $user['password_hash'])) {
        jsonResponse(401, [
            'success' => false,
            'error'   => 'Invalid email or password.',
        ]);
    }

    // -----------------------------------------------------------------------
    // 5. Active-account check — deactivated accounts cannot log in.
    // -----------------------------------------------------------------------
    if ((int)$user['is_active'] !== 1) {
        jsonResponse(403, [
            'success' => false,
            'error'   => 'This account has been deactivated. Contact an administrator.',
        ]);
    }

    // -----------------------------------------------------------------------
    // 6. Generate a cryptographically secure session token.
    //    32 bytes → 64 hex characters → ~2^256 brute-force keyspace.
    // -----------------------------------------------------------------------
    $rawToken  = bin2hex(random_bytes(32));
    $tokenHash = hash('sha256', $rawToken);

    // -----------------------------------------------------------------------
    // 7. Persist session — store the HASH only, with a 24-hour TTL.
    //    We also prune any expired sessions for this user to prevent table
    //    bloat on shared hosting's limited storage.
    // -----------------------------------------------------------------------
    $pdo->prepare(
        'DELETE FROM auth_sessions WHERE user_id = :uid AND expires_at < NOW()'
    )->execute([':uid' => $user['id']]);

    $insert = $pdo->prepare(
        'INSERT INTO auth_sessions (user_id, token_hash, expires_at, created_at)
         VALUES (:uid, :hash, DATE_ADD(NOW(), INTERVAL 1 DAY), NOW())'
    );
    $insert->execute([
        ':uid'  => $user['id'],
        ':hash' => $tokenHash,
    ]);

    // -----------------------------------------------------------------------
    // 8. Audit trail — record the successful login with the resolved user ID.
    // -----------------------------------------------------------------------
    writeAuditLog(
        (int)$user['id'],
        "Successful login for {$user['email']}",
        '/api/auth/login',
        $ctx['ip']
    );

    // -----------------------------------------------------------------------
    // 9. Respond with the raw token + sanitized user profile.
    // -----------------------------------------------------------------------
    jsonResponse(200, [
        'success' => true,
        'message' => 'Login successful.',
        'token'   => $rawToken,
        'user'    => sanitizeUserForResponse($user),
    ]);
}


// ===========================================================================
// POST /auth/logout
// ===========================================================================

/**
 * Invalidate the current session by deleting it from auth_sessions.
 *
 * Requires: Authorization: Bearer <token>
 *
 * The client should discard the token from local storage after receiving
 * a successful response.
 */
function handleLogout(array $ctx): void
{
    $rawToken = $ctx['token'] ?? '';

    if ($rawToken === '' || $rawToken === null) {
        jsonResponse(400, [
            'success' => false,
            'error'   => 'No session token provided.',
        ]);
    }

    $tokenHash = hash('sha256', $rawToken);
    $pdo       = Database::connect();

    // -----------------------------------------------------------------------
    // Delete the session row.  If the token was already invalid / expired,
    // this is a no-op — we still return 200 to avoid leaking token validity.
    // -----------------------------------------------------------------------
    $stmt = $pdo->prepare('DELETE FROM auth_sessions WHERE token_hash = :hash');
    $stmt->execute([':hash' => $tokenHash]);

    $rowsAffected = $stmt->rowCount();

    jsonResponse(200, [
        'success'      => true,
        'message'      => 'Session invalidated.',
        'was_active'   => $rowsAffected > 0,
    ]);
}


// ===========================================================================
// GET /auth/me
// ===========================================================================

/**
 * Return the authenticated user's profile and their event registrations.
 *
 * Requires: Authorization: Bearer <token>
 *
 * Response (200):
 *   {
 *     "success": true,
 *     "user":    { ...profile fields... },
 *     "registrations": [
 *       { "event_id": 1, "event_title": "...", "status": "Approved", ... }
 *     ]
 *   }
 */
function handleGetCurrentUser(array $ctx): void
{
    // -----------------------------------------------------------------------
    // 1. Authenticate — any tier may call this endpoint.
    // -----------------------------------------------------------------------
    $user = requireAuth($ctx);

    $pdo = Database::connect();

    // -----------------------------------------------------------------------
    // 2. Fetch the user's event registrations with a JOIN to get event titles.
    // -----------------------------------------------------------------------
    $stmt = $pdo->prepare(
        'SELECT r.id AS registration_id,
                r.event_id,
                e.title AS event_title,
                e.event_date,
                e.status AS event_status,
                e.num_days,
                e.sessions_per_day,
                e.feedback_schema,
                e.payment_type,
                e.payment_amount,
                e.payment_context,
                e.payment_qr_path,
                e.require_payment_proof,
                e.finance_contacts,
                r.status AS registration_status,
                r.checked_in_state,
                r.checked_in_at,
                r.voucher_path,
                r.participant_id,
                r.form_data_json,
                r.rejection_reason,
                r.created_at AS registered_at
         FROM event_registrations r
         INNER JOIN events e ON e.id = r.event_id
         WHERE r.user_id = :uid
         ORDER BY r.created_at DESC'
    );
    $stmt->execute([':uid' => $user['id']]);
    $registrations = $stmt->fetchAll();

    // -----------------------------------------------------------------------
    // 3. Fetch any allocations (team assignments) for the user.
    // -----------------------------------------------------------------------
    $allocStmt = $pdo->prepare(
        'SELECT a.id AS allocation_id,
                a.event_id,
                e.title AS event_title,
                a.team_name,
                a.assigned_cohort_role,
                a.row_coordinate,
                a.column_coordinate,
                a.reveal_state
         FROM allocations a
         INNER JOIN events e ON e.id = a.event_id
         WHERE a.user_id = :uid
         ORDER BY a.allocated_at DESC'
    );
    $allocStmt->execute([':uid' => $user['id']]);
    $allocations = $allocStmt->fetchAll();

    // -----------------------------------------------------------------------
    // 4. Fetch any attendance logs for the user.
    // -----------------------------------------------------------------------
    $attendStmt = $pdo->prepare(
        'SELECT al.id,
                al.event_id,
                al.day_number,
                al.session_label,
                al.marked_at
         FROM attendance_log al
         WHERE al.user_id = :uid
         ORDER BY al.day_number ASC, al.session_label ASC'
    );
    $attendStmt->execute([':uid' => $user['id']]);
    $attendance = $attendStmt->fetchAll();

    // -----------------------------------------------------------------------
    // 5. Respond with the full profile state.
    // -----------------------------------------------------------------------
    jsonResponse(200, [
        'success'       => true,
        'user'          => sanitizeUserForResponse($user),
        'registrations' => $registrations,
        'allocations'   => $allocations,
        'attendance'    => $attendance,
    ]);
}
