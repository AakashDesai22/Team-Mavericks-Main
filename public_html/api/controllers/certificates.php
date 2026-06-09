<?php
/**
 * ============================================================================
 * BODHANTRA EVENT OS — Certificate Templates Controller
 * ============================================================================
 *
 * Manages certificate design coordinates and background assets:
 *   • POST /certificates/template  →  handleSaveTemplate()
 *   • GET  /certificates/template  →  handleGetTemplate()
 *
 * Coordinates are stored as percentage scales mapping to standard A4 canvas grids.
 * This completely avoids server-side PDF generation memory exhaustion.
 *
 * RBAC: Admin only for saving; all authenticated users can get templates.
 *
 * @package BodhantraOS\Controllers
 */

declare(strict_types=1);

require_once __DIR__ . '/_middleware.php';

/** Maximum allowed template background size (6 MB). */
define('TEMPLATE_MAX_FILE_SIZE', 6 * 1024 * 1024);

/** Whitelist of template image mime types. */
define('TEMPLATE_ALLOWED_MIMES', [
    'image/jpeg',
    'image/png',
]);

/**
 * Resolve absolute templates storage directory:
 * e.g. public_html/public/uploads/templates/
 */
function getTemplatesUploadDir(): string
{
    return dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'templates';
}


// ===========================================================================
// POST /certificates/template (Admin Only)
// ===========================================================================

/**
 * Create or update a certificate template.
 *
 * Expected multipart/form-data fields:
 *   - event_id                  (string/int) — Target event ID
 *   - template_name             (string)     — Name/Category of award
 *   - elements                  (JSON string)— Draggable nodes percentage maps
 *   - background                (file)       — Optional new template image asset
 *   - existing_background_path  (string)     — Optional path if keeping old bg
 */
function handleSaveTemplate(array $ctx): void
{
    // 1. RBAC — only Admins can create and save certificate templates.
    $user = requireAuth($ctx, ['Admin']);

    // 2. Extract and validate text parameters
    $eventId      = (int)($_POST['event_id'] ?? 0);
    $templateName = trim($_POST['template_name'] ?? '');
    $elementsJson = trim($_POST['elements'] ?? '');

    if ($eventId <= 0) {
        jsonResponse(400, ['success' => false, 'error' => '"event_id" is required and must be a positive integer.']);
    }
    if ($templateName === '') {
        jsonResponse(400, ['success' => false, 'error' => '"template_name" cannot be blank.']);
    }
    if ($elementsJson === '') {
        jsonResponse(400, ['success' => false, 'error' => '"elements" coordinate array is required.']);
    }

    // Verify elements is a valid JSON string
    json_decode($elementsJson);
    if (json_last_error() !== JSON_ERROR_NONE) {
        jsonResponse(400, ['success' => false, 'error' => '"elements" must be a valid JSON array string.']);
    }

    $pdo = Database::connect();

    // Verify target event exists
    $evtStmt = $pdo->prepare('SELECT id, title FROM events WHERE id = :eid LIMIT 1');
    $evtStmt->execute([':eid' => $eventId]);
    $event = $evtStmt->fetch();
    if (!$event) {
        jsonResponse(404, ['success' => false, 'error' => 'Target event context not found.']);
    }

    // Check if an existing template exists for this event
    $existStmt = $pdo->prepare('SELECT id, background_path FROM certificate_templates WHERE event_id = :eid LIMIT 1');
    $existStmt->execute([':eid' => $eventId]);
    $existing = $existStmt->fetch();

    $backgroundPath = '';

    // 3. File upload interception & validations
    if (!empty($ctx['files']['background'])) {
        $file = $ctx['files']['background'];

        // Verify no PHP upload errors
        if ($file['error'] !== UPLOAD_ERR_OK) {
            jsonResponse(400, ['success' => false, 'error' => 'File upload error occurred on server.']);
        }

        // Enforce file size limit
        if ($file['size'] > TEMPLATE_MAX_FILE_SIZE) {
            jsonResponse(400, ['success' => false, 'error' => 'File exceeds template limit (6 MB max).']);
        }

        // Validate MIME magic bytes forensic signature
        $mime = mime_content_type($file['tmp_name']);
        if (!in_array($mime, TEMPLATE_ALLOWED_MIMES, true)) {
            jsonResponse(400, ['success' => false, 'error' => 'Invalid image format. Only JPEGs and PNGs are accepted.']);
        }

        // Safe cryptographic renaming to prevent traversal attacks
        $ext = ($mime === 'image/png') ? '.png' : '.jpg';
        $safeName = 't_' . uniqid('', true) . '_' . bin2hex(random_bytes(3)) . $ext;

        // Ensure storage folder exists
        $uploadDir = getTemplatesUploadDir();
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        $destPath = $uploadDir . DIRECTORY_SEPARATOR . $safeName;
        
        if (!move_uploaded_file($file['tmp_name'], $destPath)) {
            jsonResponse(500, ['success' => false, 'error' => 'Failed to write background image asset to disk.']);
        }

        $backgroundPath = 'public/uploads/templates/' . $safeName;

        // Clean up old template file if overwriting background to save storage
        if ($existing && $existing['background_path']) {
            $oldFile = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $existing['background_path']);
            if (file_exists($oldFile)) {
                @unlink($oldFile);
            }
        }
    } else {
        // Keeping old background file
        $existingPath = trim($_POST['existing_background_path'] ?? '');
        if ($existingPath !== '') {
            $backgroundPath = $existingPath;
        } else if ($existing) {
            $backgroundPath = $existing['background_path'];
        } else {
            jsonResponse(400, ['success' => false, 'error' => 'Background image is required. Upload a JPEG/PNG file.']);
        }
    }

    // 4. Save template coordinates upsert
    $pdo->beginTransaction();
    try {
        if ($existing) {
            // Update
            $update = $pdo->prepare(
                'UPDATE certificate_templates
                 SET template_name = :name,
                     background_path = :bg,
                     elements_json = :elem,
                     updated_at = NOW()
                 WHERE id = :id'
            );
            $update->execute([
                ':name' => $templateName,
                ':bg'   => $backgroundPath,
                ':elem' => $elementsJson,
                ':id'   => $existing['id']
            ]);
            $templateId = (int)$existing['id'];
        } else {
            // Insert new
            $insert = $pdo->prepare(
                'INSERT INTO certificate_templates (event_id, template_name, background_path, elements_json, created_by, created_at, updated_at)
                 VALUES (:eid, :name, :bg, :elem, :creator, NOW(), NOW())'
            );
            $insert->execute([
                ':eid'     => $eventId,
                ':name'    => $templateName,
                ':bg'      => $backgroundPath,
                ':elem'    => $elementsJson,
                ':creator' => $user['id']
            ]);
            $templateId = (int)$pdo->lastInsertId();
        }
        $pdo->commit();
    } catch (\Throwable $e) {
        $pdo->rollBack();
        error_log('[BodhantraOS][Certificates] Save failed: ' . $e->getMessage());
        jsonResponse(500, ['success' => false, 'error' => 'Failed to save certificate template coordinates.']);
    }

    // 5. Audit Log
    writeAuditLog(
        (int)$user['id'],
        "Saved certificate template coordinates #{$templateId} for event '{$event['title']}'",
        '/api/certificates/template',
        $ctx['ip']
    );

    jsonResponse(200, [
        'success'         => true,
        'message'         => 'Template blueprint saved successfully.',
        'template_id'     => $templateId,
        'event_id'        => $eventId,
        'background_path' => $backgroundPath
    ]);
}


// ===========================================================================
// GET /certificates/template (All authenticated users)
// ===========================================================================

/**
 * Retrieve the certificate template coordinates layout for an event.
 *
 * Query params:
 *   ?event_id=3
 */
function handleGetTemplate(array $ctx): void
{
    // Any authenticated user can read coordinate metadata to execute compilation
    $user    = requireAuth($ctx);
    $eventId = (int)($ctx['query']['event_id'] ?? 0);

    if ($eventId <= 0) {
        jsonResponse(400, ['success' => false, 'error' => '"event_id" query parameter is required.']);
    }

    $pdo = Database::connect();

    $stmt = $pdo->prepare(
        'SELECT id, event_id, template_name, background_path, elements_json
         FROM certificate_templates
         WHERE event_id = :eid
         LIMIT 1'
    );
    $stmt->execute([':eid' => $eventId]);
    $template = $stmt->fetch();

    if (!$template) {
        jsonResponse(200, [
            'success'  => true,
            'template' => null,
            'message'  => 'No certificate template designed for this event.'
        ]);
    }

    // Decode elements list back into array elements
    $template['elements_json'] = is_string($template['elements_json'])
        ? json_decode($template['elements_json'], true)
        : $template['elements_json'];

    jsonResponse(200, [
        'success'  => true,
        'template' => $template
    ]);
}


// ===========================================================================
// GET /certificates/verify (programmatic programmatic check-ins)
// ===========================================================================

/**
 * Retrieve validation data for a certificate ID.
 */
function handleVerifyCertificate(array $ctx): void
{
    $user = requireAuth($ctx);
    $code = trim($ctx['query']['id'] ?? '');

    if ($code === '') {
        jsonResponse(400, ['success' => false, 'error' => '"id" parameter is required.']);
    }

    $pdo = Database::connect();

    $stmt = $pdo->prepare(
        "SELECT u.name, u.branch, er.participant_id, er.status, e.title AS event_title, e.event_date
         FROM event_registrations er
         INNER JOIN users u ON u.id = er.user_id
         INNER JOIN events e ON e.id = er.event_id
         WHERE er.participant_id = :code AND er.status = 'Approved'
         LIMIT 1"
    );
    $stmt->execute([':code' => $code]);
    $verified = $stmt->fetch();

    if (!$verified) {
        jsonResponse(404, [
            'success' => false,
            'error'   => 'Verification failed. Unregistered or unpaid credentials ledger.'
        ]);
    }

    jsonResponse(200, [
        'success'      => true,
        'verified'     => true,
        'holder_name'  => $verified['name'],
        'department'   => $verified['branch'],
        'registration' => $verified['participant_id'],
        'event'        => $verified['event_title'],
        'event_date'   => $verified['event_date'],
        'message'      => 'Authentic certificate verified.'
    ]);
}

/** Helper function to replicate PHP's normal gettype() for cleaner data checks */
function typeof($var): string
{
    return gettype($var);
}
