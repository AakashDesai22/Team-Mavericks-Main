-- ============================================================================
-- BODHANTRA EVENT OS — Database Migration Phase 4: Email Audit & Logging
-- ============================================================================

-- 1. Application Email Audit Logs Table
CREATE TABLE IF NOT EXISTS `application_email_logs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `application_id` INT NULL COMMENT 'Reference application ID if applicable',
    `sender_id` INT NULL COMMENT 'Reference admin user ID who triggered send',
    `email_type` VARCHAR(100) NOT NULL COMMENT 'e.g. otp, credentials, registration_confirm, payment_approval, trigger_event, bulk_communicate',
    `subject` VARCHAR(255) NOT NULL,
    `body_html` LONGTEXT NOT NULL,
    `status` ENUM('sent', 'failed') NOT NULL DEFAULT 'failed',
    `error_message` TEXT NULL COMMENT 'Contains PHPMailer ErrorInfo if status is failed',
    `sent_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_email_type` (`email_type`),
    INDEX `idx_email_status` (`status`),
    INDEX `idx_email_sent_at` (`sent_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
