<?php
/**
 * ============================================================================
 * BODHANTRA EVENT OS — Participant Registration Controller
 * ============================================================================
 *
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  ⚠️  DEPRECATED — Phase 1 Refactoring                                  ║
 * ║                                                                        ║
 * ║  This controller is superseded by public_register.php which provides:  ║
 * ║    • OTP-verified registration (POST /register/initiate)               ║
 * ║    • Account creation with MAV-MEM-XXX IDs (/register/verify-otp)     ║
 * ║    • Event-scoped participant signup (POST /events/{id}/register)      ║
 * ║                                                                        ║
 * ║  This file is kept for backward compatibility ONLY.                    ║
 * ║  New features should be added to public_register.php.                  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Legacy flow (POST /register):
 *   1. Extract & sanitize input fields.
 *   2. Run strict format validations (email, phone, required fields).
 *   3. Check for duplicate email.
 *   4. Generate a registration ID (BODH2026-XXXXXX — old format).
 *   5. Generate a temporary password for initial access.
 *   6. Insert into users with role_tier = 'Participant'.
 *   7. Return credentials + tracking code.
 *
 * @package BodhantraOS\Controllers
 * @deprecated Use public_register.php instead.
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
    // -----------------------------------------------------------------------
    $name         = trim($body['name']          ?? '');
    $email        = trim($body['email']         ?? '');
    $phone        = trim($body['phone']         ?? '');
    $branch       = trim($body['branch']        ?? 'Other');
    $academicYear = trim($body['academic_year'] ?? 'FY');
    $role         = trim($body['role_tier']     ?? $body['role'] ?? 'Member');

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

    // --- Phone: required, 10–15 digits ---
    if ($phone === '') {
        $errors[] = 'Phone number is required.';
    } elseif (!preg_match('/^\+?[0-9]{10,15}$/', $phone)) {
        $errors[] = 'Phone must be 10–15 digits. Optional leading + for country code.';
    }

    // --- Role: only Admin and Member allowed for registration ---
    if ($role !== 'Admin' && $role !== 'Member') {
        $errors[] = 'Role must be either Admin or Member.';
    }

    // --- Return all errors at once ---
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
    // 4. Password Enforce (Mobile Number)
    // -----------------------------------------------------------------------
    $tempPassword = $phone;
    $passwordHash = password_hash($tempPassword, PASSWORD_BCRYPT, ['cost' => 12]);

    if ($passwordHash === false) {
        error_log('[BodhantraOS][Register] password_hash() returned false — check PHP build.');
        jsonResponse(500, [
            'success' => false,
            'error'   => 'Internal security error. Contact an administrator.',
        ]);
    }

    // -----------------------------------------------------------------------
    // 5. Insert Into Database (Inside Transaction for ID Gen lock safety)
    // -----------------------------------------------------------------------
    require_once dirname(__DIR__) . '/utils/id_generator.php';
    
    $pdo->beginTransaction();
    try {
        // Generate sequential prefixed ID (MAV-ADM-XXX or MAV-MEM-XXX)
        $regId = generateAccountId($pdo, $role);

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
            ':role'      => $role,
        ]);

        $newUserId = (int)$pdo->lastInsertId();
        $pdo->commit();
    } catch (\Throwable $e) {
        $pdo->rollBack();
        error_log('[BodhantraOS][Register] Transaction failed: ' . $e->getMessage());
        jsonResponse(500, [
            'success' => false,
            'error'   => 'Registration failed due to database transaction failure.',
        ]);
    }

    // -----------------------------------------------------------------------
    // 6. Audit Log
    // -----------------------------------------------------------------------
    writeAuditLog(
        $newUserId,
        "New {$role} registered: {$email} ({$regId})",
        '/api/register',
        $ctx['ip']
    );

    // -----------------------------------------------------------------------
    // 7. Respond with credentials
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
            'role_tier'              => $role,
        ],
    ]);
}
