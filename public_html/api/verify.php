<?php
/**
 * ============================================================================
 * BODHANTRA EVENT OS — Standalone Digital Credential Validation Gateway
 * ============================================================================
 *
 * Lightweight standalone native PHP verification gateway served at:
 *   GET /api/verify.php?id=MAV-PRT-XXX
 *
 * Designed to process recruiter mobile camera scans and execute lightning-fast
 * read-only PDO Prepared Statements on the Phase 5 schema structure.
 */

declare(strict_types=1);

require_once __DIR__ . '/db.php';

$id = trim($_GET['id'] ?? '');

$verified = null;
$error = '';

if ($id === '') {
    $error = 'INVALID OR FAULTERED CREDENTIAL RECORD';
} else {
    try {
        $pdo = Database::connect();
        
        // Execute fast read-only query joining event_registrations, users, and events
        $stmt = $pdo->prepare(
            "SELECT u.name, e.title, er.status, er.created_at 
             FROM event_registrations er 
             JOIN users u ON er.user_id = u.id 
             JOIN events e ON er.event_id = e.id 
             WHERE er.participant_id = :id 
             LIMIT 1"
        );
        $stmt->execute([':id' => $id]);
        $verified = $stmt->fetch();
        
        // Fraud Prevention Guard: Block non-existent, pending, or rejected registrations
        if (!$verified || $verified['status'] !== 'Approved') {
            $verified = null; // Clear so it triggers the blocked warning card
            $error = 'INVALID OR FAULTERED CREDENTIAL RECORD';
        }
    } catch (\Throwable $e) {
        error_log('[BodhantraOS][VerifyGateway] Connection/Query Error: ' . $e->getMessage());
        $error = 'INVALID OR FAULTERED CREDENTIAL RECORD';
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Team Mavericks Directory — Forensic Credential Ledger</title>
    <!-- Tailwind CSS CDN for styling -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Inter', 'sans-serif'],
                        mono: ['JetBrains Mono', 'monospace'],
                    },
                    boxShadow: {
                        'glow-emerald': '0 0 25px -5px rgba(16, 185, 129, 0.4)',
                        'glow-rose': '0 0 25px -5px rgba(239, 68, 68, 0.4)',
                        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
                    }
                }
            }
        }
    </script>
    <!-- Premium Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
    
    <style>
        .mesh-background {
            background-color: #020617;
            background-image: 
                radial-gradient(at 10% 20%, rgba(99, 102, 241, 0.05) 0px, transparent 50%),
                radial-gradient(at 90% 80%, rgba(16, 185, 129, 0.04) 0px, transparent 50%);
        }
        .mesh-background-failed {
            background-color: #020617;
            background-image: 
                radial-gradient(at 50% 50%, rgba(239, 68, 68, 0.05) 0px, transparent 60%);
        }
    </style>
</head>
<body class="min-h-screen text-slate-100 flex items-center justify-center p-4 md:p-8 selection:bg-indigo-500/30 font-sans transition-all duration-300 <?= $verified ? 'mesh-background' : 'mesh-background-failed' ?>">

    <div class="w-full max-w-lg transition-transform duration-500 transform hover:scale-[1.01] my-8">
        
        <?php if ($verified): ?>
            <!-- ── STUNNING GLASSMORPHIC AUTHORITATIVE SUCCESS MANIFEST ── -->
            <div class="relative overflow-hidden bg-white/[0.02] backdrop-blur-xl border border-white/[0.08] rounded-[28px] p-6 md:p-8 shadow-glass shadow-emerald-500/5">
                
                <!-- Linear top gradient highlight -->
                <div class="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-500 via-emerald-500 to-teal-400"></div>
                
                <!-- Floating decorative circles -->
                <div class="absolute -right-16 -top-16 w-36 h-36 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <div class="absolute -left-16 -bottom-16 w-36 h-36 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

                <!-- Green Crest Shield Badge -->
                <div class="mx-auto w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center shadow-glow-emerald animate-pulse mb-6 relative">
                    <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                    </svg>
                </div>

                <div class="text-center mb-8">
                    <h1 class="text-xl md:text-2xl font-black tracking-tight text-white uppercase leading-none">Credential Verified</h1>
                    <span class="text-[9px] md:text-[10px] font-black uppercase tracking-[0.25em] text-brand-400 text-indigo-400 block mt-2.5">AUTHENTIC DIRECTORY SECURE LEDGER</span>
                </div>

                <!-- Verified details ledger list -->
                <div class="space-y-5 border-t border-white/5 pt-6 text-left">
                    
                    <div class="flex flex-col gap-1">
                        <span class="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Certificate Holder</span>
                        <span class="text-lg font-extrabold text-white tracking-tight leading-snug"><?= htmlspecialchars($verified['name']) ?></span>
                    </div>

                    <div class="flex flex-col gap-1">
                        <span class="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Participant Tracking ID</span>
                        <span class="text-xs font-bold font-mono text-indigo-400 select-all"><?= htmlspecialchars($id) ?></span>
                    </div>

                    <div class="flex flex-col gap-1">
                        <span class="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Symposium Context</span>
                        <span class="text-sm font-semibold text-slate-200"><?= htmlspecialchars($verified['title']) ?></span>
                    </div>

                    <div class="flex flex-col gap-1">
                        <span class="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Date of Issuance</span>
                        <span class="text-xs font-semibold text-slate-400"><?= htmlspecialchars(date('F d, Y', strtotime($verified['created_at']))) ?></span>
                    </div>
                </div>

                <!-- Green shield verification confirm bar -->
                <div class="mt-8 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex items-center gap-3 text-emerald-400/90 text-xs">
                    <svg class="w-5 h-5 shrink-0 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                    </svg>
                    <span class="font-bold tracking-wide uppercase text-[10px]">AUTHENTIC CREDENTIAL VERIFIED BY TEAM MAVERICKS DIRECTORY</span>
                </div>

                <div class="text-center text-[9px] font-mono text-slate-500 tracking-wider border-t border-white/5 pt-5 mt-6 uppercase">
                    Mavericks Event OS v1.0 • Ledger Security Certified
                </div>

            </div>

        <?php else: ?>
            <!-- ── BLOCKED WARNING CARD / FRAUD PROTECTION GUARD ── -->
            <div class="relative overflow-hidden bg-white/[0.01] backdrop-blur-xl border border-rose-500/15 rounded-[28px] p-6 md:p-8 shadow-glass shadow-rose-950/10">
                
                <!-- Red top gradient highlight -->
                <div class="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-rose-600 via-red-500 to-rose-600"></div>
                
                <!-- Floating decorative circles -->
                <div class="absolute -right-16 -top-16 w-36 h-36 bg-rose-500/5 rounded-full blur-3xl pointer-events-none"></div>

                <!-- Red Warning Crest -->
                <div class="mx-auto w-20 h-20 bg-rose-500/10 border border-rose-500/25 text-rose-500 rounded-2xl flex items-center justify-center shadow-glow-rose animate-bounce mb-6">
                    <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                </div>

                <div class="text-center mb-6">
                    <h1 class="text-lg md:text-xl font-black tracking-tight text-rose-500 uppercase leading-none">Verification Blocked</h1>
                    <span class="text-[9px] font-black uppercase tracking-[0.2em] text-rose-400 block mt-2.5">Security Alert Engine</span>
                </div>

                <!-- Standalone Bold Color-Coded HTML Validation Block Alert -->
                <div class="p-5 rounded-2xl bg-rose-950/20 border border-rose-500/20 text-center space-y-2 mb-6">
                    <div class="text-xs font-black uppercase tracking-widest text-rose-400">Ledger Verification Query Terminated</div>
                    <div class="text-sm font-extrabold text-white tracking-wide uppercase select-none"><?= htmlspecialchars($error) ?></div>
                </div>

                <div class="text-xs text-slate-400 leading-relaxed text-left border-t border-white/5 pt-5 mb-4">
                    The database structural lookups could not trace an <strong>Approved</strong> certificate registration linked to this payload tracking ID (<code><?= htmlspecialchars($id ?: 'None') ?></code>). 
                    If you believe this record is a technical anomaly, please direct the holder to the Mavericks Club helpdesk.
                </div>

                <div class="text-center text-[9px] font-mono text-slate-600 tracking-wider border-t border-white/5 pt-4 mt-6 uppercase">
                    Mavericks Security Gate • Verification Refused
                </div>

            </div>
        <?php endif; ?>

    </div>

</body>
</html>
