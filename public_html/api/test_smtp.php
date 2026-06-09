<?php
/**
 * Isolated SMTP Socket Connection Test
 *
 * Expose this file in your browser or run via command line to test the SMTP settings:
 * http://localhost:8000/api/test_smtp.php?to=your-personal-email@domain.com
 */

declare(strict_types=1);

require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/utils/mailer.php';

header('Content-Type: text/plain; charset=UTF-8');

echo "==================================================\n";
echo "  Mavericks Event OS — Isolated SMTP Socket Test\n";
echo "==================================================\n\n";

// Validate inputs
$to = $_GET['to'] ?? null;

if (!$to || filter_var($to, FILTER_VALIDATE_EMAIL) === false) {
    echo "ERROR: Please specify a valid destination email using the 'to' parameter.\n";
    echo "Usage: test_smtp.php?to=your-email@example.com\n";
    exit;
}

$subject = $_GET['subject'] ?? 'SMTP Socket Verification Test';
$body = $_GET['body'] ?? '<h1>SMTP Socket Test</h1><p>If you receive this email, your native PHP SMTP socket wrapper is working perfectly on Hostinger!</p>';

// Get configuration
$config = getMailConfig();

// Force SMTP production credentials for this isolated test script
$config['is_local']     = false;
$config['smtp_host']    = 'smtp.hostinger.com';
$config['smtp_port']    = '465';
$config['smtp_secure']  = 'ssl';
$config['smtp_user']    = 'no-reply@teammavericks.org';
$config['smtp_pass']    = '@Bcw8&dz';
$config['from_name']    = 'Mavericks Verification Test';
$config['from_address'] = 'no-reply@teammavericks.org';

echo "Target Recipient : {$to}\n";
echo "SMTP Host        : {$config['smtp_host']}\n";
echo "SMTP Port        : {$config['smtp_port']}\n";
echo "SMTP Encryption  : {$config['smtp_secure']}\n";
echo "SMTP Username    : {$config['smtp_user']}\n";
echo "Sending email...\n\n";

// Execute SMTP transfer
$result = sendMailViaSmtp($to, $subject, $body, $config);

if ($result) {
    echo "==================================================\n";
    echo "SUCCESS: SMTP transaction completed successfully!\n";
    echo "The mail server accepted the message for delivery.\n";
    echo "==================================================\n";
} else {
    echo "==================================================\n";
    echo "FAILED: SMTP transaction failed.\n";
    echo "Please check PHP error logs or web server log outputs.\n";
    echo "==================================================\n";
}
