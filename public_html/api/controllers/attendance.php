<?php
/**
 * ============================================================================
 * BODHANTRA EVENT OS — High-Throughput Check-In & Export Controller (Phase 2)
 * ============================================================================
 *
 * Handlers:
 *   POST /attendance/log   → handleLogAttendance() (Admin/Member only)
 *   GET  /attendance/export  → handleExportAttendance() (Admin/Member only)
 *
 * @package BodhantraOS\Controllers
 */

declare(strict_types=1);

require_once __DIR__ . '/_middleware.php';

/**
 * High-Throughput Check-In Gate
 * Logs a participant's day-wise/session-wise attendance with database-level
 * unique key constraints and verified registration validation.
 *
 * Request body:
 *   {
 *     "account_id":   "MAV-PRT-042",
 *     "event_id":     1,
 *     "day_number":   2,
 *     "session_tier": "Afternoon"
 *   }
 */
function handleLogAttendance(array $ctx): void
{
    // 1. RBAC check — restrict strictly to Admin and Member tiers.
    $operator = requireAuth($ctx, ['Admin', 'Member']);

    $body = $ctx['body'];

    $participantId = trim((string)($body['account_id'] ?? ''));
    $eventId       = (int)($body['event_id'] ?? 0);
    $dayNumber     = (int)($body['day_number'] ?? 0);
    $sessionTier   = trim((string)($body['session_tier'] ?? ''));

    // Input Validation
    if ($participantId === '' || $eventId <= 0 || $dayNumber <= 0 || $sessionTier === '') {
        jsonResponse(400, [
            'success' => false,
            'error'   => 'Missing or invalid required parameters (account_id, event_id, day_number, session_tier).',
        ]);
    }

    $pdo = Database::connect();

    // 2. Verification Chain — Step 1: Cross-reference account_id against event registrations
    $regStmt = $pdo->prepare(
        'SELECT er.user_id, er.status, u.name, u.email, u.phone
         FROM event_registrations er
         INNER JOIN users u ON er.user_id = u.id
         WHERE er.participant_id = :pid AND er.event_id = :eid
         LIMIT 1'
    );
    $regStmt->execute([
        ':pid' => $participantId,
        ':eid' => $eventId,
    ]);
    $registration = $regStmt->fetch(PDO::FETCH_ASSOC);

    if (!$registration) {
        jsonResponse(404, [
            'success' => false,
            'error'   => 'No event registration found for the scanned ID: ' . $participantId,
        ]);
    }

    // Access check: status must be Approved
    if ($registration['status'] !== 'Approved') {
        jsonResponse(403, [
            'success' => false,
            'error'   => 'Access Denied: Payment screenshot verification is unapproved.',
            'name'    => $registration['name'],
            'status'  => $registration['status'],
        ]);
    }

    $userId = (int)$registration['user_id'];

    // 3. Verification Chain — Step 2: Check for duplicate check-ins
    // Column in DB is session_label, maps to session_tier
    $dupStmt = $pdo->prepare(
        'SELECT marked_at, marked_by
         FROM attendance_log
         WHERE event_id = :eid AND user_id = :uid AND day_number = :day AND session_label = :sess
         LIMIT 1'
    );
    $dupStmt->execute([
        ':eid'  => $eventId,
        ':uid'  => $userId,
        ':day'  => $dayNumber,
        ':sess' => $sessionTier,
    ]);
    $existing = $dupStmt->fetch(PDO::FETCH_ASSOC);

    if ($existing) {
        // Query operator details for original log
        $opName = 'System';
        if ($existing['marked_by'] !== null) {
            $opStmt = $pdo->prepare('SELECT name FROM users WHERE id = :oid LIMIT 1');
            $opStmt->execute([':oid' => $existing['marked_by']]);
            $opRow = $opStmt->fetch(PDO::FETCH_ASSOC);
            if ($opRow) {
                $opName = $opRow['name'];
            }
        }

        jsonResponse(409, [
            'success'   => false,
            'error'     => 'Attendee has already checked in for this session block.',
            'name'      => $registration['name'],
            'email'     => $registration['email'],
            'phone'     => $registration['phone'],
            'marked_at' => $existing['marked_at'],
            'marked_by' => $opName,
            'session'   => 'Day ' . $dayNumber . ' - ' . $sessionTier,
        ]);
    }

    // 4. Database Commit — Write entry tracking operator, IP, and server timestamp
    try {
        $insert = $pdo->prepare(
            'INSERT INTO attendance_log
                (event_id, user_id, participant_id, day_number, session_label, marked_by, client_ip, marked_at)
             VALUES
                (:eid, :uid, :pid, :day, :sess, :marked_by, :ip, NOW())'
        );
        $insert->execute([
            ':eid'       => $eventId,
            ':uid'       => $userId,
            ':pid'       => $participantId,
            ':day'       => $dayNumber,
            ':sess'      => $sessionTier,
            ':marked_by' => $operator['id'],
            ':ip'        => $ctx['ip'] ?? '0.0.0.0',
        ]);
    } catch (\Throwable $e) {
        error_log('[BodhantraOS][Attendance] Log insert failed: ' . $e->getMessage());
        jsonResponse(500, [
            'success' => false,
            'error'   => 'Failed to log attendance. Please try again.',
        ]);
    }

    // Write audit ledger record
    writeAuditLog(
        (int)$operator['id'],
        "Logged attendance for {$participantId} (Day {$dayNumber}, {$sessionTier})",
        "/api/attendance/log",
        $ctx['ip']
    );

    // 5. Success Response: Renders user credentials
    jsonResponse(200, [
        'success'        => true,
        'message'        => 'Attendance logged cleanly.',
        'participant_id' => $participantId,
        'name'           => $registration['name'],
        'email'          => $registration['email'],
        'phone'          => $registration['phone'],
        'session'        => 'Day ' . $dayNumber . ' (' . $sessionTier . ')',
        'logged_at'      => date('Y-m-d H:i:s'),
    ]);
}

/**
 * Attendance Data Exporter
 * Pulls complete event enrollment list and aggregates session logs into standard CSV download.
 *
 * Query Parameter:
 *   GET /attendance/export?event_id=1
 */
function handleExportAttendance(array $ctx): void
{
    // 1. RBAC check — Admin or Member only
    requireAuth($ctx, ['Admin', 'Member']);

    $eventId = (int)($ctx['params']['event_id'] ?? $ctx['query']['event_id'] ?? 0);

    if ($eventId <= 0) {
        jsonResponse(400, [
            'success' => false,
            'error'   => 'Invalid or missing event ID parameter.',
        ]);
    }

    $pdo = Database::connect();

    // Verify event exists
    $evtStmt = $pdo->prepare('SELECT title FROM events WHERE id = :eid LIMIT 1');
    $evtStmt->execute([':eid' => $eventId]);
    $event = $evtStmt->fetch(PDO::FETCH_ASSOC);

    if (!$event) {
        jsonResponse(404, [
            'success' => false,
            'error'   => 'Event not found.',
        ]);
    }

    // 2. Fetch the complete event enrollment dataset
    $regStmt = $pdo->prepare(
        'SELECT er.user_id, er.participant_id, u.name, u.email, u.phone, u.branch, u.academic_year,
                er.status AS registration_status, er.created_at AS registered_at
         FROM event_registrations er
         INNER JOIN users u ON er.user_id = u.id
         WHERE er.event_id = :eid
         ORDER BY er.participant_id ASC'
    );
    $regStmt->execute([':eid' => $eventId]);
    $registrations = $regStmt->fetchAll(PDO::FETCH_ASSOC);

    // 3. Fetch all logged attendance sessions for this event
    $logStmt = $pdo->prepare(
        'SELECT user_id, day_number, session_label, marked_at
         FROM attendance_log
         WHERE event_id = :eid
         ORDER BY day_number ASC, session_label ASC'
    );
    $logStmt->execute([':eid' => $eventId]);
    $logs = $logStmt->fetchAll(PDO::FETCH_ASSOC);

    // Group logs by user
    $userLogs = [];
    foreach ($logs as $log) {
        $uid = (int)$log['user_id'];
        if (!isset($userLogs[$uid])) {
            $userLogs[$uid] = [];
        }
        $userLogs[$uid][] = 'Day ' . $log['day_number'] . ' (' . $log['session_label'] . ')';
    }

    // 4. Stream Raw CSV Stream directly (bypass index.php JSON buffering)
    if (ob_get_level() > 0) {
        ob_end_clean();
    }

    header('Content-Type: text/csv; charset=utf-8');
    $filename = 'attendance_' . preg_replace('/[^a-zA-Z0-9_\-]/', '_', $event['title']) . '_' . date('Ymd_His') . '.csv';
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    header('Pragma: no-cache');
    header('Expires: 0');

    $stream = fopen('php://output', 'w');

    // Excel UTF-8 compatibility BOM
    fprintf($stream, chr(0xEF) . chr(0xBB) . chr(0xBF));

    // CSV Headers
    fputcsv($stream, [
        'Participant ID',
        'Name',
        'Email',
        'Phone',
        'Branch',
        'Academic Year',
        'Registration Status',
        'Registered At',
        'Attended Sessions',
        'Total Sessions Attended'
    ]);

    // CSV rows
    foreach ($registrations as $reg) {
        $uid = (int)$reg['user_id'];
        $sessionsString = isset($userLogs[$uid]) ? implode(', ', $userLogs[$uid]) : 'None';
        $totalAttended  = isset($userLogs[$uid]) ? count($userLogs[$uid]) : 0;

        fputcsv($stream, [
            $reg['participant_id'],
            $reg['name'],
            $reg['email'],
            $reg['phone'],
            $reg['branch'],
            $reg['academic_year'],
            $reg['registration_status'],
            $reg['registered_at'],
            $sessionsString,
            $totalAttended
        ]);
    }

    fclose($stream);
    exit;
}
