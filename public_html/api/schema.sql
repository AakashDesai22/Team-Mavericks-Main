-- ============================================================================
-- BODHANTRA EVENT OS — Database Schema Migration
-- ============================================================================
-- Run this file once against your MySQL database to create all required tables.
--
-- Target:  MySQL 8.0+ / MariaDB 10.5+
-- Charset: utf8mb4 (full Unicode + emoji support)
--
-- Usage on Hostinger:
--   1. Open phpMyAdmin from the Hostinger panel
--   2. Select the target database
--   3. Click the "SQL" tab
--   4. Paste this entire file and click "Go"
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------------
-- 1. USERS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
    `id`                     INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `name`                   VARCHAR(150)    NOT NULL,
    `email`                  VARCHAR(255)    NOT NULL,
    `phone`                  VARCHAR(20)     DEFAULT NULL,
    `password_hash`          VARCHAR(255)    NOT NULL  COMMENT 'bcrypt / argon2id hash',
    `branch`                 VARCHAR(100)    DEFAULT NULL  COMMENT 'Academic branch / department',
    `academic_year`          VARCHAR(20)     DEFAULT NULL  COMMENT 'e.g. FY, SY, TY, Final',
    `unique_registration_id` VARCHAR(50)     NOT NULL  COMMENT 'Platform-generated unique ID',
    `role_tier`              ENUM('Admin','Member','Participant') NOT NULL DEFAULT 'Participant',
    `avatar_path`            VARCHAR(500)    DEFAULT NULL  COMMENT 'Relative path to profile image',
    `is_active`              TINYINT(1)      NOT NULL DEFAULT 1,
    `created_at`             TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`             TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_users_email` (`email`),
    UNIQUE KEY `uq_users_reg_id` (`unique_registration_id`),
    INDEX `idx_users_role` (`role_tier`),
    INDEX `idx_users_branch` (`branch`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 2. EVENTS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `events` (
    `id`                INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `title`             VARCHAR(255)    NOT NULL,
    `description`       TEXT            DEFAULT NULL,
    `event_date`        DATE            DEFAULT NULL,
    `max_capacity`      INT UNSIGNED    NOT NULL DEFAULT 0,
    `status`            ENUM('Draft','Active','Archived') NOT NULL DEFAULT 'Draft',
    `cover_image_path`  VARCHAR(500)    DEFAULT NULL,
    `created_by`        INT UNSIGNED    DEFAULT NULL,
    `created_at`        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    INDEX `idx_events_status` (`status`),
    INDEX `idx_events_date` (`event_date`),
    CONSTRAINT `fk_events_created_by` FOREIGN KEY (`created_by`)
        REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 3. REGISTRATIONS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `registrations` (
    `id`                INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `user_id`           INT UNSIGNED    NOT NULL,
    `event_id`          INT UNSIGNED    NOT NULL,
    `status`            ENUM('Pending_Verification','Approved','Rejected') NOT NULL DEFAULT 'Pending_Verification',
    `voucher_path`      VARCHAR(500)    DEFAULT NULL  COMMENT 'Relative path to uploaded payment voucher',
    `checked_in_state`  TINYINT(1)      NOT NULL DEFAULT 0,
    `checked_in_at`     TIMESTAMP       NULL DEFAULT NULL,
    `rejection_reason`  VARCHAR(500)    DEFAULT NULL,
    `created_at`        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_reg_user_event` (`user_id`, `event_id`),
    INDEX `idx_reg_status` (`status`),
    INDEX `idx_reg_event` (`event_id`),
    CONSTRAINT `fk_reg_user` FOREIGN KEY (`user_id`)
        REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_reg_event` FOREIGN KEY (`event_id`)
        REFERENCES `events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 4. SEATING GRID
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `seating_grid` (
    `id`                INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `event_id`          INT UNSIGNED    NOT NULL,
    `row_identifier`    VARCHAR(10)     NOT NULL  COMMENT 'Row label (A, B, C, ...)',
    `column_identifier` VARCHAR(10)     NOT NULL  COMMENT 'Column number (1, 2, 3, ...)',
    `cell_type`         ENUM('Available','Blocked') NOT NULL DEFAULT 'Available',
    `block_reason`      VARCHAR(100)    DEFAULT NULL  COMMENT 'Pillar, walkway, equipment, etc.',

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_grid_cell` (`event_id`, `row_identifier`, `column_identifier`),
    CONSTRAINT `fk_grid_event` FOREIGN KEY (`event_id`)
        REFERENCES `events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 5. ALLOCATIONS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `allocations` (
    `id`                  INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `user_id`             INT UNSIGNED    NOT NULL,
    `event_id`            INT UNSIGNED    NOT NULL,
    `team_name`           VARCHAR(100)    NOT NULL,
    `assigned_cohort_role` VARCHAR(50)    NOT NULL  COMMENT 'LEADER, ANALYST, SCRIBE, etc.',
    `row_coordinate`      VARCHAR(10)    NOT NULL,
    `column_coordinate`   VARCHAR(10)    NOT NULL,
    `reveal_state`        ENUM('Unrevealed','Revealed') NOT NULL DEFAULT 'Unrevealed',
    `allocated_at`        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_alloc_user_event` (`user_id`, `event_id`),
    UNIQUE KEY `uq_alloc_seat` (`event_id`, `row_coordinate`, `column_coordinate`),
    INDEX `idx_alloc_team` (`event_id`, `team_name`),
    CONSTRAINT `fk_alloc_user` FOREIGN KEY (`user_id`)
        REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_alloc_event` FOREIGN KEY (`event_id`)
        REFERENCES `events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 6. AUDIT LEDGER
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `audit_ledger` (
    `id`                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `actor_user_id`      INT UNSIGNED    DEFAULT NULL  COMMENT 'NULL for anonymous/unauthenticated actions',
    `action_description` VARCHAR(500)    NOT NULL,
    `targeted_endpoint`  VARCHAR(255)    NOT NULL,
    `client_ip`          VARCHAR(45)     NOT NULL  COMMENT 'IPv4 or IPv6',
    `server_timestamp`   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    INDEX `idx_audit_actor` (`actor_user_id`),
    INDEX `idx_audit_time` (`server_timestamp`),
    CONSTRAINT `fk_audit_actor` FOREIGN KEY (`actor_user_id`)
        REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 7. CERTIFICATE TEMPLATES (stores canvas coordinate percentages)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `certificate_templates` (
    `id`                INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `event_id`          INT UNSIGNED    NOT NULL,
    `template_name`     VARCHAR(150)    NOT NULL,
    `background_path`   VARCHAR(500)    DEFAULT NULL,
    `elements_json`     JSON            NOT NULL  COMMENT 'Array of {type, label, x_pct, y_pct, font_size_pct, ...}',
    `created_by`        INT UNSIGNED    DEFAULT NULL,
    `created_at`        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    INDEX `idx_cert_event` (`event_id`),
    CONSTRAINT `fk_cert_event` FOREIGN KEY (`event_id`)
        REFERENCES `events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_cert_creator` FOREIGN KEY (`created_by`)
        REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 8. SESSIONS / AUTH TOKENS (optional — for JWT-less session management)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `auth_sessions` (
    `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id`       INT UNSIGNED    NOT NULL,
    `token_hash`    VARCHAR(128)    NOT NULL  COMMENT 'SHA-256 hash of the bearer token',
    `expires_at`    TIMESTAMP       NOT NULL,
    `created_at`    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_token` (`token_hash`),
    INDEX `idx_session_user` (`user_id`),
    INDEX `idx_session_expiry` (`expires_at`),
    CONSTRAINT `fk_session_user` FOREIGN KEY (`user_id`)
        REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- SEED: Default admin account
-- Password: Change this immediately after first login!
-- The hash below is for the string "admin@bodhantra2026" using bcrypt cost 12.
-- Generate a new hash with: php -r "echo password_hash('YOUR_PASSWORD', PASSWORD_BCRYPT, ['cost'=>12]);"
-- ============================================================================
-- INSERT INTO `users` (`name`, `email`, `password_hash`, `unique_registration_id`, `role_tier`)
-- VALUES ('System Admin', 'admin@bodhantra.com', '$2y$12$PLACEHOLDER_HASH_REPLACE_ME', 'ADM-000001', 'Admin');
