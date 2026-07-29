<?php
/**
 * ============================================================================
 * BODHANTRA EVENT OS — PHPMailer SMTP Engine & Email Service Blueprint
 * ============================================================================
 *
 * Fully compliant with Team Mavericks Email Master Guide (teammavericks.org).
 *
 * Core Features:
 *   1. PHPMailer SMTP Dispatcher (`createSmtpMailer`) with SSL/TLS stream setup.
 *   2. Dual Environment Routing (intercepts/logs OTPs locally, dispatches in production).
 *   3. Audit Logger (`logEmailAudit`) writing dispatches to DB & file (`logs/mail_errors.log`).
 *   4. Integrated `App\EmailTemplate` for responsive, inline HTML layouts.
 *
 * @package BodhantraOS\Utils
 */

declare(strict_types=1);

// Require PHPMailer classes from local vendor directory
require_once __DIR__ . '/PHPMailer/Exception.php';
require_once __DIR__ . '/PHPMailer/PHPMailer.php';
require_once __DIR__ . '/PHPMailer/SMTP.php';

// Require EmailTemplate engine
require_once __DIR__ . '/EmailTemplate.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception as PHPMailerException;
use App\EmailTemplate;

// ===========================================================================
// ENVIRONMENT DETECTION & CONFIGURATION
// ===========================================================================

/**
 * Determine if the application is running in local development mode.
 *
 * @return bool True if running locally, false for production.
 */
function isLocalEnvironment(): bool
{
    $appEnv = strtolower(getenv('APP_ENV') ?: (defined('APP_ENV') ? APP_ENV : ''));
    if ($appEnv === 'local') {
        return true;
    }
    if ($appEnv === 'production') {
        return false;
    }

    $serverName = $_SERVER['SERVER_NAME'] ?? '';
    $httpHost   = $_SERVER['HTTP_HOST'] ?? '';
    if (
        in_array($serverName, ['localhost', '127.0.0.1', '::1'], true) ||
        in_array($httpHost, ['localhost', '127.0.0.1', '::1'], true) ||
        PHP_SAPI === 'cli-server'
    ) {
        return true;
    }

    return false;
}

/**
 * Retrieve mail configuration from environment variables or defined constants.
 *
 * @return array
 */
function getMailConfig(): array
{
    $fromAddress = getenv('MAIL_FROM_ADDRESS')
        ?: (defined('MAIL_FROM_ADDRESS') ? MAIL_FROM_ADDRESS : 'no-reply@teammavericks.org');

    // Fallback: If MAIL_FROM_ADDRESS still points to placehold domain, force teammavericks.org
    if (strpos($fromAddress, 'yourdomain.com') !== false) {
        $fromAddress = 'no-reply@teammavericks.org';
    }

    $smtpUser = getenv('SMTP_USER')
        ?: (defined('SMTP_USER') ? SMTP_USER : 'no-reply@teammavericks.org');

    return [
        'is_local'             => isLocalEnvironment(),
        'allow_local_sending'  => (strtolower((string)getenv('ALLOW_LOCAL_MAIL_SENDING')) === 'true'),
        'from_name'            => getenv('MAIL_FROM_NAME')    ?: (defined('MAIL_FROM_NAME') ? MAIL_FROM_NAME : 'Team Mavericks'),
        'from_address'         => $fromAddress,
        'reply_to'             => getenv('MAIL_REPLY_TO')     ?: (defined('MAIL_REPLY_TO') ? MAIL_REPLY_TO : 'support@teammavericks.org'),
        'smtp_host'            => getenv('SMTP_HOST')         ?: (defined('SMTP_HOST') ? SMTP_HOST : 'smtp.hostinger.com'),
        'smtp_port'            => getenv('SMTP_PORT')         ?: (defined('SMTP_PORT') ? (string)SMTP_PORT : '465'),
        'smtp_secure'          => getenv('SMTP_SECURE')       ?: (defined('SMTP_SECURE') ? SMTP_SECURE : 'ssl'),
        'smtp_user'            => $smtpUser,
        'smtp_pass'            => getenv('SMTP_PASS')         ?: (defined('SMTP_PASS') ? SMTP_PASS : '@Bcw8&dz'),
    ];
}


// ===========================================================================
// AUDIT LOGGER & FILE LOGGING
// ===========================================================================

/**
 * Log email audit details into database table `application_email_logs`
 * and append failure logs to `logs/mail_errors.log`.
 *
 * Gracefully handles database absence so local testing without MySQL works 100%.
 */
function logEmailAudit(
    ?int $applicationId,
    ?int $senderId,
    string $emailType,
    string $subject,
    string $bodyHtml,
    string $status,
    ?string $errorMessage = null
): void {
    // 1. Always append failure details to mail_errors.log file
    if ($status === 'failed' || !empty($errorMessage)) {
        $logsDir = dirname(__DIR__) . '/logs';
        if (!is_dir($logsDir)) {
            @mkdir($logsDir, 0755, true);
        }
        $logFile = $logsDir . '/mail_errors.log';
        $timestamp = date('Y-m-d H:i:s');
        $logMsg = "[{$timestamp}] Mail send failed (Type: {$emailType}) -> Error: " . ($errorMessage ?: 'Unknown error') . "\n";
        @file_put_contents($logFile, $logMsg, FILE_APPEND | LOCK_EX);
    }

    // 2. Attempt DB Audit Insert if Database class / connection is available
    try {
        if (class_exists('Database') && method_exists('Database', 'getConnection')) {
            $db = \Database::getConnection();
            if ($db instanceof \PDO) {
                // Ensure table exists on the fly if needed
                $db->exec("CREATE TABLE IF NOT EXISTS `application_email_logs` (
                    `id` INT AUTO_INCREMENT PRIMARY KEY,
                    `application_id` INT NULL,
                    `sender_id` INT NULL,
                    `email_type` VARCHAR(100) NOT NULL,
                    `subject` VARCHAR(255) NOT NULL,
                    `body_html` LONGTEXT NOT NULL,
                    `status` ENUM('sent', 'failed') NOT NULL,
                    `error_message` TEXT NULL,
                    `sent_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

                $stmt = $db->prepare(
                    "INSERT INTO application_email_logs (application_id, sender_id, email_type, subject, body_html, status, error_message) VALUES (?, ?, ?, ?, ?, ?, ?)"
                );
                $stmt->execute([$applicationId, $senderId, $emailType, $subject, $bodyHtml, $status, $errorMessage]);
            }
        }
    } catch (\Throwable $e) {
        // Silently catch so database errors do not disrupt main execution flow.
    }
}

/**
 * Write an OTP code to local debug log file and PHP error log for dev testing.
 */
function logOtpToFile(string $email, string $otpCode): void
{
    $logsDir = dirname(__DIR__) . '/logs';
    if (!is_dir($logsDir)) {
        @mkdir($logsDir, 0755, true);
    }

    $logFile   = $logsDir . '/otp_debug.log';
    $timestamp = date('Y-m-d H:i:s');
    $separator = str_repeat('─', 56);

    $entry = <<<LOG

{$separator}
  OTP INTERCEPTED — LOCAL DEV MODE
{$separator}
  Timestamp : {$timestamp}
  Email     : {$email}
  OTP Code  : {$otpCode}
{$separator}

LOG;

    @file_put_contents($logFile, $entry, FILE_APPEND | LOCK_EX);

    error_log(
        "\n" .
        "[BodhantraOS][DEV] ════════════════════════════════════════\n" .
        "[BodhantraOS][DEV]  OTP CODE for {$email}: >>> {$otpCode} <<<\n" .
        "[BodhantraOS][DEV] ════════════════════════════════════════\n"
    );
}


// ===========================================================================
// PHPMAILER FACTORY & CORE DISPATCHER
// ===========================================================================

/**
 * Standard PHPMailer Factory Helper.
 * Configures authenticated SMTP with SSL/TLS stream options.
 *
 * @param array|null $customConfig Optional config override.
 * @return PHPMailer
 */
function createSmtpMailer(?array $customConfig = null): PHPMailer
{
    $config = $customConfig ?: getMailConfig();
    $mail = new PHPMailer(true);

    $mail->isSMTP();
    $mail->Host       = $config['smtp_host'];
    $mail->SMTPAuth   = true;
    $mail->Username   = $config['smtp_user'];
    $mail->Password   = $config['smtp_pass'];
    
    $port = (int)$config['smtp_port'];
    $mail->Port = $port;

    if ($port === 465 || strtolower((string)$config['smtp_secure']) === 'ssl') {
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
    } else {
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    }

    // SSL options (bypasses self-signed cert checks on local development servers)
    $mail->SMTPOptions = [
        'ssl' => [
            'verify_peer'       => false,
            'verify_peer_name'  => false,
            'allow_self_signed' => true,
        ],
    ];

    $mail->setFrom($config['from_address'], $config['from_name']);
    if (!empty($config['reply_to'])) {
        $mail->addReplyTo($config['reply_to']);
    }

    $mail->isHTML(true);
    $mail->CharSet = 'UTF-8';

    return $mail;
}

/**
 * Legacy compatibility wrapper for sendMailViaSmtp using PHPMailer.
 */
function sendMailViaSmtp(string $to, string $subject, string $htmlBody, array $config): bool
{
    try {
        $mail = createSmtpMailer($config);
        $mail->addAddress($to);
        $mail->Subject = $subject;
        $mail->Body    = $htmlBody;
        return $mail->send();
    } catch (\Throwable $e) {
        $errorMsg = $e->getMessage();
        error_log("[BodhantraOS][Mailer][SMTP Error] to {$to}: " . $errorMsg);
        return false;
    }
}

/**
 * Core HTML Email Dispatcher — dual-routed by environment.
 *
 * @param string $to        Recipient email address.
 * @param string $subject   Email subject line.
 * @param string $htmlBody  Complete HTML content of the email.
 * @param string $emailType Categorized email type for audit logging.
 *
 * @return bool True if mail was delivered or successfully suppressed locally.
 */
function sendMail(string $to, string $subject, string $htmlBody, string $emailType = 'general'): bool
{
    $config = getMailConfig();

    // In local mode, suppress real network send unless explicitly enabled via ALLOW_LOCAL_MAIL_SENDING
    if ($config['is_local'] && !$config['allow_local_sending']) {
        error_log(sprintf(
            "[BodhantraOS][Mailer][DEV] Email suppressed (local mode)\n" .
            "  To:      %s\n" .
            "  Subject: %s\n",
            $to,
            $subject
        ));
        logEmailAudit(null, null, $emailType, $subject, $htmlBody, 'sent', 'Suppressed in local development mode');
        return true;
    }

    // Production or local with network sending enabled — dispatch via PHPMailer SMTP
    try {
        $mail = createSmtpMailer($config);
        $mail->addAddress($to);
        $mail->Subject = $subject;
        $mail->Body    = $htmlBody;
        $mail->send();

        logEmailAudit(null, null, $emailType, $subject, $htmlBody, 'sent');
        return true;
    } catch (PHPMailerException $e) {
        $errorInfo = $mail->ErrorInfo ?: $e->getMessage();
        error_log("[BodhantraOS][Mailer][PROD Error] Send to {$to} failed: {$errorInfo}");
        logEmailAudit(null, null, $emailType, $subject, $htmlBody, 'failed', $errorInfo);
        return false;
    } catch (\Throwable $e) {
        error_log("[BodhantraOS][Mailer][PROD Error] Exception sending to {$to}: " . $e->getMessage());
        logEmailAudit(null, null, $emailType, $subject, $htmlBody, 'failed', $e->getMessage());
        return false;
    }
}


// ===========================================================================
// EMAIL TEMPLATES & SERVICES
// ===========================================================================

/**
 * Send 6-Digit OTP Verification Email.
 */
function sendOtpEmail(string $email, string $otpCode, string $campaignName = 'Mavericks Club Portal'): bool
{
    if (isLocalEnvironment()) {
        logOtpToFile($email, $otpCode);
    }

    $subject  = 'Your Team Mavericks Email Verification Code';
    $htmlBody = EmailTemplate::getOtpHtml('', $otpCode, $campaignName);

    return sendMail($email, $subject, $htmlBody, 'otp');
}

/**
 * Send Member Credentials Email (Account Creation).
 */
function sendCredentialsEmail(
    string $email,
    string $name,
    string $accountId,
    string $loginPath = '/login'
): bool {
    $subject   = "Welcome to Mavericks — Your Account is Ready ({$accountId})";
    $firstName = explode(' ', trim($name))[0];

    $bodyHtml = <<<HTML
<p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
    Hi <strong style="color: #0f172a;">{$firstName}</strong>, welcome to Team Mavericks! Your member account has been activated.
</p>
<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 24px; margin: 0 0 24px;">
    <p style="color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 6px; font-weight: 700;">Account ID</p>
    <p style="color: #0f172a; font-size: 24px; font-weight: 800; letter-spacing: 2px; margin: 0 0 16px; font-family: monospace;">{$accountId}</p>
    <p style="color: #64748b; font-size: 13px; margin: 0;"><strong>Username:</strong> {$email}</p>
</div>
HTML;

    $fullHtml = EmailTemplate::getHtml("Account Created", $bodyHtml, "Login to Portal", $loginPath);
    return sendMail($email, $subject, $fullHtml, 'credentials');
}

/**
 * Send Registration Confirmation Email.
 */
function sendRegistrationConfirmation(string $email, string $name, string $accountId): bool
{
    $subject   = "Registration Confirmed — {$accountId}";
    $firstName = explode(' ', trim($name))[0];

    $bodyHtml = <<<HTML
<p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
    Hey <strong style="color: #0f172a;">{$firstName}</strong>! 🎉 Your registration has been successfully confirmed.
</p>
<div style="background-color: #f1f5f9; border-radius: 10px; padding: 24px; text-align: center; margin: 0 0 24px;">
    <p style="color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 6px; font-weight: 700;">Your Registration ID</p>
    <p style="color: #0f172a; font-size: 26px; font-weight: 800; letter-spacing: 3px; margin: 0; font-family: monospace;">{$accountId}</p>
</div>
HTML;

    $fullHtml = EmailTemplate::getHtml("Registration Confirmed", $bodyHtml);
    return sendMail($email, $subject, $fullHtml, 'registration_confirm');
}

/**
 * Send Payment Verification Approval Email.
 */
function sendPaymentApprovalEmail(string $email, string $name, string $eventTitle): bool
{
    $subject   = "Payment Verified — You're In for {$eventTitle}!";
    $firstName = explode(' ', trim($name))[0];

    $bodyHtml = <<<HTML
<p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
    Great news, <strong style="color: #0f172a;">{$firstName}</strong>! Your payment for <strong>{$eventTitle}</strong> has been verified.
</p>
<div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 20px; text-align: center; margin: 0 0 24px;">
    <p style="color: #059669; font-size: 15px; font-weight: 700; margin: 0;">✅ Status: APPROVED</p>
</div>
HTML;

    $fullHtml = EmailTemplate::getHtml("Payment Verified", $bodyHtml);
    return sendMail($email, $subject, $fullHtml, 'payment_approval');
}

/**
 * Backwards compatibility helper wrapper buildEmailLayout.
 */
function buildEmailLayout(string $headerTitle, string $innerHtml): string
{
    return EmailTemplate::getHtml($headerTitle, $innerHtml);
}
