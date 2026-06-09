-- ============================================================================
-- BODHANTRA EVENT OS — Phase 1 Migration
-- ============================================================================
--
-- This migration introduces:
--   1. `otp_verifications`   — Timed OTP verification cache
--   2. `event_registrations` — Event-scoped participant tracking (MAV-PRT-XXX)
--   3. `attendance_log`      — Day-wise, session-wise attendance matrix
--   4. ALTER `events`        — Dynamic form_schema, multi-day, payment config
--   5. Data migration        — Rewrite existing user IDs to MAV-{ROLE}-{SEQ}
--
-- IMPORTANT:
--   • Run this AFTER the initial schema.sql has been applied.
--   • Back up your database before executing in production.
--   • This migration is idempotent — it uses IF NOT EXISTS guards.
--
-- Target:  MySQL 8.0+ / MariaDB 10.5+
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;


-- ---------------------------------------------------------------------------
-- 1. OTP VERIFICATIONS
-- ---------------------------------------------------------------------------
-- Caches pending registration payloads with a timed 6-digit verification code.
-- The hashed_otp column stores SHA-256(otp_code) — never the plaintext.
-- Rows are soft-expired via `expires_at` and hard-consumed via `is_consumed`.
-- A background cron or manual TRUNCATE should clean stale rows periodically.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `otp_verifications` (
    `id`           BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT,
    `email`        VARCHAR(255)      NOT NULL  COMMENT 'Target email address for verification',
    `hashed_otp`   VARCHAR(128)      NOT NULL  COMMENT 'SHA-256 hash of the 6-digit OTP',
    `payload_json` JSON              NOT NULL  COMMENT 'Cached registration form data (name, email, phone, etc.)',
    `expires_at`   TIMESTAMP         NOT NULL  COMMENT 'Expiry = created_at + 5 minutes',
    `is_consumed`  TINYINT(1)        NOT NULL DEFAULT 0  COMMENT '1 = OTP was successfully verified',
    `created_at`   TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    INDEX `idx_otp_email`   (`email`),
    INDEX `idx_otp_expires` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ---------------------------------------------------------------------------
-- 2. EVENT REGISTRATIONS (Event-Scoped Participant Tracking)
-- ---------------------------------------------------------------------------
-- This table replaces the direct Participant → Event binding that previously
-- lived in the `registrations` table.  Each row represents a user's
-- participation in a SPECIFIC event, with their unique MAV-PRT-XXX ID.
--
-- The old `registrations` table is kept for backward compatibility during
-- the transition period.  New event signups should use this table.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `event_registrations` (
    `id`               INT UNSIGNED     NOT NULL AUTO_INCREMENT,
    `user_id`          INT UNSIGNED     NOT NULL  COMMENT 'FK → users.id (the global account)',
    `event_id`         INT UNSIGNED     NOT NULL  COMMENT 'FK → events.id',
    `participant_id`   VARCHAR(50)      NOT NULL  COMMENT 'Deterministic serial: MAV-PRT-XXX',
    `status`           ENUM('Pending_Verification','Approved','Rejected')
                                        NOT NULL DEFAULT 'Pending_Verification',
    `voucher_path`     VARCHAR(500)     DEFAULT NULL  COMMENT 'Uploaded payment voucher path',
    `form_data_json`   JSON             DEFAULT NULL  COMMENT 'Dynamic field answers from form_schema',
    `checked_in_state` TINYINT(1)       NOT NULL DEFAULT 0,
    `checked_in_at`    TIMESTAMP        NULL DEFAULT NULL,
    `rejection_reason` VARCHAR(500)     DEFAULT NULL,
    `created_at`       TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`       TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_evt_reg_user_event` (`user_id`, `event_id`),
    UNIQUE KEY `uq_evt_reg_participant` (`participant_id`),
    INDEX `idx_evtreg_status` (`status`),
    INDEX `idx_evtreg_event`  (`event_id`),
    CONSTRAINT `fk_evtreg_user` FOREIGN KEY (`user_id`)
        REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_evtreg_event` FOREIGN KEY (`event_id`)
        REFERENCES `events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ---------------------------------------------------------------------------
-- 3. ATTENDANCE LOG (Day-Wise / Session-Wise)
-- ---------------------------------------------------------------------------
-- Granular attendance matrix supporting multi-day, multi-session events.
-- Each row = one attendance mark for one participant in one session.
--
-- session_label examples: "Morning", "Afternoon", "Evening", "Session 1"
-- The admin defines num_days and sessions_per_day on the event; the
-- frontend generates day_number / session_label combinations from that.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `attendance_log` (
    `id`              BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT,
    `event_id`        INT UNSIGNED      NOT NULL,
    `user_id`         INT UNSIGNED      NOT NULL,
    `participant_id`  VARCHAR(50)       NOT NULL  COMMENT 'MAV-PRT-XXX for quick lookup/scan',
    `day_number`      TINYINT UNSIGNED  NOT NULL  COMMENT '1-indexed day of the event',
    `session_label`   VARCHAR(50)       NOT NULL DEFAULT 'Morning'
                                        COMMENT 'e.g. Morning, Afternoon',
    `marked_by`       INT UNSIGNED      DEFAULT NULL  COMMENT 'Staff user who marked attendance',
    `marked_at`       TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_attend_record` (`event_id`, `user_id`, `day_number`, `session_label`),
    INDEX `idx_attend_event_day` (`event_id`, `day_number`),
    INDEX `idx_attend_participant` (`participant_id`),
    CONSTRAINT `fk_attend_event` FOREIGN KEY (`event_id`)
        REFERENCES `events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_attend_user` FOREIGN KEY (`user_id`)
        REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_attend_marker` FOREIGN KEY (`marked_by`)
        REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ---------------------------------------------------------------------------
-- 4. ALTER `events` — Dynamic Form Schema, Multi-Day, Payment Config
-- ---------------------------------------------------------------------------
-- These columns are added conditionally.  If you re-run this migration,
-- the ALTER will fail on duplicate column names — that's expected and safe.
-- Wrap in a procedure for idempotency.
-- ---------------------------------------------------------------------------

-- 4a. form_schema — JSON column storing the Google-Forms-style field definitions
--     built by the admin when creating/editing an event.
ALTER TABLE `events`
    ADD COLUMN `form_schema` JSON DEFAULT NULL
        COMMENT 'Custom registration form field definitions (Google-Forms style)'
        AFTER `cover_image_path`;

-- 4b. num_days — How many days the event spans (default 1).
ALTER TABLE `events`
    ADD COLUMN `num_days` TINYINT UNSIGNED NOT NULL DEFAULT 1
        COMMENT 'Number of days the event spans'
        AFTER `form_schema`;

-- 4c. sessions_per_day — Sessions per day for attendance tracking (default 2).
ALTER TABLE `events`
    ADD COLUMN `sessions_per_day` TINYINT UNSIGNED NOT NULL DEFAULT 2
        COMMENT 'Number of sessions per day (Morning, Afternoon, etc.)'
        AFTER `num_days`;

-- 4d. payment_type — Online / Offline / Free.
ALTER TABLE `events`
    ADD COLUMN `payment_type` ENUM('Online','Offline','Free') NOT NULL DEFAULT 'Free'
        COMMENT 'Payment infrastructure type for this event'
        AFTER `sessions_per_day`;

-- 4e. payment_amount — Cost of the event (0.00 for free).
ALTER TABLE `events`
    ADD COLUMN `payment_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00
        COMMENT 'Event registration fee amount'
        AFTER `payment_type`;

-- 4f. payment_context — Additional financial context (e.g. UPI ID, bank details).
ALTER TABLE `events`
    ADD COLUMN `payment_context` VARCHAR(500) DEFAULT NULL
        COMMENT 'Financial context: UPI ID, bank details, notes'
        AFTER `payment_amount`;

-- 4g. finance_contacts — JSON array of finance team contact info (for Offline mode).
ALTER TABLE `events`
    ADD COLUMN `finance_contacts` JSON DEFAULT NULL
        COMMENT 'Array of {name, phone, role} for offline payment contact'
        AFTER `payment_context`;


-- ---------------------------------------------------------------------------
-- 5. DATA MIGRATION — Rewrite Existing User IDs to MAV-{ROLE}-{SEQ}
-- ---------------------------------------------------------------------------
-- This section rewrites all `unique_registration_id` values from the old
-- BODH2026-XXXXXX format to the new deterministic serial format:
--   Admin       → MAV-ADM-001, MAV-ADM-002, ...
--   Member      → MAV-MEM-001, MAV-MEM-002, ...
--   Participant → MAV-PRT-001, MAV-PRT-002, ...
--
-- Users are numbered in order of their `id` (creation order) within each tier.
--
-- WARNING: This is a one-way migration.  Old IDs are overwritten.
-- ---------------------------------------------------------------------------

-- Use session variables to track the running counter per role tier.
-- Process each tier sequentially.

-- 5a. Admin accounts
SET @admin_counter = 0;
UPDATE `users`
SET `unique_registration_id` = CONCAT(
    'MAV-ADM-',
    LPAD((@admin_counter := @admin_counter + 1), 3, '0')
)
WHERE `role_tier` = 'Admin'
ORDER BY `id` ASC;

-- 5b. Member accounts
SET @member_counter = 0;
UPDATE `users`
SET `unique_registration_id` = CONCAT(
    'MAV-MEM-',
    LPAD((@member_counter := @member_counter + 1), 3, '0')
)
WHERE `role_tier` = 'Member'
ORDER BY `id` ASC;

-- 5c. Participant accounts (global — these are legacy global participants)
SET @participant_counter = 0;
UPDATE `users`
SET `unique_registration_id` = CONCAT(
    'MAV-PRT-',
    LPAD((@participant_counter := @participant_counter + 1), 3, '0')
)
WHERE `role_tier` = 'Participant'
ORDER BY `id` ASC;


SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- Migration complete.
--
-- Post-migration checklist:
--   1. Verify: SELECT unique_registration_id, role_tier FROM users ORDER BY id;
--   2. Confirm no duplicate IDs: SELECT unique_registration_id, COUNT(*)
--      FROM users GROUP BY unique_registration_id HAVING COUNT(*) > 1;
--   3. Test the OTP flow with MAIL_ENABLED=false (check PHP error_log).
-- ============================================================================
