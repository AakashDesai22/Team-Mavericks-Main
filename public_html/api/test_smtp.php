<?php
/**
 * ============================================================================
 * BODHANTRA EVENT OS — Isolated PHPMailer SMTP Connection Test
 * ============================================================================
 *
 * Test script for verifying Hostinger Webmail SMTP authentication via PHPMailer.
 *
 * Usage via HTTP Browser:
 *   http://localhost:8000/api/test_smtp.php?to=your-email@gmail.com
 *
 * Usage via CLI / Terminal:
 *   php public_html/api/test_smtp.php to=your-email@gmail.com
 */

declare(strict_types=1);

require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/utils/mailer.php';

header('Content-Type: text/plain; charset=UTF-8');

echo "==================================================\n";
echo "  Mavericks Event OS — PHPMailer SMTP Diagnostic Test\n";
echo "==================================================\n\n";

// Parse CLI or HTTP input arguments
$to = $_GET['to'] ?? null;
if (!$to && isset($argv)) {
    foreach ($argv as $arg) {
        if (strpos($arg, 'to=') === 0) {
            $to = substr($arg, 3);
        }
    }
}

if (!$to || filter_var($to, FILTER_VALIDATE_EMAIL) === false) {
    echo "ERROR: Destination email required.\n";
    echo "Usage (HTTP): test_smtp.php?to=your-email@example.com\n";
    echo "Usage (CLI) : php public_html/api/test_smtp.php to=your-email@example.com\n";
    exit;
}

$subject = "Team Mavericks — SMTP Verification Test (" . date('Y-m-d H:i:s') . ")";
$htmlBody = \App\EmailTemplate::getHtml(
    "SMTP Diagnostic Test",
    "If you are reading this message in your email inbox, your PHPMailer SMTP integration with Hostinger Webmail is fully functional!"
);

$config = getMailConfig();

echo "Target Recipient : {$to}\n";
echo "SMTP Host        : {$config['smtp_host']}\n";
echo "SMTP Port        : {$config['smtp_port']}\n";
echo "SMTP Encryption  : {$config['smtp_secure']}\n";
echo "SMTP User        : {$config['smtp_user']}\n";
echo "From Address     : {$config['from_address']}\n";
echo "Sending test email via PHPMailer...\n\n";

try {
    $mail = createSmtpMailer($config);
    $mail->addAddress($to);
    $mail->Subject = $subject;
    $mail->Body    = $htmlBody;
    
    $sent = $mail->send();
    if ($sent) {
        echo "==================================================\n";
        echo "SUCCESS: SMTP transaction completed successfully!\n";
        echo "Message accepted by {$config['smtp_host']} for delivery to {$to}.\n";
        echo "==================================================\n";
    } else {
        echo "==================================================\n";
        echo "FAILED: Mailer returned false.\n";
        echo "ErrorInfo: " . ($mail->ErrorInfo ?: 'Unknown error') . "\n";
        echo "==================================================\n";
    }
} catch (\Throwable $e) {
    echo "==================================================\n";
    echo "FAILED WITH EXCEPTION:\n";
    echo "Error Message : " . $e->getMessage() . "\n";
    echo "File Location : " . $e->getFile() . ":" . $e->getLine() . "\n";
    echo "==================================================\n";
}
