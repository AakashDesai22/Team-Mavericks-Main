<?php
/**
 * ============================================================================
 * BODHANTRA EVENT OS — Seating & Allocation Engine Controller
 * ============================================================================
 *
 * The core algorithmic component of the platform.  Handles room geometry,
 * branch-balanced team formation, temporal collision avoidance, and spatial
 * seat mapping — all in native PHP arrays without external libraries.
 *
 * Endpoints:
 *   • GET  /seating/grid              →  handleGetGrid()
 *   • POST /seating/grid              →  handleUpdateGrid()
 *   • POST /allocation/run            →  handleRunAllocation()
 *   • POST /allocation/reroll         →  handleSingleReRoll()
 *   • POST /allocation/reveal         →  handleReveal()
 *   • GET  /allocations/event/{id}    →  handleGetAllocationsForEvent()
 *
 * RBAC: Admin + Member for all endpoints.
 *
 * Algorithm overview (POST allocation/run):
 *   Step 1: Spatial Mapping   — Fetch open coordinates from seating_grid.
 *   Step 2: Attendee Fetch    — Load all Approved participants for the event.
 *   Step 3: Branch Balancing  — Round-robin distribution across teams.
 *   Step 4: Temporal Checks   — Cross-reference past events for repeat pairings.
 *   Step 5: Collision Guard   — Hash-set verification for zero seat duplication.
 *   Step 6: Role Assignment   — Rotational distribution of cohort roles.
 *
 * @package BodhantraOS\Controllers
 */

declare(strict_types=1);

require_once __DIR__ . '/_middleware.php';

/**
 * Structured cohort role rotation list.
 * These are assigned rotationally within each team.
 */
define('COHORT_ROLES', [
    'LEADER',
    'ANALYST',
    'SCRIBE',
    'PRESENTER',
    'TIMEKEEPER',
    'RESEARCHER',
    'COORDINATOR',
    'OBSERVER',
]);

/**
 * Maximum acceptable overlap coefficient before a temporal collision
 * triggers a reassignment attempt.  0.5 = more than half the proposed
 * team members were in the same group in a previous event.
 */
define('MAX_TEMPORAL_OVERLAP', 0.5);

/**
 * Maximum number of shuffle attempts for temporal collision resolution
 * before accepting the best available arrangement.
 */
define('MAX_SHUFFLE_ATTEMPTS', 50);


// ===========================================================================
// GET /seating/grid
// ===========================================================================

/**
 * Fetch the seating grid layout for a specific event.
 *
 * Query params:
 *   ?event_id=3
 *
 * Returns all cells (Available + Blocked) with their coordinates and types.
 */
function handleGetGrid(array $ctx): void
{
    $user = requireAuth($ctx, ['Admin', 'Member']);

    $eventId = (int)($ctx['query']['event_id'] ?? 0);
    if ($eventId <= 0) {
        jsonResponse(400, [
            'success' => false,
            'error'   => '"event_id" query parameter is required.',
        ]);
    }

    $pdo = Database::connect();

    // Verify the event exists.
    $evtCheck = $pdo->prepare('SELECT id, title FROM events WHERE id = :eid LIMIT 1');
    $evtCheck->execute([':eid' => $eventId]);
    if (!$evtCheck->fetch()) {
        jsonResponse(404, ['success' => false, 'error' => 'Event not found.']);
    }

    // Fetch all grid cells for this event, ordered for consistent rendering.
    $stmt = $pdo->prepare(
        'SELECT id, row_identifier, column_identifier, cell_type, block_reason
         FROM seating_grid
         WHERE event_id = :eid
         ORDER BY row_identifier ASC, column_identifier ASC'
    );
    $stmt->execute([':eid' => $eventId]);
    $cells = $stmt->fetchAll();

    // Compute summary statistics.
    $totalCells    = count($cells);
    $availCount    = 0;
    $blockedCount  = 0;
    $rows          = [];
    foreach ($cells as $cell) {
        if ($cell['cell_type'] === 'Available') {
            $availCount++;
        } else {
            $blockedCount++;
        }
        $rows[$cell['row_identifier']] = true;
    }

    jsonResponse(200, [
        'success' => true,
        'event_id' => $eventId,
        'grid' => $cells,
        'summary' => [
            'total_cells'     => $totalCells,
            'available_seats' => $availCount,
            'blocked_cells'   => $blockedCount,
            'row_count'       => count($rows),
        ],
    ]);
}


// ===========================================================================
// POST /seating/grid
// ===========================================================================

/**
 * Insert or update the seating grid for an event.
 *
 * Accepts a full grid definition (upsert strategy — existing cells are
 * replaced, new cells are inserted, missing cells are removed).
 *
 * Request body:
 *   {
 *     "event_id": 3,
 *     "cells": [
 *       { "row": "A", "col": "1", "type": "Available" },
 *       { "row": "A", "col": "2", "type": "Blocked", "reason": "Pillar" },
 *       ...
 *     ]
 *   }
 *
 * RBAC: Admin, Member.
 */
function handleUpdateGrid(array $ctx): void
{
    $user = requireAuth($ctx, ['Admin', 'Member']);

    $body    = $ctx['body'];
    $eventId = (int)($body['event_id'] ?? 0);
    $cells   = $body['cells']          ?? [];

    if ($eventId <= 0) {
        jsonResponse(400, ['success' => false, 'error' => '"event_id" is required.']);
    }

    if (!is_array($cells) || empty($cells)) {
        jsonResponse(400, ['success' => false, 'error' => '"cells" must be a non-empty array.']);
    }

    $pdo = Database::connect();

    // Verify the event exists.
    $evtCheck = $pdo->prepare('SELECT id FROM events WHERE id = :eid LIMIT 1');
    $evtCheck->execute([':eid' => $eventId]);
    if (!$evtCheck->fetch()) {
        jsonResponse(404, ['success' => false, 'error' => 'Event not found.']);
    }

    // -----------------------------------------------------------------------
    // Validate each cell definition before touching the database.
    // -----------------------------------------------------------------------
    $validTypes = ['Available', 'Blocked'];
    $validated  = [];
    $errors     = [];

    foreach ($cells as $i => $cell) {
        $row  = trim($cell['row']  ?? '');
        $col  = trim($cell['col']  ?? '');
        $type = trim($cell['type'] ?? 'Available');

        if ($row === '' || $col === '') {
            $errors[] = "Cell #{$i}: 'row' and 'col' are required.";
            continue;
        }
        if (!in_array($type, $validTypes, true)) {
            $errors[] = "Cell #{$i}: 'type' must be 'Available' or 'Blocked'.";
            continue;
        }

        $validated[] = [
            'row'    => mb_substr($row, 0, 10),
            'col'    => mb_substr($col, 0, 10),
            'type'   => $type,
            'reason' => isset($cell['reason']) ? mb_substr(trim($cell['reason']), 0, 100) : null,
        ];
    }

    if (!empty($errors)) {
        jsonResponse(400, ['success' => false, 'error' => 'Invalid cells.', 'details' => $errors]);
    }

    // -----------------------------------------------------------------------
    // Atomic upsert: delete old grid → insert new grid in a transaction.
    // -----------------------------------------------------------------------
    $pdo->beginTransaction();

    try {
        // Wipe the existing grid for this event.
        $del = $pdo->prepare('DELETE FROM seating_grid WHERE event_id = :eid');
        $del->execute([':eid' => $eventId]);

        // Batch insert all validated cells.
        $insert = $pdo->prepare(
            'INSERT INTO seating_grid (event_id, row_identifier, column_identifier, cell_type, block_reason)
             VALUES (:eid, :row, :col, :type, :reason)'
        );

        foreach ($validated as $cell) {
            $insert->execute([
                ':eid'    => $eventId,
                ':row'    => $cell['row'],
                ':col'    => $cell['col'],
                ':type'   => $cell['type'],
                ':reason' => $cell['reason'],
            ]);
        }

        $pdo->commit();
    } catch (\Throwable $e) {
        $pdo->rollBack();
        error_log('[BodhantraOS][SeatingEngine] Grid update failed: ' . $e->getMessage());
        jsonResponse(500, ['success' => false, 'error' => 'Failed to update seating grid.']);
    }

    $availCount = count(array_filter($validated, fn($c) => $c['type'] === 'Available'));

    writeAuditLog(
        (int)$user['id'],
        "Updated seating grid for event #{$eventId}: " . count($validated) . " cells ({$availCount} available)",
        '/api/seating/grid',
        $ctx['ip']
    );

    jsonResponse(200, [
        'success'      => true,
        'message'      => 'Seating grid updated successfully.',
        'event_id'     => $eventId,
        'total_cells'  => count($validated),
        'available'    => $availCount,
        'blocked'      => count($validated) - $availCount,
    ]);
}


// ===========================================================================
// POST /allocation/run — THE CORE ALGORITHM
// ===========================================================================

/**
 * Execute the full allocation pipeline for an event.
 *
 * This is the most computationally intensive operation in the system.
 * It runs the six-step matching process entirely in-memory using native
 * PHP arrays before writing results to the database.
 *
 * Request body:
 *   {
 *     "event_id":     3,
 *     "team_count":   6,          // number of teams to create
 *     "team_prefix":  "Team"      // optional, default "Team"
 *   }
 *
 * RBAC: Admin, Member.
 */
function handleRunAllocation(array $ctx): void
{
    $user = requireAuth($ctx, ['Admin', 'Member']);

    $body       = $ctx['body'];
    $eventId    = (int)($body['event_id']    ?? 0);
    $teamCount  = (int)($body['team_count']  ?? 0);
    $teamPrefix = trim($body['team_prefix']  ?? 'Team');

    if ($eventId <= 0) {
        jsonResponse(400, ['success' => false, 'error' => '"event_id" is required.']);
    }
    if ($teamCount <= 0) {
        jsonResponse(400, ['success' => false, 'error' => '"team_count" must be a positive integer.']);
    }
    if ($teamPrefix === '') {
        $teamPrefix = 'Team';
    }

    $pdo = Database::connect();

    // -----------------------------------------------------------------------
    // PRE-FLIGHT: Verify the event exists and is active.
    // -----------------------------------------------------------------------
    $evtStmt = $pdo->prepare('SELECT id, title, status FROM events WHERE id = :eid LIMIT 1');
    $evtStmt->execute([':eid' => $eventId]);
    $event = $evtStmt->fetch();

    if (!$event) {
        jsonResponse(404, ['success' => false, 'error' => 'Event not found.']);
    }

    // ===================================================================
    // STEP 1: SPATIAL MAPPING
    // Fetch all non-blocked cells from seating_grid for this event.
    // These are the physical seats we can assign participants to.
    // ===================================================================
    $gridStmt = $pdo->prepare(
        "SELECT row_identifier, column_identifier
         FROM seating_grid
         WHERE event_id = :eid AND cell_type = 'Available'
         ORDER BY row_identifier ASC, column_identifier ASC"
    );
    $gridStmt->execute([':eid' => $eventId]);
    $availableSeats = $gridStmt->fetchAll();

    if (empty($availableSeats)) {
        jsonResponse(400, [
            'success' => false,
            'error'   => 'No available seats in the seating grid. Define the room layout first.',
        ]);
    }

    // ===================================================================
    // STEP 2: ATTENDEE SELECTION
    // Fetch all approved participants who have placeholder allocations
    // (created by the approval workflow) with __UNASSIGNED__ team name.
    // Also include any existing allocations that need re-processing.
    // ===================================================================
    $attendeeStmt = $pdo->prepare(
        "SELECT u.id AS user_id, u.name, u.branch, u.academic_year,
                a.id AS allocation_id
         FROM allocations a
         INNER JOIN users u ON u.id = a.user_id
         INNER JOIN registrations r ON r.user_id = a.user_id AND r.event_id = a.event_id
         WHERE a.event_id = :eid
           AND r.status = 'Approved'
         ORDER BY u.branch ASC, u.id ASC"
    );
    $attendeeStmt->execute([':eid' => $eventId]);
    $attendees = $attendeeStmt->fetchAll();

    if (empty($attendees)) {
        jsonResponse(400, [
            'success' => false,
            'error'   => 'No approved participants found for this event. Approve registrations first.',
        ]);
    }

    $totalAttendees = count($attendees);
    $totalSeats     = count($availableSeats);

    if ($totalAttendees > $totalSeats) {
        jsonResponse(400, [
            'success' => false,
            'error'   => "Not enough seats. {$totalAttendees} approved participants but only {$totalSeats} available seats.",
            'attendees'       => $totalAttendees,
            'available_seats' => $totalSeats,
        ]);
    }

    // ===================================================================
    // STEP 3: BRANCH DIVERSITY MAXIMIZATION
    //
    // Algorithm:
    //   1. Group attendees by academic branch into sub-arrays.
    //   2. Sort branches by count (largest first) for optimal spreading.
    //   3. Run a round-robin loop: cycle through branches, take one
    //      attendee at a time, assign to the next team slot.
    //
    // This ensures that members of the same branch are distributed as
    // evenly as possible across all teams, maximizing cross-departmental
    // networking.
    // ===================================================================

    // Group by branch.
    $branchBuckets = [];
    foreach ($attendees as $att) {
        $branch = $att['branch'] ?: '__UNKNOWN__';
        $branchBuckets[$branch][] = $att;
    }

    // Shuffle within each branch for randomness.
    foreach ($branchBuckets as &$bucket) {
        shuffle($bucket);
    }
    unset($bucket);

    // Sort branches by size (descending) — ensures the largest groups
    // get spread first, giving the algorithm the most flexibility.
    uasort($branchBuckets, function ($a, $b) {
        return count($b) - count($a);
    });

    // Round-robin distribution into teams.
    //
    // $teams is a 2D array: $teams[teamIndex] = [attendee1, attendee2, ...]
    //
    // We cycle through branches and teams simultaneously:
    //   - Take the next attendee from the current branch.
    //   - Assign them to the current team slot.
    //   - Advance to the next team (wrapping around).
    //   - When a branch is exhausted, move to the next branch.
    $teams = array_fill(0, $teamCount, []);
    $teamSlot = 0;

    // Build a flat interleaved queue from the branch buckets.
    // Interleaving guarantees that consecutive assignments come from
    // different branches.
    $interleavedQueue = [];
    $maxBucketSize = max(array_map('count', $branchBuckets));

    for ($i = 0; $i < $maxBucketSize; $i++) {
        foreach ($branchBuckets as $bucket) {
            if (isset($bucket[$i])) {
                $interleavedQueue[] = $bucket[$i];
            }
        }
    }

    // Assign interleaved queue to teams round-robin style.
    foreach ($interleavedQueue as $attendee) {
        $teams[$teamSlot][] = $attendee;
        $teamSlot = ($teamSlot + 1) % $teamCount;
    }

    // ===================================================================
    // STEP 4: TEMPORAL COLLISION AVOIDANCE
    //
    // For each proposed team, check how many members shared a team in
    // ANY previous event.  If the overlap coefficient exceeds the
    // threshold, attempt to swap the offending member with another team.
    //
    // Overlap coefficient = |intersection| / |team_size|
    //
    // This runs a fixed number of improvement passes to avoid infinite
    // loops on pathological data distributions.
    // ===================================================================

    // Build a lookup of past team memberships:
    //   $pastPairings[userId] = [partnerId1 => count, partnerId2 => count, ...]
    $pastPairings = buildPastPairingMatrix($pdo, $eventId);

    // Run collision resolution passes.
    for ($attempt = 0; $attempt < MAX_SHUFFLE_ATTEMPTS; $attempt++) {
        $swapped = false;

        for ($ti = 0; $ti < $teamCount; $ti++) {
            $teamMemberIds = array_column($teams[$ti], 'user_id');
            $overlapScore  = computeTeamOverlap($teamMemberIds, $pastPairings);
            $teamSize      = count($teamMemberIds);

            // Check if overlap coefficient exceeds threshold.
            if ($teamSize > 1 && ($overlapScore / $teamSize) > MAX_TEMPORAL_OVERLAP) {
                // Find the member with the highest overlap count.
                $maxOverlapMember = findHighestOverlapMember($teamMemberIds, $pastPairings);

                if ($maxOverlapMember === null) {
                    continue;
                }

                // Attempt to swap with a random member from another team.
                $targetTeam = ($ti + random_int(1, max(1, $teamCount - 1))) % $teamCount;

                if (empty($teams[$targetTeam])) {
                    continue;
                }

                // Find the member in the source team.
                $srcIdx = null;
                foreach ($teams[$ti] as $idx => $m) {
                    if ($m['user_id'] === $maxOverlapMember) {
                        $srcIdx = $idx;
                        break;
                    }
                }

                if ($srcIdx === null) {
                    continue;
                }

                // Pick a random member from the target team.
                $dstIdx = random_int(0, count($teams[$targetTeam]) - 1);

                // Swap.
                $temp = $teams[$ti][$srcIdx];
                $teams[$ti][$srcIdx] = $teams[$targetTeam][$dstIdx];
                $teams[$targetTeam][$dstIdx] = $temp;

                $swapped = true;
            }
        }

        // If no swaps were needed this pass, the configuration is optimal.
        if (!$swapped) {
            break;
        }
    }

    // ===================================================================
    // STEP 5: SPATIAL COLLISION SAFEGUARD
    //
    // Map each participant to a physical seat coordinate.  Maintain a
    // runtime hash set of "row-col" strings to mathematically guarantee
    // zero dual-occupancy at assignment time.
    //
    // The hash set check runs in O(1) per lookup, making the full pass
    // O(n) for n participants.
    // ===================================================================

    $occupiedHashSet = [];      // "row-col" → true
    $seatCursor      = 0;       // Index into $availableSeats
    $assignments     = [];      // Final assignment records

    for ($ti = 0; $ti < $teamCount; $ti++) {
        $teamName = $teamPrefix . ' ' . ($ti + 1);
        $roleIdx  = 0;         // Rotational index into COHORT_ROLES.

        foreach ($teams[$ti] as $member) {
            // Find the next unoccupied seat.
            while ($seatCursor < $totalSeats) {
                $seatRow = $availableSeats[$seatCursor]['row_identifier'];
                $seatCol = $availableSeats[$seatCursor]['column_identifier'];
                $hashKey = $seatRow . '-' . $seatCol;

                if (!isset($occupiedHashSet[$hashKey])) {
                    // Seat is free — claim it.
                    $occupiedHashSet[$hashKey] = true;
                    $seatCursor++;
                    break;
                }

                // Seat already occupied (should not happen in normal flow,
                // but the safeguard catches edge cases).
                $seatCursor++;
            }

            // If we've exhausted all seats, abort.
            if (!isset($seatRow) || !isset($seatCol)) {
                jsonResponse(500, [
                    'success' => false,
                    'error'   => 'Seat allocation exhausted. This should not happen.',
                ]);
            }

            // =============================================================
            // STEP 6: ROLE ASSIGNMENT
            // Distribute cohort roles rotationally within each team.
            // The role list cycles: LEADER → ANALYST → SCRIBE → ...
            // =============================================================
            $role = COHORT_ROLES[$roleIdx % count(COHORT_ROLES)];
            $roleIdx++;

            $assignments[] = [
                'allocation_id'   => $member['allocation_id'],
                'user_id'         => $member['user_id'],
                'user_name'       => $member['name'],
                'branch'          => $member['branch'],
                'team_name'       => $teamName,
                'role'            => $role,
                'row_coordinate'  => $seatRow,
                'col_coordinate'  => $seatCol,
            ];
        }
    }

    // ===================================================================
    // DATABASE WRITE — Batch update all allocation rows in a transaction.
    // ===================================================================
    $pdo->beginTransaction();

    try {
        $updateStmt = $pdo->prepare(
            'UPDATE allocations
             SET team_name = :team,
                 assigned_cohort_role = :role,
                 row_coordinate = :row,
                 column_coordinate = :col,
                 reveal_state = :reveal,
                 allocated_at = NOW()
             WHERE id = :aid'
        );

        foreach ($assignments as $a) {
            $updateStmt->execute([
                ':team'   => $a['team_name'],
                ':role'   => $a['role'],
                ':row'    => $a['row_coordinate'],
                ':col'    => $a['col_coordinate'],
                ':reveal' => 'Unrevealed',
                ':aid'    => $a['allocation_id'],
            ]);
        }

        $pdo->commit();
    } catch (\Throwable $e) {
        $pdo->rollBack();
        error_log('[BodhantraOS][AllocationEngine] Write failed: ' . $e->getMessage());
        jsonResponse(500, ['success' => false, 'error' => 'Failed to write allocations to database.']);
    }

    // ===================================================================
    // Build a summary grouped by team for the response.
    // ===================================================================
    $teamSummary = [];
    foreach ($assignments as $a) {
        $teamSummary[$a['team_name']][] = [
            'user_id'  => $a['user_id'],
            'name'     => $a['user_name'],
            'branch'   => $a['branch'],
            'role'     => $a['role'],
            'seat'     => $a['row_coordinate'] . '-' . $a['col_coordinate'],
        ];
    }

    // Branch distribution diagnostic.
    $branchDistribution = [];
    foreach ($teamSummary as $tn => $members) {
        $branches = array_count_values(array_column($members, 'branch'));
        $branchDistribution[$tn] = $branches;
    }

    writeAuditLog(
        (int)$user['id'],
        "Ran allocation engine for event #{$eventId}: {$totalAttendees} attendees → {$teamCount} teams",
        '/api/allocation/run',
        $ctx['ip']
    );

    jsonResponse(200, [
        'success'  => true,
        'message'  => "Allocation complete. {$totalAttendees} participants mapped across {$teamCount} teams.",
        'event_id' => $eventId,
        'stats' => [
            'total_attendees'  => $totalAttendees,
            'team_count'       => $teamCount,
            'seats_used'       => count($assignments),
            'seats_remaining'  => $totalSeats - count($assignments),
            'shuffle_attempts' => $attempt ?? 0,
        ],
        'teams'               => $teamSummary,
        'branch_distribution' => $branchDistribution,
    ]);
}


// ===========================================================================
// POST /allocation/reroll — Single Participant Re-assignment
// ===========================================================================

/**
 * Reset and recalculate a single participant's allocation without
 * affecting any other participant's team or seat.
 *
 * Request body:
 *   {
 *     "event_id": 3,
 *     "user_id":  42
 *   }
 *
 * RBAC: Admin, Member.
 */
function handleSingleReRoll(array $ctx): void
{
    $user = requireAuth($ctx, ['Admin', 'Member']);

    $eventId  = (int)($ctx['body']['event_id'] ?? 0);
    $targetId = (int)($ctx['body']['user_id']  ?? 0);

    if ($eventId <= 0 || $targetId <= 0) {
        jsonResponse(400, [
            'success' => false,
            'error'   => '"event_id" and "user_id" are required.',
        ]);
    }

    $pdo = Database::connect();

    // -----------------------------------------------------------------------
    // 1. Fetch the participant's current allocation.
    // -----------------------------------------------------------------------
    $allocStmt = $pdo->prepare(
        'SELECT a.id AS allocation_id, a.team_name, a.row_coordinate, a.column_coordinate,
                u.name AS user_name, u.branch
         FROM allocations a
         INNER JOIN users u ON u.id = a.user_id
         WHERE a.user_id = :uid AND a.event_id = :eid
         LIMIT 1'
    );
    $allocStmt->execute([':uid' => $targetId, ':eid' => $eventId]);
    $current = $allocStmt->fetch();

    if (!$current) {
        jsonResponse(404, [
            'success' => false,
            'error'   => 'No allocation found for this user at this event.',
        ]);
    }

    $oldTeam = $current['team_name'];
    $oldSeat = $current['row_coordinate'] . '-' . $current['column_coordinate'];

    // -----------------------------------------------------------------------
    // 2. Build a set of all currently occupied seats EXCLUDING this user.
    //    This frees their old seat for potential reassignment.
    // -----------------------------------------------------------------------
    $occStmt = $pdo->prepare(
        'SELECT row_coordinate, column_coordinate, team_name
         FROM allocations
         WHERE event_id = :eid AND user_id != :uid'
    );
    $occStmt->execute([':eid' => $eventId, ':uid' => $targetId]);
    $occupied = $occStmt->fetchAll();

    $occupiedHashSet = [];
    $teamSizes       = [];
    foreach ($occupied as $occ) {
        $hashKey = $occ['row_coordinate'] . '-' . $occ['column_coordinate'];
        $occupiedHashSet[$hashKey] = true;

        // Track team sizes for reassignment targeting.
        if (!isset($teamSizes[$occ['team_name']])) {
            $teamSizes[$occ['team_name']] = 0;
        }
        $teamSizes[$occ['team_name']]++;
    }

    // -----------------------------------------------------------------------
    // 3. Find the best alternate team.
    //    Strategy: pick the team with the fewest members of the same branch
    //    (other than the current team) to maximize diversity.
    // -----------------------------------------------------------------------

    // Count same-branch members per team.
    $branchCountPerTeam = [];
    foreach ($occupied as $occ) {
        // We need branch info — fetch it.
        $branchCountPerTeam[$occ['team_name']] = $branchCountPerTeam[$occ['team_name']] ?? 0;
    }

    // Query branch distribution per team for this event.
    $branchStmt = $pdo->prepare(
        "SELECT a.team_name, u.branch, COUNT(*) AS cnt
         FROM allocations a
         INNER JOIN users u ON u.id = a.user_id
         WHERE a.event_id = :eid AND a.user_id != :uid
           AND a.team_name != '__UNASSIGNED__'
         GROUP BY a.team_name, u.branch"
    );
    $branchStmt->execute([':eid' => $eventId, ':uid' => $targetId]);
    $branchRows = $branchStmt->fetchAll();

    $branchMap = [];  // teamName → [branch → count]
    foreach ($branchRows as $br) {
        $branchMap[$br['team_name']][$br['branch']] = (int)$br['cnt'];
    }

    // Score each team: lower is better (fewer same-branch members).
    $userBranch  = $current['branch'];
    $teamScores  = [];
    foreach ($teamSizes as $tn => $size) {
        if ($tn === '__UNASSIGNED__' || $tn === '__PENDING__') continue;
        $sameBranch = $branchMap[$tn][$userBranch] ?? 0;
        $teamScores[$tn] = $sameBranch;
    }

    // Exclude the current team if alternatives exist.
    if (count($teamScores) > 1) {
        unset($teamScores[$oldTeam]);
    }

    if (empty($teamScores)) {
        // No other teams — keep the same team but change the seat.
        $newTeam = $oldTeam;
    } else {
        // Pick the team with the lowest score (fewest same-branch members).
        asort($teamScores);
        $newTeam = array_key_first($teamScores);
    }

    // -----------------------------------------------------------------------
    // 4. Find a free seat.
    // -----------------------------------------------------------------------
    $gridStmt = $pdo->prepare(
        "SELECT row_identifier, column_identifier
         FROM seating_grid
         WHERE event_id = :eid AND cell_type = 'Available'
         ORDER BY RAND()
         LIMIT 50"
    );
    $gridStmt->execute([':eid' => $eventId]);
    $candidateSeats = $gridStmt->fetchAll();

    $newRow = null;
    $newCol = null;
    foreach ($candidateSeats as $seat) {
        $hashKey = $seat['row_identifier'] . '-' . $seat['column_identifier'];
        if (!isset($occupiedHashSet[$hashKey])) {
            $newRow = $seat['row_identifier'];
            $newCol = $seat['column_identifier'];
            break;
        }
    }

    if ($newRow === null) {
        jsonResponse(400, [
            'success' => false,
            'error'   => 'No available seats for re-roll. All seats are occupied.',
        ]);
    }

    // -----------------------------------------------------------------------
    // 5. Assign a new role (random from the list to add variety).
    // -----------------------------------------------------------------------
    $newRole = COHORT_ROLES[random_int(0, count(COHORT_ROLES) - 1)];

    // -----------------------------------------------------------------------
    // 6. Update the database.
    // -----------------------------------------------------------------------
    $updateStmt = $pdo->prepare(
        'UPDATE allocations
         SET team_name = :team,
             assigned_cohort_role = :role,
             row_coordinate = :row,
             column_coordinate = :col,
             allocated_at = NOW()
         WHERE id = :aid'
    );
    $updateStmt->execute([
        ':team' => $newTeam,
        ':role' => $newRole,
        ':row'  => $newRow,
        ':col'  => $newCol,
        ':aid'  => $current['allocation_id'],
    ]);

    writeAuditLog(
        (int)$user['id'],
        "Re-rolled allocation for user #{$targetId} ({$current['user_name']}): " .
            "{$oldTeam}@{$oldSeat} → {$newTeam}@{$newRow}-{$newCol}",
        '/api/allocation/reroll',
        $ctx['ip']
    );

    jsonResponse(200, [
        'success' => true,
        'message' => "Re-roll complete for {$current['user_name']}.",
        'user_id' => $targetId,
        'previous' => [
            'team' => $oldTeam,
            'seat' => $oldSeat,
        ],
        'new' => [
            'team' => $newTeam,
            'role' => $newRole,
            'seat' => "{$newRow}-{$newCol}",
        ],
    ]);
}


// ===========================================================================
// POST /allocation/reveal — Bulk Reveal
// ===========================================================================

/**
 * Bulk-update all allocations for an event to "Revealed" state.
 *
 * This makes teams/seats visible to participants on their dashboards.
 *
 * Request body:
 *   { "event_id": 3 }
 *
 * RBAC: Admin, Member.
 */
function handleReveal(array $ctx): void
{
    $user    = requireAuth($ctx, ['Admin', 'Member']);
    $eventId = (int)($ctx['body']['event_id'] ?? 0);

    if ($eventId <= 0) {
        jsonResponse(400, ['success' => false, 'error' => '"event_id" is required.']);
    }

    $pdo = Database::connect();

    // Count how many rows will be affected.
    $countStmt = $pdo->prepare(
        "SELECT COUNT(*) AS cnt FROM allocations
         WHERE event_id = :eid AND reveal_state = 'Unrevealed'"
    );
    $countStmt->execute([':eid' => $eventId]);
    $unrevealed = (int)$countStmt->fetch()['cnt'];

    if ($unrevealed === 0) {
        jsonResponse(200, [
            'success' => true,
            'message' => 'All allocations are already revealed for this event.',
            'revealed_count' => 0,
        ]);
    }

    // Bulk update.
    $updateStmt = $pdo->prepare(
        "UPDATE allocations SET reveal_state = 'Revealed' WHERE event_id = :eid"
    );
    $updateStmt->execute([':eid' => $eventId]);

    writeAuditLog(
        (int)$user['id'],
        "Revealed all allocations for event #{$eventId} ({$unrevealed} entries)",
        '/api/allocation/reveal',
        $ctx['ip']
    );

    jsonResponse(200, [
        'success'        => true,
        'message'        => "Allocations revealed. {$unrevealed} participants can now view their assignments.",
        'event_id'       => $eventId,
        'revealed_count' => $unrevealed,
    ]);
}


// ===========================================================================
// GET /allocations/event/{id} — Read Allocations for Event
// ===========================================================================

/**
 * Fetch all allocations for a specific event, grouped by team.
 *
 * RBAC: Admin, Member (coordinators can view all).
 *       Participants only see their own via /auth/me.
 */
function handleGetAllocationsForEvent(array $ctx): void
{
    $user    = requireAuth($ctx, ['Admin', 'Member']);
    $eventId = (int)($ctx['params']['event_id'] ?? 0);

    if ($eventId <= 0) {
        jsonResponse(400, ['success' => false, 'error' => 'Invalid event ID.']);
    }

    $pdo = Database::connect();

    $stmt = $pdo->prepare(
        'SELECT a.id AS allocation_id,
                a.user_id,
                u.name,
                u.email,
                u.branch,
                u.academic_year,
                u.unique_registration_id,
                a.team_name,
                a.assigned_cohort_role,
                a.row_coordinate,
                a.column_coordinate,
                a.reveal_state,
                a.allocated_at,
                r.checked_in_state
         FROM allocations a
         INNER JOIN users u ON u.id = a.user_id
         LEFT JOIN registrations r ON r.user_id = a.user_id AND r.event_id = a.event_id
         WHERE a.event_id = :eid
         ORDER BY a.team_name ASC, a.assigned_cohort_role ASC'
    );
    $stmt->execute([':eid' => $eventId]);
    $rows = $stmt->fetchAll();

    // Group by team.
    $grouped = [];
    foreach ($rows as $row) {
        $grouped[$row['team_name']][] = $row;
    }

    // Summary.
    $revealedCount   = count(array_filter($rows, fn($r) => $r['reveal_state'] === 'Revealed'));
    $unrevealedCount = count($rows) - $revealedCount;

    jsonResponse(200, [
        'success'    => true,
        'event_id'   => $eventId,
        'total'      => count($rows),
        'team_count' => count($grouped),
        'revealed'   => $revealedCount,
        'unrevealed' => $unrevealedCount,
        'teams'      => $grouped,
    ]);
}


// ===========================================================================
// INTERNAL HELPER FUNCTIONS
// (not exported to the gateway — called only within this file)
// ===========================================================================

/**
 * Build a pairing matrix from all PAST events' allocations.
 *
 * For each user, records which other users they have been teamed with
 * and how many times.
 *
 * @param  PDO  $pdo      Database connection.
 * @param  int  $eventId  Current event ID (excluded from the query).
 * @return array           $pastPairings[userId][partnerId] = count
 */
function buildPastPairingMatrix(PDO $pdo, int $eventId): array
{
    // Fetch all past allocations (from other events).
    $stmt = $pdo->prepare(
        "SELECT user_id, event_id, team_name
         FROM allocations
         WHERE event_id != :eid
           AND team_name != '__UNASSIGNED__'
         ORDER BY event_id, team_name"
    );
    $stmt->execute([':eid' => $eventId]);
    $pastRows = $stmt->fetchAll();

    if (empty($pastRows)) {
        return [];
    }

    // Group by (event_id, team_name) to find co-team members.
    $teamGroups = [];
    foreach ($pastRows as $row) {
        $key = $row['event_id'] . '::' . $row['team_name'];
        $teamGroups[$key][] = (int)$row['user_id'];
    }

    // For each team group, create pairwise entries.
    $pairings = [];
    foreach ($teamGroups as $members) {
        $n = count($members);
        for ($i = 0; $i < $n; $i++) {
            for ($j = $i + 1; $j < $n; $j++) {
                $a = $members[$i];
                $b = $members[$j];

                if (!isset($pairings[$a])) $pairings[$a] = [];
                if (!isset($pairings[$b])) $pairings[$b] = [];

                $pairings[$a][$b] = ($pairings[$a][$b] ?? 0) + 1;
                $pairings[$b][$a] = ($pairings[$b][$a] ?? 0) + 1;
            }
        }
    }

    return $pairings;
}


/**
 * Compute the overlap score for a proposed team.
 *
 * The overlap score is the total number of past pairings found among
 * the team's members.  A higher score means more historical repetition.
 *
 * @param  int[]  $memberIds     User IDs in the proposed team.
 * @param  array  $pastPairings  The pairing matrix from buildPastPairingMatrix().
 * @return int                   Total overlap score.
 */
function computeTeamOverlap(array $memberIds, array $pastPairings): int
{
    $score = 0;
    $n     = count($memberIds);

    for ($i = 0; $i < $n; $i++) {
        for ($j = $i + 1; $j < $n; $j++) {
            $a = $memberIds[$i];
            $b = $memberIds[$j];
            $score += ($pastPairings[$a][$b] ?? 0);
        }
    }

    return $score;
}


/**
 * Find the team member with the highest overlap count against their
 * current teammates.
 *
 * @param  int[]  $memberIds     User IDs in the team.
 * @param  array  $pastPairings  The pairing matrix.
 * @return int|null              User ID of the highest-overlap member, or null.
 */
function findHighestOverlapMember(array $memberIds, array $pastPairings): ?int
{
    $scores = [];

    foreach ($memberIds as $mid) {
        $scores[$mid] = 0;
        foreach ($memberIds as $other) {
            if ($mid === $other) continue;
            $scores[$mid] += ($pastPairings[$mid][$other] ?? 0);
        }
    }

    if (empty($scores)) {
        return null;
    }

    arsort($scores);
    $topId    = array_key_first($scores);
    $topScore = $scores[$topId];

    // Only return if there's actual overlap.
    return $topScore > 0 ? $topId : null;
}
