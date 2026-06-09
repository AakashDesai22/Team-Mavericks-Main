-- ============================================================================
-- BODHANTRA EVENT OS — Phase 2 Migration (Feedback & Auditing)
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Create feedback_submissions table
CREATE TABLE IF NOT EXISTS `feedback_submissions` (
    `id`                 INT UNSIGNED     NOT NULL AUTO_INCREMENT,
    `event_id`           INT UNSIGNED     NOT NULL COMMENT 'FK → events.id',
    `user_id`            INT UNSIGNED     NOT NULL COMMENT 'FK → users.id (the submitting user)',
    `feedback_data_json` JSON             NOT NULL COMMENT 'JSON payload of dynamic answers',
    `submitted_at`       TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_feedback_event_user` (`event_id`, `user_id`),
    CONSTRAINT `fk_feedback_event` FOREIGN KEY (`event_id`)
        REFERENCES `events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_feedback_user` FOREIGN KEY (`user_id`)
        REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Audit client IP in attendance_log (Checks if already added, otherwise adds)
-- To be safe across all MySQL versions, we just run a standard ALTER. If it fails due to column existing, it is safe to ignore or we can catch it.
ALTER TABLE `attendance_log`
    ADD COLUMN `client_ip` VARCHAR(45) DEFAULT NULL COMMENT 'IP of the operator checkin crew'
    AFTER `marked_by`;

SET FOREIGN_KEY_CHECKS = 1;
