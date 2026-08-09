-- ============================================================================
-- BODHANTRA EVENT OS — Database Migration Phase 6: Recruitment Blueprint Upgrades
-- ============================================================================
-- Adds support for:
--   1. Dynamic Multi-Criteria Evaluation Rubrics (evaluation_criteria)
--   2. Granular Multi-Criteria Candidate Scores (candidate_criteria_scores)
--   3. Audit History Ledger for Stage Transitions (candidate_status_history)
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------------
-- 1. EVALUATION CRITERIA TABLE (Per-event rubric parameters)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `evaluation_criteria` (
    `id`                INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `event_id`          INT UNSIGNED    NOT NULL,
    `title`             VARCHAR(255)    NOT NULL COMMENT 'e.g. Technical Depth, Soft Skills, Problem Solving',
    `max_marks`         INT UNSIGNED    NOT NULL DEFAULT 10,
    `weightage`         INT UNSIGNED    NOT NULL DEFAULT 1 COMMENT 'Multiplier weightage',
    `display_order`     INT UNSIGNED    NOT NULL DEFAULT 0,
    `created_at`        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    INDEX `idx_ec_event` (`event_id`),
    CONSTRAINT `fk_ec_event` FOREIGN KEY (`event_id`)
        REFERENCES `events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 2. CANDIDATE CRITERIA SCORES TABLE (Detailed rubric breakdown)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `candidate_criteria_scores` (
    `id`                INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `evaluation_id`     INT UNSIGNED    NOT NULL,
    `criteria_id`       INT UNSIGNED    NOT NULL,
    `score`             DECIMAL(5,2)    NOT NULL DEFAULT 0.00,
    `remarks`           VARCHAR(500)    DEFAULT NULL,
    `created_at`        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_ccs_eval_crit` (`evaluation_id`, `criteria_id`),
    CONSTRAINT `fk_ccs_eval` FOREIGN KEY (`evaluation_id`)
        REFERENCES `candidate_evaluations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_ccs_crit` FOREIGN KEY (`criteria_id`)
        REFERENCES `evaluation_criteria`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 3. CANDIDATE STATUS HISTORY AUDIT LEDGER
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `candidate_status_history` (
    `id`                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `candidate_user_id`  INT UNSIGNED    NOT NULL,
    `event_id`           INT UNSIGNED    NOT NULL,
    `old_stage`          VARCHAR(100)    NOT NULL,
    `new_stage`          VARCHAR(100)    NOT NULL,
    `changed_by_user_id` INT UNSIGNED    DEFAULT NULL,
    `notes`              TEXT            DEFAULT NULL,
    `created_at`         TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    INDEX `idx_csh_cand` (`candidate_user_id`),
    INDEX `idx_csh_event` (`event_id`),
    CONSTRAINT `fk_csh_cand` FOREIGN KEY (`candidate_user_id`)
        REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_csh_event` FOREIGN KEY (`event_id`)
        REFERENCES `events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_csh_user` FOREIGN KEY (`changed_by_user_id`)
        REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
