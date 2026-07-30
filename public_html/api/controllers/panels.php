<?php
/**
 * ============================================================================
 * BODHANTRA EVENT OS — Competition & Interview Panels Controller
 * ============================================================================
 *
 * Handles creation of GD/Debate/Interview panels, candidate allocation,
 * judge assignments, and topic management:
 *   • GET    /panels?event_id=X            → handleListPanels()
 *   • POST   /panels                       → handleCreatePanel()
 *   • POST   /panels/{id}/allocate         → handleAllocateCandidates()
 *   • POST   /panels/{id}/judges           → handleAssignJudges()
 *   • GET    /panels/topics?event_id=X     → handleListTopics()
 *   • POST   /panels/topics                → handleCreateTopic()
 *
 * @package BodhantraOS\Controllers
 */

declare(strict_types=1);

require_once __DIR__ . '/_middleware.php';

/**
 * GET /panels
 */
function handleListPanels(array $ctx): void
{
    $pdo = Database::connect();
    $eventId = (int)($ctx['query']['event_id'] ?? 0);

    if ($eventId <= 0) {
        jsonResponse(400, ['success' => false, 'error' => 'event_id is required.']);
    }

    $stmt = $pdo->prepare('SELECT p.*,
                                 (SELECT COUNT(*) FROM panel_allocations pa WHERE pa.panel_id = p.id) AS allocated_candidates_count,
                                 (SELECT COUNT(*) FROM judge_assignments ja WHERE ja.panel_id = p.id) AS assigned_judges_count
                          FROM competition_panels p
                          WHERE p.event_id = :eid
                          ORDER BY p.created_at ASC');
    $stmt->execute([':eid' => $eventId]);
    $panels = $stmt->fetchAll();

    foreach ($panels as &$panel) {
        // Fetch allocated candidates
        $cStmt = $pdo->prepare('SELECT pa.id AS allocation_id, pa.candidate_role, pa.allocated_at, u.id AS user_id, u.name, u.email, u.branch, u.academic_year
                                FROM panel_allocations pa
                                JOIN users u ON u.id = pa.user_id
                                WHERE pa.panel_id = :pid');
        $cStmt->execute([':pid' => $panel['id']]);
        $panel['candidates'] = $cStmt->fetchAll();

        // Fetch assigned judges/interviewers
        $jStmt = $pdo->prepare('SELECT ja.id AS assignment_id, ja.assigned_role, ja.created_at, u.id AS user_id, u.name, u.email
                                FROM judge_assignments ja
                                JOIN users u ON u.id = ja.judge_user_id
                                WHERE ja.panel_id = :pid');
        $jStmt->execute([':pid' => $panel['id']]);
        $panel['judges'] = $jStmt->fetchAll();
    }
    unset($panel);

    jsonResponse(200, [
        'success' => true,
        'panels'  => $panels,
    ]);
}

/**
 * POST /panels
 */
function handleCreatePanel(array $ctx): void
{
    $user = requireAuth($ctx, ['Admin']);
    $body = $ctx['body'];

    $eventId      = (int)($body['event_id'] ?? 0);
    $subEventId   = !empty($body['sub_event_id']) ? (int)$body['sub_event_id'] : null;
    $panelName    = trim($body['panel_name'] ?? '');
    $venueRoom    = trim($body['venue_room'] ?? '');
    $maxCap       = max(1, (int)($body['max_candidates'] ?? 100));
    $judgeUserIds = is_array($body['judge_user_ids'] ?? null) ? $body['judge_user_ids'] : [];

    if ($eventId <= 0 || $panelName === '') {
        jsonResponse(400, ['success' => false, 'error' => 'event_id and panel_name are required.']);
    }

    $pdo = Database::connect();
    $stmt = $pdo->prepare('INSERT INTO competition_panels (event_id, sub_event_id, panel_name, venue_room, max_candidates, status, created_at, updated_at)
                           VALUES (:eid, :sub_id, :name, :venue, :max, "Scheduled", NOW(), NOW())');
    $stmt->execute([
        ':eid'    => $eventId,
        ':sub_id' => $subEventId,
        ':name'   => $panelName,
        ':venue'  => $venueRoom !== '' ? $venueRoom : null,
        ':max'    => $maxCap,
    ]);

    $panelId = (int)$pdo->lastInsertId();

    // Assign team member interviewers if provided
    if (!empty($judgeUserIds)) {
        $jStmt = $pdo->prepare('INSERT INTO judge_assignments (panel_id, judge_user_id, assigned_role, created_at)
                                VALUES (:pid, :jid, "Interviewer", NOW())
                                ON DUPLICATE KEY UPDATE assigned_role = VALUES(assigned_role)');
        foreach ($judgeUserIds as $jid) {
            $jStmt->execute([
                ':pid' => $panelId,
                ':jid' => (int)$jid,
            ]);
        }
    }

    jsonResponse(201, [
        'success'  => true,
        'message'  => 'Interview Panel created successfully.',
        'panel_id' => $panelId,
    ]);
}

/**
 * POST /panels/{id}/allocate
 */
function handleAllocateCandidates(array $ctx): void
{
    $user    = requireAuth($ctx, ['Admin']);
    $panelId = (int)($ctx['params']['panel_id'] ?? 0);
    $body    = $ctx['body'];

    $userIds       = is_array($body['user_ids'] ?? null) ? $body['user_ids'] : [];
    $candidateRole = trim($body['candidate_role'] ?? 'Participant');

    if ($panelId <= 0 || empty($userIds)) {
        jsonResponse(400, ['success' => false, 'error' => 'panel_id and user_ids array are required.']);
    }

    $pdo  = Database::connect();
    $stmt = $pdo->prepare('INSERT INTO panel_allocations (panel_id, user_id, candidate_role, allocated_at)
                           VALUES (:pid, :uid, :role, NOW())
                           ON DUPLICATE KEY UPDATE candidate_role = VALUES(candidate_role)');

    $allocatedCount = 0;
    foreach ($userIds as $uid) {
        $stmt->execute([
            ':pid'  => $panelId,
            ':uid'  => (int)$uid,
            ':role' => $candidateRole,
        ]);
        $allocatedCount++;
    }

    jsonResponse(200, [
        'success'   => true,
        'message'   => "Allocated {$allocatedCount} candidates to panel.",
        'panel_id'  => $panelId,
    ]);
}

/**
 * POST /panels/{id}/judges
 */
function handleAssignJudges(array $ctx): void
{
    $user    = requireAuth($ctx, ['Admin']);
    $panelId = (int)($ctx['params']['panel_id'] ?? 0);
    $body    = $ctx['body'];

    $judgeUserId  = (int)($body['judge_user_id'] ?? 0);
    $assignedRole = trim($body['assigned_role'] ?? 'Judge');

    if ($panelId <= 0 || $judgeUserId <= 0) {
        jsonResponse(400, ['success' => false, 'error' => 'panel_id and judge_user_id are required.']);
    }

    $pdo  = Database::connect();
    $stmt = $pdo->prepare('INSERT INTO judge_assignments (panel_id, judge_user_id, assigned_role, created_at)
                           VALUES (:pid, :jid, :role, NOW())
                           ON DUPLICATE KEY UPDATE assigned_role = VALUES(assigned_role)');
    $stmt->execute([
        ':pid'  => $panelId,
        ':jid'  => $judgeUserId,
        ':role' => $assignedRole,
    ]);

    jsonResponse(200, [
        'success'  => true,
        'message'  => 'Judge assigned successfully.',
        'panel_id' => $panelId,
    ]);
}

/**
 * GET /panels/topics
 */
function handleListTopics(array $ctx): void
{
    $pdo     = Database::connect();
    $eventId = (int)($ctx['query']['event_id'] ?? 0);

    if ($eventId <= 0) {
        jsonResponse(400, ['success' => false, 'error' => 'event_id parameter required.']);
    }

    $stmt = $pdo->prepare('SELECT * FROM panel_topics WHERE event_id = :eid ORDER BY created_at DESC');
    $stmt->execute([':eid' => $eventId]);

    jsonResponse(200, [
        'success' => true,
        'topics'  => $stmt->fetchAll(),
    ]);
}

/**
 * POST /panels/topics
 */
function handleCreateTopic(array $ctx): void
{
    $user = requireAuth($ctx, ['Admin']);
    $body = $ctx['body'];

    $eventId    = (int)($body['event_id'] ?? 0);
    $subEventId = !empty($body['sub_event_id']) ? (int)$body['sub_event_id'] : null;
    $title      = trim($body['topic_title'] ?? '');
    $desc       = trim($body['topic_description'] ?? '');
    $category   = trim($body['category'] ?? 'General');
    $difficulty = trim($body['difficulty'] ?? 'Medium');

    if ($eventId <= 0 || $title === '') {
        jsonResponse(400, ['success' => false, 'error' => 'event_id and topic_title are required.']);
    }

    $pdo  = Database::connect();
    $stmt = $pdo->prepare('INSERT INTO panel_topics (event_id, sub_event_id, topic_title, topic_description, category, difficulty, created_at)
                           VALUES (:eid, :sub_id, :title, :desc, :cat, :diff, NOW())');
    $stmt->execute([
        ':eid'    => $eventId,
        ':sub_id' => $subEventId,
        ':title'  => $title,
        ':desc'   => $desc !== '' ? $desc : null,
        ':cat'    => $category,
        ':diff'   => $difficulty,
    ]);

    jsonResponse(201, [
        'success'  => true,
        'topic_id' => (int)$pdo->lastInsertId(),
        'message'  => 'Topic added to pool.',
    ]);
}

/**
 * PUT /panels/{id}
 */
function handleUpdatePanel(array $ctx): void
{
    $user    = requireAuth($ctx, ['Admin']);
    $panelId = (int)($ctx['params']['id'] ?? 0);
    $body    = $ctx['body'];

    $panelName    = trim($body['panel_name'] ?? '');
    $venueRoom    = trim($body['venue_room'] ?? '');
    $judgeUserIds = is_array($body['judge_user_ids'] ?? null) ? $body['judge_user_ids'] : null;

    if ($panelId <= 0 || $panelName === '') {
        jsonResponse(400, ['success' => false, 'error' => 'panel_id and panel_name are required.']);
    }

    $pdo = Database::connect();
    $stmt = $pdo->prepare('UPDATE competition_panels SET panel_name = :name, venue_room = :venue, updated_at = NOW() WHERE id = :pid');
    $stmt->execute([
        ':name'  => $panelName,
        ':venue' => $venueRoom !== '' ? $venueRoom : null,
        ':pid'   => $panelId,
    ]);

    if ($judgeUserIds !== null) {
        $del = $pdo->prepare('DELETE FROM judge_assignments WHERE panel_id = :pid');
        $del->execute([':pid' => $panelId]);

        $jStmt = $pdo->prepare('INSERT INTO judge_assignments (panel_id, judge_user_id, assigned_role, created_at) VALUES (:pid, :jid, "Interviewer", NOW())');
        foreach ($judgeUserIds as $jid) {
            $jStmt->execute([':pid' => $panelId, ':jid' => (int)$jid]);
        }
    }

    jsonResponse(200, ['success' => true, 'message' => 'Panel updated successfully.']);
}

/**
 * DELETE /panels/{id}
 */
function handleDeletePanel(array $ctx): void
{
    $user    = requireAuth($ctx, ['Admin']);
    $panelId = (int)($ctx['params']['id'] ?? 0);

    if ($panelId <= 0) {
        jsonResponse(400, ['success' => false, 'error' => 'panel_id is required.']);
    }

    $pdo = Database::connect();
    $stmt = $pdo->prepare('DELETE FROM competition_panels WHERE id = :pid');
    $stmt->execute([':pid' => $panelId]);

    jsonResponse(200, ['success' => true, 'message' => 'Panel deleted successfully.']);
}
