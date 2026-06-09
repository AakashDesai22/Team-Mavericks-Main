<?php
/**
 * ============================================================================
 * BODHANTRA EVENT OS — Public Registration Controller (Phase 1 Rewrite)
 * ============================================================================
 *
 * Replaces the legacy register.php with a full OTP-verified registration flow:
 *
 *   POST /register/initiate   →  handleInitiateRegistration()
 *   POST /register/verify-otp →  handleVerifyOtp()
 *   POST /events/{id}/register →  handleEventSignup()
 *
 * Flow:
 *   1. Visitor submits name, email, phone → system generates 6-digit OTP.
 *   2. OTP is SHA-256 hashed, cached in `otp_verifications` with 5-min TTL.
 *   3. Native PHP mail engine dispatches the OTP email.
 *   4. Frontend displays OTP input modal.
 *   5. Visitor submits OTP → system validates hash + expiry.
 *   6. On match: account created with MAV-MEM-XXX ID, phone as password.
 *   7. Credentials + confirmation emails dispatched.
 *   8. Auto-login: session token returned immediately.
 *
 * Dependencies:
 *   • Database::connect()       (db.php — loaded by gateway)
 *   • jsonResponse()            (index.php — loaded by gateway)
 *   • writeAuditLog()           (index.php — loaded by gateway)
 *   • generateAccountId()       (utils/id_generator.php)
 *   • generateParticipantId()   (utils/id_generator.php)
 *   • sendOtpEmail()            (utils/mailer.php)
 *   • sendCredentialsEmail()    (utils/mailer.php)
 *   • sendRegistrationConfirmation() (utils/mailer.php)
 *
 * @package BodhantraOS\Controllers
 */

declare(strict_types=1);

// Load utility dependencies.
require_once __DIR__ . '/../utils/id_generator.php';
require_once __DIR__ . '/../utils/mailer.php';
require_once __DIR__ . '/_middleware.php';


// ===========================================================================
// POST /register/initiate
// ===========================================================================

/**
 * Step 1: Validate registration input, generate OTP, and dispatch email.
 *
 * The form payload is cached in the `otp_verifications` table so it survives
 * the OTP round-trip without requiring the client to re-submit all fields.
 *
 * Request body:
 *   {
 *     "name":  "Aakash Sharma",
 *     "email": "aakash@example.com",
 *     "phone": "9876543210"
 *   }
 *
 * Success response (200):
 *   {
 *     "success": true,
 *     "message": "Verification code sent to your email.",
 *     "email":   "aakash@example.com"
 *   }
 */
function handleInitiateRegistration(array $ctx): void
{
    $body = $ctx['body'];

    // -----------------------------------------------------------------------
    // 1. Extract & Sanitize
    // -----------------------------------------------------------------------
    $name  = trim($body['name']  ?? '');
    $email = trim($body['email'] ?? '');
    $phone = trim($body['phone'] ?? '');

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

    // --- Phone: required, 10–15 digits (used as initial password) ---
    if ($phone === '') {
        $errors[] = 'Phone number is required.';
    } elseif (!preg_match('/^\+?[0-9]{10,15}$/', $phone)) {
        $errors[] = 'Phone must be 10–15 digits. Optional leading + for country code.';
    }

    if (!empty($errors)) {
        jsonResponse(400, [
            'success' => false,
            'error'   => 'Validation failed.',
            'details' => $errors,
        ]);
    }

    $pdo = Database::connect();

    // -----------------------------------------------------------------------
    // 3. Duplicate Email Check — prevent OTP spam for existing accounts.
    // -----------------------------------------------------------------------
    $dupCheck = $pdo->prepare('SELECT id FROM users WHERE email = :email LIMIT 1');
    $dupCheck->execute([':email' => $email]);

    if ($dupCheck->fetch()) {
        jsonResponse(409, [
            'success' => false,
            'error'   => 'An account with this email address already exists. Please login instead.',
        ]);
    }

    // -----------------------------------------------------------------------
    // 4. Rate-limit OTP requests — prevent abuse.
    //    Max 3 active (non-consumed, non-expired) OTPs per email.
    // -----------------------------------------------------------------------
    $rateLimitStmt = $pdo->prepare(
        'SELECT COUNT(*) AS active_count
         FROM otp_verifications
         WHERE email = :email
           AND is_consumed = 0
           AND expires_at > NOW()'
    );
    $rateLimitStmt->execute([':email' => $email]);
    $activeCount = (int)$rateLimitStmt->fetch()['active_count'];

    if ($activeCount >= 3) {
        jsonResponse(429, [
            'success' => false,
            'error'   => 'Too many verification requests. Please wait for the previous code to expire (5 minutes).',
        ]);
    }

    // -----------------------------------------------------------------------
    // 5. Generate 6-digit cryptographic OTP.
    //    random_int() uses a CSPRNG — no need for openssl_random_pseudo_bytes.
    // -----------------------------------------------------------------------
    $otpCode   = (string)random_int(100000, 999999);
    $hashedOtp = hash('sha256', $otpCode);

    // -----------------------------------------------------------------------
    // 6. Cache the OTP + registration payload in the database.
    //    Expires in 5 minutes from now.
    // -----------------------------------------------------------------------
    $payload = json_encode([
        'name'  => $name,
        'email' => $email,
        'phone' => $phone,
    ], JSON_UNESCAPED_UNICODE);

    $insertOtp = $pdo->prepare(
        'INSERT INTO otp_verifications (email, hashed_otp, payload_json, expires_at, is_consumed, created_at)
         VALUES (:email, :hash, :payload, DATE_ADD(NOW(), INTERVAL 5 MINUTE), 0, NOW())'
    );
    $insertOtp->execute([
        ':email'   => $email,
        ':hash'    => $hashedOtp,
        ':payload' => $payload,
    ]);

    // -----------------------------------------------------------------------
    // 7. Dispatch OTP email via the native mail engine.
    // -----------------------------------------------------------------------
    $mailSent = sendOtpEmail($email, $otpCode);

    if (!$mailSent) {
        // Log the failure but don't block the user — the OTP is still valid
        // in the database and can be retrieved from the PHP error log in dev mode.
        error_log("[BodhantraOS][Register] OTP email dispatch failed for {$email}");
    }

    // -----------------------------------------------------------------------
    // 8. Audit trail.
    // -----------------------------------------------------------------------
    writeAuditLog(
        null,
        "OTP initiated for registration: {$email}",
        '/api/register/initiate',
        $ctx['ip']
    );

    // -----------------------------------------------------------------------
    // 9. Respond — never reveal the OTP in the response.
    // -----------------------------------------------------------------------
    jsonResponse(200, [
        'success' => true,
        'message' => 'Verification code sent to your email. Please check your inbox.',
        'email'   => $email,
    ]);
}


// ===========================================================================
// POST /register/verify-otp
// ===========================================================================

/**
 * Step 2: Validate the OTP, create the account, and auto-login.
 *
 * Request body:
 *   {
 *     "email": "aakash@example.com",
 *     "otp":   "482917"
 *   }
 *
 * Success response (201):
 *   {
 *     "success":    true,
 *     "message":    "Account created successfully.",
 *     "account_id": "MAV-MEM-003",
 *     "token":      "...",
 *     "user":       { ... }
 *   }
 */
function handleVerifyOtp(array $ctx): void
{
    $body = $ctx['body'];

    $email = trim($body['email'] ?? '');
    $otp   = trim($body['otp']   ?? '');

    // -----------------------------------------------------------------------
    // 1. Input validation.
    // -----------------------------------------------------------------------
    if ($email === '' || $otp === '') {
        jsonResponse(400, [
            'success' => false,
            'error'   => 'Both "email" and "otp" are required.',
        ]);
    }

    // OTP must be exactly 6 digits.
    if (!preg_match('/^\d{6}$/', $otp)) {
        jsonResponse(400, [
            'success' => false,
            'error'   => 'OTP must be a 6-digit numeric code.',
        ]);
    }

    $pdo = Database::connect();

    // -----------------------------------------------------------------------
    // 2. Lookup the latest non-consumed, non-expired OTP for this email.
    //    ORDER BY id DESC ensures we match the most recent attempt.
    // -----------------------------------------------------------------------
    $otpStmt = $pdo->prepare(
        'SELECT id, hashed_otp, payload_json, expires_at
         FROM otp_verifications
         WHERE email = :email
           AND is_consumed = 0
           AND expires_at > NOW()
         ORDER BY id DESC
         LIMIT 1'
    );
    $otpStmt->execute([':email' => $email]);
    $otpRow = $otpStmt->fetch();

    if (!$otpRow) {
        jsonResponse(400, [
            'success' => false,
            'error'   => 'No active verification code found for this email. It may have expired. Please request a new code.',
        ]);
    }

    // -----------------------------------------------------------------------
    // 3. Verify OTP hash — constant-time comparison via hash_equals().
    // -----------------------------------------------------------------------
    $submittedHash = hash('sha256', $otp);

    if (!hash_equals($otpRow['hashed_otp'], $submittedHash)) {
        jsonResponse(400, [
            'success' => false,
            'error'   => 'Incorrect verification code. Please try again.',
        ]);
    }

    // -----------------------------------------------------------------------
    // 4. OTP is valid — mark as consumed to prevent reuse.
    // -----------------------------------------------------------------------
    $consumeStmt = $pdo->prepare(
        'UPDATE otp_verifications SET is_consumed = 1 WHERE id = :id'
    );
    $consumeStmt->execute([':id' => $otpRow['id']]);

    // -----------------------------------------------------------------------
    // 5. Parse the cached registration payload.
    // -----------------------------------------------------------------------
    $payload = json_decode($otpRow['payload_json'], true);
    if (!$payload || empty($payload['name']) || empty($payload['email']) || empty($payload['phone'])) {
        error_log('[BodhantraOS][Register] Corrupted payload_json in OTP row #' . $otpRow['id']);
        jsonResponse(500, [
            'success' => false,
            'error'   => 'Registration data is corrupted. Please start the registration again.',
        ]);
    }

    $name  = $payload['name'];
    $email = $payload['email'];
    $phone = $payload['phone'];

    // -----------------------------------------------------------------------
    // 6. Double-check email uniqueness (race condition guard).
    //    Two users could have initiated OTP for the same email simultaneously.
    // -----------------------------------------------------------------------
    $dupCheck = $pdo->prepare('SELECT id FROM users WHERE email = :email LIMIT 1');
    $dupCheck->execute([':email' => $email]);

    if ($dupCheck->fetch()) {
        jsonResponse(409, [
            'success' => false,
            'error'   => 'An account with this email was already created. Please login instead.',
        ]);
    }

    // -----------------------------------------------------------------------
    // 7. Begin transaction — account creation + session must be atomic.
    // -----------------------------------------------------------------------
    $pdo->beginTransaction();

    try {
        // -------------------------------------------------------------------
        // 7a. Generate deterministic Account ID (MAV-MEM-XXX).
        //     The generator uses SELECT ... FOR UPDATE to serialize.
        // -------------------------------------------------------------------
        $accountId = generateAccountId($pdo, 'Member');

        // -------------------------------------------------------------------
        // 7b. Hash the phone number as the initial password.
        //     bcrypt at cost 12 — balances security vs. shared hosting CPU.
        // -------------------------------------------------------------------
        $passwordHash = password_hash($phone, PASSWORD_BCRYPT, ['cost' => 12]);

        if ($passwordHash === false) {
            throw new \RuntimeException('password_hash() returned false.');
        }

        // -------------------------------------------------------------------
        // 7c. Insert the new user into the database.
        // -------------------------------------------------------------------
        $insertUser = $pdo->prepare(
            'INSERT INTO users
                (name, email, phone, unique_registration_id, password_hash, role_tier, is_active, created_at, updated_at)
             VALUES
                (:name, :email, :phone, :reg_id, :pass_hash, :role, 1, NOW(), NOW())'
        );
        $insertUser->execute([
            ':name'      => $name,
            ':email'     => $email,
            ':phone'     => $phone,
            ':reg_id'    => $accountId,
            ':pass_hash' => $passwordHash,
            ':role'      => 'Member',
        ]);

        $newUserId = (int)$pdo->lastInsertId();

        // -------------------------------------------------------------------
        // 7d. Auto-login — create a session token immediately.
        //     32 bytes → 64 hex chars → ~2^256 brute-force keyspace.
        // -------------------------------------------------------------------
        $rawToken  = bin2hex(random_bytes(32));
        $tokenHash = hash('sha256', $rawToken);

        $insertSession = $pdo->prepare(
            'INSERT INTO auth_sessions (user_id, token_hash, expires_at, created_at)
             VALUES (:uid, :hash, DATE_ADD(NOW(), INTERVAL 1 DAY), NOW())'
        );
        $insertSession->execute([
            ':uid'  => $newUserId,
            ':hash' => $tokenHash,
        ]);

        $pdo->commit();
    } catch (\Throwable $e) {
        $pdo->rollBack();
        error_log('[BodhantraOS][Register] Account creation failed: ' . $e->getMessage());
        jsonResponse(500, [
            'success' => false,
            'error'   => 'Failed to create your account. Please try again.',
        ]);
    }

    // -----------------------------------------------------------------------
    // 8. Dispatch emails — fire-and-forget (don't block the response).
    // -----------------------------------------------------------------------

    // 8a. Credentials delivery email.
    sendCredentialsEmail($email, $name, $accountId, '/login');

    // 8b. Registration confirmation email.
    sendRegistrationConfirmation($email, $name, $accountId);

    // -----------------------------------------------------------------------
    // 9. Audit trail.
    // -----------------------------------------------------------------------
    writeAuditLog(
        $newUserId,
        "New member registered via OTP: {$email} ({$accountId})",
        '/api/register/verify-otp',
        $ctx['ip']
    );

    // -----------------------------------------------------------------------
    // 10. Invalidate all remaining OTPs for this email (cleanup).
    // -----------------------------------------------------------------------
    try {
        $cleanupStmt = $pdo->prepare(
            'UPDATE otp_verifications SET is_consumed = 1 WHERE email = :email AND is_consumed = 0'
        );
        $cleanupStmt->execute([':email' => $email]);
    } catch (\Throwable $e) {
        // Non-critical — log and continue.
        error_log('[BodhantraOS][Register] OTP cleanup failed: ' . $e->getMessage());
    }

    // -----------------------------------------------------------------------
    // 11. Respond with the full account data + auto-login token.
    // -----------------------------------------------------------------------
    jsonResponse(201, [
        'success'    => true,
        'message'    => 'Account created successfully. Welcome to Mavericks!',
        'account_id' => $accountId,
        'token'      => $rawToken,
        'user'       => [
            'id'                     => $newUserId,
            'name'                   => $name,
            'email'                  => $email,
            'phone'                  => $phone,
            'unique_registration_id' => $accountId,
            'role_tier'              => 'Member',
        ],
    ]);
}


// ===========================================================================
// POST /events/{id}/register
// ===========================================================================

/**
 * Register an authenticated user for a specific event.
 *
 * This creates an event-scoped participant entry with a unique MAV-PRT-XXX
 * tracking identifier.  The "No-Double-Register" constraint is enforced:
 * a user cannot register for the same event twice.
 *
 * Request body:
 *   {
 *     "form_data": { ... }     // Optional: dynamic field answers
 *   }
 *
 * RBAC: Any authenticated user (Admin, Member, or existing Participant).
 */
function handleEventSignup(array $ctx): void
{
    $eventId  = (int)($ctx['params']['event_id'] ?? 0);
    $formData = $ctx['body']['form_data'] ?? null;
    $voucherPath = isset($ctx['body']['voucher_path']) ? trim((string)$ctx['body']['voucher_path']) : '';
    $cleanVoucherPath = $voucherPath !== '' ? preg_replace('/^\/?api\//', '', $voucherPath) : null;

    if ($eventId <= 0) {
        jsonResponse(400, [
            'success' => false,
            'error'   => 'Invalid event ID.',
        ]);
    }

    $pdo = Database::connect();

    // -----------------------------------------------------------------------
    // 1. Authentication — Resolve session if token is provided.
    //    If token is absent/invalid, we support guest registration by
    //    auto-creating a Participant account under the provided credentials.
    // -----------------------------------------------------------------------
    $user = resolveSession($ctx['token'] ?? null);
    $token = null;
    $isNewVisitor = false;

    if ($user === null) {
        $body = $ctx['body'];
        $name = trim($body['name'] ?? '');
        $email = trim($body['email'] ?? '');
        $phone = trim($body['phone'] ?? '');

        if ($name === '' || $email === '' || $phone === '') {
            jsonResponse(400, [
                'success' => false,
                'error'   => 'Authentication required, or name, email, and phone must be provided to register.',
            ]);
        }

        // Duplicate Email check
        $dupCheck = $pdo->prepare('SELECT id FROM users WHERE email = :email LIMIT 1');
        $dupCheck->execute([':email' => $email]);
        if ($dupCheck->fetch()) {
            jsonResponse(409, [
                'success' => false,
                'error'   => 'An account with this email address already exists. Please log in first to secure your spot.',
            ]);
        }


        // Start transaction for atomic guest account creation & registration
        $pdo->beginTransaction();
        $isNewVisitor = true;

        try {
            // Generate deterministic Participant Account ID (MAV-PRT-seq)
            $userRegId = generateAccountId($pdo, 'Participant');

            // Hash phone number as password
            $passwordHash = password_hash($phone, PASSWORD_BCRYPT, ['cost' => 12]);
            if ($passwordHash === false) {
                throw new \RuntimeException('password_hash() returned false.');
            }

            // Insert new user into database
            $insertUser = $pdo->prepare(
                'INSERT INTO users
                    (name, email, phone, unique_registration_id, password_hash, role_tier, is_active, created_at, updated_at)
                 VALUES
                    (:name, :email, :phone, :reg_id, :pass_hash, \'Participant\', 1, NOW(), NOW())'
            );
            $insertUser->execute([
                ':name'      => $name,
                ':email'     => $email,
                ':phone'     => $phone,
                ':reg_id'    => $userRegId,
                ':pass_hash' => $passwordHash,
            ]);

            $newUserId = (int)$pdo->lastInsertId();

            // Create auto-login session token
            $rawToken  = bin2hex(random_bytes(32));
            $tokenHash = hash('sha256', $rawToken);

            $insertSession = $pdo->prepare(
                'INSERT INTO auth_sessions (user_id, token_hash, expires_at, created_at)
                 VALUES (:uid, :hash, DATE_ADD(NOW(), INTERVAL 1 DAY), NOW())'
            );
            $insertSession->execute([
                ':uid'  => $newUserId,
                ':hash' => $tokenHash,
            ]);

            $user = [
                'id'                     => $newUserId,
                'name'                   => $name,
                'email'                  => $email,
                'phone'                  => $phone,
                'unique_registration_id' => $userRegId,
                'role_tier'              => 'Participant',
            ];
            $token = $rawToken;
        } catch (\Throwable $e) {
            $pdo->rollBack();
            error_log('[BodhantraOS][EventSignup] Guest account creation failed: ' . $e->getMessage());
            jsonResponse(500, [
                'success' => false,
                'error'   => 'Failed to create your guest account. Please try again.',
            ]);
        }
    } else {
        $pdo->beginTransaction();
    }

    // -----------------------------------------------------------------------
    // 2. Verify the event exists and is Active.
    // -----------------------------------------------------------------------
    $eventStmt = $pdo->prepare(
        'SELECT id, title, status, max_capacity, form_schema, payment_type
         FROM events
         WHERE id = :eid
         LIMIT 1'
    );
    $eventStmt->execute([':eid' => $eventId]);
    $event = $eventStmt->fetch();

    if (!$event) {
        $pdo->rollBack();
        jsonResponse(404, [
            'success' => false,
            'error'   => 'Event not found.',
        ]);
    }

    if ($event['status'] !== 'Active') {
        $pdo->rollBack();
        jsonResponse(400, [
            'success' => false,
            'error'   => 'This event is not currently accepting registrations.',
        ]);
    }

    // -----------------------------------------------------------------------
    // 3. Check capacity — has the event reached its max?
    // -----------------------------------------------------------------------
    if ((int)$event['max_capacity'] > 0) {
        $countStmt = $pdo->prepare(
            'SELECT COUNT(*) AS reg_count
             FROM event_registrations
             WHERE event_id = :eid AND status != :rejected'
        );
        $countStmt->execute([
            ':eid'      => $eventId,
            ':rejected' => 'Rejected',
        ]);
        $regCount = (int)$countStmt->fetch()['reg_count'];

        if ($regCount >= (int)$event['max_capacity']) {
            $pdo->rollBack();
            jsonResponse(400, [
                'success' => false,
                'error'   => 'This event has reached its maximum capacity.',
            ]);
        }
    }

    // -----------------------------------------------------------------------
    // 4. No-Double-Register constraint — check if already registered.
    // -----------------------------------------------------------------------
    $existingReg = $pdo->prepare(
        'SELECT id, participant_id, status
         FROM event_registrations
         WHERE user_id = :uid AND event_id = :eid
         LIMIT 1'
    );
    $existingReg->execute([
        ':uid' => $user['id'],
        ':eid' => $eventId,
    ]);
    $existing = $existingReg->fetch();

    if ($existing) {
        $pdo->rollBack();
        jsonResponse(409, [
            'success'        => false,
            'error'          => 'You are already registered for this event.',
            'participant_id' => $existing['participant_id'],
            'status'         => $existing['status'],
        ]);
    }

    // -----------------------------------------------------------------------
    // 5. Validate dynamic form data against the event's form_schema.
    // -----------------------------------------------------------------------
    $formDataJson = null;
    if ($formData !== null && $event['form_schema'] !== null) {
        $schema = json_decode($event['form_schema'], true);
        if (is_array($schema)) {
            $validationErrors = validateDynamicFormData($schema, $formData);
            if (!empty($validationErrors)) {
                $pdo->rollBack();
                jsonResponse(400, [
                    'success' => false,
                    'error'   => 'Form validation failed.',
                    'details' => $validationErrors,
                ]);
            }
        }
        $formDataJson = json_encode($formData, JSON_UNESCAPED_UNICODE);
    }

    // -----------------------------------------------------------------------
    // 6. DB operations — participant ID generation + insert must be atomic.
    // -----------------------------------------------------------------------
    try {
        // Generate event-scoped participant tracking ID (MAV-PRT-XXX).
        $participantId = generateParticipantId($pdo);

        // Determine initial status based on payment type.
        $initialStatus = ($event['payment_type'] === 'Free')
            ? 'Approved'
            : 'Pending_Verification';

        $insertReg = $pdo->prepare(
            'INSERT INTO event_registrations
                (user_id, event_id, participant_id, status, voucher_path, form_data_json, created_at, updated_at)
             VALUES
                (:uid, :eid, :pid, :status, :voucher, :form_data, NOW(), NOW())'
        );
        $insertReg->execute([
            ':uid'       => $user['id'],
            ':eid'       => $eventId,
            ':pid'       => $participantId,
            ':status'    => $initialStatus,
            ':voucher'   => $cleanVoucherPath,
            ':form_data' => $formDataJson,
        ]);

        $registrationId = (int)$pdo->lastInsertId();

        // legacy compatible registrations insertion
        try {
            $legacyInsert = $pdo->prepare(
                'INSERT IGNORE INTO registrations
                    (user_id, event_id, status, voucher_path, created_at, updated_at)
                 VALUES
                    (:uid, :eid, :status, :voucher, NOW(), NOW())'
            );
            $legacyInsert->execute([
                ':uid'    => $user['id'],
                ':eid'    => $eventId,
                ':status' => $initialStatus,
                ':voucher'=> $cleanVoucherPath,
            ]);
        } catch (\Throwable $e) {
            error_log('[BodhantraOS][EventSignup] Legacy registrations insert failed: ' . $e->getMessage());
        }

        $pdo->commit();
    } catch (\Throwable $e) {
        $pdo->rollBack();
        error_log('[BodhantraOS][EventSignup] Registration failed: ' . $e->getMessage());
        jsonResponse(500, [
            'success' => false,
            'error'   => 'Failed to register for this event. Please try again.',
        ]);
    }

    // -----------------------------------------------------------------------
    // 7. Audit trail.
    // -----------------------------------------------------------------------
    writeAuditLog(
        (int)$user['id'],
        "Registered for event #{$eventId} ({$event['title']}) as {$participantId}",
        "/api/events/{$eventId}/register",
        $ctx['ip']
    );

    // -----------------------------------------------------------------------
    // 8. Respond with the registration details and auto-login if new visitor.
    // -----------------------------------------------------------------------
    $response = [
        'success'         => true,
        'message'         => "Successfully registered for {$event['title']}!",
        'registration_id' => $registrationId,
        'participant_id'  => $participantId,
        'event_id'        => $eventId,
        'event_title'     => $event['title'],
        'status'          => $initialStatus,
    ];

    if ($isNewVisitor) {
        sendCredentialsEmail($user['email'], $user['name'], $user['unique_registration_id'], '/login');
        
        $response['token'] = $token;
        $response['user'] = [
            'id'                     => $user['id'],
            'name'                   => $user['name'],
            'email'                  => $user['email'],
            'phone'                  => $user['phone'],
            'unique_registration_id' => $user['unique_registration_id'],
            'role_tier'              => 'Participant',
        ];
    }

    sendRegistrationConfirmation($user['email'], $user['name'], $user['unique_registration_id']);

    jsonResponse(201, $response);
}


// ===========================================================================
// INTERNAL HELPERS
// ===========================================================================

/**
 * Validate dynamic form data against the event's form_schema.
 *
 * The schema is an array of field definitions, each with:
 *   { "field_name": "...", "field_type": "text|select|textarea|checkbox",
 *     "label": "...", "required": true|false, "options": [...] }
 *
 * @param  array $schema    The form_schema from the events table.
 * @param  array $formData  The submitted form data.
 *
 * @return array            Array of error messages (empty if valid).
 */
function validateDynamicFormData(array $schema, array $formData): array
{
    $errors = [];

    foreach ($schema as $field) {
        $fieldName = $field['field_name'] ?? '';
        $label     = $field['label']      ?? $fieldName;
        $required  = (bool)($field['required'] ?? false);
        $fieldType = $field['field_type'] ?? 'text';

        if ($fieldName === '') {
            continue; // Skip malformed schema entries.
        }

        $value = $formData[$fieldName] ?? null;

        // Required check.
        if ($required && ($value === null || $value === '')) {
            $errors[] = "{$label} is required.";
            continue;
        }

        // Type-specific validation.
        if ($value !== null && $value !== '') {
            switch ($fieldType) {
                case 'select':
                    $options = $field['options'] ?? [];
                    if (!empty($options) && !in_array($value, $options, true)) {
                        $errors[] = "{$label} has an invalid selection.";
                    }
                    break;

                case 'number':
                    if (!is_numeric($value)) {
                        $errors[] = "{$label} must be a number.";
                    }
                    break;

                // text, textarea, checkbox — no additional validation.
                default:
                    break;
            }
        }
    }

    return $errors;
}

// ===========================================================================
// POST /events/{id}/register/initiate
// ===========================================================================

function handleEventSignupInitiate(array $ctx): void
{
    $eventId = (int)($ctx['params']['event_id'] ?? 0);
    $body = $ctx['body'];

    $name = trim((string)($body['name'] ?? ''));
    $email = trim((string)($body['email'] ?? ''));
    $phone = trim((string)($body['phone'] ?? ''));
    $formData = $body['form_data'] ?? null;
    $voucherPath = trim((string)($body['voucher_path'] ?? ''));

    // Server-side validation
    $errors = [];
    if ($name === '') {
        $errors[] = 'Name is required.';
    } elseif (mb_strlen($name) < 2 || mb_strlen($name) > 150) {
        $errors[] = 'Name must be between 2 and 150 characters.';
    }

    if ($email === '') {
        $errors[] = 'Email is required.';
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $errors[] = 'Invalid email address format.';
    }

    if ($phone === '') {
        $errors[] = 'Phone number is required.';
    } elseif (!preg_match('/^\+?[0-9]{10,15}$/', $phone)) {
        $errors[] = 'Phone must be 10–15 digits.';
    }

    if (!empty($errors)) {
        jsonResponse(400, [
            'success' => false,
            'error'   => 'Validation failed.',
            'details' => $errors,
        ]);
    }

    $pdo = Database::connect();

    // Check duplicate email
    $dupCheck = $pdo->prepare('SELECT id FROM users WHERE email = :email LIMIT 1');
    $dupCheck->execute([':email' => $email]);
    if ($dupCheck->fetch()) {
        jsonResponse(409, [
            'success' => false,
            'error'   => 'An account with this email address already exists. Please log in first to secure your spot.',
        ]);
    }

    // Check event exists and is Active
    $eventStmt = $pdo->prepare('SELECT id, title, status, form_schema, payment_type FROM events WHERE id = :eid LIMIT 1');
    $eventStmt->execute([':eid' => $eventId]);
    $event = $eventStmt->fetch();

    if (!$event) {
        jsonResponse(404, [
            'success' => false,
            'error'   => 'Event not found.',
        ]);
    }

    if ($event['status'] !== 'Active') {
        jsonResponse(400, [
            'success' => false,
            'error'   => 'This event is not accepting registrations.',
        ]);
    }

    // Validate dynamic form data
    if ($formData !== null && $event['form_schema'] !== null) {
        $schema = json_decode($event['form_schema'], true);
        if (is_array($schema)) {
            $validationErrors = validateDynamicFormData($schema, $formData);
            if (!empty($validationErrors)) {
                jsonResponse(400, [
                    'success' => false,
                    'error'   => 'Form validation failed.',
                    'details' => $validationErrors,
                ]);
            }
        }
    }

    // Proof upload requirements
    $paymentMethod = trim((string)($body['payment_method'] ?? ''));
    if ($paymentMethod === '') {
        $paymentMethod = ($event['payment_type'] === 'Offline') ? 'Offline' : 'Online';
    }

    if ($event['payment_type'] === 'Free') {
        if ($voucherPath === '') {
            jsonResponse(400, [
                'success' => false,
                'error'   => 'College ID screenshot proof is required for verification.',
            ]);
        }
    } else {
        if ($paymentMethod === 'Online') {
            if ($voucherPath === '') {
                jsonResponse(400, [
                    'success' => false,
                    'error'   => 'Payment receipt proof screenshot is required for online payments.',
                ]);
            }
        }
    }

    // Rate-limit check (max 3 active OTPs)
    $rateLimitStmt = $pdo->prepare(
        'SELECT COUNT(*) AS active_count
         FROM otp_verifications
         WHERE email = :email
           AND is_consumed = 0
           AND expires_at > NOW()'
    );
    $rateLimitStmt->execute([':email' => $email]);
    $activeCount = (int)$rateLimitStmt->fetch()['active_count'];

    if ($activeCount >= 3) {
        jsonResponse(429, [
            'success' => false,
            'error'   => 'Too many verification requests. Please wait for the previous code to expire (5 minutes).',
        ]);
    }

    // Generate cryptographic OTP
    $otpCode   = (string)random_int(100000, 999999);
    $hashedOtp = hash('sha256', $otpCode);

    // Save payload
    $payload = json_encode([
        'name'           => $name,
        'email'          => $email,
        'phone'          => $phone,
        'form_data'      => $formData,
        'voucher_path'   => $voucherPath,
        'event_id'       => $eventId,
        'payment_method' => $paymentMethod,
    ], JSON_UNESCAPED_UNICODE);

    $insertOtp = $pdo->prepare(
        'INSERT INTO otp_verifications (email, hashed_otp, payload_json, expires_at, is_consumed, created_at)
         VALUES (:email, :hash, :payload, DATE_ADD(NOW(), INTERVAL 5 MINUTE), 0, NOW())'
    );
    $insertOtp->execute([
        ':email'   => $email,
        ':hash'    => $hashedOtp,
        ':payload' => $payload,
    ]);

    // Send OTP email
    $mailSent = sendOtpEmail($email, $otpCode);
    if (!$mailSent) {
        error_log("[BodhantraOS][GuestRegister] OTP email dispatch failed for {$email}");
    }

    writeAuditLog(
        null,
        "Guest OTP initiated for event #{$eventId} registration: {$email}",
        "/api/events/{$eventId}/register/initiate",
        $ctx['ip']
    );

    jsonResponse(200, [
        'success' => true,
        'message' => 'Verification code sent to your email. Please check your inbox.',
        'email'   => $email,
    ]);
}


// ===========================================================================
// POST /events/{id}/register/verify
// ===========================================================================

function handleEventSignupVerify(array $ctx): void
{
    $eventId = (int)($ctx['params']['event_id'] ?? 0);
    $body = $ctx['body'];

    $email = trim((string)($body['email'] ?? ''));
    $otp   = trim((string)($body['otp']   ?? ''));

    if ($email === '' || $otp === '') {
        jsonResponse(400, [
            'success' => false,
            'error'   => 'Both "email" and "otp" are required.',
        ]);
    }

    if (!preg_match('/^\d{6}$/', $otp)) {
        jsonResponse(400, [
            'success' => false,
            'error'   => 'Verification code must be exactly 6 digits.',
        ]);
    }

    $pdo = Database::connect();

    // Validate OTP hash and validity
    $stmt = $pdo->prepare(
        'SELECT id, payload_json
         FROM otp_verifications
         WHERE email = :email
           AND hashed_otp = :hash
           AND is_consumed = 0
           AND expires_at > NOW()
         ORDER BY id DESC
         LIMIT 1'
    );
    $hashedOtp = hash('sha256', $otp);
    $stmt->execute([
        ':email' => $email,
        ':hash'  => $hashedOtp,
    ]);

    $verification = $stmt->fetch();

    if (!$verification) {
        jsonResponse(400, [
            'success' => false,
            'error'   => 'Invalid or expired verification code. Please request a new one.',
        ]);
    }

    // Mark as consumed
    $updateStmt = $pdo->prepare('UPDATE otp_verifications SET is_consumed = 1 WHERE id = :id');
    $updateStmt->execute([':id' => $verification['id']]);

    // Parse payload and match event_id
    $payload = json_decode($verification['payload_json'], true);
    if (!is_array($payload) || (int)($payload['event_id'] ?? 0) !== $eventId) {
        jsonResponse(400, [
            'success' => false,
            'error'   => 'Invalid session payload. Please initiate event registration again.',
        ]);
    }

    $name = $payload['name'];
    $phone = $payload['phone'];
    $formData = $payload['form_data'];
    $voucherPath = $payload['voucher_path'];

    // Double check email duplicate
    $dupCheck = $pdo->prepare('SELECT id FROM users WHERE email = :email LIMIT 1');
    $dupCheck->execute([':email' => $email]);
    if ($dupCheck->fetch()) {
        jsonResponse(409, [
            'success' => false,
            'error'   => 'An account with this email address already exists. Please login instead.',
        ]);
    }

    // Start database transaction
    $pdo->beginTransaction();

    try {
        // Generate deterministic Account ID
        $userRegId = generateAccountId($pdo, 'Participant');

        // Hash phone number as password
        $passwordHash = password_hash($phone, PASSWORD_BCRYPT, ['cost' => 12]);
        if ($passwordHash === false) {
            throw new \RuntimeException('password_hash() returned false.');
        }

        // Insert new user into database
        $insertUser = $pdo->prepare(
            'INSERT INTO users
                (name, email, phone, unique_registration_id, password_hash, role_tier, is_active, created_at, updated_at)
             VALUES
                (:name, :email, :phone, :reg_id, :pass_hash, \'Participant\', 1, NOW(), NOW())'
        );
        $insertUser->execute([
            ':name'      => $name,
            ':email'     => $email,
            ':phone'     => $phone,
            ':reg_id'    => $userRegId,
            ':pass_hash' => $passwordHash,
        ]);

        $newUserId = (int)$pdo->lastInsertId();

        // Create session token
        $rawToken  = bin2hex(random_bytes(32));
        $tokenHash = hash('sha256', $rawToken);

        $insertSession = $pdo->prepare(
            'INSERT INTO auth_sessions (user_id, token_hash, expires_at, created_at)
             VALUES (:uid, :hash, DATE_ADD(NOW(), INTERVAL 1 DAY), NOW())'
        );
        $insertSession->execute([
            ':uid'  => $newUserId,
            ':hash' => $tokenHash,
        ]);

        // Get Event details
        $eventStmt = $pdo->prepare('SELECT title, payment_type FROM events WHERE id = :eid LIMIT 1');
        $eventStmt->execute([':eid' => $eventId]);
        $event = $eventStmt->fetch();

        // Guest registration always results in Pending_Verification for manual approval
        $initialStatus = 'Pending_Verification';

        // Strip /api/ prefix if present
        $cleanVoucherPath = $voucherPath ? preg_replace('/^\/?api\//', '', $voucherPath) : null;
        $formDataJson = $formData ? json_encode($formData, JSON_UNESCAPED_UNICODE) : null;

        // Generate participant serial code
        $participantId = generateParticipantId($pdo);

        // Insert event registration
        $insertReg = $pdo->prepare(
            'INSERT INTO event_registrations
                (user_id, event_id, participant_id, status, voucher_path, form_data_json, created_at, updated_at)
             VALUES
                (:uid, :eid, :pid, :status, :voucher, :form_data, NOW(), NOW())'
        );
        $insertReg->execute([
            ':uid'       => $newUserId,
            ':eid'       => $eventId,
            ':pid'       => $participantId,
            ':status'    => $initialStatus,
            ':voucher'   => $cleanVoucherPath,
            ':form_data' => $formDataJson,
        ]);

        $registrationId = (int)$pdo->lastInsertId();

        // Insert legacy registrations compatibility row
        try {
            $legacyInsert = $pdo->prepare(
                'INSERT IGNORE INTO registrations
                    (user_id, event_id, status, voucher_path, created_at, updated_at)
                 VALUES
                    (:uid, :eid, :status, :voucher, NOW(), NOW())'
            );
            $legacyInsert->execute([
                ':uid'     => $newUserId,
                ':eid'     => $eventId,
                ':status'  => $initialStatus,
                ':voucher' => $cleanVoucherPath,
            ]);
        } catch (\Throwable $e) {
            error_log('[BodhantraOS][EventSignupVerify] Legacy registrations insert failed: ' . $e->getMessage());
        }

        $pdo->commit();
    } catch (\Throwable $e) {
        $pdo->rollBack();
        error_log('[BodhantraOS][EventSignupVerify] Guest verify registration failed: ' . $e->getMessage());
        jsonResponse(500, [
            'success' => false,
            'error'   => 'Failed to register guest account. Please try again.',
        ]);
    }

    // Send emails
    sendCredentialsEmail($email, $name, $userRegId, '/login');
    sendRegistrationConfirmation($email, $name, $userRegId);

    writeAuditLog(
        $newUserId,
        "Guest verified OTP and registered for event #{$eventId} ({$event['title']}) as {$participantId}",
        "/api/events/{$eventId}/register/verify",
        $ctx['ip']
    );

    jsonResponse(201, [
        'success'         => true,
        'message'         => "Successfully verified and registered for {$event['title']}!",
        'registration_id' => $registrationId,
        'participant_id'  => $participantId,
        'event_id'        => $eventId,
        'event_title'     => $event['title'],
        'status'          => $initialStatus,
        'token'           => $rawToken,
        'user' => [
            'id'                     => $newUserId,
            'name'                   => $name,
            'email'                  => $email,
            'phone'                  => $phone,
            'unique_registration_id' => $userRegId,
            'role_tier'              => 'Participant',
        ],
    ]);
}
