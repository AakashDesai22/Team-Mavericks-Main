<?php
/**
 * ============================================================================
 * BODHANTRA EVENT OS — Voucher Upload Controller (GD Processing Pipeline)
 * ============================================================================
 *
 * Handles payment screenshot uploads with a full server-side image
 * processing pipeline:
 *
 *   POST /upload/voucher  →  handleVoucherUpload()
 *
 * Security layers:
 *   1. Authentication (any tier can upload for themselves).
 *   2. File-presence validation.
 *   3. MIME-type forensic verification (magic bytes, not extension).
 *   4. File-size enforcement (max 10 MB raw upload).
 *   5. Cryptographic file renaming (prevents directory traversal).
 *   6. GD Library compression pipeline:
 *      - Downscale width to ≤ 800px (aspect-ratio locked).
 *      - Re-encode as 70% quality JPEG.
 *      - Destroy in-memory canvases to prevent memory leaks.
 *   7. Database record linkage (registration → voucher_path).
 *
 * Storage target: public_html/public/uploads/vouchers/
 * Stored path:    public/uploads/vouchers/<hash>.jpg (relative to web root)
 *
 * @package BodhantraOS\Controllers
 */

declare(strict_types=1);

require_once __DIR__ . '/_middleware.php';

/** Maximum allowed file size in bytes (10 MB). */
define('VOUCHER_MAX_FILE_SIZE', 10 * 1024 * 1024);

/** Maximum width in pixels before downscaling. */
define('VOUCHER_MAX_WIDTH', 800);

/** JPEG output quality (0–100). 70% balances clarity vs. disk footprint. */
define('VOUCHER_JPEG_QUALITY', 70);

/** Whitelist of accepted MIME types. */
define('VOUCHER_ALLOWED_MIMES', [
    'image/jpeg',
    'image/png',
    'image/webp',
]);

/**
 * Absolute path to the upload destination directory.
 * Resolved relative to the api/ directory → ../public/uploads/vouchers/
 */
function getVoucherUploadDir(): string
{
    return realpath(__DIR__ . '/../../public') !== false
        ? realpath(__DIR__ . '/../../public') . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'vouchers'
        : dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'vouchers';
}


// ===========================================================================
// POST /upload/voucher
// ===========================================================================

/**
 * Process a payment voucher upload.
 *
 * Expected multipart/form-data fields:
 *   - voucher   (file)   — The payment screenshot image.
 *   - event_id  (string) — The event the participant is registering for.
 *
 * The event_id may come from the multipart form fields ($_POST) or from
 * the JSON body if the client sends it as a separate field.  We check both.
 */
function handleVoucherUpload(array $ctx): void
{
    // -----------------------------------------------------------------------
    // 1. Authentication — any authenticated user can upload a voucher.
    // -----------------------------------------------------------------------
    $user = requireAuth($ctx);

    // -----------------------------------------------------------------------
    // 2. Extract event_id from form data or JSON body.
    //    For multipart uploads, PHP populates $_POST for text fields and
    //    $_FILES for file fields.  The gateway passes $_FILES as $ctx['files'].
    // -----------------------------------------------------------------------
    $eventId = (int)(
        $_POST['event_id']
        ?? $ctx['body']['event_id']
        ?? $ctx['query']['event_id']
        ?? 0
    );

    if ($eventId <= 0) {
        jsonResponse(400, [
            'success' => false,
            'error'   => '"event_id" is required and must be a positive integer.',
        ]);
    }

    // -----------------------------------------------------------------------
    // 3. Verify the event exists and is Active.
    // -----------------------------------------------------------------------
    $pdo = Database::connect();

    $evtStmt = $pdo->prepare(
        'SELECT id, title, status, max_capacity FROM events WHERE id = :eid LIMIT 1'
    );
    $evtStmt->execute([':eid' => $eventId]);
    $event = $evtStmt->fetch();

    if (!$event) {
        jsonResponse(404, [
            'success' => false,
            'error'   => 'Event not found.',
        ]);
    }

    if ($event['status'] !== 'Active') {
        jsonResponse(400, [
            'success' => false,
            'error'   => 'Registrations are not open for this event.',
        ]);
    }

    // -----------------------------------------------------------------------
    // 4. Check if the user already has a registration for this event.
    //    If they do, we update the voucher; otherwise, we create a new row.
    // -----------------------------------------------------------------------
    $existingReg = $pdo->prepare(
        'SELECT id, status, voucher_path FROM registrations
         WHERE user_id = :uid AND event_id = :eid
         LIMIT 1'
    );
    $existingReg->execute([
        ':uid' => $user['id'],
        ':eid' => $eventId,
    ]);
    $registration = $existingReg->fetch();

    // If already approved, don't allow re-upload.
    if ($registration && $registration['status'] === 'Approved') {
        jsonResponse(400, [
            'success' => false,
            'error'   => 'Your registration is already approved. Voucher re-upload is not permitted.',
        ]);
    }

    // -----------------------------------------------------------------------
    // 5. File Interception — verify a file was actually uploaded.
    // -----------------------------------------------------------------------
    if (empty($ctx['files']['voucher'])) {
        jsonResponse(400, [
            'success' => false,
            'error'   => 'No file uploaded. Please attach a payment voucher image as the "voucher" field.',
        ]);
    }

    $file = $ctx['files']['voucher'];

    // Check for PHP upload errors.
    if ($file['error'] !== UPLOAD_ERR_OK) {
        $uploadErrors = [
            UPLOAD_ERR_INI_SIZE   => 'File exceeds the server\'s maximum upload size.',
            UPLOAD_ERR_FORM_SIZE  => 'File exceeds the form\'s maximum upload size.',
            UPLOAD_ERR_PARTIAL    => 'File was only partially uploaded.',
            UPLOAD_ERR_NO_FILE    => 'No file was uploaded.',
            UPLOAD_ERR_NO_TMP_DIR => 'Server missing temporary folder.',
            UPLOAD_ERR_CANT_WRITE => 'Server failed to write file to disk.',
            UPLOAD_ERR_EXTENSION  => 'Upload blocked by a PHP extension.',
        ];
        $msg = $uploadErrors[$file['error']] ?? 'Unknown upload error.';
        jsonResponse(400, [
            'success' => false,
            'error'   => $msg,
        ]);
    }

    // -----------------------------------------------------------------------
    // 6. File-Size Enforcement (defence-in-depth — Apache/PHP limits may
    //    also restrict this, but we enforce explicitly).
    // -----------------------------------------------------------------------
    if ($file['size'] > VOUCHER_MAX_FILE_SIZE) {
        $maxMB = VOUCHER_MAX_FILE_SIZE / (1024 * 1024);
        jsonResponse(400, [
            'success' => false,
            'error'   => "File size exceeds the maximum allowed ({$maxMB} MB).",
        ]);
    }

    // -----------------------------------------------------------------------
    // 7. MIME-Type Forensic Verification
    //    DO NOT trust $file['type'] — it is provided by the client and can
    //    be spoofed.  Use mime_content_type() which reads the file's magic
    //    bytes (file signature) from the actual binary on disk.
    // -----------------------------------------------------------------------
    $detectedMime = mime_content_type($file['tmp_name']);

    if ($detectedMime === false || !in_array($detectedMime, VOUCHER_ALLOWED_MIMES, true)) {
        jsonResponse(400, [
            'success' => false,
            'error'   => 'Invalid file type. Only JPEG, PNG, and WebP images are accepted.',
            'detected_mime' => $detectedMime ?: 'unknown',
        ]);
    }

    // Secondary verification: attempt to read image dimensions.
    // getimagesize() also inspects magic bytes and will return false for
    // non-images even if the MIME type was somehow spoofed.
    $imageInfo = @getimagesize($file['tmp_name']);
    if ($imageInfo === false) {
        jsonResponse(400, [
            'success' => false,
            'error'   => 'File does not appear to be a valid image. Upload rejected.',
        ]);
    }

    // -----------------------------------------------------------------------
    // 8. Cryptographic File Renaming
    //    Generate a filename that:
    //    - Contains no user-controlled segments (prevents path traversal).
    //    - Is unique (uniqid + random_bytes → collision-proof).
    //    - Uses a safe .jpg extension (output is always JPEG after GD).
    // -----------------------------------------------------------------------
    $safeFilename = uniqid('v_', true) . '_' . bin2hex(random_bytes(4)) . '.jpg';

    // -----------------------------------------------------------------------
    // 9. Ensure the destination directory exists.
    // -----------------------------------------------------------------------
    $uploadDir = getVoucherUploadDir();

    if (!is_dir($uploadDir)) {
        if (!mkdir($uploadDir, 0755, true)) {
            error_log('[BodhantraOS][Voucher] Failed to create upload directory: ' . $uploadDir);
            jsonResponse(500, [
                'success' => false,
                'error'   => 'Server storage error. Contact an administrator.',
            ]);
        }
    }

    $destinationPath = $uploadDir . DIRECTORY_SEPARATOR . $safeFilename;

    // -----------------------------------------------------------------------
    // 10. GD Compression Pipeline
    // -----------------------------------------------------------------------
    $sourceImage = null;

    try {
        // Create a GD image resource from the uploaded file based on type.
        switch ($detectedMime) {
            case 'image/jpeg':
                $sourceImage = @imagecreatefromjpeg($file['tmp_name']);
                break;
            case 'image/png':
                $sourceImage = @imagecreatefrompng($file['tmp_name']);
                break;
            case 'image/webp':
                $sourceImage = @imagecreatefromwebp($file['tmp_name']);
                break;
        }

        if ($sourceImage === false || $sourceImage === null) {
            jsonResponse(400, [
                'success' => false,
                'error'   => 'Failed to decode image data. The file may be corrupted.',
            ]);
        }

        // -----------------------------------------------------------------
        // Extract spatial metrics.
        // -----------------------------------------------------------------
        $srcWidth  = imagesx($sourceImage);
        $srcHeight = imagesy($sourceImage);

        // -----------------------------------------------------------------
        // Downscale if width exceeds 800px, maintaining aspect ratio.
        //
        //   newHeight = originalHeight × (maxWidth / originalWidth)
        //
        // If the image is already ≤ 800px wide, we skip resizing but still
        // re-encode at 70% quality to normalize file size.
        // -----------------------------------------------------------------
        if ($srcWidth > VOUCHER_MAX_WIDTH) {
            $scale    = VOUCHER_MAX_WIDTH / $srcWidth;
            $dstWidth  = VOUCHER_MAX_WIDTH;
            $dstHeight = (int)round($srcHeight * $scale);

            // Create a clean destination canvas.
            $destImage = imagecreatetruecolor($dstWidth, $dstHeight);

            if ($destImage === false) {
                imagedestroy($sourceImage);
                jsonResponse(500, [
                    'success' => false,
                    'error'   => 'Image processing failed (canvas allocation).',
                ]);
            }

            // Preserve transparency for PNG source (converted to white bg).
            $white = imagecolorallocate($destImage, 255, 255, 255);
            imagefill($destImage, 0, 0, $white);

            // Execute high-performance bicubic resample.
            imagecopyresampled(
                $destImage,                        // dst image
                $sourceImage,                      // src image
                0, 0,                              // dst x, y
                0, 0,                              // src x, y
                $dstWidth, $dstHeight,             // dst width, height
                $srcWidth, $srcHeight              // src width, height
            );

            // Destroy the source — we only need the resampled version.
            imagedestroy($sourceImage);
            $sourceImage = $destImage;
        } else {
            // No resize needed, but for PNG/WebP sources we need to fill
            // the background with white before JPEG encoding.
            if ($detectedMime !== 'image/jpeg') {
                $canvas = imagecreatetruecolor($srcWidth, $srcHeight);
                $white = imagecolorallocate($canvas, 255, 255, 255);
                imagefill($canvas, 0, 0, $white);
                imagecopy($canvas, $sourceImage, 0, 0, 0, 0, $srcWidth, $srcHeight);
                imagedestroy($sourceImage);
                $sourceImage = $canvas;
            }
        }

        // -----------------------------------------------------------------
        // Write the finalized asset as JPEG at 70% quality.
        // -----------------------------------------------------------------
        $writeResult = imagejpeg($sourceImage, $destinationPath, VOUCHER_JPEG_QUALITY);

        if (!$writeResult) {
            error_log('[BodhantraOS][Voucher] imagejpeg() write failed: ' . $destinationPath);
            jsonResponse(500, [
                'success' => false,
                'error'   => 'Failed to save processed image. Contact an administrator.',
            ]);
        }

    } finally {
        // -----------------------------------------------------------------
        // ALWAYS destroy in-memory canvas references to prevent memory
        // leaks.  On shared hosting with limited memory_limit, this is
        // critical for stability.
        // -----------------------------------------------------------------
        if ($sourceImage !== null && $sourceImage !== false) {
            imagedestroy($sourceImage);
        }
    }

    // -----------------------------------------------------------------------
    // 11. Database Record Linkage
    //     Store the relative path (from web root) in the registrations table.
    // -----------------------------------------------------------------------
    $relativePath = 'public/uploads/vouchers/' . $safeFilename;

    // Get the final file size for response metadata.
    $finalFileSize = filesize($destinationPath);

    if ($registration) {
        // -----------------------------------------------------------------
        // Existing registration — update voucher and reset to pending.
        // If a previous voucher file exists, delete it to save storage.
        // -----------------------------------------------------------------
        if ($registration['voucher_path']) {
            $oldFile = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $registration['voucher_path']);
            if (file_exists($oldFile)) {
                @unlink($oldFile);
            }
        }

        $updateStmt = $pdo->prepare(
            'UPDATE registrations
             SET voucher_path = :path,
                 status = :status,
                 updated_at = NOW()
             WHERE id = :rid'
        );
        $updateStmt->execute([
            ':path'   => $relativePath,
            ':status' => 'Pending_Verification',
            ':rid'    => $registration['id'],
        ]);

        $registrationId = (int)$registration['id'];

        writeAuditLog(
            (int)$user['id'],
            "Re-uploaded voucher for event #{$eventId} (registration #{$registrationId})",
            '/api/upload/voucher',
            $ctx['ip']
        );
    } else {
        // -----------------------------------------------------------------
        // New registration — create the row.
        // -----------------------------------------------------------------
        $insertStmt = $pdo->prepare(
            'INSERT INTO registrations (user_id, event_id, status, voucher_path, checked_in_state, created_at, updated_at)
             VALUES (:uid, :eid, :status, :path, 0, NOW(), NOW())'
        );
        $insertStmt->execute([
            ':uid'    => $user['id'],
            ':eid'    => $eventId,
            ':status' => 'Pending_Verification',
            ':path'   => $relativePath,
        ]);

        $registrationId = (int)$pdo->lastInsertId();

        writeAuditLog(
            (int)$user['id'],
            "Uploaded voucher and registered for event #{$eventId} (registration #{$registrationId})",
            '/api/upload/voucher',
            $ctx['ip']
        );
    }

    // -----------------------------------------------------------------------
    // 12. Success Response
    // -----------------------------------------------------------------------
    jsonResponse(200, [
        'success'         => true,
        'message'         => 'Voucher uploaded and processed successfully. Awaiting admin verification.',
        'registration_id' => $registrationId,
        'event_id'        => $eventId,
        'voucher_path'    => $relativePath,
        'processing' => [
            'original_size_bytes'  => $file['size'],
            'processed_size_bytes' => $finalFileSize ?: null,
            'compression_ratio'    => $file['size'] > 0 && $finalFileSize
                ? round((1 - $finalFileSize / $file['size']) * 100, 1) . '%'
                : null,
            'output_format'        => 'JPEG',
            'quality'              => VOUCHER_JPEG_QUALITY . '%',
            'max_width_px'         => VOUCHER_MAX_WIDTH,
        ],
    ]);
}
