-- ============================================================================
-- BODHANTRA EVENT OS — Database Migration Phase 5: Multi-Event Engine Structure
-- ============================================================================
-- Adds support for:
--   1. Dynamic Event Feature Flags & Event Types
--   2. Sub-Events & Workshops (Invicta, Verbafest, etc.)
--   3. Sub-Event Registrations
--   4. Multi-Day & Session-Wise Attendance Logs
--   5. Panels Engine (GD, Debate, Interview Panels)
--   6. Candidate Panel Allocations & Judge Assignments
--   7. Panel Topics Pool (GD & Debate)
--   8. Interview Recruitment Slots & Candidate Pipeline Evaluations
--   9. Pre-seeded Draft Event Templates (Bodhantra, Invicta, Verbafest, Recruitment)
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------------
-- 1. EXTEND `events` TABLE WITH EVENT TYPE & FEATURE FLAGS
-- ---------------------------------------------------------------------------
ALTER TABLE `events` 
  ADD COLUMN `event_type` ENUM('Symposium', 'Workshop_Series', 'Literary_Fest', 'Recruitment', 'Custom') NOT NULL DEFAULT 'Custom' AFTER `status`,
  ADD COLUMN `parent_event_id` INT UNSIGNED DEFAULT NULL AFTER `event_type`,
  ADD COLUMN `feature_flags_json` JSON DEFAULT NULL COMMENT 'Dynamic toggles: multi_day, sub_events, seating, panels, slots, etc.' AFTER `cover_image_path`,
  ADD COLUMN `is_template` TINYINT(1) NOT NULL DEFAULT 0 AFTER `feature_flags_json`;

-- ---------------------------------------------------------------------------
-- 2. SUB-EVENTS / WORKSHOPS / COMPETITIONS TABLE
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sub_events` (
    `id`                      INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `parent_event_id`         INT UNSIGNED    NOT NULL,
    `title`                   VARCHAR(255)    NOT NULL,
    `sub_event_type`          ENUM('Workshop', 'GD', 'Debate', 'MindSaga', 'Interview_Role', 'Custom') NOT NULL DEFAULT 'Workshop',
    `description`             TEXT            DEFAULT NULL,
    `capacity`                INT UNSIGNED    NOT NULL DEFAULT 0,
    `event_date`              DATE            DEFAULT NULL,
    `start_time`              TIME            DEFAULT NULL,
    `end_time`                TIME            DEFAULT NULL,
    `venue_location`          VARCHAR(255)    DEFAULT NULL,
    `certificate_template_id` INT UNSIGNED    DEFAULT NULL,
    `is_active`               TINYINT(1)      NOT NULL DEFAULT 1,
    `created_at`              TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`              TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    INDEX `idx_sub_parent` (`parent_event_id`),
    INDEX `idx_sub_type` (`sub_event_type`),
    CONSTRAINT `fk_sub_parent_event` FOREIGN KEY (`parent_event_id`)
        REFERENCES `events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 3. SUB-EVENT REGISTRATIONS (Workshops / Sub-Competitions)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sub_event_registrations` (
    `id`                INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `user_id`           INT UNSIGNED    NOT NULL,
    `parent_event_id`   INT UNSIGNED    NOT NULL,
    `sub_event_id`      INT UNSIGNED    NOT NULL,
    `status`            ENUM('Registered', 'Waitlisted', 'Cancelled') NOT NULL DEFAULT 'Registered',
    `created_at`        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_sub_reg_user` (`user_id`, `sub_event_id`),
    INDEX `idx_sub_reg_parent` (`parent_event_id`),
    INDEX `idx_sub_reg_sub` (`sub_event_id`),
    CONSTRAINT `fk_subreg_user` FOREIGN KEY (`user_id`)
        REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_subreg_parent` FOREIGN KEY (`parent_event_id`)
        REFERENCES `events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_subreg_sub` FOREIGN KEY (`sub_event_id`)
        REFERENCES `sub_events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 4. MULTI-DAY & SESSION-WISE ATTENDANCE LOGS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `attendance_logs` (
    `id`                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id`           INT UNSIGNED    NOT NULL,
    `event_id`          INT UNSIGNED    NOT NULL,
    `sub_event_id`      INT UNSIGNED    DEFAULT NULL,
    `day_number`        TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '1 to 5',
    `session_name`      VARCHAR(100)    NOT NULL DEFAULT 'Main' COMMENT 'e.g. Morning, Workshop A, Final',
    `checked_in_by`     INT UNSIGNED    DEFAULT NULL COMMENT 'User ID of scanning admin/volunteer',
    `checked_in_at`     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_attendance_user_day` (`user_id`, `event_id`, `sub_event_id`, `day_number`, `session_name`),
    INDEX `idx_att_event` (`event_id`),
    INDEX `idx_att_sub_event` (`sub_event_id`),
    INDEX `idx_att_day` (`day_number`),
    CONSTRAINT `fk_att_user` FOREIGN KEY (`user_id`)
        REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_att_event` FOREIGN KEY (`event_id`)
        REFERENCES `events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 5. COMPETITION & INTERVIEW PANELS TABLE
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `competition_panels` (
    `id`                INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `event_id`          INT UNSIGNED    NOT NULL,
    `sub_event_id`      INT UNSIGNED    DEFAULT NULL,
    `panel_name`        VARCHAR(150)    NOT NULL COMMENT 'e.g. Panel A, Arena 1, Interview Panel Tech-1',
    `venue_room`        VARCHAR(150)    DEFAULT NULL,
    `max_candidates`    INT UNSIGNED    NOT NULL DEFAULT 10,
    `status`            ENUM('Draft', 'Scheduled', 'In_Progress', 'Completed') NOT NULL DEFAULT 'Draft',
    `created_at`        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    INDEX `idx_panel_event` (`event_id`),
    INDEX `idx_panel_sub` (`sub_event_id`),
    CONSTRAINT `fk_panel_event` FOREIGN KEY (`event_id`)
        REFERENCES `events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 6. PANEL ALLOCATIONS (Candidate mappings)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `panel_allocations` (
    `id`                INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `panel_id`          INT UNSIGNED    NOT NULL,
    `user_id`           INT UNSIGNED    NOT NULL,
    `candidate_role`    VARCHAR(100)    DEFAULT 'Participant' COMMENT 'e.g. GD Speaker, Affirmative, Negative, Candidate',
    `assigned_topic_id` INT UNSIGNED    DEFAULT NULL,
    `allocated_at`      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_panel_user` (`panel_id`, `user_id`),
    INDEX `idx_alloc_panel` (`panel_id`),
    INDEX `idx_alloc_user` (`user_id`),
    CONSTRAINT `fk_palloc_panel` FOREIGN KEY (`panel_id`)
        REFERENCES `competition_panels`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_palloc_user` FOREIGN KEY (`user_id`)
        REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 7. JUDGE & INTERVIEWER ASSIGNMENTS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `judge_assignments` (
    `id`                INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `panel_id`          INT UNSIGNED    NOT NULL,
    `judge_user_id`     INT UNSIGNED    NOT NULL,
    `assigned_role`     ENUM('Lead_Judge', 'Judge', 'Interviewer') NOT NULL DEFAULT 'Judge',
    `created_at`        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_judge_panel` (`panel_id`, `judge_user_id`),
    CONSTRAINT `fk_jassign_panel` FOREIGN KEY (`panel_id`)
        REFERENCES `competition_panels`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_jassign_judge` FOREIGN KEY (`judge_user_id`)
        REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 8. PANEL TOPICS POOL (GD & Debate Topics)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `panel_topics` (
    `id`                INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `event_id`          INT UNSIGNED    NOT NULL,
    `sub_event_id`      INT UNSIGNED    DEFAULT NULL,
    `topic_title`       VARCHAR(255)    NOT NULL,
    `topic_description` TEXT            DEFAULT NULL,
    `category`          VARCHAR(100)    DEFAULT 'General',
    `difficulty`        ENUM('Easy', 'Medium', 'Hard') DEFAULT 'Medium',
    `created_at`        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    INDEX `idx_topic_event` (`event_id`),
    CONSTRAINT `fk_topic_event` FOREIGN KEY (`event_id`)
        REFERENCES `events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 9. INTERVIEW RECRUITMENT SLOTS & CANDIDATE EVALUATIONS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `interview_slots` (
    `id`                INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `event_id`          INT UNSIGNED    NOT NULL,
    `sub_event_id`      INT UNSIGNED    DEFAULT NULL,
    `panel_id`          INT UNSIGNED    NOT NULL,
    `slot_date`         DATE            NOT NULL,
    `start_time`        TIME            NOT NULL,
    `end_time`          TIME            NOT NULL,
    `booked_by_user_id` INT UNSIGNED    DEFAULT NULL,
    `status`            ENUM('Available', 'Booked', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Available',
    `created_at`        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    INDEX `idx_slot_event` (`event_id`),
    INDEX `idx_slot_panel` (`panel_id`),
    INDEX `idx_slot_user` (`booked_by_user_id`),
    CONSTRAINT `fk_slot_event` FOREIGN KEY (`event_id`)
        REFERENCES `events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_slot_panel` FOREIGN KEY (`panel_id`)
        REFERENCES `competition_panels`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_slot_user` FOREIGN KEY (`booked_by_user_id`)
        REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `candidate_evaluations` (
    `id`                 INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `candidate_user_id`  INT UNSIGNED    NOT NULL,
    `event_id`           INT UNSIGNED    NOT NULL,
    `panel_id`           INT UNSIGNED    DEFAULT NULL,
    `evaluator_user_id`  INT UNSIGNED    NOT NULL,
    `score`              DECIMAL(5,2)    DEFAULT NULL COMMENT 'Out of 100 or 10',
    `comments`           TEXT            DEFAULT NULL,
    `recommendation`     ENUM('Select', 'Hold', 'Reject') NOT NULL DEFAULT 'Hold',
    `stage`              ENUM('Applied', 'Screened', 'Interviewed', 'Shortlisted', 'Selected', 'Rejected') NOT NULL DEFAULT 'Applied',
    `created_at`         TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`         TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    INDEX `idx_eval_cand` (`candidate_user_id`),
    INDEX `idx_eval_event` (`event_id`),
    INDEX `idx_eval_stage` (`stage`),
    CONSTRAINT `fk_eval_cand` FOREIGN KEY (`candidate_user_id`)
        REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_eval_event` FOREIGN KEY (`event_id`)
        REFERENCES `events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_eval_evaluator` FOREIGN KEY (`evaluator_user_id`)
        REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 10. PRE-SEED DRAFT EVENTS FOR ADMIN QUICK-CONFIGURATION
-- ---------------------------------------------------------------------------

-- Insert Bodhantra (5-Day Flagship Symposium)
INSERT INTO `events` (`title`, `description`, `event_date`, `max_capacity`, `status`, `event_type`, `is_template`, `feature_flags_json`)
VALUES (
  'Bodhantra 2026',
  '5-Day Flagship Club Symposium & Technical Conclave featuring team allocations, dynamic seating matrices, certificate generation, and theatrical noir reveals.',
  CURDATE() + INTERVAL 30 DAY,
  500,
  'Draft',
  'Symposium',
  1,
  '{"multi_day": true, "days_count": 5, "seating_cohorts": true, "certificates": true, "theatrical_reveal": true, "sub_events": false, "panels": false, "time_slots": false}'
)
ON DUPLICATE KEY UPDATE `event_type` = VALUES(`event_type`);

-- Insert Invicta (2-Day Workshop Series)
INSERT INTO `events` (`title`, `description`, `event_date`, `max_capacity`, `status`, `event_type`, `is_template`, `feature_flags_json`)
VALUES (
  'Invicta 2026',
  '2-Day Technical Workshop Extravaganza offering track-wise registrations, individual workshop certificates, and session attendance tracking.',
  CURDATE() + INTERVAL 45 DAY,
  300,
  'Draft',
  'Workshop_Series',
  1,
  '{"multi_day": true, "days_count": 2, "sub_events": true, "sub_event_certificates": true, "seating_cohorts": false, "panels": false, "time_slots": false}'
)
ON DUPLICATE KEY UPDATE `event_type` = VALUES(`event_type`);

-- Insert Verbafest (Literary & Oratory Fest)
INSERT INTO `events` (`title`, `description`, `event_date`, `max_capacity`, `status`, `event_type`, `is_template`, `feature_flags_json`)
VALUES (
  'Verbafest 2026',
  'National Literary & Oratory Festival featuring Group Discussions (GD), Parliamentary Debates, and Mind Saga Online Testing competition.',
  CURDATE() + INTERVAL 60 DAY,
  400,
  'Draft',
  'Literary_Fest',
  1,
  '{"multi_day": false, "sub_events": true, "panels": true, "topics_pool": true, "judge_scoring": true, "online_test_sso": true, "certificates": true}'
)
ON DUPLICATE KEY UPDATE `event_type` = VALUES(`event_type`);

-- Insert Core Committee Recruitment Interviews
INSERT INTO `events` (`title`, `description`, `event_date`, `max_capacity`, `status`, `event_type`, `is_template`, `feature_flags_json`)
VALUES (
  'Core Committee Recruitment 2026',
  'Annual hiring & interview drive for club domain leads, coordinators, and core members with automated time slot booking and interviewer scorecards.',
  CURDATE() + INTERVAL 15 DAY,
  200,
  'Draft',
  'Recruitment',
  1,
  '{"multi_day": false, "sub_events": true, "panels": true, "time_slots": true, "candidate_kanban": true, "certificates": false}'
)
ON DUPLICATE KEY UPDATE `event_type` = VALUES(`event_type`);

SET FOREIGN_KEY_CHECKS = 1;
