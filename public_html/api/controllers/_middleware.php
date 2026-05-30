<?php
/**
 * ============================================================================
 * BODHANTRA EVENT OS — Shared Authentication & RBAC Middleware
 * ============================================================================
 *
 * This file provides two reusable functions that any controller can call to
 * authenticate the current request and enforce role-tier gates:
 *
 *   resolveSession($token)       — Returns the user row if the token is valid.
 *   requireAuth($ctx, $tiers)    — Gate: resolves + enforces tier, or exits.
 *
 * Include via:  require_once __DIR__ . '/_middleware.php';
 *
 * @package BodhantraOS
 */

declare(strict_types=1);

/**
 * Resolve a bearer token into an authenticated user record.
 *
 * Flow:
 *   1. Hash the raw token with SHA-256 (tokens are stored hashed).
 *   2. Look up the hash in auth_sessions, joined with users.
 *   3. Verify the session has not expired.
 *   4. Return the full user row, or null if invalid.
 *
 * @param  string|null $rawToken  The raw bearer token from the Authorization header.
 * @return array|null             The user row (assoc) on success, null on failure.
 */
function resolveSession(?string $rawToken): ?array
{
    if ($rawToken === null || $rawToken === '') {
        return null;
    }

    $tokenHash = hash('sha256', $rawToken);
    $pdo       = Database::connect();

    $stmt = $pdo->prepare(
        'SELECT u.id, u.name, u.email, u.phone, u.branch, u.academic_year,
                u.unique_registration_id, u.role_tier, u.avatar_path,
                u.is_active, u.created_at,
                s.expires_at AS session_expires_at
         FROM auth_sessions s
         INNER JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = :token_hash
         LIMIT 1'
    );
    $stmt->execute([':token_hash' => $tokenHash]);
    $row = $stmt->fetch();

    if (!$row) {
        return null;
    }

    // -----------------------------------------------------------------------
    // Expiry check — compare against current server time.
    // -----------------------------------------------------------------------
    $expiresAt = strtotime($row['session_expires_at']);
    if ($expiresAt === false || $expiresAt < time()) {
        // Session expired — clean it up proactively.
        $del = $pdo->prepare('DELETE FROM auth_sessions WHERE token_hash = :hash');
        $del->execute([':hash' => $tokenHash]);
        return null;
    }

    // -----------------------------------------------------------------------
    // Account active check — disabled accounts cannot maintain sessions.
    // -----------------------------------------------------------------------
    if ((int)$row['is_active'] !== 1) {
        return null;
    }

    // Remove session metadata from the user array before returning.
    unset($row['session_expires_at']);

    return $row;
}

/**
 * Gate function: resolve the session AND enforce an RBAC tier whitelist.
 *
 * If the token is missing, invalid, expired, or the user's role_tier is not
 * in the $allowedTiers list, execution halts with a 401/403 JSON response.
 *
 * @param  array    $ctx           The gateway context array.
 * @param  string[] $allowedTiers  Tier strings that may pass (e.g., ['Admin','Member']).
 *                                 Pass an empty array to allow ANY authenticated user.
 * @return array                   The authenticated user row.
 */
function requireAuth(array $ctx, array $allowedTiers = []): array
{
    $user = resolveSession($ctx['token'] ?? null);

    if ($user === null) {
        jsonResponse(401, [
            'success' => false,
            'error'   => 'Authentication required. Please log in.',
        ]);
    }

    // If specific tiers are required, enforce the gate.
    if (!empty($allowedTiers) && !in_array($user['role_tier'], $allowedTiers, true)) {
        jsonResponse(403, [
            'success' => false,
            'error'   => 'Access denied. Insufficient permissions.',
            'required_tier' => $allowedTiers,
            'your_tier'     => $user['role_tier'],
        ]);
    }

    // Update the gateway audit log entry with the resolved actor ID.
    // This is best-effort; the initial audit entry was written with null actor.
    try {
        $pdo = Database::connect();
        $stmt = $pdo->prepare(
            'UPDATE audit_ledger
             SET actor_user_id = :uid
             WHERE targeted_endpoint = :ep
               AND client_ip = :ip
               AND actor_user_id IS NULL
             ORDER BY id DESC
             LIMIT 1'
        );
        $stmt->execute([
            ':uid' => $user['id'],
            ':ep'  => '/api/' . ($ctx['route'] ?? ''),
            ':ip'  => $ctx['ip'] ?? '',
        ]);
    } catch (\Throwable $e) {
        // Non-critical — swallow silently.
        error_log('[BodhantraOS][Middleware] Audit backfill failed: ' . $e->getMessage());
    }

    return $user;
}

/**
 * Strip sensitive fields from a user array before sending to the client.
 *
 * @param  array $user  Raw user row from the database.
 * @return array        Sanitized user array safe for JSON output.
 */
function sanitizeUserForResponse(array $user): array
{
    unset(
        $user['password_hash'],
        $user['is_active'],
        $user['session_expires_at']
    );
    return $user;
}
