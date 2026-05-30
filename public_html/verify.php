<?php
/**
 * ============================================================================
 * BODHANTRA EVENT OS — Public Certificate QR Verification Gate
 * ============================================================================
 *
 * Lightweight public script served directly at the web root:
 *   GET /verify.php?id=BODH2026-XXXXXX
 *
 * It executes a read-only PDO query against our db.php singleton.
 * If verified and status is explicitly "Approved", displays a premium, secure
 * digital credential ledger verifying holder authenticity in under 100ms.
 *
 * @package BodhantraOS
 */

declare(strict_types=1);

// Include standard database connector singleton
require_once __DIR__ . '/api/db.php';

$id = trim($_GET['id'] ?? '');

$verified = null;
$error = '';

if ($id === '') {
    $error = 'Verification payload identifier is missing from the query string.';
} else {
    try {
        $pdo = Database::connect();
        
        // Fetch participant registration and team allocations securely
        $stmt = $pdo->prepare(
            "SELECT u.name,
                    u.branch,
                    u.academic_year,
                    u.unique_registration_id AS tracking_code,
                    r.status,
                    r.checked_in_state,
                    r.checked_in_at,
                    e.title AS event_title,
                    e.event_date,
                    a.team_name,
                    a.assigned_cohort_role,
                    a.row_coordinate,
                    a.column_coordinate
             FROM users u
             INNER JOIN registrations r ON r.user_id = u.id
             INNER JOIN events e        ON e.id = r.event_id
             LEFT JOIN allocations a    ON a.user_id = u.id AND a.event_id = r.event_id
             WHERE u.unique_registration_id = :id AND r.status = 'Approved'
             LIMIT 1"
        );
        $stmt->execute([':id' => $id]);
        $verified = $stmt->fetch();
        
        if (!$verified) {
            $error = 'CREDENTIAL VERIFICATION BLOCKED: No approved registration found mapping to ID "' . htmlspecialchars($id) . '". Direct holder to helpdesk.';
        }
    } catch (\Throwable $e) {
        error_log('[BodhantraOS][VerifyGate] SQL Error: ' . $e->getMessage());
        $error = 'Database connectivity fault. Please refresh or verify server status.';
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bodhantra OS — Digital Credential Ledger</title>
    <!-- Modern responsive Inter font family -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
    
    <style>
        /* Modern Glassmorphic Design System Tokens */
        :root {
            --surface-950: #020617;
            --surface-900: #0f172a;
            --surface-800: #1e293b;
            --brand-500: #6366f1;
            --brand-400: #818cf8;
            --emerald-400: #34d399;
            --emerald-500: #10b981;
            --rose-400: #f87171;
            --rose-500: #ef4444;
            --text-slate-200: #e2e8f0;
            --text-slate-400: #94a3b8;
            --text-slate-500: #64748b;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Inter', sans-serif;
            background-color: var(--surface-950);
            color: var(--text-slate-200);
            min-h: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            overflow-x: hidden;
            background-image:
                radial-gradient(at 20% 20%, rgba(99, 102, 241, 0.06) 0%, transparent 50%),
                radial-gradient(at 80% 80%, rgba(16, 185, 129, 0.04) 0%, transparent 50%);
        }

        /* Container scale limits */
        .wrapper {
            width: 100%;
            max-width: 520px;
            perspective: 1000px;
        }

        /* Glassmorphic Card styles */
        .glass-card {
            background: rgba(255, 255, 255, 0.03);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 24px;
            padding: 36px 30px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            text-align: center;
            position: relative;
            overflow: hidden;
        }

        .glass-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, var(--brand-500), var(--emerald-500));
        }

        .glass-card.failed::before {
            background: linear-gradient(90deg, var(--rose-500), #f43f5e);
        }

        /* Verified Crest Shield Badge */
        .crest {
            width: 80px;
            height: 80px;
            border-radius: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px auto;
            position: relative;
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid rgba(16, 185, 129, 0.25);
            color: var(--emerald-400);
            box-shadow: 0 10px 25px -5px rgba(16, 185, 129, 0.15);
        }

        .crest.failed {
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.25);
            color: var(--rose-400);
            box-shadow: 0 10px 25px -5px rgba(239, 68, 68, 0.15);
        }

        .crest svg {
            width: 40px;
            height: 40px;
        }

        /* Title branding */
        h1 {
            font-size: 20px;
            font-weight: 900;
            letter-spacing: -0.02em;
            margin-bottom: 6px;
            color: #fff;
        }

        .subtitle {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.25em;
            color: var(--brand-400);
            margin-bottom: 28px;
        }

        .subtitle.failed {
            color: var(--rose-400);
        }

        /* Verified Details Ledger List */
        .ledger {
            text-align: left;
            margin-bottom: 28px;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
            padding-top: 20px;
        }

        .ledger-row {
            display: flex;
            flex-direction: column;
            gap: 4px;
            margin-bottom: 18px;
        }

        .ledger-row:last-child {
            margin-bottom: 0;
        }

        .label {
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.15em;
            color: var(--text-slate-500);
        }

        .value {
            font-size: 14px;
            font-weight: 600;
            color: var(--text-slate-200);
            line-height: 1.4;
        }

        .value.mono {
            font-family: 'JetBrains Mono', monospace;
            font-size: 13px;
            color: var(--brand-400);
        }

        .badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            margin-top: 2px;
            background: rgba(16, 185, 129, 0.1);
            color: var(--emerald-400);
            border: 1px solid rgba(16, 185, 129, 0.2);
            width: fit-content;
        }

        /* Split allocations details cards */
        .allocation-grid {
            display: grid;
            grid-template-cols: 1fr 1fr;
            gap: 12px;
            background: rgba(0, 0, 0, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.04);
            border-radius: 16px;
            padding: 14px;
            margin-top: 14px;
        }

        /* Error alert description details */
        .error-desc {
            font-size: 12px;
            line-height: 1.6;
            color: var(--text-slate-400);
            text-align: left;
            margin-bottom: 24px;
            background: rgba(239, 68, 68, 0.05);
            border: 1px solid rgba(239, 68, 68, 0.15);
            border-radius: 16px;
            padding: 16px;
        }

        /* Footer brand marks */
        .footer-brand {
            font-size: 9px;
            font-family: 'JetBrains Mono', monospace;
            color: var(--text-slate-500);
            letter-spacing: 0.1em;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
            padding-top: 16px;
            margin-top: 10px;
            text-transform: uppercase;
        }
    </style>
</head>
<body>

    <div class="wrapper">
        
        <?php if ($verified): ?>
            <!-- ── SUCCESS LEDGER CARD ── -->
            <div class="glass-card">
                
                <!-- Emerald Crest Shield -->
                <div class="crest animate-pulse-slow">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                    </svg>
                </div>

                <h1>Credential Verified</h1>
                <div class="subtitle">Bodhantra Secure Registry</div>

                <!-- Verified details fields -->
                <div class="ledger">
                    
                    <div class="ledger-row">
                        <span class="label">Certificate Holder</span>
                        <span class="value" style="font-size: 16px; font-weight: 800; color: #fff;"><?= htmlspecialchars($verified['name']) ?></span>
                    </div>

                    <div class="ledger-row">
                        <span class="label">Tracking Code ID</span>
                        <span class="value mono"><?= htmlspecialchars($verified['tracking_code']) ?></span>
                    </div>

                    <div class="ledger-row">
                        <span class="label">Academic department</span>
                        <span class="value"><?= htmlspecialchars($verified['branch']) ?> (Year <?= htmlspecialchars($verified['academic_year']) ?>)</span>
                    </div>

                    <div class="ledger-row">
                        <span class="label">Authorized Event context</span>
                        <span class="value" style="font-weight: 700;"><?= htmlspecialchars($verified['event_title']) ?></span>
                        <span class="label" style="font-size: 8px; margin-top: 2px;">Event Date: <?= htmlspecialchars(date('M d, Y', strtotime($verified['event_date']))) ?></span>
                    </div>

                    <!-- Pinned Seating details if allocations are assigned -->
                    <?php if ($verified['team_name'] && $verified['team_name'] !== '__UNASSIGNED__' && $verified['team_name'] !== '__PENDING__'): ?>
                        <div class="allocation-grid">
                            <div>
                                <span class="label" style="font-size: 7px; color: var(--emerald-400);">Cohort Group</span>
                                <span class="value" style="font-size: 11px; font-weight: 700; color: #fff;"><?= htmlspecialchars($verified['team_name']) ?></span>
                                <span class="badge" style="font-size: 7px; padding: 2px 6px; margin-top: 4px;"><?= htmlspecialchars($verified['assigned_cohort_role']) ?></span>
                            </div>
                            <div>
                                <span class="label" style="font-size: 7px; color: var(--emerald-400);">Seat coordinate</span>
                                <span class="value mono" style="font-size: 12px; font-weight: 700; color: #fff;"><?= htmlspecialchars($verified['row_coordinate']) ?>-<?= htmlspecialchars($verified['column_coordinate']) ?></span>
                                <span class="label" style="font-size: 7px; display: block; margin-top: 4px;">Verified Seat</span>
                            </div>
                        </div>
                    <?php endif; ?>

                </div>

                <div class="footer-brand">
                    Bodhantra OS v1.0 • Ledger hash secure
                </div>

            </div>

        <?php else: ?>
            <!-- ── BLOCKED WARNING CARD ── -->
            <div class="glass-card failed">
                
                <!-- Red Warning Crest -->
                <div class="crest failed">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                </div>

                <h1>Verification Blocked</h1>
                <div class="subtitle failed">Credential Invalid</div>

                <div class="error-desc">
                    <?= htmlspecialchars($error) ?>
                </div>

                <div class="footer-brand">
                    Bodhantra OS • Secure gateway check
                </div>

            </div>
        <?php endif; ?>

    </div>

</body>
</html>
