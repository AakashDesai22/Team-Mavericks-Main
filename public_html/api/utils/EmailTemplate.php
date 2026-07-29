<?php
/**
 * ============================================================================
 * BODHANTRA EVENT OS — Responsive HTML Email Template Engine
 * ============================================================================
 *
 * Generates responsive, inline-styled HTML email layouts matching the Team
 * Mavericks brand identity. Compatible with all major email clients
 * (Gmail, Outlook, Apple Mail, Yahoo).
 *
 * @package BodhantraOS\Utils
 */

declare(strict_types=1);

namespace App;

class EmailTemplate
{
    /**
     * Shared brand header background style.
     */
    private static function headerStyle(): string
    {
        return "background: #0d2399 url('https://res.cloudinary.com/dnmzkntqd/image/upload/v1784363984/MailHeader_uvqc31.png') no-repeat center center; background-size: cover; text-align: left;";
    }

    /**
     * Generate standard HTML email container with custom content & optional CTA button.
     *
     * @param string      $title       Header title / email topic.
     * @param string      $bodyHtml    Main body HTML or plain text.
     * @param string|null $buttonText  Optional Call-To-Action button label.
     * @param string|null $buttonUrl   Optional Call-To-Action target URL.
     *
     * @return string Complete HTML document.
     */
    public static function getHtml(
        string $title,
        string $bodyHtml,
        ?string $buttonText = null,
        ?string $buttonUrl = null
    ): string {
        $headerBg = self::headerStyle();
        $btnMarkup = "";

        if ($buttonText && $buttonUrl) {
            $btnMarkup = "
            <div style='text-align: center; margin-top: 32px; margin-bottom: 8px;'>
                <a href='{$buttonUrl}' target='_blank' style='display: inline-block; background-color: #f97316; color: #ffffff; font-family: sans-serif; font-size: 13px; font-weight: bold; text-decoration: none; padding: 12px 28px; border-radius: 6px;'>{$buttonText}</a>
            </div>";
        }

        $formattedBodyHtml = (strpos($bodyHtml, '<p>') !== false || strpos($bodyHtml, '<div') !== false)
            ? $bodyHtml
            : nl2br(htmlspecialchars($bodyHtml));

        $year = date('Y');

        return "<!DOCTYPE html>
<html>
<head>
<meta charset='utf-8'>
<meta name='viewport' content='width=device-width, initial-scale=1.0'>
<title>{$title}</title>
<link href='https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=Outfit:wght@400;750;900&display=swap' rel='stylesheet'>
</head>
<body style='margin:0;padding:0;background-color:#f8fafc;font-family:sans-serif;'>
<table border='0' cellpadding='0' cellspacing='0' width='100%' style='table-layout:fixed;background-color:#f8fafc;'>
<tr>
<td align='center' style='padding:40px 10px;'>
<table border='0' cellpadding='0' cellspacing='0' width='100%' style='max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(15, 23, 42,0.05);border:1px solid #e2e8f0;'>
<!-- Brand Header -->
<tr>
<td background='https://res.cloudinary.com/dnmzkntqd/image/upload/v1784363984/MailHeader_uvqc31.png' style='{$headerBg}'>
<table border='0' cellpadding='0' cellspacing='0' width='100%'>
<tr>
<td style='padding: 35px 35px; text-align: left;'>
<span style='color: #ffffff; font-family: Cinzel, Georgia, serif; font-size: 24px; font-weight: 900; letter-spacing: 1.5px; display: block; text-shadow: 0 2px 8px rgba(0,0,0,0.3);'>Team Mavericks</span>
</td>
</tr>
</table>
</td>
</tr>
<!-- Decorative Line -->
<tr>
<td height='4' style='background:linear-gradient(90deg,#f97316 0%,#fb923c 50%,#fdba74 100%);'></td>
</tr>
<!-- Main Body -->
<tr>
<td style='padding:36px 32px;text-align:left;color:#334155;font-size:13px;line-height:1.6;'>
<h2 style='color:#0f172a;font-family:Outfit,sans-serif;font-size:18px;font-weight:800;margin-top:0;margin-bottom:20px;'>{$title}</h2>
<div style='font-size:13px;color:#334155;font-family:sans-serif;'>{$formattedBodyHtml}</div>
{$btnMarkup}
</td>
</tr>
<!-- Footer -->
<tr>
<td style='background-color:#f1f5f9;padding:20px 32px;text-align:center;font-size:10px;color:#64748b;border-top:1px solid #e2e8f0;'>
<p style='margin:0;font-family:Outfit,sans-serif;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;'>Stay Updated!! Stay Ahead!!</p>
<p style='margin:6px 0 0 0;'>&copy; {$year} Team Mavericks. KIT CoEK Kolhapur. All rights reserved.</p>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>";
    }

    /**
     * Generate HTML layout specifically for 6-digit OTP verification codes.
     *
     * @param string $recipientName Optional candidate full name.
     * @param string $otpCode       6-digit plaintext OTP verification code.
     * @param string $campaignName  Associated event or campaign name.
     *
     * @return string Complete HTML document for OTP email.
     */
    public static function getOtpHtml(
        string $recipientName,
        string $otpCode,
        string $campaignName = 'Team Mavericks Recruitment'
    ): string {
        $headerBg = self::headerStyle();
        $nameDisplay = trim($recipientName) !== '' ? " " . htmlspecialchars($recipientName) : "";
        $campaignDisplay = htmlspecialchars($campaignName);
        $year = date('Y');

        return "<!DOCTYPE html>
<html>
<head>
<meta charset='utf-8'>
<meta name='viewport' content='width=device-width, initial-scale=1.0'>
<title>Email Verification</title>
<link href='https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=Outfit:wght@400;750;900&display=swap' rel='stylesheet'>
</head>
<body style='margin:0;padding:0;background-color:#f8fafc;font-family:sans-serif;'>
<table border='0' cellpadding='0' cellspacing='0' width='100%' style='table-layout:fixed;background-color:#f8fafc;'>
<tr>
<td align='center' style='padding:40px 10px;'>
<table border='0' cellpadding='0' cellspacing='0' width='100%' style='max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(15, 23, 42,0.05);border:1px solid #e2e8f0;'>
<tr>
<td background='https://res.cloudinary.com/dnmzkntqd/image/upload/v1784363984/MailHeader_uvqc31.png' style='{$headerBg}'>
<table border='0' cellpadding='0' cellspacing='0' width='100%'>
<tr>
<td style='padding: 35px 35px; text-align: left;'>
<span style='color: #ffffff; font-family: Cinzel, Georgia, serif; font-size: 24px; font-weight: 900; letter-spacing: 1.5px; display: block; text-shadow: 0 2px 8px rgba(0,0,0,0.3);'>Team Mavericks</span>
</td>
</tr>
</table>
</td>
</tr>
<tr>
<td height='4' style='background:linear-gradient(90deg,#f97316 0%,#fb923c 50%,#fdba74 100%);'></td>
</tr>
<tr>
<td style='padding:36px 32px;text-align:left;color:#334155;font-size:13px;line-height:1.6;'>
<h2 style='color:#0f172a;font-family:Outfit,sans-serif;font-size:18px;font-weight:800;margin-top:0;margin-bottom:20px;'>Verify Your Email Address</h2>
<p style='margin:0 0 16px 0;'>Hello{$nameDisplay},</p>
<p style='margin:0 0 24px 0;'>You are one step away from applying to <strong>{$campaignDisplay}</strong>. Use the verification code below:</p>
<!-- Large OTP Box -->
<div style='text-align:center;margin:28px 0;'>
<div style='display:inline-block;background-color:#f1f5f9;border:2px dashed #cbd5e1;padding:16px 36px;border-radius:10px;font-family:monospace;font-size:32px;font-weight:900;letter-spacing:8px;color:#0f172a;'>
{$otpCode}
</div>
</div>
<p style='margin:0 0 8px 0;text-align:center;font-size:12px;color:#64748b;'>This code expires in <strong>10 minutes</strong>.</p>
<p style='margin:24px 0 0 0;font-size:12px;color:#94a3b8;'>If you did not request this code, you can safely ignore this email.</p>
</td>
</tr>
<tr>
<td style='background-color:#f1f5f9;padding:20px 32px;text-align:center;font-size:10px;color:#64748b;border-top:1px solid #e2e8f0;'>
<p style='margin:0;font-family:Outfit,sans-serif;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;'>Stay Updated!! Stay Ahead!!</p>
<p style='margin:6px 0 0 0;'>&copy; {$year} Team Mavericks. KIT CoEK Kolhapur. All rights reserved.</p>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>";
    }
}
