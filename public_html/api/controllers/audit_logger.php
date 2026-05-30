<?php
/**
 * ============================================================================
 * BODHANTRA EVENT OS — Audit Ledger Controller
 * ============================================================================
 *
 * Exposes the system activity history to the administrative dashboard:
 *   • GET /admin/audit-log  →  handleGetAuditLog()
 *
 * Strict RBAC: Admin ONLY.
 * Members and Participants are rejected with 403.
 *
 * @package BodhantraOS\Controllers
 */

declare(strict_types=1);

require_once __DIR__ . '/_middleware.php';


// ===========================================================================
// GET /admin/audit-log
// ===========================================================================

/**
 * Query the audit_ledger table with optional filters.
 *
 * Query params:
 *   ?actor_user_id=5           — filter by the performing user
 *   ?endpoint=/api/auth/login  — filter by the targeted API endpoint
 *   ?date_from=2026-05-01      — filter entries from this date onward
 *   ?date_to=2026-05-31        — filter entries up to this date
 *   ?search=login              — free-text search across action_description
 *   ?page=1&per_page=100       — pagination (max 500 per page)
 *
 * RBAC: Admin ONLY.
 */
function handleGetAuditLog(array $ctx): void
{
    // -----------------------------------------------------------------------
    // Strict Admin-only gate.  Members are explicitly rejected.
    // -----------------------------------------------------------------------
    $user = requireAuth($ctx, ['Admin']);

    $pdo = Database::connect();

    // -----------------------------------------------------------------------
    // Parse filter parameters from the query string.
    // -----------------------------------------------------------------------
    $actorFilter    = $ctx['query']['actor_user_id'] ?? null;
    $endpointFilter = $ctx['query']['endpoint']      ?? null;
    $dateFrom       = $ctx['query']['date_from']     ?? null;
    $dateTo         = $ctx['query']['date_to']       ?? null;
    $searchTerm     = $ctx['query']['search']        ?? null;
    $page           = max(1, (int)($ctx['query']['page']     ?? 1));
    $perPage        = max(1, min(500, (int)($ctx['query']['per_page'] ?? 100)));
    $offset         = ($page - 1) * $perPage;

    // -----------------------------------------------------------------------
    // Build WHERE clause dynamically — strict bound parameters throughout.
    // -----------------------------------------------------------------------
    $conditions = [];
    $params     = [];

    // Filter by actor user ID.
    if ($actorFilter !== null) {
        if ($actorFilter === 'null' || $actorFilter === 'anonymous') {
            $conditions[] = 'a.actor_user_id IS NULL';
        } else {
            $conditions[] = 'a.actor_user_id = :actor_id';
            $params[':actor_id'] = (int)$actorFilter;
        }
    }

    // Filter by targeted endpoint (exact or prefix match).
    if ($endpointFilter !== null && $endpointFilter !== '') {
        $conditions[] = 'a.targeted_endpoint LIKE :endpoint';
        // Allow prefix matching (e.g., /api/auth matches /api/auth/login).
        $params[':endpoint'] = $endpointFilter . '%';
    }

    // Filter by date range.
    if ($dateFrom !== null && preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateFrom)) {
        $conditions[] = 'a.server_timestamp >= :date_from';
        $params[':date_from'] = $dateFrom . ' 00:00:00';
    }

    if ($dateTo !== null && preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateTo)) {
        $conditions[] = 'a.server_timestamp <= :date_to';
        $params[':date_to'] = $dateTo . ' 23:59:59';
    }

    // Free-text search across action description.
    if ($searchTerm !== null && $searchTerm !== '') {
        $conditions[] = 'a.action_description LIKE :search';
        $params[':search'] = '%' . $searchTerm . '%';
    }

    $where = !empty($conditions) ? 'WHERE ' . implode(' AND ', $conditions) : '';

    // -----------------------------------------------------------------------
    // Count total matching entries for pagination metadata.
    // -----------------------------------------------------------------------
    $countSql  = "SELECT COUNT(*) AS total FROM audit_ledger a {$where}";
    $countStmt = $pdo->prepare($countSql);
    $countStmt->execute($params);
    $total = (int)$countStmt->fetch()['total'];

    // -----------------------------------------------------------------------
    // Fetch the current page, joined with users to resolve actor names.
    // -----------------------------------------------------------------------
    $dataSql = "SELECT a.id,
                       a.actor_user_id,
                       u.name   AS actor_name,
                       u.email  AS actor_email,
                       u.role_tier AS actor_tier,
                       a.action_description,
                       a.targeted_endpoint,
                       a.client_ip,
                       a.server_timestamp
                FROM audit_ledger a
                LEFT JOIN users u ON u.id = a.actor_user_id
                {$where}
                ORDER BY a.server_timestamp DESC
                LIMIT :lim OFFSET :off";

    $dataStmt = $pdo->prepare($dataSql);
    foreach ($params as $k => $v) {
        $dataStmt->bindValue($k, $v);
    }
    $dataStmt->bindValue(':lim', $perPage, \PDO::PARAM_INT);
    $dataStmt->bindValue(':off', $offset,  \PDO::PARAM_INT);
    $dataStmt->execute();
    $entries = $dataStmt->fetchAll();

    // -----------------------------------------------------------------------
    // Format for terminal-compatible, clean JSON output.
    // -----------------------------------------------------------------------
    jsonResponse(200, [
        'success' => true,
        'audit_log' => $entries,
        'filters_applied' => [
            'actor_user_id' => $actorFilter,
            'endpoint'      => $endpointFilter,
            'date_from'     => $dateFrom,
            'date_to'       => $dateTo,
            'search'        => $searchTerm,
        ],
        'pagination' => [
            'page'     => $page,
            'per_page' => $perPage,
            'total'    => $total,
            'pages'    => (int)ceil($total / max(1, $perPage)),
        ],
    ]);
}
