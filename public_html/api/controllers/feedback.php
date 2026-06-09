<?php
/**
 * ============================================================================
 * BODHANTRA EVENT OS — Custom Assessment & Feedback Evaluator (Phase 2)
 * ============================================================================
 *
 * Handlers:
 *   POST /feedback/submit   → handleSubmitFeedback() (Participant only)
 *
 * @package BodhantraOS\Controllers
 */

declare(strict_types=1);

require_once __DIR__ . '/_middleware.php';

/**
 * Submit Participant Event Feedback
 * Verifies the user is an approved event participant, checks duplicate constraints,
 * and commits the feedback payload safely to the relational DB.
 *
 * Request body:
 *   {
 *     "event_id":      1,
 *     "feedback_data": {
 *        "rating_organization": "5",
 *        "favorite_speaker":    "Dr. Alice",
 *        "suggestions":         "Include more hands-on labs next time."
 *     }
 *   }
 */
function handleSubmitFeedback(array $ctx): void
{
    // 1. Authentication — enforce signed-in session
    $user = requireAuth($ctx);

    $body = $ctx['body'];

    $eventId      = (int)($body['event_id'] ?? 0);
    $feedbackData = $body['feedback_data'] ?? null;

    if ($eventId <= 0 || $feedbackData === null || !is_array($feedbackData)) {
        jsonResponse(400, [
            'success' => false,
            'error'   => 'Invalid or missing parameters (event_id, feedback_data must be a valid key-value object).',
        ]);
    }

    $pdo = Database::connect();

    // 2. Verified Participant check — user must have status = 'Approved' for this event
    $regStmt = $pdo->prepare(
        'SELECT id, status, participant_id
         FROM event_registrations
         WHERE event_id = :eid AND user_id = :uid
         LIMIT 1'
    );
    $regStmt->execute([
        ':eid' => $eventId,
        ':uid' => $user['id'],
    ]);
    $registration = $regStmt->fetch(PDO::FETCH_ASSOC);

    if (!$registration) {
        jsonResponse(403, [
            'success' => false,
            'error'   => 'Access Denied: You are not registered for this event.',
        ]);
    }

    if ($registration['status'] !== 'Approved') {
        jsonResponse(403, [
            'success' => false,
            'error'   => 'Access Denied: Only approved participants can submit feedback.',
            'status'  => $registration['status'],
        ]);
    }

    // 3. Prevent dual submission check
    $checkStmt = $pdo->prepare(
        'SELECT submitted_at
         FROM feedback_submissions
         WHERE event_id = :eid AND user_id = :uid
         LIMIT 1'
    );
    $checkStmt->execute([
        ':eid' => $eventId,
        ':uid' => $user['id'],
    ]);
    $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);

    if ($existing) {
        jsonResponse(409, [
            'success' => false,
            'error'   => 'You have already submitted your assessment feedback for this event.',
            'submitted_at' => $existing['submitted_at'],
        ]);
    }

    // 4. Save dynamic feedback answers into feedback_submissions table
    try {
        $feedbackJson = json_encode($feedbackData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        
        $insert = $pdo->prepare(
            'INSERT INTO feedback_submissions (event_id, user_id, feedback_data_json, submitted_at)
             VALUES (:eid, :uid, :feedback, NOW())'
        );
        $insert->execute([
            ':eid'      => $eventId,
            ':uid'      => $user['id'],
            ':feedback' => $feedbackJson,
        ]);
    } catch (\Throwable $e) {
        error_log('[BodhantraOS][Feedback] Submit failed: ' . $e->getMessage());
        jsonResponse(500, [
            'success' => false,
            'error'   => 'Failed to save feedback submission. Please try again.',
        ]);
    }

    // Write audit trail entry
    writeAuditLog(
        (int)$user['id'],
        "Submitted feedback for event #{$eventId} as {$registration['participant_id']}",
        "/api/feedback/submit",
        $ctx['ip']
    );

    // 5. Respond cleanly
    jsonResponse(201, [
        'success' => true,
        'message' => 'Feedback submitted cleanly. Thank you for your contribution!',
    ]);
}

/**
 * Fetch all feedback submissions for a specific event.
 *
 * RBAC: Admin only.
 */
function handleGetEventFeedback(array $ctx): void
{
    $user = requireAuth($ctx, ['Admin']);
    $eventId = (int)($ctx['params']['event_id'] ?? 0);

    if ($eventId <= 0) {
        jsonResponse(400, [
            'success' => false,
            'error'   => 'Invalid event ID.',
        ]);
    }

    $pdo = Database::connect();

    // Verify event exists
    $stmt = $pdo->prepare('SELECT id, title FROM events WHERE id = :eid LIMIT 1');
    $stmt->execute([':eid' => $eventId]);
    $event = $stmt->fetch();

    if (!$event) {
        jsonResponse(404, [
            'success' => false,
            'error'   => 'Event not found.',
        ]);
    }

    $fbStmt = $pdo->prepare(
        'SELECT f.id,
                f.user_id,
                u.name AS participant_name,
                u.email AS participant_email,
                f.feedback_data_json,
                f.submitted_at
         FROM feedback_submissions f
         INNER JOIN users u ON u.id = f.user_id
         WHERE f.event_id = :eid
         ORDER BY f.submitted_at DESC'
    );
    $fbStmt->execute([':eid' => $eventId]);
    $submissions = $fbStmt->fetchAll();

    // Parse the JSON data for each submission
    foreach ($submissions as &$sub) {
        $sub['feedback_data'] = json_decode($sub['feedback_data_json'], true);
        unset($sub['feedback_data_json']);
    }
    unset($sub);

    jsonResponse(200, [
        'success'     => true,
        'event_title' => $event['title'],
        'submissions' => $submissions,
    ]);
}
