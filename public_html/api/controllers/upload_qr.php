<?php
/**
 * ============================================================================
 * BODHANTRA EVENT OS — Payment QR Upload Controller
 * ============================================================================
 */

declare(strict_types=1);

require_once __DIR__ . '/_middleware.php';

define('QR_MAX_FILE_SIZE', 5 * 1024 * 1024); // 5 MB
define('QR_ALLOWED_MIMES', ['image/jpeg', 'image/png', 'image/webp']);

function getQrUploadDir(): string
{
    return realpath(__DIR__ . '/../../public') !== false
        ? realpath(__DIR__ . '/../../public') . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'qrs'
        : dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'qrs';
}

function handleQrUpload(array $ctx): void
{
    // Authentication —strictly Admin only
    $user = requireAuth($ctx, ['Admin']);

    if (empty($ctx['files']['qr'])) {
        jsonResponse(400, [
            'success' => false,
            'error'   => 'No file uploaded. Please attach a QR image as the "qr" field.',
        ]);
    }

    $file = $ctx['files']['qr'];

    if ($file['error'] !== UPLOAD_ERR_OK) {
        jsonResponse(400, [
            'success' => false,
            'error'   => 'Upload error occurred. Code: ' . $file['error'],
        ]);
    }

    if ($file['size'] > QR_MAX_FILE_SIZE) {
        jsonResponse(400, [
            'success' => false,
            'error'   => 'File size exceeds 5 MB limit.',
        ]);
    }

    $detectedMime = mime_content_type($file['tmp_name']);
    if ($detectedMime === false || !in_array($detectedMime, QR_ALLOWED_MIMES, true)) {
        jsonResponse(400, [
            'success' => false,
            'error'   => 'Invalid file type. Only JPEG, PNG, and WebP are accepted.',
        ]);
    }

    $safeFilename = uniqid('qr_', true) . '_' . bin2hex(random_bytes(4)) . '.jpg';
    $uploadDir = getQrUploadDir();

    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    $destinationPath = $uploadDir . DIRECTORY_SEPARATOR . $safeFilename;

    // Use GD to process and re-encode to JPG
    $sourceImage = null;
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
            'error'   => 'Failed to decode image data.',
        ]);
    }

    $srcWidth  = imagesx($sourceImage);
    $srcHeight = imagesy($sourceImage);

    // Create truecolor canvas and re-render
    $canvas = imagecreatetruecolor($srcWidth, $srcHeight);
    $white = imagecolorallocate($canvas, 255, 255, 255);
    imagefill($canvas, 0, 0, $white);
    imagecopy($canvas, $sourceImage, 0, 0, 0, 0, $srcWidth, $srcHeight);
    imagedestroy($sourceImage);

    $writeResult = imagejpeg($canvas, $destinationPath, 85);
    imagedestroy($canvas);

    if (!$writeResult) {
        jsonResponse(500, [
            'success' => false,
            'error'   => 'Failed to save processed QR code image.',
        ]);
    }

    $relativePath = '/api/public/uploads/qrs/' . $safeFilename;

    writeAuditLog(
        (int)$user['id'],
        "Uploaded payment QR code: {$relativePath}",
        '/api/upload/qr',
        $ctx['ip']
    );

    jsonResponse(200, [
        'success' => true,
        'message' => 'QR code uploaded successfully.',
        'path'    => $relativePath,
    ]);
}
