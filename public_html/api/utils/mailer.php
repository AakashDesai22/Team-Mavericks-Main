<?php
/**
 * ============================================================================
 * BODHANTRA EVENT OS — Native PHP Mail Engine (Dual-Environment)
 * ============================================================================
 *
 * Zero third-party dependencies.  Routes email payloads through two modes:
 *
 *   ┌─────────────────────────────────────────────────────────────────────────┐
 *   │  LOCAL (APP_ENV=local)                                                  │
 *   │  • Never touches an MTA.                                                │
 *   │  • OTP codes are intercepted and written to:                            │
 *   │      api/logs/otp_debug.log   (persistent, human-readable)              │
 *   │      PHP error_log()          (mirrors to the dev terminal)             │
 *   │  • Developer copies the OTP from terminal or log file and pastes it     │
 *   │    into the React frontend to complete the registration flow.           │
 *   ├─────────────────────────────────────────────────────────────────────────┤
 *   │  PRODUCTION (APP_ENV=production)                                        │
 *   │  • Dispatches HTML email via native PHP mail().                          │
 *   │  • Automatic Hostinger postfix alignment — no PHPMailer needed.         │
 *   │  • Hardened MIME + security headers for Gmail/Outlook inbox delivery.   │
 *   └─────────────────────────────────────────────────────────────────────────┘
 *
 * Environment variables (set in .env):
 *   APP_ENV            = local|production
 *   MAIL_FROM_NAME     = "Mavericks Verification"
 *   MAIL_FROM_ADDRESS  = no-reply@yourdomain.com
 *   MAIL_REPLY_TO      = support@yourdomain.com
 *
 * Includes 4 standard HTML mailing templates:
 *   1. OTP Verification Code
 *   2. Credentials Delivery (Member Invite)
 *   3. Registration Success & QR Code Recovery
 *   4. Payment Verification State Update
 *
 * All templates use inline CSS for maximum email client compatibility
 * (Gmail, Outlook, Yahoo, Apple Mail).
 *
 * @package BodhantraOS\Utils
 */

declare(strict_types=1);


// ===========================================================================
// ENVIRONMENT DETECTION
// ===========================================================================

/**
 * Determine if the application is running in local development mode.
 *
 * Detection order (first match wins):
 *   1. APP_ENV environment variable === 'local'
 *   2. $_SERVER['SERVER_NAME'] resolves to 'localhost' or '127.0.0.1'
 *   3. PHP_SAPI === 'cli-server' (PHP built-in dev server)
 *
 * @return bool  True if running locally, false for production.
 */
function isLocalEnvironment(): bool
{
    // 1. Explicit env flag (highest priority)
    $appEnv = strtolower(getenv('APP_ENV') ?: '');
    if ($appEnv === 'local') {
        return true;
    }
    if ($appEnv === 'production') {
        return false;
    }

    // 2. Server name detection (fallback for unconfigured .env)
    $serverName = $_SERVER['SERVER_NAME'] ?? '';
    if (in_array($serverName, ['localhost', '127.0.0.1', '::1'], true)) {
        return true;
    }

    // 3. PHP built-in dev server detection
    if (PHP_SAPI === 'cli-server') {
        return true;
    }

    // Default to production if nothing matches — fail-safe for live servers.
    return false;
}


// ===========================================================================
// CONFIGURATION
// ===========================================================================

/**
 * Retrieve mail configuration from environment variables.
 *
 * @return array{from_name: string, from_address: string, reply_to: string, is_local: bool}
 */
function getMailConfig(): array
{
    return [
        'is_local'     => isLocalEnvironment(),
        'from_name'    => getenv('MAIL_FROM_NAME')    ?: 'Mavericks Verification',
        'from_address' => getenv('MAIL_FROM_ADDRESS') ?: 'no-reply@yourdomain.com',
        'reply_to'     => getenv('MAIL_REPLY_TO')     ?: 'support@yourdomain.com',
    ];
}


// ===========================================================================
// OTP DEBUG LOGGER (LOCAL DEVELOPMENT ONLY)
// ===========================================================================

/**
 * Write an OTP code to the local debug log file AND the PHP error_log.
 *
 * The log file is written to `api/logs/otp_debug.log` relative to the
 * project's `public_html/api` directory.  Each entry includes a timestamp,
 * recipient email, and the plaintext OTP code for easy copy-paste.
 *
 * @param  string $email    The email address the OTP was requested for.
 * @param  string $otpCode  The 6-digit plaintext OTP code.
 */
function logOtpToFile(string $email, string $otpCode): void
{
    $logsDir = dirname(__DIR__) . '/logs';

    // Auto-create the logs directory if it doesn't exist.
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

    // Write to the dedicated log file (append mode).
    @file_put_contents($logFile, $entry, FILE_APPEND | LOCK_EX);

    // Mirror to PHP error_log so it shows in the dev terminal running
    // `php -S localhost:8000`.
    error_log(
        "\n" .
        "[BodhantraOS][DEV] ════════════════════════════════════════\n" .
        "[BodhantraOS][DEV]  OTP CODE for {$email}: >>> {$otpCode} <<<\n" .
        "[BodhantraOS][DEV] ════════════════════════════════════════\n"
    );
}


// ===========================================================================
// CORE MAIL DISPATCHER
// ===========================================================================

/**
 * Send an HTML email — dual-routed by environment.
 *
 * LOCAL MODE:
 *   Logs the email metadata to PHP error_log. Does NOT attempt delivery.
 *   OTP-specific interception is handled at the template level (see
 *   sendOtpEmail) so that the plaintext code is captured before it enters
 *   this generic dispatcher.
 *
 * PRODUCTION MODE:
 *   Dispatches via native PHP mail() with hardened MIME/security headers
 *   tuned for Hostinger shared hosting (postfix) + Gmail/Outlook inbox
 *   placement.
 *
 * @param  string $to        Recipient email address.
 * @param  string $subject   Email subject line.
 * @param  string $htmlBody  Complete HTML content of the email.
 *
 * @return bool              True if mail() returned true or if logged successfully.
 */
function sendMail(string $to, string $subject, string $htmlBody): bool
{
    $config = getMailConfig();

    // -----------------------------------------------------------------------
    // LOCAL DEV — suppress delivery, log instead.
    // -----------------------------------------------------------------------
    if ($config['is_local']) {
        error_log(sprintf(
            "[BodhantraOS][Mailer][DEV] Email suppressed (local mode)\n" .
            "  To:      %s\n" .
            "  Subject: %s\n" .
            "  Body:    %s\n",
            $to,
            $subject,
            mb_substr(strip_tags($htmlBody), 0, 500) . '...'
        ));
        return true;
    }

    // -----------------------------------------------------------------------
    // PRODUCTION — build hardened headers and dispatch via native mail().
    // -----------------------------------------------------------------------

    // Construct RFC-compliant, security-hardened MIME headers.
    // Each header is a deliberate deliverability/security decision:
    //   • MIME-Version + Content-Type: required for HTML rendering
    //   • From: must match the Hostinger domain's SPF/DKIM records
    //   • Reply-To: separates support contact from system sender
    //   • X-Mailer: identifies the sending system for debug tracing
    //   • X-Priority: 1 flags as High Importance to speed relay delivery
    $headers = implode("\r\n", [
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=UTF-8',
        'From: ' . $config['from_name'] . ' <' . $config['from_address'] . '>',
        'Reply-To: ' . $config['reply_to'],
        'X-Mailer: PHP/' . phpversion(),
        'X-Priority: 1',
    ]);

    // Hostinger-specific envelope sender:
    // The `-f` flag tells postfix to set the envelope-from (Return-Path)
    // to the same address as the From header.  Without this, some shared
    // hosts inject the cPanel username as the envelope sender, which causes
    // SPF soft-fails and triggers Gmail spam filters.
    $additionalParams = '-f ' . $config['from_address'];

    try {
        $result = mail($to, $subject, $htmlBody, $headers, $additionalParams);

        if (!$result) {
            error_log("[BodhantraOS][Mailer][PROD] mail() returned false for {$to} — subject: {$subject}");
        }

        return $result;
    } catch (\Throwable $e) {
        error_log("[BodhantraOS][Mailer][PROD] Exception sending to {$to}: " . $e->getMessage());
        return false;
    }
}


// ===========================================================================
// TEMPLATE 1: OTP VERIFICATION CODE
// ===========================================================================

/**
 * Send an OTP verification email with a 6-digit code.
 *
 * In LOCAL mode, the plaintext OTP is intercepted and logged to both
 * `api/logs/otp_debug.log` and the PHP error_log (terminal) BEFORE
 * the email is suppressed by sendMail().
 *
 * @param  string $email   Recipient email address.
 * @param  string $otpCode The 6-digit OTP code (plaintext — for display only).
 *
 * @return bool
 */
function sendOtpEmail(string $email, string $otpCode): bool
{
    // -----------------------------------------------------------------------
    // LOCAL DEV INTERCEPTION — log the OTP before suppressing the email.
    // This is the primary mechanism for localhost OTP testing.
    // -----------------------------------------------------------------------
    if (isLocalEnvironment()) {
        logOtpToFile($email, $otpCode);
    }

    $subject = 'Your Verification Code — Mavericks Club Portal';

    $html = buildEmailLayout(
        'Verification Code',
        <<<HTML
        <p style="color: #94a3b8; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
            You're almost there! Use the verification code below to complete your
            registration on the Mavericks Club Portal.
        </p>

        <!-- OTP Code Block -->
        <div style="background: linear-gradient(135deg, #6d28d9 0%, #4f46e5 100%);
                    border-radius: 16px; padding: 32px; text-align: center; margin: 0 0 24px;">
            <p style="color: rgba(255,255,255,0.7); font-size: 11px; text-transform: uppercase;
                      letter-spacing: 3px; margin: 0 0 12px; font-weight: 600;">
                Your One-Time Code
            </p>
            <p style="color: #ffffff; font-size: 40px; font-weight: 800; letter-spacing: 12px;
                      margin: 0; font-family: 'Courier New', Courier, monospace;">
                {$otpCode}
            </p>
        </div>

        <!-- Warning Box -->
        <div style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.2);
                    border-radius: 12px; padding: 16px; margin: 0 0 24px;">
            <p style="color: #f59e0b; font-size: 13px; margin: 0; font-weight: 500;">
                ⚠️ This code expires in <strong>5 minutes</strong>. Do not share this
                code with anyone. Our team will never ask you for this code.
            </p>
        </div>

        <p style="color: #64748b; font-size: 13px; line-height: 1.6; margin: 0;">
            If you didn't request this code, you can safely ignore this email.
            Someone may have entered your email address by mistake.
        </p>
        HTML
    );

    return sendMail($email, $subject, $html);
}


// ===========================================================================
// TEMPLATE 2: CREDENTIALS DELIVERY (MEMBER INVITE)
// ===========================================================================

/**
 * Send a credentials delivery email for a newly created Member account.
 *
 * @param  string $email      Recipient email.
 * @param  string $name       Member's full name.
 * @param  string $accountId  Their assigned MAV-MEM-XXX Account ID.
 * @param  string $loginPath  URL path to the login page (e.g., "/login").
 *
 * @return bool
 */
function sendCredentialsEmail(
    string $email,
    string $name,
    string $accountId,
    string $loginPath = '/login'
): bool {
    $subject = "Welcome to Mavericks — Your Account is Ready ({$accountId})";
    $firstName = explode(' ', trim($name))[0];

    $html = buildEmailLayout(
        'Account Created',
        <<<HTML
        <p style="color: #94a3b8; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
            Hi <strong style="color: #e2e8f0;">{$firstName}</strong>, welcome to the
            Mavericks Club Portal! Your account has been created successfully.
        </p>

        <!-- Credentials Card -->
        <div style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%);
                    border: 1px solid rgba(139, 92, 246, 0.25); border-radius: 16px;
                    padding: 28px; margin: 0 0 24px;">

            <!-- Account ID -->
            <p style="color: rgba(167, 139, 250, 0.8); font-size: 10px; text-transform: uppercase;
                      letter-spacing: 2.5px; margin: 0 0 6px; font-weight: 700;">
                Your Account ID
            </p>
            <p style="color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: 2px;
                      margin: 0 0 20px; font-family: 'Courier New', Courier, monospace;">
                {$accountId}
            </p>

            <div style="height: 1px; background: rgba(255,255,255,0.1); margin: 0 0 20px;"></div>

            <!-- Username -->
            <table style="width: 100%; margin: 0 0 12px;">
                <tr>
                    <td style="color: #64748b; font-size: 12px; padding: 4px 0;">Username (Email)</td>
                    <td style="color: #e2e8f0; font-size: 14px; font-weight: 600; text-align: right; padding: 4px 0;">
                        {$email}
                    </td>
                </tr>
                <tr>
                    <td style="color: #64748b; font-size: 12px; padding: 4px 0;">Password</td>
                    <td style="color: #fbbf24; font-size: 14px; font-weight: 600; text-align: right; padding: 4px 0;">
                        Your registered phone number
                    </td>
                </tr>
            </table>
        </div>

        <!-- Login CTA -->
        <div style="text-align: center; margin: 0 0 24px;">
            <a href="{$loginPath}" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #6d28d9);
               color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px;
               padding: 14px 40px; border-radius: 12px; letter-spacing: 0.5px;">
                Login to Your Account →
            </a>
        </div>

        <p style="color: #64748b; font-size: 13px; line-height: 1.6; margin: 0;">
            Keep your Account ID safe — you'll need it for event check-ins and your
            digital identity pass. We recommend changing your password after your first login.
        </p>
        HTML
    );

    return sendMail($email, $subject, $html);
}


// ===========================================================================
// TEMPLATE 3: REGISTRATION SUCCESS & QR CODE RECOVERY
// ===========================================================================

/**
 * Send a registration confirmation email with the Account ID.
 *
 * @param  string $email     Recipient email.
 * @param  string $name      User's full name.
 * @param  string $accountId Their MAV-XXX-XXX Account ID.
 *
 * @return bool
 */
function sendRegistrationConfirmation(string $email, string $name, string $accountId): bool
{
    $subject = "Registration Confirmed — {$accountId}";
    $firstName = explode(' ', trim($name))[0];

    $html = buildEmailLayout(
        'Registration Confirmed',
        <<<HTML
        <p style="color: #94a3b8; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
            Hey <strong style="color: #e2e8f0;">{$firstName}</strong>! 🎉 Your registration
            on the Mavericks Club Portal is now confirmed.
        </p>

        <!-- Confirmation Card -->
        <div style="background: linear-gradient(135deg, #064e3b 0%, #065f46 100%);
                    border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 16px;
                    padding: 28px; text-align: center; margin: 0 0 24px;">
            <div style="display: inline-block; width: 56px; height: 56px; line-height: 56px;
                        background: rgba(16, 185, 129, 0.2); border-radius: 50%;
                        font-size: 28px; margin: 0 0 16px;">
                ✓
            </div>
            <p style="color: rgba(167, 243, 208, 0.8); font-size: 10px; text-transform: uppercase;
                      letter-spacing: 2.5px; margin: 0 0 8px; font-weight: 700;">
                Your Account ID
            </p>
            <p style="color: #ffffff; font-size: 28px; font-weight: 800; letter-spacing: 3px;
                      margin: 0; font-family: 'Courier New', Courier, monospace;">
                {$accountId}
            </p>
        </div>

        <!-- QR Code Notice -->
        <div style="background: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.2);
                    border-radius: 12px; padding: 16px; margin: 0 0 24px;">
            <p style="color: #a5b4fc; font-size: 13px; margin: 0; font-weight: 500;">
                🔐 <strong>Your Identity QR Code</strong> is available in your dashboard
                after logging in. This QR code contains your Account ID and can be used
                for event check-ins and identity verification.
            </p>
        </div>

        <p style="color: #64748b; font-size: 13px; line-height: 1.6; margin: 0;">
            You can now browse events, register for activities, and access all club
            resources through your portal dashboard. Save this email for your records.
        </p>
        HTML
    );

    return sendMail($email, $subject, $html);
}


// ===========================================================================
// TEMPLATE 4: PAYMENT VERIFICATION STATE UPDATE
// ===========================================================================

/**
 * Send a payment approval notification email.
 *
 * Dispatched when an admin transitions a registration from Pending → Approved.
 *
 * @param  string $email      Recipient email.
 * @param  string $name       User's full name.
 * @param  string $eventTitle Title of the event that was approved.
 *
 * @return bool
 */
function sendPaymentApprovalEmail(string $email, string $name, string $eventTitle): bool
{
    $subject = "Payment Verified — You're In for {$eventTitle}!";
    $firstName = explode(' ', trim($name))[0];

    $html = buildEmailLayout(
        'Payment Approved',
        <<<HTML
        <p style="color: #94a3b8; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
            Great news, <strong style="color: #e2e8f0;">{$firstName}</strong>! Your payment
            has been verified and your registration is now approved.
        </p>

        <!-- Approval Card -->
        <div style="background: linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%);
                    border: 1px solid rgba(59, 130, 246, 0.25); border-radius: 16px;
                    padding: 28px; text-align: center; margin: 0 0 24px;">
            <div style="display: inline-block; width: 56px; height: 56px; line-height: 56px;
                        background: rgba(59, 130, 246, 0.2); border-radius: 50%;
                        font-size: 28px; margin: 0 0 16px;">
                💳
            </div>
            <p style="color: rgba(147, 197, 253, 0.8); font-size: 10px; text-transform: uppercase;
                      letter-spacing: 2.5px; margin: 0 0 8px; font-weight: 700;">
                Event Confirmed
            </p>
            <p style="color: #ffffff; font-size: 22px; font-weight: 800; margin: 0;">
                {$eventTitle}
            </p>
        </div>

        <!-- Status Badge -->
        <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.2);
                    border-radius: 12px; padding: 16px; margin: 0 0 24px; text-align: center;">
            <p style="color: #10b981; font-size: 14px; margin: 0; font-weight: 700;">
                ✅ Status: APPROVED
            </p>
        </div>

        <p style="color: #64748b; font-size: 13px; line-height: 1.6; margin: 0 0 16px;">
            You're all set! Here's what to do next:
        </p>
        <ul style="color: #94a3b8; font-size: 13px; line-height: 1.8; margin: 0 0 24px; padding-left: 20px;">
            <li>Log in to your dashboard to view event details</li>
            <li>Check the schedule and session times</li>
            <li>Download your identity QR pass for check-in</li>
        </ul>

        <p style="color: #64748b; font-size: 13px; line-height: 1.6; margin: 0;">
            See you at the event! If you have any questions, reach out to our team
            through the contact page.
        </p>
        HTML
    );

    return sendMail($email, $subject, $html);
}


// ===========================================================================
// EMAIL LAYOUT BUILDER (Shared Wrapper)
// ===========================================================================

/**
 * Build a complete HTML email document with the shared Mavericks brand layout.
 *
 * This wraps the inner content in a responsive, dark-themed email template
 * that renders consistently across major email clients.
 *
 * @param  string $headerTitle  Title shown in the email header bar.
 * @param  string $innerHtml    The template-specific HTML content.
 *
 * @return string               Complete HTML document ready for dispatch.
 */
function buildEmailLayout(string $headerTitle, string $innerHtml): string
{
    $year = date('Y');

    return <<<HTML
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>{$headerTitle}</title>
        <!--[if mso]>
        <noscript>
            <xml>
                <o:OfficeDocumentSettings>
                    <o:PixelsPerInch>96</o:PixelsPerInch>
                </o:OfficeDocumentSettings>
            </xml>
        </noscript>
        <![endif]-->
    </head>
    <body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system,
                 BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                 -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">

        <!-- Outer Container -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
               style="background-color: #0f172a;">
            <tr>
                <td align="center" style="padding: 40px 16px;">

                    <!-- Inner Card -->
                    <table role="presentation" cellpadding="0" cellspacing="0"
                           width="100%" style="max-width: 520px; background: #1e293b;
                           border: 1px solid rgba(148, 163, 184, 0.1);
                           border-radius: 20px; overflow: hidden;">

                        <!-- Header Bar -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 50%, #4c1d95 100%);
                                       padding: 28px 32px; text-align: center;">
                                <p style="color: rgba(255,255,255,0.6); font-size: 10px;
                                          text-transform: uppercase; letter-spacing: 3px;
                                          margin: 0 0 8px; font-weight: 600;">
                                    Mavericks Club Portal
                                </p>
                                <h1 style="color: #ffffff; font-size: 22px; font-weight: 800;
                                           margin: 0; letter-spacing: -0.3px;">
                                    {$headerTitle}
                                </h1>
                            </td>
                        </tr>

                        <!-- Body Content -->
                        <tr>
                            <td style="padding: 32px;">
                                {$innerHtml}
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="padding: 20px 32px; border-top: 1px solid rgba(148, 163, 184, 0.08);
                                       text-align: center;">
                                <p style="color: #475569; font-size: 11px; margin: 0 0 4px;">
                                    © {$year} Team Mavericks — Bodhantra Event OS
                                </p>
                                <p style="color: #334155; font-size: 10px; margin: 0;">
                                    This is an automated message. Please do not reply directly.
                                </p>
                            </td>
                        </tr>
                    </table>

                </td>
            </tr>
        </table>

    </body>
    </html>
    HTML;
}
