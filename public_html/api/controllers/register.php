<?php
/**
 * ============================================================================
 * BODHANTRA EVENT OS — Participant Registration Controller
 * ============================================================================
 *
 * Handles public self-service participant sign-ups:
 *   • POST /register  →  handleRegistration()
 *
 * Flow:
 *   1. Extract & sanitize input fields.
 *   2. Run strict format validations (email, phone, required fields).
 *   3. Check for duplicate email.
 *   4. Generate a deterministic, unique registration ID (BODH2026-XXXXXX).
 *   5. Generate a temporary password for initial access.
 *   6. Insert into users with role_tier = 'Participant'.
 *   7. Return credentials + tracking code.
 *
 * @package BodhantraOS\Controllers
 */

declare(strict_types=1);

// No middleware needed — registration is a public endpoint.


// ===========================================================================
// POST /register
// ===========================================================================

/**
 * Process a new participant registration.
 *
 * Request body:
 *   {
 *     "name":          "Aakash Sharma",
 *     "email":         "aakash@example.com",
 *     "phone":         "9876543210",
 *     "branch":        "Computer Science",
 *     "academic_year": "TY"
 *   }
 *
 * Success response (201):
 *   {
 *     "success":          true,
 *     "message":          "Registration successful.",
 *     "registration_id":  "BODH2026-X8R9TQ",
 *     "temporary_password": "...",
 *     "user": { ... }
 *   }
 */
function handleRegistration(array $ctx): void
{
    $body = $ctx['body'];

    // -----------------------------------------------------------------------
    // 1. Extract & Sanitize
    //    trim() removes accidental whitespace; htmlspecialchars is NOT needed
    //    here because we store raw text and the React frontend handles
    //    rendering escaping.  SQL injection is handled by PDO bindings.
    // -----------------------------------------------------------------------
    $name         = trim($body['name']          ?? '');
    $email        = trim($body['email']         ?? '');
    $phone        = trim($body['phone']         ?? '');
    $branch       = trim($body['branch']        ?? '');
    $academicYear = trim($body['academic_year'] ?? '');

    // -----------------------------------------------------------------------
    // 2. Server-Side Validation
    // -----------------------------------------------------------------------
    $errors = [];

    // --- Name: required, 2–150 chars ---
    if ($name === '') {
        $errors[] = 'Name is required.';
    } elseif (mb_strlen($name) < 2 || mb_strlen($name) > 150) {
        $errors[] = 'Name must be between 2 and 150 characters.';
    }

    // --- Email: required, valid format ---
    if ($email === '') {
        $errors[] = 'Email is required.';
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $errors[] = 'Invalid email address format.';
    } elseif (mb_strlen($email) > 255) {
        $errors[] = 'Email address is too long (max 255 characters).';
    }

    // --- Phone: required, 10–15 digits (international support) ---
    if ($phone === '') {
        $errors[] = 'Phone number is required.';
    } elseif (!preg_match('/^\+?[0-9]{10,15}$/', $phone)) {
        $errors[] = 'Phone must be 10–15 digits. Optional leading + for country code.';
    }

    // --- Branch: required ---
    if ($branch === '') {
        $errors[] = 'Academic branch / department is required.';
    } elseif (mb_strlen($branch) > 100) {
        $errors[] = 'Branch name is too long (max 100 characters).';
    }

    // --- Academic Year: required, validate against allowed set ---
    $validYears = ['FY', 'SY', 'TY', 'Final', 'PG-1', 'PG-2', 'PhD'];
    if ($academicYear === '') {
        $errors[] = 'Academic year is required.';
    } elseif (!in_array($academicYear, $validYears, true)) {
        $errors[] = 'Academic year must be one of: ' . implode(', ', $validYears) . '.';
    }

    // --- Return all errors at once for better UX ---
    if (!empty($errors)) {
        jsonResponse(400, [
            'success' => false,
            'error'   => 'Validation failed.',
            'details' => $errors,
        ]);
    }

    $pdo = Database::connect();

    // -----------------------------------------------------------------------
    // 3. Duplicate Email Check
    //    We do this as a SELECT first (instead of relying solely on the
    //    UNIQUE constraint) to return a friendly message.
    // -----------------------------------------------------------------------
    $dupCheck = $pdo->prepare('SELECT id FROM users WHERE email = :email LIMIT 1');
    $dupCheck->execute([':email' => $email]);

    if ($dupCheck->fetch()) {
        jsonResponse(409, [
            'success' => false,
            'error'   => 'An account with this email address already exists.',
        ]);
    }

    // -----------------------------------------------------------------------
    // 4. Deterministic Registration ID Generation
    //
    //    Format: BODH2026-XXXXXX
    //    The 6-char suffix is cryptographically random, uppercase alpha-numeric.
    //    We loop until uniqueness is confirmed (collision probability is
    //    astronomically low: 36^6 = ~2.18 billion combinations).
    // -----------------------------------------------------------------------
    $regId = '';
    $maxAttempts = 10;

    for ($attempt = 0; $attempt < $maxAttempts; $attempt++) {
        // Generate 6 random uppercase alpha-numeric characters.
        $suffix = strtoupper(substr(bin2hex(random_bytes(4)), 0, 6));
        // Replace any lowercase hex chars with random uppercase letters.
        $suffix = preg_replace_callback('/[a-f]/', function () {
            // Replace with a random uppercase letter from A-Z.
            return chr(random_int(65, 90));
        }, $suffix);
        $candidate = 'BODH2026-' . strtoupper($suffix);

        $check = $pdo->prepare(
            'SELECT id FROM users WHERE unique_registration_id = :rid LIMIT 1'
        );
        $check->execute([':rid' => $candidate]);

        if (!$check->fetch()) {
            $regId = $candidate;
            break;
        }
    }

    if ($regId === '') {
        // Astronomically unlikely, but handle gracefully.
        error_log('[BodhantraOS][Register] Failed to generate unique reg ID after ' . $maxAttempts . ' attempts.');
        jsonResponse(500, [
            'success' => false,
            'error'   => 'Unable to generate a unique registration ID. Please try again.',
        ]);
    }

    // -----------------------------------------------------------------------
    // 5. Temporary Password Generation
    //    16 characters, mixed-case alpha-numeric — strong enough for initial
    //    access.  The user should change this on first login.
    // -----------------------------------------------------------------------
    $tempPassword = substr(str_replace(
        ['+', '/', '='],
        '',
        base64_encode(random_bytes(16))
    ), 0, 16);

    // Hash with bcrypt at cost 12 — balances security vs. shared hosting CPU.
    $passwordHash = password_hash($tempPassword, PASSWORD_BCRYPT, ['cost' => 12]);

    if ($passwordHash === false) {
        error_log('[BodhantraOS][Register] password_hash() returned false — check PHP build.');
        jsonResponse(500, [
            'success' => false,
            'error'   => 'Internal security error. Contact an administrator.',
        ]);
    }

    // -----------------------------------------------------------------------
    // 6. Insert Into Database
    // -----------------------------------------------------------------------
    $insert = $pdo->prepare(
        'INSERT INTO users (name, email, phone, branch, academic_year, unique_registration_id, password_hash, role_tier, is_active, created_at, updated_at)
         VALUES (:name, :email, :phone, :branch, :year, :reg_id, :pass_hash, :role, 1, NOW(), NOW())'
    );

    $insert->execute([
        ':name'      => $name,
        ':email'     => $email,
        ':phone'     => $phone,
        ':branch'    => $branch,
        ':year'      => $academicYear,
        ':reg_id'    => $regId,
        ':pass_hash' => $passwordHash,
        ':role'      => 'Participant',
    ]);

    $newUserId = (int)$pdo->lastInsertId();

    // -----------------------------------------------------------------------
    // 7. Audit Log
    // -----------------------------------------------------------------------
    writeAuditLog(
        $newUserId,
        "New participant registered: {$email} ({$regId})",
        '/api/register',
        $ctx['ip']
    );

    // -----------------------------------------------------------------------
    // 8. Respond with credentials and tracking code.
    //    The temporary password is returned ONLY in this response.
    //    It is the client's responsibility to display it clearly and instruct
    //    the user to save it.
    // -----------------------------------------------------------------------
    jsonResponse(201, [
        'success'            => true,
        'message'            => 'Registration successful. Please save your credentials.',
        'registration_id'    => $regId,
        'temporary_password' => $tempPassword,
        'user' => [
            'id'                     => $newUserId,
            'name'                   => $name,
            'email'                  => $email,
            'phone'                  => $phone,
            'branch'                 => $branch,
            'academic_year'          => $academicYear,
            'unique_registration_id' => $regId,
            'role_tier'              => 'Participant',
        ],
    ]);
}
