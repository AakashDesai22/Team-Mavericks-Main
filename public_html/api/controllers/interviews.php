<?php
/**
 * ============================================================================
 * BODHANTRA EVENT OS — Recruitment & Interviews Controller
 * ============================================================================
 *
 * Manages interview recruitment slots, candidate bookings, evaluations, and shortlisting pipeline:
 *   • GET    /interviews/slots?event_id=X       → handleListSlots()
 *   • POST   /interviews/slots                  → handleCreateSlot() (Admin only)
 *   • POST   /interviews/slots/{id}/book        → handleBookSlot() (Candidate / Participant)
 *   • GET    /interviews/evaluations?event_id=X → handleListEvaluations() (Admin / Interviewer)
 *   • POST   /interviews/evaluations            → handleCreateEvaluation() (Admin / Interviewer)
 *   • PUT    /interviews/candidates/{id}/stage  → handleUpdateCandidateStage() (Admin only)
 *
 * @package BodhantraOS\Controllers
 */

declare(strict_types=1);

require_once __DIR__ . '/_middleware.php';

/**
 * GET /interviews/slots
 */
function handleListSlots(array $ctx): void
{
    $pdo = Database::connect();
    $eventId = (int)($ctx['query']['event_id'] ?? 0);

    if ($eventId <= 0) {
        jsonResponse(400, ['success' => false, 'error' => 'event_id is required.']);
    }

    $stmt = $pdo->prepare('SELECT s.*, p.panel_name, p.venue_room, u.name AS booked_by_name, u.email AS booked_by_email
                          FROM interview_slots s
                          JOIN competition_panels p ON p.id = s.panel_id
                          LEFT JOIN users u ON u.id = s.booked_by_user_id
                          WHERE s.event_id = :eid
                          ORDER BY s.slot_date ASC, s.start_time ASC');
    $stmt->execute([':eid' => $eventId]);

    jsonResponse(200, [
        'success' => true,
        'slots'   => $stmt->fetchAll(),
    ]);
}

/**
 * POST /interviews/slots
 */
function handleCreateSlot(array $ctx): void
{
    $user = requireAuth($ctx, ['Admin']);
    $body = $ctx['body'];

    $eventId    = (int)($body['event_id'] ?? 0);
    $subEventId = !empty($body['sub_event_id']) ? (int)$body['sub_event_id'] : null;
    $panelId    = (int)($body['panel_id'] ?? 0);
    $slotDate   = trim($body['slot_date'] ?? '');
    $startTime  = trim($body['start_time'] ?? '');
    $endTime    = trim($body['end_time'] ?? '');

    if ($eventId <= 0 || $panelId <= 0 || $slotDate === '' || $startTime === '' || $endTime === '') {
        jsonResponse(400, ['success' => false, 'error' => 'event_id, panel_id, slot_date, start_time, and end_time are required.']);
    }

    $pdo  = Database::connect();
    $stmt = $pdo->prepare('INSERT INTO interview_slots (event_id, sub_event_id, panel_id, slot_date, start_time, end_time, status, created_at)
                           VALUES (:eid, :sub_id, :pid, :sdate, :stime, :etime, "Available", NOW())');
    $stmt->execute([
        ':eid'    => $eventId,
        ':sub_id' => $subEventId,
        ':pid'    => $panelId,
        ':sdate'  => $slotDate,
        ':stime'  => $startTime,
        ':etime'  => $endTime,
    ]);

    jsonResponse(201, [
        'success' => true,
        'slot_id' => (int)$pdo->lastInsertId(),
        'message' => 'Interview slot created.',
    ]);
}

/**
 * POST /interviews/slots/{id}/book
 */
function handleBookSlot(array $ctx): void
{
    $user   = requireAuth($ctx);
    $slotId = (int)($ctx['params']['slot_id'] ?? 0);

    if ($slotId <= 0) {
        jsonResponse(400, ['success' => false, 'error' => 'Invalid slot_id.']);
    }

    $pdo = Database::connect();

    // Check slot availability
    $check = $pdo->prepare('SELECT id, status, booked_by_user_id FROM interview_slots WHERE id = :sid LIMIT 1');
    $check->execute([':sid' => $slotId]);
    $slot = $check->fetch();

    if (!$slot) {
        jsonResponse(404, ['success' => false, 'error' => 'Interview slot not found.']);
    }

    if ($slot['status'] !== 'Available') {
        jsonResponse(400, ['success' => false, 'error' => 'This slot is already booked or unavailable.']);
    }

    // Update slot
    $stmt = $pdo->prepare('UPDATE interview_slots SET booked_by_user_id = :uid, status = "Booked" WHERE id = :sid');
    $stmt->execute([
        ':uid' => $user['id'],
        ':sid' => $slotId,
    ]);

    jsonResponse(200, [
        'success' => true,
        'message' => 'Interview slot booked successfully.',
    ]);
}

/**
 * GET /interviews/evaluations
 */
function handleListEvaluations(array $ctx): void
{
    $user    = requireAuth($ctx, ['Admin', 'Member']);
    $eventId = (int)($ctx['query']['event_id'] ?? 0);

    if ($eventId <= 0) {
        jsonResponse(400, ['success' => false, 'error' => 'event_id is required.']);
    }

    $pdo  = Database::connect();
    $stmt = $pdo->prepare('SELECT e.*, c.name AS candidate_name, c.email AS candidate_email, c.branch, c.academic_year,
                                  ev.name AS evaluator_name
                           FROM candidate_evaluations e
                           JOIN users c ON c.id = e.candidate_user_id
                           JOIN users ev ON ev.id = e.evaluator_user_id
                           WHERE e.event_id = :eid
                           ORDER BY e.created_at DESC');
    $stmt->execute([':eid' => $eventId]);

    jsonResponse(200, [
        'success'     => true,
        'evaluations' => $stmt->fetchAll(),
    ]);
}

/**
 * POST /interviews/evaluations
 */
function handleCreateEvaluation(array $ctx): void
{
    $user = requireAuth($ctx, ['Admin', 'Member']);
    $body = $ctx['body'];

    $candidateUserId = (int)($body['candidate_user_id'] ?? 0);
    $eventId         = (int)($body['event_id'] ?? 0);
    $panelId         = !empty($body['panel_id']) ? (int)$body['panel_id'] : null;
    $score           = (float)($body['score'] ?? 0.0);
    $comments        = trim($body['comments'] ?? '');
    $recommendation  = trim($body['recommendation'] ?? 'Hold');
    $stage           = trim($body['stage'] ?? 'Interviewed');

    if ($candidateUserId <= 0 || $eventId <= 0) {
        jsonResponse(400, ['success' => false, 'error' => 'candidate_user_id and event_id are required.']);
    }

    $pdo  = Database::connect();
    $stmt = $pdo->prepare('INSERT INTO candidate_evaluations (candidate_user_id, event_id, panel_id, evaluator_user_id, score, comments, recommendation, stage, created_at, updated_at)
                           VALUES (:cid, :eid, :pid, :euid, :score, :comments, :rec, :stage, NOW(), NOW())');
    $stmt->execute([
        ':cid'      => $candidateUserId,
        ':eid'      => $eventId,
        ':pid'      => $panelId,
        ':euid'     => $user['id'],
        ':score'    => $score,
        ':comments' => $comments !== '' ? $comments : null,
        ':rec'      => $recommendation,
        ':stage'    => $stage,
    ]);

    jsonResponse(201, [
        'success'       => true,
        'evaluation_id' => (int)$pdo->lastInsertId(),
        'message'       => 'Evaluation recorded.',
    ]);
}

/**
 * PUT /interviews/candidates/{id}/stage
 */
function handleUpdateCandidateStage(array $ctx): void
{
    $user            = requireAuth($ctx, ['Admin']);
    $candidateUserId = (int)($ctx['params']['candidate_user_id'] ?? 0);
    $body            = $ctx['body'];
    $eventId         = (int)($body['event_id'] ?? 0);
    $stage           = trim($body['stage'] ?? '');

    if ($candidateUserId <= 0 || $eventId <= 0 || $stage === '') {
        jsonResponse(400, ['success' => false, 'error' => 'candidate_user_id, event_id, and stage are required.']);
    }

    $pdo  = Database::connect();
    
    // Upsert candidate evaluation stage record if not already existing
    $check = $pdo->prepare('SELECT id FROM candidate_evaluations WHERE candidate_user_id = :cid AND event_id = :eid LIMIT 1');
    $check->execute([':cid' => $candidateUserId, ':eid' => $eventId]);
    $existing = $check->fetch();

    if ($existing) {
        $stmt = $pdo->prepare('UPDATE candidate_evaluations SET stage = :stage, updated_at = NOW() 
                               WHERE candidate_user_id = :cid AND event_id = :eid');
        $stmt->execute([
            ':stage' => $stage,
            ':cid'   => $candidateUserId,
            ':eid'   => $eventId,
        ]);
    } else {
        $stmt = $pdo->prepare('INSERT INTO candidate_evaluations (candidate_user_id, event_id, evaluator_user_id, stage, created_at, updated_at)
                               VALUES (:cid, :eid, :euid, :stage, NOW(), NOW())');
        $stmt->execute([
            ':cid'   => $candidateUserId,
            ':eid'   => $eventId,
            ':euid'  => $user['id'],
            ':stage' => $stage,
        ]);
    }

    jsonResponse(200, [
        'success' => true,
        'message' => 'Candidate recruitment stage updated to ' . $stage,
    ]);
}

/**
 * GET /interviews/candidates?event_id=X
 */
function handleListCandidates(array $ctx): void
{
    $user    = requireAuth($ctx, ['Admin', 'Member']);
    $eventId = (int)($ctx['query']['event_id'] ?? 0);

    if ($eventId <= 0) {
        jsonResponse(400, ['success' => false, 'error' => 'event_id is required.']);
    }

    $pdo  = Database::connect();
    $stmt = $pdo->prepare('SELECT r.id AS registration_id, r.created_at AS registered_at,
                                  u.id AS user_id, u.name, u.email, u.phone, u.branch, u.academic_year, u.unique_registration_id,
                                  COALESCE(e.stage, "Applied") AS stage, e.score, e.comments, e.recommendation, e.updated_at AS evaluated_at,
                                  s.id AS slot_id, s.slot_date, s.start_time, s.end_time,
                                  p.panel_name, p.venue_room
                           FROM registrations r
                           JOIN users u ON u.id = r.user_id
                           LEFT JOIN candidate_evaluations e ON (e.candidate_user_id = u.id AND e.event_id = r.event_id)
                           LEFT JOIN interview_slots s ON (s.booked_by_user_id = u.id AND s.event_id = r.event_id)
                           LEFT JOIN competition_panels p ON p.id = s.panel_id
                           WHERE r.event_id = :eid
                           ORDER BY r.created_at DESC');
    $stmt->execute([':eid' => $eventId]);

    jsonResponse(200, [
        'success'    => true,
        'candidates' => $stmt->fetchAll(),
    ]);
}

/**
 * DELETE /interviews/candidates/{id}?event_id=X
 */
function handleDeleteCandidate(array $ctx): void
{
    $admin   = requireAuth($ctx, ['Admin']);
    $userId  = (int)($ctx['params'][0] ?? 0);
    $eventId = (int)($ctx['query']['event_id'] ?? 0);

    if ($userId <= 0 || $eventId <= 0) {
        jsonResponse(400, ['success' => false, 'error' => 'user_id and event_id are required.']);
    }

    $pdo = Database::connect();

    // 1. Delete from registrations & event_registrations
    $stmt1 = $pdo->prepare('DELETE FROM registrations WHERE user_id = :uid AND event_id = :eid');
    $stmt1->execute([':uid' => $userId, ':eid' => $eventId]);

    $stmt1b = $pdo->prepare('DELETE FROM event_registrations WHERE user_id = :uid AND event_id = :eid');
    $stmt1b->execute([':uid' => $userId, ':eid' => $eventId]);

    // 2. Delete candidate evaluations
    $stmt2 = $pdo->prepare('DELETE FROM candidate_evaluations WHERE candidate_user_id = :uid AND event_id = :eid');
    $stmt2->execute([':uid' => $userId, ':eid' => $eventId]);

    // 3. Clear booked interview slots
    $stmt3 = $pdo->prepare('UPDATE interview_slots SET booked_by_user_id = NULL, is_booked = 0 WHERE booked_by_user_id = :uid AND event_id = :eid');
    $stmt3->execute([':uid' => $userId, ':eid' => $eventId]);

    // 4. Delete allocations
    $stmt4 = $pdo->prepare('DELETE FROM allocations WHERE user_id = :uid AND event_id = :eid');
    $stmt4->execute([':uid' => $userId, ':eid' => $eventId]);

    jsonResponse(200, [
        'success' => true,
        'message' => 'Candidate record removed successfully.',
    ]);
}

