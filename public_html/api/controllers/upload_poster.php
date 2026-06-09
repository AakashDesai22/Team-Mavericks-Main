<?php
/**
 * ============================================================================
 * BODHANTRA EVENT OS — Poster Upload Controller (GD Processing Pipeline)
 * ============================================================================
 *
 * Handles event poster image uploads with a server-side image processing pipeline:
 *
 *   POST /upload/poster  →  handlePosterUpload()
 *
 * Security layers:
 *   1. Authentication (Admin only).
 *   2. File-presence validation.
 *   3. MIME-type forensic verification.
 *   4. File-size enforcement (max 5 MB raw upload).
 *   5. Cryptographic file renaming.
 *   6. GD Library compression pipeline:
 *      - Downscale width to ≤ 1200px (aspect-ratio locked).
 *      - Re-encode as 80% quality JPEG.
 *      - Destroy in-memory canvases.
 *
 * Storage target: public_html/public/uploads/posters/
 * Stored path:    public/uploads/posters/<hash>.jpg
 *
 * @package BodhantraOS\Controllers
 */

declare(strict_types=1);

require_once __DIR__ . '/_middleware.php';

/** Maximum allowed file size in bytes (5 MB). */
define('POSTER_MAX_FILE_SIZE', 5 * 1024 * 1024);

/** Maximum width in pixels before downscaling. */
define('POSTER_MAX_WIDTH', 1200);

/** JPEG output quality (0–100). */
define('POSTER_JPEG_QUALITY', 80);

/** Whitelist of accepted MIME types. */
define('POSTER_ALLOWED_MIMES', [
    'image/jpeg',
    'image/png',
    'image/webp',
]);

/**
 * Absolute path to the upload destination directory.
 */
function getPosterUploadDir(): string
{
    return realpath(__DIR__ . '/../../public') !== false
        ? realpath(__DIR__ . '/../../public') . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'posters'
        : dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'posters';
}

// ===========================================================================
// POST /upload/poster
// ===========================================================================

/**
 * Process an event poster image upload.
 *
 * Expected multipart/form-data fields:
 *   - poster (file) — The cover image.
 */
function handlePosterUpload(array $ctx): void
{
    // 1. Authentication — strictly Admin only
    $user = requireAuth($ctx, ['Admin']);

    // 2. File Interception — verify a file was actually uploaded.
    if (empty($ctx['files']['poster'])) {
        jsonResponse(400, [
            'success' => false,
            'error'   => 'No file uploaded. Please attach a poster image as the "poster" field.',
        ]);
    }

    $file = $ctx['files']['poster'];

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

    // 3. File-Size Enforcement
    if ($file['size'] > POSTER_MAX_FILE_SIZE) {
        $maxMB = POSTER_MAX_FILE_SIZE / (1024 * 1024);
        jsonResponse(400, [
            'success' => false,
            'error'   => "File size exceeds the maximum allowed ({$maxMB} MB).",
        ]);
    }

    // 4. MIME-Type Forensic Verification
    $detectedMime = mime_content_type($file['tmp_name']);

    if ($detectedMime === false || !in_array($detectedMime, POSTER_ALLOWED_MIMES, true)) {
        jsonResponse(400, [
            'success' => false,
            'error'   => 'Invalid file type. Only JPEG, PNG, and WebP images are accepted.',
            'detected_mime' => $detectedMime ?: 'unknown',
        ]);
    }

    $imageInfo = @getimagesize($file['tmp_name']);
    if ($imageInfo === false) {
        jsonResponse(400, [
            'success' => false,
            'error'   => 'File does not appear to be a valid image.',
        ]);
    }

    // 5. Cryptographic File Renaming
    $safeFilename = uniqid('p_', true) . '_' . bin2hex(random_bytes(4)) . '.jpg';

    // 6. Ensure the destination directory exists.
    $uploadDir = getPosterUploadDir();

    if (!is_dir($uploadDir)) {
        if (!mkdir($uploadDir, 0755, true)) {
            error_log('[BodhantraOS][Poster] Failed to create upload directory: ' . $uploadDir);
            jsonResponse(500, [
                'success' => false,
                'error'   => 'Server storage error. Contact an administrator.',
            ]);
        }
    }

    $destinationPath = $uploadDir . DIRECTORY_SEPARATOR . $safeFilename;

    // 7. GD Compression Pipeline
    $sourceImage = null;

    try {
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

        $srcWidth  = imagesx($sourceImage);
        $srcHeight = imagesy($sourceImage);

        // Downscale if width exceeds 1200px, maintaining aspect ratio.
        if ($srcWidth > POSTER_MAX_WIDTH) {
            $scale    = POSTER_MAX_WIDTH / $srcWidth;
            $dstWidth  = POSTER_MAX_WIDTH;
            $dstHeight = (int)round($srcHeight * $scale);

            $destImage = imagecreatetruecolor($dstWidth, $dstHeight);

            if ($destImage === false) {
                imagedestroy($sourceImage);
                jsonResponse(500, [
                    'success' => false,
                    'error'   => 'Image processing failed (canvas allocation).',
                ]);
            }

            $white = imagecolorallocate($destImage, 255, 255, 255);
            imagefill($destImage, 0, 0, $white);

            imagecopyresampled(
                $destImage,
                $sourceImage,
                0, 0,
                0, 0,
                $dstWidth, $dstHeight,
                $srcWidth, $srcHeight
            );

            imagedestroy($sourceImage);
            $sourceImage = $destImage;
        } else {
            if ($detectedMime !== 'image/jpeg') {
                $canvas = imagecreatetruecolor($srcWidth, $srcHeight);
                $white = imagecolorallocate($canvas, 255, 255, 255);
                imagefill($canvas, 0, 0, $white);
                imagecopy($canvas, $sourceImage, 0, 0, 0, 0, $srcWidth, $srcHeight);
                imagedestroy($sourceImage);
                $sourceImage = $canvas;
            }
        }

        // Write as JPEG at 80% quality.
        $writeResult = imagejpeg($sourceImage, $destinationPath, POSTER_JPEG_QUALITY);

        if (!$writeResult) {
            error_log('[BodhantraOS][Poster] imagejpeg() write failed: ' . $destinationPath);
            jsonResponse(500, [
                'success' => false,
                'error'   => 'Failed to save processed image.',
            ]);
        }

    } finally {
        if ($sourceImage !== null && $sourceImage !== false) {
            imagedestroy($sourceImage);
        }
    }

    $relativePath = '/api/public/uploads/posters/' . $safeFilename;

    writeAuditLog(
        (int)$user['id'],
        "Uploaded event poster: {$relativePath}",
        '/api/upload/poster',
        $ctx['ip']
    );

    jsonResponse(200, [
        'success'   => true,
        'message'   => 'Poster uploaded successfully.',
        'path'      => $relativePath,
    ]);
}
