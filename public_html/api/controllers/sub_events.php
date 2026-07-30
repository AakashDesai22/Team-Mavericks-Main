<?php
/**
 * ============================================================================
 * BODHANTRA EVENT OS — Sub-Events Controller (Workshops & Track Management)
 * ============================================================================
 *
 * Controller for managing sub-events (e.g. Invicta workshops, Verbafest GD/Debate/MindSaga tracks):
 *   • GET    /sub-events?parent_event_id=X → handleListSubEvents()
 *   • POST   /sub-events                   → handleCreateSubEvent() (Admin only)
 *   • PUT    /sub-events/{id}              → handleUpdateSubEvent() (Admin only)
 *   • DELETE /sub-events/{id}              → handleDeleteSubEvent() (Admin only)
 *
 * @package BodhantraOS\Controllers
 */

declare(strict_types=1);

require_once __DIR__ . '/_middleware.php';

/**
 * GET /sub-events
 */
function handleListSubEvents(array $ctx): void
{
    $pdo = Database::connect();
    $parentEventId = isset($ctx['query']['parent_event_id']) ? (int)$ctx['query']['parent_event_id'] : 0;

    if ($parentEventId <= 0) {
        jsonResponse(400, [
            'success' => false,
            'error'   => 'parent_event_id query parameter is required.',
        ]);
    }

    $stmt = $pdo->prepare('SELECT s.*, 
                                 (SELECT COUNT(*) FROM sub_event_registrations r WHERE r.sub_event_id = s.id) AS registered_count
                          FROM sub_events s
                          WHERE s.parent_event_id = :pid
                          ORDER BY s.event_date ASC, s.start_time ASC');
    $stmt->execute([':pid' => $parentEventId]);
    $subEvents = $stmt->fetchAll();

    jsonResponse(200, [
        'success'    => true,
        'sub_events' => $subEvents,
    ]);
}

/**
 * POST /sub-events
 */
function handleCreateSubEvent(array $ctx): void
{
    $user = requireAuth($ctx, ['Admin']);
    $body = $ctx['body'];

    $parentEventId = (int)($body['parent_event_id'] ?? 0);
    $title         = trim($body['title'] ?? '');
    $type          = trim($body['sub_event_type'] ?? 'Workshop');
    $description   = trim($body['description'] ?? '');
    $capacity      = (int)($body['capacity'] ?? 0);
    $eventDate     = trim($body['event_date'] ?? '');
    $startTime     = trim($body['start_time'] ?? '');
    $endTime       = trim($body['end_time'] ?? '');
    $venueLocation = trim($body['venue_location'] ?? '');
    $certTemplateId = !empty($body['certificate_template_id']) ? (int)$body['certificate_template_id'] : null;

    if ($parentEventId <= 0 || $title === '') {
        jsonResponse(400, [
            'success' => false,
            'error'   => 'parent_event_id and title are required.',
        ]);
    }

    $pdo = Database::connect();

    $stmt = $pdo->prepare('INSERT INTO sub_events 
        (parent_event_id, title, sub_event_type, description, capacity, event_date, start_time, end_time, venue_location, certificate_template_id, is_active, created_at, updated_at)
        VALUES 
        (:pid, :title, :type, :desc, :cap, :edate, :stime, :etime, :venue, :cert_id, 1, NOW(), NOW())');

    $stmt->execute([
        ':pid'     => $parentEventId,
        ':title'   => $title,
        ':type'    => $type,
        ':desc'    => $description !== '' ? $description : null,
        ':cap'     => $capacity,
        ':edate'   => $eventDate !== '' ? $eventDate : null,
        ':stime'   => $startTime !== '' ? $startTime : null,
        ':etime'   => $endTime !== '' ? $endTime : null,
        ':venue'   => $venueLocation !== '' ? $venueLocation : null,
        ':cert_id' => $certTemplateId,
    ]);

    $newId = (int)$pdo->lastInsertId();

    jsonResponse(201, [
        'success'      => true,
        'message'      => 'Sub-event created successfully.',
        'sub_event_id' => $newId,
    ]);
}

/**
 * PUT /sub-events/{id}
 */
function handleUpdateSubEvent(array $ctx): void
{
    $user       = requireAuth($ctx, ['Admin']);
    $subEventId = (int)($ctx['params']['sub_event_id'] ?? 0);

    if ($subEventId <= 0) {
        jsonResponse(400, ['success' => false, 'error' => 'Invalid sub_event_id.']);
    }

    $body = $ctx['body'];
    $pdo  = Database::connect();

    $updateFields = [];
    $params       = [':id' => $subEventId];

    if (isset($body['title'])) {
        $updateFields[] = 'title = :title';
        $params[':title'] = trim($body['title']);
    }
    if (isset($body['sub_event_type'])) {
        $updateFields[] = 'sub_event_type = :type';
        $params[':type'] = trim($body['sub_event_type']);
    }
    if (array_key_exists('description', $body)) {
        $updateFields[] = 'description = :desc';
        $params[':desc'] = $body['description'] !== null ? trim($body['description']) : null;
    }
    if (isset($body['capacity'])) {
        $updateFields[] = 'capacity = :cap';
        $params[':cap'] = (int)$body['capacity'];
    }
    if (isset($body['event_date'])) {
        $updateFields[] = 'event_date = :edate';
        $params[':edate'] = trim($body['event_date']) !== '' ? trim($body['event_date']) : null;
    }
    if (isset($body['start_time'])) {
        $updateFields[] = 'start_time = :stime';
        $params[':stime'] = trim($body['start_time']) !== '' ? trim($body['start_time']) : null;
    }
    if (isset($body['end_time'])) {
        $updateFields[] = 'end_time = :etime';
        $params[':etime'] = trim($body['end_time']) !== '' ? trim($body['end_time']) : null;
    }
    if (isset($body['venue_location'])) {
        $updateFields[] = 'venue_location = :venue';
        $params[':venue'] = trim($body['venue_location']) !== '' ? trim($body['venue_location']) : null;
    }
    if (array_key_exists('certificate_template_id', $body)) {
        $updateFields[] = 'certificate_template_id = :cert_id';
        $params[':cert_id'] = !empty($body['certificate_template_id']) ? (int)$body['certificate_template_id'] : null;
    }
    if (isset($body['is_active'])) {
        $updateFields[] = 'is_active = :is_active';
        $params[':is_active'] = (int)$body['is_active'];
    }

    if (empty($updateFields)) {
        jsonResponse(400, ['success' => false, 'error' => 'No updatable fields provided.']);
    }

    $updateFields[] = 'updated_at = NOW()';
    $sql = 'UPDATE sub_events SET ' . implode(', ', $updateFields) . ' WHERE id = :id';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    jsonResponse(200, [
        'success'      => true,
        'message'      => 'Sub-event updated successfully.',
        'sub_event_id' => $subEventId,
    ]);
}

/**
 * DELETE /sub-events/{id}
 */
function handleDeleteSubEvent(array $ctx): void
{
    $user       = requireAuth($ctx, ['Admin']);
    $subEventId = (int)($ctx['params']['sub_event_id'] ?? 0);

    if ($subEventId <= 0) {
        jsonResponse(400, ['success' => false, 'error' => 'Invalid sub_event_id.']);
    }

    $pdo  = Database::connect();
    $stmt = $pdo->prepare('DELETE FROM sub_events WHERE id = :id');
    $stmt->execute([':id' => $subEventId]);

    jsonResponse(200, [
        'success' => true,
        'message' => 'Sub-event deleted successfully.',
    ]);
}
