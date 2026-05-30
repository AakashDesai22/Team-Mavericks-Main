<?php
/**
 * ============================================================================
 * BODHANTRA EVENT OS — Registration Verification Workflow Controller
 * ============================================================================
 *
 * Manages the state-transition lifecycle of participant registrations:
 *   • GET   /registrations           →  handleListRegistrations()
 *   • PATCH /registrations/approve   →  handleApproveRegistration()
 *   • PATCH /registrations/reject    →  handleRejectRegistration()
 *
 * State machine:
 *   Pending_Verification ──approve──► Approved
 *   Pending_Verification ──reject───► Rejected
 *   Rejected ─────────────approve──► Approved   (admin override)
 *
 * On approval, a placeholder allocation row is automatically inserted
 * into the allocations table so the participant is pre-staged for the
 * matching pipeline.
 *
 * RBAC: Admin + Member for all endpoints.
 *
 * @package BodhantraOS\Controllers
 */

declare(strict_types=1);

require_once __DIR__ . '/_middleware.php';


// ===========================================================================
// GET /registrations
// ===========================================================================

/**
 * List registrations with relational joins for display context.
 *
 * Query params:
 *   ?status=Pending_Verification   — filter by registration status
 *   ?event_id=3                    — filter by specific event
 *   ?page=1&per_page=50            — pagination
 *
 * RBAC: Admin, Member only.
 */
function handleListRegistrations(array $ctx): void
{
    $user = requireAuth($ctx, ['Admin', 'Member']);

    $pdo = Database::connect();

    // -----------------------------------------------------------------------
    // Parse query filters.
    // -----------------------------------------------------------------------
    $statusFilter  = $ctx['query']['status']   ?? null;
    $eventIdFilter = $ctx['query']['event_id'] ?? null;
    $page          = max(1, (int)($ctx['query']['page']     ?? 1));
    $perPage       = max(1, min(200, (int)($ctx['query']['per_page'] ?? 50)));
    $offset        = ($page - 1) * $perPage;

    // -----------------------------------------------------------------------
    // Build WHERE clause dynamically — all conditions are bound.
    // -----------------------------------------------------------------------
    $conditions = [];
    $params     = [];

    $validStatuses = ['Pending_Verification', 'Approved', 'Rejected'];
    if ($statusFilter !== null && in_array($statusFilter, $validStatuses, true)) {
        $conditions[] = 'r.status = :status';
        $params[':status'] = $statusFilter;
    }

    if ($eventIdFilter !== null && (int)$eventIdFilter > 0) {
        $conditions[] = 'r.event_id = :evt_filter';
        $params[':evt_filter'] = (int)$eventIdFilter;
    }

    $where = !empty($conditions) ? 'WHERE ' . implode(' AND ', $conditions) : '';

    // -----------------------------------------------------------------------
    // Count total for pagination.
    // -----------------------------------------------------------------------
    $countStmt = $pdo->prepare(
        "SELECT COUNT(*) AS total
         FROM registrations r
         {$where}"
    );
    $countStmt->execute($params);
    $total = (int)$countStmt->fetch()['total'];

    // -----------------------------------------------------------------------
    // Fetch page with JOINs to users and events.
    // -----------------------------------------------------------------------
    $sql = "SELECT r.id AS registration_id,
                   r.user_id,
                   u.name AS participant_name,
                   u.email AS participant_email,
                   u.phone AS participant_phone,
                   u.branch AS participant_branch,
                   u.academic_year,
                   u.unique_registration_id AS tracking_code,
                   r.event_id,
                   e.title AS event_title,
                   e.event_date,
                   r.status,
                   r.voucher_path,
                   r.checked_in_state,
                   r.checked_in_at,
                   r.rejection_reason,
                   r.created_at AS registered_at,
                   r.updated_at
            FROM registrations r
            INNER JOIN users u  ON u.id = r.user_id
            INNER JOIN events e ON e.id = r.event_id
            {$where}
            ORDER BY
                CASE r.status
                    WHEN 'Pending_Verification' THEN 0
                    WHEN 'Rejected' THEN 1
                    WHEN 'Approved' THEN 2
                END ASC,
                r.created_at DESC
            LIMIT :lim OFFSET :off";

    $dataStmt = $pdo->prepare($sql);
    foreach ($params as $k => $v) {
        $dataStmt->bindValue($k, $v);
    }
    $dataStmt->bindValue(':lim', $perPage, \PDO::PARAM_INT);
    $dataStmt->bindValue(':off', $offset,  \PDO::PARAM_INT);
    $dataStmt->execute();
    $registrations = $dataStmt->fetchAll();

    // -----------------------------------------------------------------------
    // Aggregate summary for the toolbar.
    // -----------------------------------------------------------------------
    $summSql = "SELECT
                    COUNT(*)                                                          AS total_all,
                    SUM(CASE WHEN r.status = 'Pending_Verification' THEN 1 ELSE 0 END) AS pending_count,
                    SUM(CASE WHEN r.status = 'Approved'             THEN 1 ELSE 0 END) AS approved_count,
                    SUM(CASE WHEN r.status = 'Rejected'             THEN 1 ELSE 0 END) AS rejected_count
                FROM registrations r";
    // Apply event filter to summary too if present.
    if ($eventIdFilter !== null && (int)$eventIdFilter > 0) {
        $summSql .= ' WHERE r.event_id = :evt_summ';
        $summStmt = $pdo->prepare($summSql);
        $summStmt->execute([':evt_summ' => (int)$eventIdFilter]);
    } else {
        $summStmt = $pdo->prepare($summSql);
        $summStmt->execute();
    }
    $summary = $summStmt->fetch();

    jsonResponse(200, [
        'success'       => true,
        'registrations' => $registrations,
        'summary'       => $summary,
        'pagination'    => [
            'page'     => $page,
            'per_page' => $perPage,
            'total'    => $total,
            'pages'    => (int)ceil($total / max(1, $perPage)),
        ],
    ]);
}


// ===========================================================================
// PATCH /registrations/approve
// ===========================================================================

/**
 * Transition a registration from Pending/Rejected → Approved.
 *
 * On approval, a placeholder allocation row is inserted so the participant
 * is pre-staged for the seating_engine allocation pipeline.
 *
 * Request body:
 *   { "registration_id": 42 }
 *
 * RBAC: Admin, Member only.
 */
function handleApproveRegistration(array $ctx): void
{
    $user = requireAuth($ctx, ['Admin', 'Member']);

    $regId = (int)($ctx['body']['registration_id'] ?? 0);
    if ($regId <= 0) {
        jsonResponse(400, [
            'success' => false,
            'error'   => '"registration_id" is required and must be a positive integer.',
        ]);
    }

    $pdo = Database::connect();

    // -----------------------------------------------------------------------
    // 1. Fetch the registration with its current state.
    // -----------------------------------------------------------------------
    $stmt = $pdo->prepare(
        'SELECT r.id, r.user_id, r.event_id, r.status,
                u.name AS participant_name, u.email AS participant_email,
                e.title AS event_title
         FROM registrations r
         INNER JOIN users u  ON u.id = r.user_id
         INNER JOIN events e ON e.id = r.event_id
         WHERE r.id = :rid
         LIMIT 1'
    );
    $stmt->execute([':rid' => $regId]);
    $reg = $stmt->fetch();

    if (!$reg) {
        jsonResponse(404, [
            'success' => false,
            'error'   => 'Registration not found.',
        ]);
    }

    // Already approved — idempotent success.
    if ($reg['status'] === 'Approved') {
        jsonResponse(200, [
            'success' => true,
            'message' => 'Registration is already approved.',
            'registration_id' => $regId,
        ]);
    }

    // -----------------------------------------------------------------------
    // 2. Begin transaction — approval + allocation placeholder must be atomic.
    // -----------------------------------------------------------------------
    $pdo->beginTransaction();

    try {
        // Update registration status.
        $update = $pdo->prepare(
            'UPDATE registrations
             SET status = :status, rejection_reason = NULL, updated_at = NOW()
             WHERE id = :rid'
        );
        $update->execute([
            ':status' => 'Approved',
            ':rid'    => $regId,
        ]);

        // -----------------------------------------------------------------
        // 3. Insert a placeholder allocation row for this user+event.
        //    The actual team, role, and seat coordinates will be filled
        //    by the allocation engine later.  We use empty placeholder
        //    strings that the engine will overwrite.
        //
        //    If an allocation already exists (e.g., from a previous
        //    approve→reject→re-approve cycle), skip the insert.
        // -----------------------------------------------------------------
        $existingAlloc = $pdo->prepare(
            'SELECT id FROM allocations WHERE user_id = :uid AND event_id = :eid LIMIT 1'
        );
        $existingAlloc->execute([
            ':uid' => $reg['user_id'],
            ':eid' => $reg['event_id'],
        ]);

        if (!$existingAlloc->fetch()) {
            $insertAlloc = $pdo->prepare(
                "INSERT INTO allocations
                    (user_id, event_id, team_name, assigned_cohort_role,
                     row_coordinate, column_coordinate, reveal_state, allocated_at)
                 VALUES
                    (:uid, :eid, '__UNASSIGNED__', '__PENDING__',
                     '0', '0', 'Unrevealed', NOW())"
            );
            $insertAlloc->execute([
                ':uid' => $reg['user_id'],
                ':eid' => $reg['event_id'],
            ]);
        }

        $pdo->commit();
    } catch (\Throwable $e) {
        $pdo->rollBack();
        error_log('[BodhantraOS][Registrations] Approve failed: ' . $e->getMessage());
        jsonResponse(500, [
            'success' => false,
            'error'   => 'Failed to approve registration. Please try again.',
        ]);
    }

    // -----------------------------------------------------------------------
    // 4. Audit trail.
    // -----------------------------------------------------------------------
    writeAuditLog(
        (int)$user['id'],
        "Approved registration #{$regId} for {$reg['participant_email']} → {$reg['event_title']}",
        '/api/registrations/approve',
        $ctx['ip']
    );

    jsonResponse(200, [
        'success'         => true,
        'message'         => "Registration approved for {$reg['participant_name']}.",
        'registration_id' => $regId,
        'user_id'         => $reg['user_id'],
        'event_id'        => $reg['event_id'],
        'new_status'      => 'Approved',
    ]);
}


// ===========================================================================
// PATCH /registrations/reject
// ===========================================================================

/**
 * Transition a registration from Pending → Rejected.
 *
 * Request body:
 *   {
 *     "registration_id": 42,
 *     "reason": "Voucher image is unreadable."   // optional
 *   }
 *
 * RBAC: Admin, Member only.
 */
function handleRejectRegistration(array $ctx): void
{
    $user = requireAuth($ctx, ['Admin', 'Member']);

    $regId  = (int)($ctx['body']['registration_id'] ?? 0);
    $reason = trim($ctx['body']['reason'] ?? '');

    if ($regId <= 0) {
        jsonResponse(400, [
            'success' => false,
            'error'   => '"registration_id" is required and must be a positive integer.',
        ]);
    }

    $pdo = Database::connect();

    // -----------------------------------------------------------------------
    // 1. Fetch the registration.
    // -----------------------------------------------------------------------
    $stmt = $pdo->prepare(
        'SELECT r.id, r.user_id, r.event_id, r.status,
                u.name AS participant_name, u.email AS participant_email,
                e.title AS event_title
         FROM registrations r
         INNER JOIN users u  ON u.id = r.user_id
         INNER JOIN events e ON e.id = r.event_id
         WHERE r.id = :rid
         LIMIT 1'
    );
    $stmt->execute([':rid' => $regId]);
    $reg = $stmt->fetch();

    if (!$reg) {
        jsonResponse(404, [
            'success' => false,
            'error'   => 'Registration not found.',
        ]);
    }

    // Already rejected — idempotent.
    if ($reg['status'] === 'Rejected') {
        jsonResponse(200, [
            'success' => true,
            'message' => 'Registration is already rejected.',
            'registration_id' => $regId,
        ]);
    }

    // -----------------------------------------------------------------------
    // 2. If transitioning FROM Approved → Rejected, also remove the
    //    placeholder allocation to keep data clean.
    // -----------------------------------------------------------------------
    $pdo->beginTransaction();

    try {
        $update = $pdo->prepare(
            'UPDATE registrations
             SET status = :status,
                 rejection_reason = :reason,
                 updated_at = NOW()
             WHERE id = :rid'
        );
        $update->execute([
            ':status' => 'Rejected',
            ':reason' => $reason !== '' ? mb_substr($reason, 0, 500) : null,
            ':rid'    => $regId,
        ]);

        // Clean up any allocation placeholder if reverting from Approved.
        if ($reg['status'] === 'Approved') {
            $delAlloc = $pdo->prepare(
                'DELETE FROM allocations WHERE user_id = :uid AND event_id = :eid'
            );
            $delAlloc->execute([
                ':uid' => $reg['user_id'],
                ':eid' => $reg['event_id'],
            ]);
        }

        $pdo->commit();
    } catch (\Throwable $e) {
        $pdo->rollBack();
        error_log('[BodhantraOS][Registrations] Reject failed: ' . $e->getMessage());
        jsonResponse(500, [
            'success' => false,
            'error'   => 'Failed to reject registration. Please try again.',
        ]);
    }

    writeAuditLog(
        (int)$user['id'],
        "Rejected registration #{$regId} for {$reg['participant_email']} → {$reg['event_title']}" .
            ($reason !== '' ? " (reason: {$reason})" : ''),
        '/api/registrations/reject',
        $ctx['ip']
    );

    jsonResponse(200, [
        'success'         => true,
        'message'         => "Registration rejected for {$reg['participant_name']}.",
        'registration_id' => $regId,
        'new_status'      => 'Rejected',
        'reason'          => $reason !== '' ? $reason : null,
    ]);
}
