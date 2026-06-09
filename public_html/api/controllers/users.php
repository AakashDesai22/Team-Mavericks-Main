<?php
/**
 * ============================================================================
 * BODHANTRA EVENT OS — Teammate & User Management Controller (Phase 3)
 * ============================================================================
 *
 * Handlers:
 *   POST   /users/invite     → handleInviteUser() (Admin only)
 *   GET    /users/{id}       → handleGetUser() (Admin only)
 *   PATCH  /users/{id}/role  → handleUpdateUserRole() (Admin only)
 *
 * @package BodhantraOS\Controllers
 */

declare(strict_types=1);

require_once __DIR__ . '/_middleware.php';
require_once __DIR__ . '/../utils/id_generator.php';
require_once __DIR__ . '/../utils/mailer.php';

/**
 * Invite New Teammate / Create Account
 * Admin-only endpoint. Creates a new Member or Admin account, hashes the phone
 * as initial password, and triggers mailer credentials dispatch.
 *
 * Request body:
 *   {
 *     "name":      "Vikram Malhotra",
 *     "email":     "vikram@example.com",
 *     "phone":     "9876543212",
 *     "role_tier": "Member"  // 'Member' or 'Admin'
 *   }
 */
function handleInviteUser(array $ctx): void
{
    // 1. RBAC gate — restricted exclusively to Admin
    $operator = requireAuth($ctx, ['Admin']);

    $body = $ctx['body'];

    $name     = trim((string)($body['name'] ?? ''));
    $email    = trim((string)($body['email'] ?? ''));
    $phone    = trim((string)($body['phone'] ?? ''));
    $roleTier = trim((string)($body['role_tier'] ?? ''));

    // Input validations
    if ($name === '' || $email === '' || $phone === '' || !in_array($roleTier, ['Admin', 'Member'], true)) {
        jsonResponse(400, [
            'success' => false,
            'error'   => 'Missing or invalid parameters. (name, email, phone, and role_tier in Admin|Member are required).',
        ]);
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonResponse(400, [
            'success' => false,
            'error'   => 'Invalid email address format.',
        ]);
    }

    $pdo = Database::connect();

    // Check if email already registered
    $checkEmail = $pdo->prepare('SELECT id FROM users WHERE email = :email LIMIT 1');
    $checkEmail->execute([':email' => $email]);
    if ($checkEmail->fetch()) {
        jsonResponse(409, [
            'success' => false,
            'error'   => 'A user with this email address is already registered inside Mavericks.',
        ]);
    }


    // 2. Transact insertion & sequential serial ID generation
    $pdo->beginTransaction();

    try {
        // Generate MAV-ADM-XXX or MAV-MEM-XXX
        $accountId = generateAccountId($pdo, $roleTier);

        // Hashing phone as initial password
        $passwordHash = password_hash($phone, PASSWORD_BCRYPT, ['cost' => 12]);

        $insert = $pdo->prepare(
            'INSERT INTO users (name, email, phone, unique_registration_id, role_tier, password_hash, is_active, created_at)
             VALUES (:name, :email, :phone, :uid, :role, :password_hash, 1, NOW())'
        );
        $insert->execute([
            ':name'          => $name,
            ':email'         => $email,
            ':phone'         => $phone,
            ':uid'           => $accountId,
            ':role'          => $roleTier,
            ':password_hash' => $passwordHash,
        ]);

        $newUserId = (int)$pdo->lastInsertId();

        $pdo->commit();
    } catch (\Throwable $e) {
        $pdo->rollBack();
        error_log('[BodhantraOS][TeammateInvite] Transaction failed: ' . $e->getMessage());
        jsonResponse(500, [
            'success' => false,
            'error'   => 'Failed to create user account. Database transactional error.',
        ]);
    }

    // 3. Dispatch access credentials email using native utility mailer
    $mailSent = false;
    try {
        // Mailer generates branded credentials template
        $loginPath = '/login';
        $mailSent  = sendCredentialsEmail($email, $name, $accountId, $loginPath);
    } catch (\Throwable $e) {
        error_log('[BodhantraOS][TeammateInvite] Mailer failed: ' . $e->getMessage());
    }

    // Audit logs
    writeAuditLog(
        (int)$operator['id'],
        "Invited new {$roleTier} teammates: {$name} ({$accountId})",
        "/api/users/invite",
        $ctx['ip']
    );

    jsonResponse(201, [
        'success'    => true,
        'message'    => "Successfully invited {$name} as {$roleTier}.",
        'account_id' => $accountId,
        'email_sent' => $mailSent,
    ]);
}

/**
 * Fetch Single User Profile
 */
function handleGetUser(array $ctx): void
{
    requireAuth($ctx, ['Admin']);

    $userId = (int)($ctx['params']['user_id'] ?? 0);

    if ($userId <= 0) {
        jsonResponse(400, [
            'success' => false,
            'error'   => 'Invalid user ID.',
        ]);
    }

    $pdo = Database::connect();
    $stmt = $pdo->prepare(
        'SELECT id, name, email, phone, branch, academic_year, unique_registration_id, role_tier, is_active, created_at
         FROM users
         WHERE id = :uid
         LIMIT 1'
    );
    $stmt->execute([':uid' => $userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        jsonResponse(404, [
            'success' => false,
            'error'   => 'User profile not found.',
        ]);
    }

    jsonResponse(200, [
        'success' => true,
        'user'    => $user,
    ]);
}

/**
 * Update Teammate Role
 */
function handleUpdateUserRole(array $ctx): void
{
    $operator = requireAuth($ctx, ['Admin']);

    $userId   = (int)($ctx['params']['user_id'] ?? 0);
    $newRole  = trim((string)($ctx['body']['role_tier'] ?? ''));

    if ($userId <= 0 || !in_array($newRole, ['Admin', 'Member', 'Participant'], true)) {
        jsonResponse(400, [
            'success' => false,
            'error'   => 'Invalid user ID or target role tier.',
        ]);
    }

    $pdo = Database::connect();

    // Prevent self-role-downgrade
    if ($userId === (int)$operator['id']) {
        jsonResponse(400, [
            'success' => false,
            'error'   => 'Security violation: Self-role modifications are locked.',
        ]);
    }

    // Check user exists
    $check = $pdo->prepare('SELECT name, unique_registration_id, role_tier FROM users WHERE id = :uid LIMIT 1');
    $check->execute([':uid' => $userId]);
    $targetUser = $check->fetch(PDO::FETCH_ASSOC);

    if (!$targetUser) {
        jsonResponse(404, [
            'success' => false,
            'error'   => 'User profile not found.',
        ]);
    }

    try {
        $update = $pdo->prepare('UPDATE users SET role_tier = :role WHERE id = :uid');
        $update->execute([
            ':role' => $newRole,
            ':uid'  => $userId,
        ]);
    } catch (\Throwable $e) {
        error_log('[BodhantraOS][UserRoleUpdate] Failed: ' . $e->getMessage());
        jsonResponse(500, [
            'success' => false,
            'error'   => 'Failed to update user role.',
        ]);
    }

    writeAuditLog(
        (int)$operator['id'],
        "Updated role of {$targetUser['name']} ({$targetUser['unique_registration_id']}) from {$targetUser['role_tier']} to {$newRole}",
        "/api/users/{$userId}/role",
        $ctx['ip']
    );

    jsonResponse(200, [
        'success' => true,
        'message' => "Role tier for {$targetUser['name']} successfully updated to {$newRole}.",
    ]);
}

/**
 * List All Users (Admin only)
 */
function handleListUsers(array $ctx): void
{
    requireAuth($ctx, ['Admin']);

    $pdo = Database::connect();
    try {
        $stmt = $pdo->query(
            'SELECT id, name, email, phone, branch, academic_year, unique_registration_id, role_tier, is_active, created_at
             FROM users
             ORDER BY created_at DESC'
        );
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

        jsonResponse(200, [
            'success' => true,
            'users'   => $users,
        ]);
    } catch (\Throwable $e) {
        error_log('[BodhantraOS][UsersList] Failed: ' . $e->getMessage());
        jsonResponse(500, [
            'success' => false,
            'error'   => 'Failed to retrieve users list.',
        ]);
    }
}

/**
 * Delete User Account (Admin only)
 */
function handleDeleteUser(array $ctx): void
{
    $operator = requireAuth($ctx, ['Admin']);

    $userId = (int)($ctx['params']['user_id'] ?? 0);

    if ($userId <= 0) {
        jsonResponse(400, [
            'success' => false,
            'error'   => 'Invalid user ID.',
        ]);
    }

    // Prevent self-deletion
    if ($userId === (int)$operator['id']) {
        jsonResponse(400, [
            'success' => false,
            'error'   => 'Security violation: Self-deletion is locked.',
        ]);
    }

    $pdo = Database::connect();
    
    // Check if user exists
    $check = $pdo->prepare('SELECT name, unique_registration_id FROM users WHERE id = :uid LIMIT 1');
    $check->execute([':uid' => $userId]);
    $user = $check->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        jsonResponse(404, [
            'success' => false,
            'error'   => 'User profile not found.',
        ]);
    }

    try {
        $pdo->beginTransaction();
        
        $delete = $pdo->prepare('DELETE FROM users WHERE id = :uid');
        $delete->execute([':uid' => $userId]);
        
        $pdo->commit();
    } catch (\Throwable $e) {
        $pdo->rollBack();
        error_log('[BodhantraOS][UserDelete] Failed: ' . $e->getMessage());
        jsonResponse(500, [
            'success' => false,
            'error'   => 'Failed to delete user account. Database error.',
        ]);
    }

    writeAuditLog(
        (int)$operator['id'],
        "Deleted user account: {$user['name']} ({$user['unique_registration_id']})",
        "/api/users/{$userId}",
        $ctx['ip']
    );

    jsonResponse(200, [
        'success' => true,
        'message' => "User {$user['name']} has been successfully deleted.",
    ]);
}

/**
 * Update User Details (Admin only)
 */
function handleUpdateUser(array $ctx): void
{
    requireAuth($ctx, ['Admin']);

    $userId = (int)($ctx['params']['user_id'] ?? 0);
    $body   = $ctx['body'];

    if ($userId <= 0) {
        jsonResponse(400, [
            'success' => false,
            'error'   => 'Invalid user ID.',
        ]);
    }

    $name         = trim((string)($body['name'] ?? ''));
    $email        = trim((string)($body['email'] ?? ''));
    $phone        = trim((string)($body['phone'] ?? ''));
    $branch       = trim((string)($body['branch'] ?? ''));
    $academicYear = trim((string)($body['academic_year'] ?? ''));

    // Validation
    if ($name === '' || $email === '') {
        jsonResponse(400, [
            'success' => false,
            'error'   => 'Name and Email are required.',
        ]);
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonResponse(400, [
            'success' => false,
            'error'   => 'Invalid email address format.',
        ]);
    }

    $pdo = Database::connect();

    // Check if user exists
    $checkUser = $pdo->prepare('SELECT id FROM users WHERE id = :uid LIMIT 1');
    $checkUser->execute([':uid' => $userId]);
    if (!$checkUser->fetch()) {
        jsonResponse(404, [
            'success' => false,
            'error'   => 'User profile not found.',
        ]);
    }

    // Check if email already registered by ANOTHER user
    $checkEmail = $pdo->prepare('SELECT id FROM users WHERE email = :email AND id != :uid LIMIT 1');
    $checkEmail->execute([':email' => $email, ':uid' => $userId]);
    if ($checkEmail->fetch()) {
        jsonResponse(409, [
            'success' => false,
            'error'   => 'Another user with this email address already exists.',
        ]);
    }

    try {
        $update = $pdo->prepare(
            'UPDATE users 
             SET name = :name, email = :email, phone = :phone, branch = :branch, academic_year = :year
             WHERE id = :uid'
        );
        $update->execute([
            ':name'   => $name,
            ':email'  => $email,
            ':phone'  => $phone !== '' ? $phone : null,
            ':branch' => $branch !== '' ? $branch : null,
            ':year'   => $academicYear !== '' ? $academicYear : null,
            ':uid'    => $userId,
        ]);
        
        jsonResponse(200, [
            'success' => true,
            'message' => 'User details updated successfully.',
        ]);
    } catch (\Throwable $e) {
        error_log('[BodhantraOS][UserUpdate] Failed: ' . $e->getMessage());
        jsonResponse(500, [
            'success' => false,
            'error'   => 'Failed to update user details.',
        ]);
    }
}

