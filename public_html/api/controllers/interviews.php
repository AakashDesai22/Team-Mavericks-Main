<?php
/**
 * ============================================================================
 * BODHANTRA EVENT OS — Recruitment & Interviews Controller
 * ============================================================================
 *
 * Manages interview recruitment slots, candidate bookings, multi-criteria evaluations,
 * stage transition audit history, desk verification check-in, and bulk email communications:
 *   • GET    /interviews/slots?event_id=X            → handleListSlots()
 *   • POST   /interviews/slots                       → handleCreateSlot() (Admin only)
 *   • POST   /interviews/slots/{id}/book             → handleBookSlot() (Candidate / Participant)
 *   • GET    /interviews/evaluations?event_id=X      → handleListEvaluations() (Admin / Interviewer)
 *   • POST   /interviews/evaluations                 → handleCreateEvaluation() (Admin / Interviewer)
 *   • PUT    /interviews/candidates/{id}/stage       → handleUpdateCandidateStage() (Admin only)
 *   • GET    /interviews/candidates?event_id=X       → handleListCandidates()
 *   • DELETE /interviews/candidates/{id}?event_id=X  → handleDeleteCandidate()
 *   • GET    /interviews/criteria?event_id=X         → handleGetCriteria()
 *   • POST   /interviews/criteria                    → handleSaveCriteria()
 *   • GET    /interviews/candidates/{id}/history     → handleGetCandidateHistory()
 *   • POST   /interviews/checkin                     → handleQuickCheckinCandidate()
 *   • POST   /interviews/communicate                 → handleBulkCommunicateCandidates()
 *
 * @package BodhantraOS\Controllers
 */

declare(strict_types=1);

require_once __DIR__ . '/_middleware.php';
require_once __DIR__ . '/../utils/mailer.php';

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
 * POST /interviews/evaluations (Supports both overall score & multi-criteria rubric)
 */
function handleCreateEvaluation(array $ctx): void
{
    $user = requireAuth($ctx, ['Admin', 'Member']);
    $body = $ctx['body'];

    $candidateUserId = (int)($body['candidate_user_id'] ?? 0);
    $eventId         = (int)($body['event_id'] ?? 0);
    $panelId         = !empty($body['panel_id']) ? (int)$body['panel_id'] : null;
    $score           = isset($body['score']) ? (float)$body['score'] : null;
    $comments        = trim($body['comments'] ?? '');
    $recommendation  = trim($body['recommendation'] ?? 'Hold');
    $stage           = trim($body['stage'] ?? 'Interviewed');
    $criteriaScores  = is_array($body['criteria_scores'] ?? null) ? $body['criteria_scores'] : [];

    if ($candidateUserId <= 0 || $eventId <= 0) {
        jsonResponse(400, ['success' => false, 'error' => 'candidate_user_id and event_id are required.']);
    }

    $pdo = Database::connect();

    // Check existing stage for history logging
    $prevStmt = $pdo->prepare('SELECT id, stage FROM candidate_evaluations WHERE candidate_user_id = :cid AND event_id = :eid LIMIT 1');
    $prevStmt->execute([':cid' => $candidateUserId, ':eid' => $eventId]);
    $prevEval = $prevStmt->fetch();
    $oldStage = $prevEval ? $prevEval['stage'] : 'Applied';

    // Calculate score from rubric breakdown if criteria_scores provided
    if (!empty($criteriaScores)) {
        $totalEarned = 0.0;
        $totalMax = 0.0;

        foreach ($criteriaScores as $cs) {
            $critId = (int)($cs['criteria_id'] ?? 0);
            $itemScore = (float)($cs['score'] ?? 0);

            $cStmt = $pdo->prepare('SELECT max_marks, weightage FROM evaluation_criteria WHERE id = :id LIMIT 1');
            $cStmt->execute([':id' => $critId]);
            $critRow = $cStmt->fetch();
            if ($critRow) {
                $weight = max(1, (int)$critRow['weightage']);
                $maxM = max(1, (int)$critRow['max_marks']);
                $totalEarned += ($itemScore * $weight);
                $totalMax += ($maxM * $weight);
            }
        }

        if ($totalMax > 0) {
            $score = round(($totalEarned / $totalMax) * 100, 2);
        }
    }

    if ($score === null) {
        $score = 80.0;
    }

    // Upsert candidate evaluation
    if ($prevEval) {
        $evalId = (int)$prevEval['id'];
        $stmt = $pdo->prepare('UPDATE candidate_evaluations 
                               SET panel_id = :pid, evaluator_user_id = :euid, score = :score, comments = :comments, 
                                   recommendation = :rec, stage = :stage, updated_at = NOW()
                               WHERE id = :id');
        $stmt->execute([
            ':pid'      => $panelId,
            ':euid'     => $user['id'],
            ':score'    => $score,
            ':comments' => $comments !== '' ? $comments : null,
            ':rec'      => $recommendation,
            ':stage'    => $stage,
            ':id'       => $evalId,
        ]);
    } else {
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
        $evalId = (int)$pdo->lastInsertId();
    }

    // Insert/update criteria breakdown scores
    if (!empty($criteriaScores)) {
        $csStmt = $pdo->prepare('INSERT INTO candidate_criteria_scores (evaluation_id, criteria_id, score, remarks)
                                 VALUES (:e_id, :c_id, :score, :remarks)
                                 ON DUPLICATE KEY UPDATE score = VALUES(score), remarks = VALUES(remarks)');
        foreach ($criteriaScores as $cs) {
            if (!empty($cs['criteria_id'])) {
                $csStmt->execute([
                    ':e_id'    => $evalId,
                    ':c_id'    => (int)$cs['criteria_id'],
                    ':score'   => (float)($cs['score'] ?? 0),
                    ':remarks' => !empty($cs['remarks']) ? trim($cs['remarks']) : null,
                ]);
            }
        }
    }

    // Log stage history audit entry if stage changed
    if ($oldStage !== $stage) {
        $auditStmt = $pdo->prepare('INSERT INTO candidate_status_history (candidate_user_id, event_id, old_stage, new_stage, changed_by_user_id, notes, created_at)
                                    VALUES (:cid, :eid, :old, :new, :uid, :notes, NOW())');
        $auditStmt->execute([
            ':cid'   => $candidateUserId,
            ':eid'   => $eventId,
            ':old'   => $oldStage,
            ':new'   => $stage,
            ':uid'   => $user['id'],
            ':notes' => "Stage updated to {$stage} during candidate evaluation.",
        ]);
    }

    jsonResponse(201, [
        'success'       => true,
        'evaluation_id' => $evalId,
        'score'         => $score,
        'message'       => 'Evaluation & rubric ratings recorded successfully.',
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
    $notes           = trim($body['notes'] ?? '');

    if ($candidateUserId <= 0 || $eventId <= 0 || $stage === '') {
        jsonResponse(400, ['success' => false, 'error' => 'candidate_user_id, event_id, and stage are required.']);
    }

    $pdo  = Database::connect();
    
    // Check old stage
    $check = $pdo->prepare('SELECT id, stage FROM candidate_evaluations WHERE candidate_user_id = :cid AND event_id = :eid LIMIT 1');
    $check->execute([':cid' => $candidateUserId, ':eid' => $eventId]);
    $existing = $check->fetch();
    $oldStage = $existing ? $existing['stage'] : 'Applied';

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

    // Log history audit entry
    if ($oldStage !== $stage) {
        $historyStmt = $pdo->prepare('INSERT INTO candidate_status_history (candidate_user_id, event_id, old_stage, new_stage, changed_by_user_id, notes, created_at)
                                      VALUES (:cid, :eid, :old, :new, :uid, :notes, NOW())');
        $historyStmt->execute([
            ':cid'   => $candidateUserId,
            ':eid'   => $eventId,
            ':old'   => $oldStage,
            ':new'   => $stage,
            ':uid'   => $user['id'],
            ':notes' => $notes !== '' ? $notes : "Stage transition: {$oldStage} → {$stage}",
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
    $stmt = $pdo->prepare('SELECT r.id AS registration_id, r.created_at AS registered_at, r.checked_in_state, r.checked_in_at,
                                  u.id AS user_id, u.name, u.email, u.phone, u.branch, u.academic_year, u.unique_registration_id,
                                  COALESCE(e.stage, "Applied") AS stage, e.score, e.comments, e.recommendation, e.updated_at AS evaluated_at,
                                  s.id AS slot_id, s.slot_date, s.start_time, s.end_time,
                                  p.id AS panel_id, p.panel_name, p.venue_room
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

/**
 * GET /interviews/criteria?event_id=X
 */
function handleGetCriteria(array $ctx): void
{
    $pdo = Database::connect();
    $eventId = (int)($ctx['query']['event_id'] ?? 0);

    if ($eventId <= 0) {
        jsonResponse(400, ['success' => false, 'error' => 'event_id is required.']);
    }

    $stmt = $pdo->prepare('SELECT * FROM evaluation_criteria WHERE event_id = :eid ORDER BY display_order ASC, id ASC');
    $stmt->execute([':eid' => $eventId]);

    jsonResponse(200, [
        'success'  => true,
        'criteria' => $stmt->fetchAll(),
    ]);
}

/**
 * POST /interviews/criteria (Admin saves evaluation rubric parameters)
 */
function handleSaveCriteria(array $ctx): void
{
    $user     = requireAuth($ctx, ['Admin']);
    $body     = $ctx['body'];
    $eventId  = (int)($body['event_id'] ?? 0);
    $criteria = is_array($body['criteria'] ?? null) ? $body['criteria'] : [];

    if ($eventId <= 0) {
        jsonResponse(400, ['success' => false, 'error' => 'event_id is required.']);
    }

    $pdo = Database::connect();
    
    // Purge removed criteria
    $existingIds = [];
    foreach ($criteria as $c) {
        if (!empty($c['id'])) {
            $existingIds[] = (int)$c['id'];
        }
    }

    if (!empty($existingIds)) {
        $inClause = implode(',', array_map('intval', $existingIds));
        $delStmt = $pdo->prepare("DELETE FROM evaluation_criteria WHERE event_id = :eid AND id NOT IN ({$inClause})");
        $delStmt->execute([':eid' => $eventId]);
    } else {
        $delStmt = $pdo->prepare("DELETE FROM evaluation_criteria WHERE event_id = :eid");
        $delStmt->execute([':eid' => $eventId]);
    }

    // Upsert items
    $order = 0;
    $upsertStmt = $pdo->prepare('INSERT INTO evaluation_criteria (id, event_id, title, max_marks, weightage, display_order, created_at)
                                 VALUES (:id, :eid, :title, :max, :weight, :disp, NOW())
                                 ON DUPLICATE KEY UPDATE title = VALUES(title), max_marks = VALUES(max_marks), 
                                                         weightage = VALUES(weightage), display_order = VALUES(display_order)');

    foreach ($criteria as $c) {
        $title = trim($c['title'] ?? '');
        if ($title !== '') {
            $order++;
            $cId = !empty($c['id']) ? (int)$c['id'] : null;
            $max = max(1, (int)($c['max_marks'] ?? 10));
            $weight = max(1, (int)($c['weightage'] ?? 1));

            $upsertStmt->execute([
                ':id'     => $cId,
                ':eid'    => $eventId,
                ':title'  => $title,
                ':max'    => $max,
                ':weight' => $weight,
                ':disp'   => $order,
            ]);
        }
    }

    jsonResponse(200, [
        'success' => true,
        'message' => 'Evaluation criteria rubric updated successfully.',
    ]);
}

/**
 * GET /interviews/candidates/{id}/history?event_id=X
 */
function handleGetCandidateHistory(array $ctx): void
{
    $user            = requireAuth($ctx, ['Admin', 'Member']);
    $candidateUserId = (int)($ctx['params'][0] ?? 0);
    $eventId         = (int)($ctx['query']['event_id'] ?? 0);

    if ($candidateUserId <= 0 || $eventId <= 0) {
        jsonResponse(400, ['success' => false, 'error' => 'candidate_user_id and event_id are required.']);
    }

    $pdo  = Database::connect();
    $stmt = $pdo->prepare('SELECT h.*, u.name AS changed_by_name
                           FROM candidate_status_history h
                           LEFT JOIN users u ON u.id = h.changed_by_user_id
                           WHERE h.candidate_user_id = :cid AND h.event_id = :eid
                           ORDER BY h.created_at DESC');
    $stmt->execute([':cid' => $candidateUserId, ':eid' => $eventId]);

    jsonResponse(200, [
        'success' => true,
        'history' => $stmt->fetchAll(),
    ]);
}

/**
 * POST /interviews/checkin (Quick PRN / QR Desk Ticket Verification & Check-In)
 */
function handleQuickCheckinCandidate(array $ctx): void
{
    $user       = requireAuth($ctx, ['Admin', 'Member']);
    $body       = $ctx['body'];
    $eventId    = (int)($body['event_id'] ?? 0);
    $prnOrEmail = trim($body['prn_or_email'] ?? '');

    if ($eventId <= 0 || $prnOrEmail === '') {
        jsonResponse(400, ['success' => false, 'error' => 'event_id and prn_or_email are required.']);
    }

    $pdo = Database::connect();

    // Lookup user by PRN or email
    $userStmt = $pdo->prepare('SELECT u.id, u.name, u.email, u.phone, u.branch, u.academic_year, u.unique_registration_id
                               FROM users u
                               JOIN registrations r ON r.user_id = u.id
                               WHERE r.event_id = :eid AND (u.unique_registration_id = :lookup OR u.email = :lookup OR u.phone = :lookup)
                               LIMIT 1');
    $userStmt->execute([':eid' => $eventId, ':lookup' => $prnOrEmail]);
    $cand = $userStmt->fetch();

    if (!$cand) {
        jsonResponse(404, ['success' => false, 'error' => 'Candidate registration ticket not found.']);
    }

    $candId = (int)$cand['id'];

    // Update attendance state
    $updReg = $pdo->prepare('UPDATE registrations SET checked_in_state = 1, checked_in_at = NOW() WHERE user_id = :uid AND event_id = :eid');
    $updReg->execute([':uid' => $candId, ':eid' => $eventId]);

    // Update stage to Interview if currently Applied / Under Review
    $evalCheck = $pdo->prepare('SELECT id, stage FROM candidate_evaluations WHERE candidate_user_id = :cid AND event_id = :eid LIMIT 1');
    $evalCheck->execute([':cid' => $candId, ':eid' => $eventId]);
    $existingEval = $evalCheck->fetch();

    $oldStage = $existingEval ? $existingEval['stage'] : 'Applied';
    $newStage = ($oldStage === 'Applied' || $oldStage === 'Under Review' || $oldStage === 'Shortlisted') ? 'Interview' : $oldStage;

    if ($existingEval) {
        $updEval = $pdo->prepare('UPDATE candidate_evaluations SET stage = :stage, updated_at = NOW() WHERE id = :id');
        $updEval->execute([':stage' => $newStage, ':id' => $existingEval['id']]);
    } else {
        $insEval = $pdo->prepare('INSERT INTO candidate_evaluations (candidate_user_id, event_id, evaluator_user_id, stage, created_at, updated_at)
                                  VALUES (:cid, :eid, :uid, :stage, NOW(), NOW())');
        $insEval->execute([':cid' => $candId, ':eid' => $eventId, ':uid' => $user['id'], ':stage' => $newStage]);
    }

    // Log history audit
    if ($oldStage !== $newStage) {
        $hStmt = $pdo->prepare('INSERT INTO candidate_status_history (candidate_user_id, event_id, old_stage, new_stage, changed_by_user_id, notes, created_at)
                                VALUES (:cid, :eid, :old, :new, :uid, :notes, NOW())');
        $hStmt->execute([
            ':cid'   => $candId,
            ':eid'   => $eventId,
            ':old'   => $oldStage,
            ':new'   => $newStage,
            ':uid'   => $user['id'],
            ':notes' => "Desk Verification Check-in marked by {$user['name']}.",
        ]);
    }

    jsonResponse(200, [
        'success'   => true,
        'candidate' => $cand,
        'message'   => "Candidate {$cand['name']} ({$cand['unique_registration_id']}) verified & checked in successfully!",
    ]);
}

/**
 * POST /interviews/communicate (Dynamic Templated Bulk Recruitment Communication Dispatcher)
 */
function handleBulkCommunicateCandidates(array $ctx): void
{
    $user        = requireAuth($ctx, ['Admin']);
    $body        = $ctx['body'];
    $eventId     = (int)($body['event_id'] ?? 0);
    $userIds     = is_array($body['candidate_user_ids'] ?? null) ? $body['candidate_user_ids'] : [];
    $subject     = trim($body['subject'] ?? '');
    $bodyHtml    = trim($body['body_html'] ?? '');

    if ($eventId <= 0 || empty($userIds) || $subject === '' || $bodyHtml === '') {
        jsonResponse(400, ['success' => false, 'error' => 'event_id, candidate_user_ids array, subject, and body_html are required.']);
    }

    $pdo = Database::connect();

    // Fetch Event details
    $eStmt = $pdo->prepare('SELECT title FROM events WHERE id = :eid LIMIT 1');
    $eStmt->execute([':eid' => $eventId]);
    $eventRow = $eStmt->fetch();
    $eventTitle = $eventRow ? $eventRow['title'] : 'Recruitment Drive';

    $inClause = implode(',', array_map('intval', $userIds));
    $candStmt = $pdo->prepare("SELECT u.id, u.name, u.email, u.branch, u.academic_year, u.unique_registration_id,
                                      COALESCE(e.stage, 'Applied') AS stage,
                                      p.panel_name, p.venue_room, s.slot_date, s.start_time, s.end_time
                               FROM users u
                               JOIN registrations r ON (r.user_id = u.id AND r.event_id = :eid)
                               LEFT JOIN candidate_evaluations e ON (e.candidate_user_id = u.id AND e.event_id = r.event_id)
                               LEFT JOIN interview_slots s ON (s.booked_by_user_id = u.id AND s.event_id = r.event_id)
                               LEFT JOIN competition_panels p ON p.id = s.panel_id
                               WHERE u.id IN ({$inClause})");
    $candStmt->execute([':eid' => $eventId]);
    $recipients = $candStmt->fetchAll();

    $sentCount = 0;
    $failCount = 0;

    foreach ($recipients as $r) {
        $parsedBody = str_replace(
            ['{candidate_name}', '{prn}', '{event_title}', '{panel_name}', '{venue_room}', '{slot_date}', '{start_time}', '{end_time}', '{stage}'],
            [
                $r['name'],
                $r['unique_registration_id'],
                $eventTitle,
                $r['panel_name'] ?? 'Assigned Panel',
                $r['venue_room'] ?? 'TBD',
                $r['slot_date'] ?? 'Scheduled Date',
                $r['start_time'] ?? '',
                $r['end_time'] ?? '',
                $r['stage']
            ],
            $bodyHtml
        );

        $ok = sendMail($r['email'], $subject, $parsedBody);
        if ($ok) {
            $sentCount++;
        } else {
            $failCount++;
        }
    }

    // Write audit ledger
    writeAuditLog(
        $user['id'],
        "Bulk recruitment email dispatched to {$sentCount} candidates for event #{$eventId}",
        '/interviews/communicate',
        $ctx['ip']
    );

    jsonResponse(200, [
        'success'    => true,
        'sent_count' => $sentCount,
        'fail_count' => $failCount,
        'message'    => "Bulk recruitment email dispatched to {$sentCount} recipient(s).",
    ]);
}
