<?php
/**
 * ============================================================================
 * BODHANTRA EVENT OS — Check-In Controller
 * ============================================================================
 *
 * Handles live gate-entry validation at the physical venue:
 *   • POST /checkin  →  handleCheckIn()
 *
 * Flow:
 *   1. Accept a unique_registration_id (BODH2026-XXXXXX) or user_id.
 *   2. Resolve the participant via the identifier.
 *   3. Verify payment approval status is explicitly "Approved".
 *   4. Mark checked_in_state = 1 and record checked_in_at timestamp.
 *
 * RBAC: Admin + Member (door coordinators).
 *
 * @package BodhantraOS\Controllers
 */

declare(strict_types=1);

require_once __DIR__ . '/_middleware.php';


// ===========================================================================
// POST /checkin
// ===========================================================================

/**
 * Process a live check-in at the event entrance.
 *
 * Request body (one of the following identifiers):
 *   {
 *     "event_id":              3,
 *     "unique_registration_id": "BODH2026-X8R9TQ"   // ← preferred (QR scan)
 *   }
 *
 * OR:
 *   {
 *     "event_id":  3,
 *     "user_id":   42
 *   }
 *
 * RBAC: Admin, Member.
 */
function handleCheckIn(array $ctx): void
{
    // -----------------------------------------------------------------------
    // 1. RBAC — only Admin and Member (door staff) can process check-ins.
    // -----------------------------------------------------------------------
    $operator = requireAuth($ctx, ['Admin', 'Member']);

    $body = $ctx['body'];

    // -----------------------------------------------------------------------
    // 2. Extract identifiers.
    // -----------------------------------------------------------------------
    $eventId = (int)($body['event_id'] ?? 0);
    $regCode = trim($body['unique_registration_id'] ?? '');
    $userId  = (int)($body['user_id'] ?? 0);

    if ($eventId <= 0) {
        jsonResponse(400, [
            'success' => false,
            'error'   => '"event_id" is required.',
        ]);
    }

    if ($regCode === '' && $userId <= 0) {
        jsonResponse(400, [
            'success' => false,
            'error'   => 'Either "unique_registration_id" or "user_id" must be provided.',
        ]);
    }

    $pdo = Database::connect();

    // -----------------------------------------------------------------------
    // 3. Resolve the participant.
    //    Prefer unique_registration_id (QR code at the door) over user_id.
    // -----------------------------------------------------------------------
    if ($regCode !== '') {
        $userStmt = $pdo->prepare(
            'SELECT id, name, email, unique_registration_id, branch
             FROM users
             WHERE unique_registration_id = :code
             LIMIT 1'
        );
        $userStmt->execute([':code' => $regCode]);
    } else {
        $userStmt = $pdo->prepare(
            'SELECT id, name, email, unique_registration_id, branch
             FROM users
             WHERE id = :uid
             LIMIT 1'
        );
        $userStmt->execute([':uid' => $userId]);
    }

    $participant = $userStmt->fetch();

    if (!$participant) {
        jsonResponse(404, [
            'success' => false,
            'error'   => 'Participant not found. Check the registration code or user ID.',
        ]);
    }

    // -----------------------------------------------------------------------
    // 4. Fetch their registration record for this specific event.
    // -----------------------------------------------------------------------
    $regStmt = $pdo->prepare(
        'SELECT r.id AS registration_id, r.status, r.checked_in_state,
                r.checked_in_at, r.voucher_path,
                e.title AS event_title
         FROM registrations r
         INNER JOIN events e ON e.id = r.event_id
         WHERE r.user_id = :uid AND r.event_id = :eid
         LIMIT 1'
    );
    $regStmt->execute([
        ':uid' => $participant['id'],
        ':eid' => $eventId,
    ]);
    $registration = $regStmt->fetch();

    if (!$registration) {
        jsonResponse(404, [
            'success' => false,
            'error'   => "No registration found for {$participant['name']} at event #{$eventId}.",
        ]);
    }

    // -----------------------------------------------------------------------
    // 5. Validate payment status — MUST be explicitly "Approved".
    // -----------------------------------------------------------------------
    if ($registration['status'] === 'Pending_Verification') {
        jsonResponse(403, [
            'success' => false,
            'error'   => 'CHECK-IN BLOCKED: Payment voucher is still pending verification.',
            'participant' => [
                'name'              => $participant['name'],
                'registration_code' => $participant['unique_registration_id'],
                'status'            => $registration['status'],
            ],
            'action_required' => 'Ask the participant to contact the registration desk for voucher review.',
        ]);
    }

    if ($registration['status'] === 'Rejected') {
        jsonResponse(403, [
            'success' => false,
            'error'   => 'CHECK-IN BLOCKED: Payment voucher was rejected.',
            'participant' => [
                'name'              => $participant['name'],
                'registration_code' => $participant['unique_registration_id'],
                'status'            => $registration['status'],
            ],
            'action_required' => 'Direct the participant to the admin desk for dispute resolution.',
        ]);
    }

    // -----------------------------------------------------------------------
    // 6. Check for duplicate check-in (already checked in).
    // -----------------------------------------------------------------------
    if ((int)$registration['checked_in_state'] === 1) {
        jsonResponse(200, [
            'success' => true,
            'message' => "ALREADY CHECKED IN: {$participant['name']} was checked in at {$registration['checked_in_at']}.",
            'duplicate' => true,
            'participant' => [
                'name'              => $participant['name'],
                'email'             => $participant['email'],
                'registration_code' => $participant['unique_registration_id'],
                'branch'            => $participant['branch'],
                'checked_in_at'     => $registration['checked_in_at'],
            ],
        ]);
    }

    // -----------------------------------------------------------------------
    // 7. Execute check-in — mark the state and record the timestamp.
    // -----------------------------------------------------------------------
    $updateStmt = $pdo->prepare(
        'UPDATE registrations
         SET checked_in_state = 1,
             checked_in_at = NOW(),
             updated_at = NOW()
         WHERE id = :rid'
    );
    $updateStmt->execute([':rid' => $registration['registration_id']]);

    // -----------------------------------------------------------------------
    // 8. Fetch the participant's allocation data (team + seat) if revealed.
    // -----------------------------------------------------------------------
    $allocStmt = $pdo->prepare(
        'SELECT team_name, assigned_cohort_role, row_coordinate, column_coordinate, reveal_state
         FROM allocations
         WHERE user_id = :uid AND event_id = :eid
         LIMIT 1'
    );
    $allocStmt->execute([
        ':uid' => $participant['id'],
        ':eid' => $eventId,
    ]);
    $allocation = $allocStmt->fetch();

    // Only show allocation details if the reveal state is 'Revealed'.
    $allocationInfo = null;
    if ($allocation && $allocation['reveal_state'] === 'Revealed') {
        $allocationInfo = [
            'team_name'      => $allocation['team_name'],
            'role'           => $allocation['assigned_cohort_role'],
            'seat_row'       => $allocation['row_coordinate'],
            'seat_column'    => $allocation['column_coordinate'],
        ];
    }

    // -----------------------------------------------------------------------
    // 9. Audit trail.
    // -----------------------------------------------------------------------
    writeAuditLog(
        (int)$operator['id'],
        "Checked in {$participant['name']} ({$participant['unique_registration_id']}) for {$registration['event_title']}",
        '/api/checkin',
        $ctx['ip']
    );

    jsonResponse(200, [
        'success' => true,
        'message' => "CHECK-IN SUCCESSFUL: Welcome, {$participant['name']}!",
        'duplicate'   => false,
        'participant' => [
            'name'              => $participant['name'],
            'email'             => $participant['email'],
            'registration_code' => $participant['unique_registration_id'],
            'branch'            => $participant['branch'],
        ],
        'event'     => $registration['event_title'],
        'allocation' => $allocationInfo,
    ]);
}
