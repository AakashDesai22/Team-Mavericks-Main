<?php
/**
 * ============================================================================
 * BODHANTRA EVENT OS — Deterministic Serial Account ID Generator
 * ============================================================================
 *
 * Generates sequential, role-prefixed Account IDs with vacant sequence reuse:
 *   Admin       → MAV-ADM-001, MAV-ADM-002, ...
 *   Member      → MAV-MEM-001, MAV-MEM-002, ...
 *   Participant → MAV-PRT-001, MAV-PRT-002, ...
 *
 * Design decisions:
 *   • When users/members are deleted, vacant sequence gaps are reused in
 *     ascending order (e.g. if MAV-ADM-002 is deleted, the next Admin created
 *     will fill MAV-ADM-002 before incrementing past the max).
 *   • The numeric suffix is zero-padded to 3 digits (001-999) and extends.
 *   • Race-condition safety is achieved via SELECT ... FOR UPDATE within
 *     a transaction, which serializes concurrent inserts for the same prefix.
 *
 * @package BodhantraOS\Utils
 */

declare(strict_types=1);

// ---------------------------------------------------------------------------
// Role Prefix Map
// ---------------------------------------------------------------------------
const ROLE_PREFIX_MAP = [
    'Admin'       => 'MAV-ADM',
    'Member'      => 'MAV-MEM',
    'Participant' => 'MAV-PRT',
];

/**
 * Generate the next sequential Account ID for a given role tier, filling gaps in ascending order.
 *
 * This function MUST be called within an active PDO transaction.
 *
 * @param  PDO    $pdo       Active PDO connection (should be inside a transaction).
 * @param  string $roleTier  One of: 'Admin', 'Member', 'Participant'.
 * @param  string $table     Table to scan for existing IDs (default: 'users').
 * @param  string $column    Column holding the ID (default: 'unique_registration_id').
 *
 * @return string            The generated ID (e.g., "MAV-MEM-002").
 */
function generateAccountId(
    PDO    $pdo,
    string $roleTier,
    string $table  = 'users',
    string $column = 'unique_registration_id'
): string {
    if (!isset(ROLE_PREFIX_MAP[$roleTier])) {
        throw new \InvalidArgumentException(
            "Invalid role tier '{$roleTier}'. Expected one of: " .
            implode(', ', array_keys(ROLE_PREFIX_MAP))
        );
    }

    $prefix         = ROLE_PREFIX_MAP[$roleTier];
    $prefixWithDash = $prefix . '-';
    $prefixLen      = mb_strlen($prefixWithDash);

    // Fetch all existing numeric sequence numbers for this prefix in ascending order
    $sql = "SELECT CAST(SUBSTRING(`{$column}`, :prefix_len + 1) AS UNSIGNED) AS seq_num
            FROM `{$table}`
            WHERE `{$column}` LIKE :prefix_pattern
            ORDER BY seq_num ASC
            FOR UPDATE";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':prefix_len'     => $prefixLen,
        ':prefix_pattern' => $prefixWithDash . '%',
    ]);

    $existingSeqs = $stmt->fetchAll(PDO::FETCH_COLUMN);

    // Find lowest vacant positive integer starting at 1
    $nextSeq = 1;
    if ($existingSeqs) {
        foreach ($existingSeqs as $seq) {
            $seqVal = (int)$seq;
            if ($seqVal === $nextSeq) {
                $nextSeq++;
            } elseif ($seqVal > $nextSeq) {
                // Gap found! $nextSeq is the lowest vacant number
                break;
            }
        }
    }

    $paddedSeq = str_pad((string)$nextSeq, 3, '0', STR_PAD_LEFT);
    return $prefix . '-' . $paddedSeq;
}

/**
 * Generate a Participant ID for event-scoped registration.
 *
 * @param  PDO $pdo  Active PDO connection (must be inside a transaction).
 * @return string    e.g., "MAV-PRT-001"
 */
function generateParticipantId(PDO $pdo): string
{
    return generateAccountId($pdo, 'Participant', 'event_registrations', 'participant_id');
}
