<?php
/**
 * ============================================================================
 * BODHANTRA EVENT OS — Deterministic Serial Account ID Generator
 * ============================================================================
 *
 * Generates sequential, role-prefixed Account IDs:
 *   Admin       → MAV-ADM-001, MAV-ADM-002, ...
 *   Member      → MAV-MEM-001, MAV-MEM-002, ...
 *   Participant → MAV-PRT-001, MAV-PRT-002, ...
 *
 * Design decisions:
 *   • IDs are derived from a MAX() query on the existing pool, not from a
 *     separate sequence table.  This keeps the schema simple and the IDs
 *     self-documenting.
 *   • The numeric suffix is zero-padded to 3 digits.  When > 999 accounts
 *     exist for a tier, the format naturally extends (e.g., MAV-MEM-1000).
 *   • Race-condition safety is achieved via SELECT ... FOR UPDATE within
 *     a transaction, which serializes concurrent inserts for the same prefix.
 *
 * Usage:
 *   require_once __DIR__ . '/id_generator.php';
 *   $pdo = Database::connect();
 *   $accountId = generateAccountId($pdo, 'Member');
 *   // → "MAV-MEM-001" (if first member)
 *
 * @package BodhantraOS\Utils
 */

declare(strict_types=1);


// ---------------------------------------------------------------------------
// Role Prefix Map
// ---------------------------------------------------------------------------
// Maps the database role_tier ENUM values to their ID prefix segments.
// This is the single source of truth for the prefix format.
// ---------------------------------------------------------------------------
const ROLE_PREFIX_MAP = [
    'Admin'       => 'MAV-ADM',
    'Member'      => 'MAV-MEM',
    'Participant' => 'MAV-PRT',
];


/**
 * Generate the next sequential Account ID for a given role tier.
 *
 * This function MUST be called within an active PDO transaction.
 * It acquires a row-level lock (FOR UPDATE) to prevent concurrent
 * requests from generating the same sequence number.
 *
 * @param  PDO    $pdo       Active PDO connection (should be inside a transaction).
 * @param  string $roleTier  One of: 'Admin', 'Member', 'Participant'.
 * @param  string $table     Table to scan for existing IDs (default: 'users').
 *                           Pass 'event_registrations' for event-scoped PRT IDs.
 * @param  string $column    Column holding the ID (default: 'unique_registration_id').
 *                           Pass 'participant_id' for event_registrations.
 *
 * @return string            The generated ID (e.g., "MAV-MEM-007").
 *
 * @throws \InvalidArgumentException  If $roleTier is not in ROLE_PREFIX_MAP.
 * @throws \RuntimeException          If the sequence query fails.
 */
function generateAccountId(
    PDO    $pdo,
    string $roleTier,
    string $table  = 'users',
    string $column = 'unique_registration_id'
): string {
    // -----------------------------------------------------------------------
    // 1. Validate role tier and resolve prefix.
    // -----------------------------------------------------------------------
    if (!isset(ROLE_PREFIX_MAP[$roleTier])) {
        throw new \InvalidArgumentException(
            "Invalid role tier '{$roleTier}'. Expected one of: " .
            implode(', ', array_keys(ROLE_PREFIX_MAP))
        );
    }

    $prefix = ROLE_PREFIX_MAP[$roleTier];

    // -----------------------------------------------------------------------
    // 2. Find the current highest sequence number for this prefix.
    //
    //    We use SUBSTRING to extract the numeric suffix after the prefix + dash.
    //    Example: from "MAV-MEM-042" we extract "042" → 42.
    //
    //    The FOR UPDATE clause acquires a row-level lock on the scanned rows,
    //    serializing concurrent inserts.  This requires an active transaction.
    //
    //    If no rows match the prefix, MAX returns NULL → COALESCE gives 0.
    // -----------------------------------------------------------------------
    $prefixWithDash = $prefix . '-';
    $prefixLen      = mb_strlen($prefixWithDash);

    // Build query dynamically based on table context.
    // For the `users` table, we filter by role_tier as an optimization.
    // For `event_registrations`, we scan all rows with the PRT prefix.
    if ($table === 'users') {
        $sql = "SELECT COALESCE(
                    MAX(
                        CAST(SUBSTRING(`{$column}`, :prefix_len + 1) AS UNSIGNED)
                    ), 0
                ) AS max_seq
                FROM `{$table}`
                WHERE `{$column}` LIKE :prefix_pattern
                FOR UPDATE";
    } else {
        $sql = "SELECT COALESCE(
                    MAX(
                        CAST(SUBSTRING(`{$column}`, :prefix_len + 1) AS UNSIGNED)
                    ), 0
                ) AS max_seq
                FROM `{$table}`
                WHERE `{$column}` LIKE :prefix_pattern
                FOR UPDATE";
    }

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':prefix_len'     => $prefixLen,
        ':prefix_pattern' => $prefixWithDash . '%',
    ]);

    $row = $stmt->fetch();

    if ($row === false) {
        throw new \RuntimeException(
            "[BodhantraOS][IDGen] Sequence query returned no result for prefix '{$prefix}'."
        );
    }

    $nextSeq = ((int)$row['max_seq']) + 1;

    // -----------------------------------------------------------------------
    // 3. Format the ID with zero-padded numeric suffix.
    //    Minimum 3 digits (001–999), but naturally extends for larger numbers.
    // -----------------------------------------------------------------------
    $paddedSeq = str_pad((string)$nextSeq, 3, '0', STR_PAD_LEFT);

    return $prefix . '-' . $paddedSeq;
}


/**
 * Generate a Participant ID for event-scoped registration.
 *
 * Convenience wrapper that scans the `event_registrations` table
 * instead of the `users` table.  Participant IDs are globally sequential
 * across all events (not per-event).
 *
 * @param  PDO $pdo  Active PDO connection (must be inside a transaction).
 * @return string    e.g., "MAV-PRT-001"
 */
function generateParticipantId(PDO $pdo): string
{
    return generateAccountId($pdo, 'Participant', 'event_registrations', 'participant_id');
}
