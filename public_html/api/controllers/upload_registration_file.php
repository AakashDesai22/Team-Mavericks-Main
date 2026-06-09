<?php
/**
 * ============================================================================
 * BODHANTRA EVENT OS — Registration Custom File Upload Controller
 * ============================================================================
 */

declare(strict_types=1);

require_once __DIR__ . '/_middleware.php';

define('REG_FILE_MAX_SIZE', 8 * 1024 * 1024); // 8 MB limit
define('REG_FILE_ALLOWED_MIMES', [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf'
]);

function getRegistrationFilesDir(): string
{
    return realpath(__DIR__ . '/../../public') !== false
        ? realpath(__DIR__ . '/../../public') . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'registration_files'
        : dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'registration_files';
}

function handleRegistrationFileUpload(array $ctx): void
{
    // Resolves session if token is provided. Guests are also permitted to upload registration files.
    $user = resolveSession($ctx['token'] ?? null);

    if (empty($ctx['files']['file'])) {
        jsonResponse(400, [
            'success' => false,
            'error'   => 'No file uploaded. Please attach a file as the "file" field.',
        ]);
    }

    $file = $ctx['files']['file'];

    if ($file['error'] !== UPLOAD_ERR_OK) {
        jsonResponse(400, [
            'success' => false,
            'error'   => 'Upload error occurred. Code: ' . $file['error'],
        ]);
    }

    if ($file['size'] > REG_FILE_MAX_SIZE) {
        jsonResponse(400, [
            'success' => false,
            'error'   => 'File size exceeds 8 MB limit.',
        ]);
    }

    $detectedMime = mime_content_type($file['tmp_name']);
    if ($detectedMime === false || !in_array($detectedMime, REG_FILE_ALLOWED_MIMES, true)) {
        jsonResponse(400, [
            'success' => false,
            'error'   => 'Invalid file type. Only JPEG, PNG, WebP, and PDF are accepted.',
        ]);
    }

    // Determine extension
    $ext = 'bin';
    switch ($detectedMime) {
        case 'image/jpeg':      $ext = 'jpg'; break;
        case 'image/png':       $ext = 'png'; break;
        case 'image/webp':      $ext = 'webp'; break;
        case 'application/pdf': $ext = 'pdf'; break;
    }

    $safeFilename = uniqid('rf_', true) . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
    $uploadDir = getRegistrationFilesDir();

    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    $destinationPath = $uploadDir . DIRECTORY_SEPARATOR . $safeFilename;

    if (!move_uploaded_file($file['tmp_name'], $destinationPath)) {
        jsonResponse(500, [
            'success' => false,
            'error'   => 'Failed to save uploaded file to storage.',
        ]);
    }

    $relativePath = '/api/public/uploads/registration_files/' . $safeFilename;

    writeAuditLog(
        $user !== null ? (int)$user['id'] : null,
        "Uploaded registration dynamic file: {$relativePath}",
        '/api/upload/registration-file',
        $ctx['ip']
    );

    jsonResponse(200, [
        'success' => true,
        'message' => 'File uploaded successfully.',
        'path'    => $relativePath,
    ]);
}
