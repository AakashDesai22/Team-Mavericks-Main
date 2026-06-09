-- ============================================================================
-- BODHANTRA EVENT OS — Phase 3 Migration (QR Payments & Custom File Fields)
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Alter events table to add payment_qr_path and require_payment_proof
ALTER TABLE `events`
    ADD COLUMN `payment_qr_path` VARCHAR(500) DEFAULT NULL COMMENT 'Path to custom uploaded payment QR code graphic' AFTER `payment_context`,
    ADD COLUMN `require_payment_proof` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = Require proof screenshot upload from participant' AFTER `payment_qr_path`;

SET FOREIGN_KEY_CHECKS = 1;
