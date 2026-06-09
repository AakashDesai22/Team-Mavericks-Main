<?php
/**
 * ============================================================================
 * BODHANTRA EVENT OS — Events CRUD Controller
 * ============================================================================
 *
 * Administrative manager for symposium events and their configurations:
 *   • GET    /events         →  handleListEvents()       (all authenticated users)
 *   • GET    /events/{id}    →  handleGetEvent()          (all authenticated users)
 *   • POST   /events         →  handleCreateEvent()       (Admin, Member only)
 *   • PUT    /events/{id}    →  handleUpdateEvent()        (Admin, Member only)
 *   • DELETE /events/{id}    →  handleDeleteEvent()        (Admin only)
 *
 * RBAC Enforcement:
 *   READ  = any authenticated user
 *   WRITE = Admin + Member
 *   DELETE = Admin only (prevents accidental data loss by coordinators)
 *
 * @package BodhantraOS\Controllers
 */

declare(strict_types=1);

require_once __DIR__ . '/_middleware.php';


// ===========================================================================
// GET /events
// ===========================================================================

/**
 * List all events, optionally filtered by status.
 *
 * Query params:
 *   ?status=Active          — filter by event status
 *   ?page=1&per_page=20     — pagination
 *
 * Accessible by: Admin, Member, Participant
 */
function handleListEvents(array $ctx): void
{
    // Optional Auth: if token is present, resolve session. Guests are allowed.
    $user = resolveSession($ctx['token'] ?? null);

    $pdo = Database::connect();

    // -----------------------------------------------------------------------
    // Parse optional filters from query string.
    // -----------------------------------------------------------------------
    $statusFilter = $ctx['query']['status'] ?? null;
    $page         = max(1, (int)($ctx['query']['page'] ?? 1));
    $perPage      = max(1, min(100, (int)($ctx['query']['per_page'] ?? 20)));
    $offset       = ($page - 1) * $perPage;

    // -----------------------------------------------------------------------
    // Build query dynamically based on filters.
    // -----------------------------------------------------------------------
    $where  = '';
    $params = [];

    if ($statusFilter !== null && in_array($statusFilter, ['Draft', 'Active', 'Archived'], true)) {
        $where = 'WHERE e.status = :status';
        $params[':status'] = $statusFilter;
    }

    // For Guests or Participants, only show Active events (not Draft or Archived).
    if ($user === null || $user['role_tier'] === 'Participant') {
        $where = 'WHERE e.status = :status';
        $params[':status'] = 'Active';
    }

    // Count total for pagination metadata.
    $countSql = "SELECT COUNT(*) AS total FROM events e {$where}";
    $countStmt = $pdo->prepare($countSql);
    $countStmt->execute($params);
    $total = (int)$countStmt->fetch()['total'];

    $dataSql = "SELECT e.id, e.title, e.description, e.event_date, e.max_capacity,
                       e.status, e.cover_image_path, e.form_schema, e.num_days,
                       e.sessions_per_day, e.payment_type, e.payment_amount,
                       e.payment_context, e.payment_qr_path, e.require_payment_proof, e.finance_contacts, e.feedback_schema, e.created_by,
                       u.name AS created_by_name,
                       e.created_at, e.updated_at
                FROM events e
                LEFT JOIN users u ON u.id = e.created_by
                {$where}
                ORDER BY e.event_date DESC, e.created_at DESC
                LIMIT :limit OFFSET :offset";

    $dataStmt = $pdo->prepare($dataSql);
    foreach ($params as $k => $v) {
        $dataStmt->bindValue($k, $v);
    }
    $dataStmt->bindValue(':limit', $perPage, \PDO::PARAM_INT);
    $dataStmt->bindValue(':offset', $offset, \PDO::PARAM_INT);
    $dataStmt->execute();
    $events = $dataStmt->fetchAll();

    // -----------------------------------------------------------------------
    // For each event, include a registration count summary.
    // -----------------------------------------------------------------------
    if (!empty($events)) {
        $eventIds = array_column($events, 'id');
        $placeholders = implode(',', array_fill(0, count($eventIds), '?'));

        $regCountSql = "SELECT event_id,
                               COUNT(*) AS total_registrations,
                               SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) AS approved_count,
                               SUM(CASE WHEN status = 'Pending_Verification' THEN 1 ELSE 0 END) AS pending_count
                        FROM registrations
                        WHERE event_id IN ({$placeholders})
                        GROUP BY event_id";

        $regStmt = $pdo->prepare($regCountSql);
        $regStmt->execute($eventIds);
        $regCounts = [];
        foreach ($regStmt->fetchAll() as $row) {
            $regCounts[$row['event_id']] = $row;
        }

        foreach ($events as &$event) {
            $eid = $event['id'];
            $event['registration_summary'] = $regCounts[$eid] ?? [
                'total_registrations' => 0,
                'approved_count'      => 0,
                'pending_count'       => 0,
            ];
        }
        unset($event);
    }

    jsonResponse(200, [
        'success' => true,
        'events'  => $events,
        'pagination' => [
            'page'     => $page,
            'per_page' => $perPage,
            'total'    => $total,
            'pages'    => (int)ceil($total / $perPage),
        ],
    ]);
}


// ===========================================================================
// GET /events/{id}
// ===========================================================================

/**
 * Fetch a single event by ID with full details.
 *
 * The $ctx['params']['event_id'] is injected by the gateway's dynamic router.
 */
function handleGetEvent(array $ctx): void
{
    // Optional Auth: resolves session if token exists. Guests are allowed.
    $user    = resolveSession($ctx['token'] ?? null);
    $eventId = (int)($ctx['params']['event_id'] ?? 0);

    if ($eventId <= 0) {
        jsonResponse(400, [
            'success' => false,
            'error'   => 'Invalid event ID.',
        ]);
    }

    $pdo = Database::connect();

    $stmt = $pdo->prepare(
        'SELECT e.id, e.title, e.description, e.event_date, e.max_capacity,
                e.status, e.cover_image_path, e.form_schema, e.num_days,
                e.sessions_per_day, e.payment_type, e.payment_amount,
                e.payment_context, e.payment_qr_path, e.require_payment_proof, e.finance_contacts, e.feedback_schema, e.created_by,
                u.name AS created_by_name,
                e.created_at, e.updated_at
         FROM events e
         LEFT JOIN users u ON u.id = e.created_by
         WHERE e.id = :eid
         LIMIT 1'
    );
    $stmt->execute([':eid' => $eventId]);
    $event = $stmt->fetch();

    if (!$event) {
        jsonResponse(404, [
            'success' => false,
            'error'   => 'Event not found.',
        ]);
    }

    // Guest or Participant: block access to non-Active (Draft/Archived) events.
    if ($event['status'] !== 'Active') {
        if ($user === null || !in_array($user['role_tier'], ['Admin', 'Member'], true)) {
            jsonResponse(403, [
                'success' => false,
                'error'   => 'Access denied. You do not have permission to view this event configuration.',
            ]);
        }
    }

    // -----------------------------------------------------------------------
    // Include registration stats for Admin/Member.
    // -----------------------------------------------------------------------
    if ($user !== null && in_array($user['role_tier'], ['Admin', 'Member'], true)) {
        $regStmt = $pdo->prepare(
            "SELECT COUNT(*) AS total_registrations,
                    SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) AS approved_count,
                    SUM(CASE WHEN status = 'Pending_Verification' THEN 1 ELSE 0 END) AS pending_count,
                    SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) AS rejected_count,
                    SUM(CASE WHEN checked_in_state = 1 THEN 1 ELSE 0 END) AS checked_in_count
             FROM registrations
             WHERE event_id = :eid"
        );
        $regStmt->execute([':eid' => $eventId]);
        $event['registration_summary'] = $regStmt->fetch();

        // Seating grid stats.
        $gridStmt = $pdo->prepare(
            "SELECT COUNT(*) AS total_cells,
                    SUM(CASE WHEN cell_type = 'Available' THEN 1 ELSE 0 END) AS available_seats,
                    SUM(CASE WHEN cell_type = 'Blocked' THEN 1 ELSE 0 END) AS blocked_cells
             FROM seating_grid
             WHERE event_id = :eid"
        );
        $gridStmt->execute([':eid' => $eventId]);
        $event['seating_summary'] = $gridStmt->fetch();
    }

    // -----------------------------------------------------------------------
    // Include the current user's own registration state for this event.
    // -----------------------------------------------------------------------
    if ($user !== null) {
        $myRegStmt = $pdo->prepare(
            'SELECT id AS registration_id, status, voucher_path, checked_in_state, created_at
             FROM registrations
             WHERE user_id = :uid AND event_id = :eid
             LIMIT 1'
        );
        $myRegStmt->execute([
            ':uid' => $user['id'],
            ':eid' => $eventId,
        ]);
        $event['my_registration'] = $myRegStmt->fetch() ?: null;
    } else {
        $event['my_registration'] = null;
    }

    jsonResponse(200, [
        'success' => true,
        'event'   => $event,
    ]);
}


// ===========================================================================
// POST /events
// ===========================================================================

/**
 * Create a new event.
 *
 * RBAC: Admin only.
 */
function handleCreateEvent(array $ctx): void
{
    // -----------------------------------------------------------------------
    // RBAC Gate: Only Admins can create events.
    // -----------------------------------------------------------------------
    $user = requireAuth($ctx, ['Admin']);

    $body = $ctx['body'];

    // -----------------------------------------------------------------------
    // Input validation.
    // -----------------------------------------------------------------------
    $title       = trim($body['title']       ?? '');
    $description = trim($body['description'] ?? '');
    $eventDate   = trim($body['event_date']  ?? '');
    $maxCapacity = (int)($body['max_capacity'] ?? 0);
    $status      = trim($body['status']      ?? 'Draft');

    // New configuration fields
    $coverImagePath  = trim($body['cover_image_path'] ?? '');
    $formSchema      = isset($body['form_schema']) ? (is_array($body['form_schema']) ? json_encode($body['form_schema']) : $body['form_schema']) : null;
    $feedbackSchema  = isset($body['feedback_schema']) ? (is_array($body['feedback_schema']) ? json_encode($body['feedback_schema']) : $body['feedback_schema']) : null;
    $numDays         = max(1, (int)($body['num_days'] ?? 1));
    $sessionsPerDay  = max(1, (int)($body['sessions_per_day'] ?? 2));
    $paymentType     = trim($body['payment_type'] ?? 'Free');
    $paymentAmount   = (float)($body['payment_amount'] ?? 0.00);
    $paymentContext  = trim($body['payment_context'] ?? '');
    $paymentQrPath   = trim($body['payment_qr_path'] ?? '');
    $requirePaymentProof = isset($body['require_payment_proof']) ? (int)$body['require_payment_proof'] : 1;
    $financeContacts = isset($body['finance_contacts']) ? (is_array($body['finance_contacts']) ? json_encode($body['finance_contacts']) : $body['finance_contacts']) : null;

    $errors = [];

    if ($title === '') {
        $errors[] = 'Event title is required.';
    } elseif (mb_strlen($title) > 255) {
        $errors[] = 'Event title must not exceed 255 characters.';
    }

    if ($eventDate !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $eventDate)) {
        $errors[] = 'Event date must be in YYYY-MM-DD format.';
    } elseif ($eventDate !== '') {
        // Validate the date is real (e.g., not 2026-02-30).
        $dateParts = explode('-', $eventDate);
        if (!checkdate((int)$dateParts[1], (int)$dateParts[2], (int)$dateParts[0])) {
            $errors[] = 'Event date is not a valid calendar date.';
        }
    }

    if ($maxCapacity < 0) {
        $errors[] = 'Max capacity cannot be negative.';
    }

    $validStatuses = ['Draft', 'Active', 'Archived'];
    if (!in_array($status, $validStatuses, true)) {
        $errors[] = 'Status must be one of: ' . implode(', ', $validStatuses) . '.';
    }

    $validPaymentTypes = ['Free', 'Online', 'Offline'];
    if (!in_array($paymentType, $validPaymentTypes, true)) {
        $errors[] = 'Payment type must be one of: ' . implode(', ', $validPaymentTypes) . '.';
    }

    if ($paymentAmount < 0) {
        $errors[] = 'Payment amount cannot be negative.';
    }

    if (!empty($errors)) {
        jsonResponse(400, [
            'success' => false,
            'error'   => 'Validation failed.',
            'details' => $errors,
        ]);
    }

    // -----------------------------------------------------------------------
    // Insert.
    // -----------------------------------------------------------------------
    $pdo = Database::connect();

    $stmt = $pdo->prepare(
        'INSERT INTO events (title, description, event_date, max_capacity, status, 
                             cover_image_path, form_schema, feedback_schema, num_days, 
                             sessions_per_day, payment_type, payment_amount, 
                             payment_context, payment_qr_path, require_payment_proof, finance_contacts, created_by, created_at, updated_at)
         VALUES (:title, :desc, :date, :cap, :status, 
                 :cover, :form_schema, :feedback_schema, :num_days, 
                 :sessions_per_day, :payment_type, :payment_amount, 
                 :payment_context, :payment_qr_path, :require_payment_proof, :finance_contacts, :creator, NOW(), NOW())'
    );

    $stmt->execute([
        ':title'            => $title,
        ':desc'             => $description !== '' ? $description : null,
        ':date'             => $eventDate !== '' ? $eventDate : null,
        ':cap'              => $maxCapacity,
        ':status'           => $status,
        ':cover'            => $coverImagePath !== '' ? $coverImagePath : null,
        ':form_schema'      => $formSchema,
        ':feedback_schema'  => $feedbackSchema,
        ':num_days'         => $numDays,
        ':sessions_per_day' => $sessionsPerDay,
        ':payment_type'     => $paymentType,
        ':payment_amount'   => $paymentAmount,
        ':payment_context'  => $paymentContext !== '' ? $paymentContext : null,
        ':payment_qr_path'  => $paymentQrPath !== '' ? $paymentQrPath : null,
        ':require_payment_proof' => $requirePaymentProof,
        ':finance_contacts' => $financeContacts,
        ':creator'          => $user['id'],
    ]);

    $newId = (int)$pdo->lastInsertId();

    writeAuditLog(
        (int)$user['id'],
        "Created event #{$newId}: {$title}",
        '/api/events',
        $ctx['ip']
    );

    jsonResponse(201, [
        'success'  => true,
        'message'  => 'Event created successfully.',
        'event_id' => $newId,
        'event' => [
            'id'           => $newId,
            'title'        => $title,
            'description'  => $description,
            'event_date'   => $eventDate ?: null,
            'max_capacity' => $maxCapacity,
            'status'       => $status,
            'created_by'   => $user['id'],
        ],
    ]);
}


// ===========================================================================
// PUT /events/{id}
// ===========================================================================

/**
 * Update an existing event.
 *
 * RBAC: Admin only.
 * Only the fields provided in the body are updated (partial update).
 */
function handleUpdateEvent(array $ctx): void
{
    $user    = requireAuth($ctx, ['Admin']);
    $eventId = (int)($ctx['params']['event_id'] ?? 0);

    if ($eventId <= 0) {
        jsonResponse(400, [
            'success' => false,
            'error'   => 'Invalid event ID.',
        ]);
    }

    $pdo = Database::connect();

    // -----------------------------------------------------------------------
    // Verify the event exists.
    // -----------------------------------------------------------------------
    $existing = $pdo->prepare('SELECT id, status FROM events WHERE id = :eid LIMIT 1');
    $existing->execute([':eid' => $eventId]);
    $event = $existing->fetch();

    if (!$event) {
        jsonResponse(404, [
            'success' => false,
            'error'   => 'Event not found.',
        ]);
    }

    $body = $ctx['body'];

    // -----------------------------------------------------------------------
    // Build a dynamic SET clause for partial updates.
    // Only explicitly provided fields are updated.
    // -----------------------------------------------------------------------
    $updateFields = [];
    $params       = [':eid' => $eventId];

    if (isset($body['title'])) {
        $title = trim($body['title']);
        if ($title === '' || mb_strlen($title) > 255) {
            jsonResponse(400, [
                'success' => false,
                'error'   => 'Event title must be 1–255 characters.',
            ]);
        }
        $updateFields[] = 'title = :title';
        $params[':title'] = $title;
    }

    if (array_key_exists('description', $body)) {
        $updateFields[] = 'description = :desc';
        $params[':desc'] = $body['description'] !== null ? trim($body['description']) : null;
    }

    if (isset($body['event_date'])) {
        $eventDate = trim($body['event_date']);
        if ($eventDate !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $eventDate)) {
            jsonResponse(400, [
                'success' => false,
                'error'   => 'Event date must be in YYYY-MM-DD format.',
            ]);
        }
        if ($eventDate !== '') {
            $parts = explode('-', $eventDate);
            if (!checkdate((int)$parts[1], (int)$parts[2], (int)$parts[0])) {
                jsonResponse(400, [
                    'success' => false,
                    'error'   => 'Event date is not a valid calendar date.',
                ]);
            }
        }
        $updateFields[] = 'event_date = :date';
        $params[':date'] = $eventDate !== '' ? $eventDate : null;
    }

    if (isset($body['max_capacity'])) {
        $cap = (int)$body['max_capacity'];
        if ($cap < 0) {
            jsonResponse(400, [
                'success' => false,
                'error'   => 'Max capacity cannot be negative.',
            ]);
        }
        $updateFields[] = 'max_capacity = :cap';
        $params[':cap'] = $cap;
    }

    if (isset($body['status'])) {
        $status = trim($body['status']);
        $validStatuses = ['Draft', 'Active', 'Archived'];
        if (!in_array($status, $validStatuses, true)) {
            jsonResponse(400, [
                'success' => false,
                'error'   => 'Status must be one of: ' . implode(', ', $validStatuses) . '.',
            ]);
        }
        $updateFields[] = 'status = :status';
        $params[':status'] = $status;
    }

    if (isset($body['cover_image_path'])) {
        $updateFields[] = 'cover_image_path = :cover';
        $params[':cover'] = trim($body['cover_image_path']) !== '' ? trim($body['cover_image_path']) : null;
    }

    if (isset($body['form_schema'])) {
        $updateFields[] = 'form_schema = :form_schema';
        $params[':form_schema'] = is_array($body['form_schema']) ? json_encode($body['form_schema']) : $body['form_schema'];
    }

    if (isset($body['feedback_schema'])) {
        $updateFields[] = 'feedback_schema = :feedback_schema';
        $params[':feedback_schema'] = is_array($body['feedback_schema']) ? json_encode($body['feedback_schema']) : $body['feedback_schema'];
    }

    if (isset($body['num_days'])) {
        $updateFields[] = 'num_days = :num_days';
        $params[':num_days'] = max(1, (int)$body['num_days']);
    }

    if (isset($body['sessions_per_day'])) {
        $updateFields[] = 'sessions_per_day = :sessions_per_day';
        $params[':sessions_per_day'] = max(1, (int)$body['sessions_per_day']);
    }

    if (isset($body['payment_type'])) {
        $pt = trim($body['payment_type']);
        if (!in_array($pt, ['Free', 'Online', 'Offline'], true)) {
            jsonResponse(400, ['success' => false, 'error' => 'Invalid payment type.']);
        }
        $updateFields[] = 'payment_type = :payment_type';
        $params[':payment_type'] = $pt;
    }

    if (isset($body['payment_amount'])) {
        $pa = (float)$body['payment_amount'];
        if ($pa < 0) {
            jsonResponse(400, ['success' => false, 'error' => 'Payment amount cannot be negative.']);
        }
        $updateFields[] = 'payment_amount = :payment_amount';
        $params[':payment_amount'] = $pa;
    }

    if (isset($body['payment_context'])) {
        $updateFields[] = 'payment_context = :payment_context';
        $params[':payment_context'] = trim($body['payment_context']) !== '' ? trim($body['payment_context']) : null;
    }

    if (isset($body['payment_qr_path'])) {
        $updateFields[] = 'payment_qr_path = :payment_qr_path';
        $params[':payment_qr_path'] = trim($body['payment_qr_path']) !== '' ? trim($body['payment_qr_path']) : null;
    }

    if (isset($body['require_payment_proof'])) {
        $updateFields[] = 'require_payment_proof = :require_payment_proof';
        $params[':require_payment_proof'] = (int)$body['require_payment_proof'];
    }

    if (isset($body['finance_contacts'])) {
        $updateFields[] = 'finance_contacts = :finance_contacts';
        $params[':finance_contacts'] = is_array($body['finance_contacts']) ? json_encode($body['finance_contacts']) : $body['finance_contacts'];
    }

    if (empty($updateFields)) {
        jsonResponse(400, [
            'success' => false,
            'error'   => 'No updatable fields provided.',
        ]);
    }

    // Always bump updated_at.
    $updateFields[] = 'updated_at = NOW()';

    $sql = 'UPDATE events SET ' . implode(', ', $updateFields) . ' WHERE id = :eid';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    writeAuditLog(
        (int)$user['id'],
        "Updated event #{$eventId}: fields [" . implode(', ', array_keys($body)) . "]",
        "/api/events/{$eventId}",
        $ctx['ip']
    );

    jsonResponse(200, [
        'success'  => true,
        'message'  => 'Event updated successfully.',
        'event_id' => $eventId,
    ]);
}


// ===========================================================================
// DELETE /events/{id}
// ===========================================================================

/**
 * Delete an event and all associated child records (cascading FK).
 *
 * RBAC: Admin ONLY — Members cannot delete to prevent accidental loss.
 */
function handleDeleteEvent(array $ctx): void
{
    // Strict Admin-only gate.
    $user    = requireAuth($ctx, ['Admin']);
    $eventId = (int)($ctx['params']['event_id'] ?? 0);

    if ($eventId <= 0) {
        jsonResponse(400, [
            'success' => false,
            'error'   => 'Invalid event ID.',
        ]);
    }

    $pdo = Database::connect();

    // -----------------------------------------------------------------------
    // Verify the event exists before deleting.
    // -----------------------------------------------------------------------
    $check = $pdo->prepare('SELECT id, title FROM events WHERE id = :eid LIMIT 1');
    $check->execute([':eid' => $eventId]);
    $event = $check->fetch();

    if (!$event) {
        jsonResponse(404, [
            'success' => false,
            'error'   => 'Event not found.',
        ]);
    }

    // -----------------------------------------------------------------------
    // Delete — the CASCADE foreign keys on registrations, seating_grid,
    // and allocations will automatically clean up child records.
    // -----------------------------------------------------------------------
    $del = $pdo->prepare('DELETE FROM events WHERE id = :eid');
    $del->execute([':eid' => $eventId]);

    writeAuditLog(
        (int)$user['id'],
        "Deleted event #{$eventId}: {$event['title']}",
        "/api/events/{$eventId}",
        $ctx['ip']
    );

    jsonResponse(200, [
        'success'  => true,
        'message'  => "Event '{$event['title']}' and all associated data have been deleted.",
        'event_id' => $eventId,
    ]);
}
