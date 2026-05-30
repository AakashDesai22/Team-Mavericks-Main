# Controllers Directory

This directory contains all PHP controller files dispatched by the API gateway (`../index.php`).

**Security notice:** Direct HTTP access to this directory is blocked by the `.htaccess` rules in the parent `api/` folder. All controller functions receive a structured `$ctx` context array and must return responses exclusively through the `jsonResponse()` helper.

## Planned controllers:
- `auth.php` — Login, logout, session validation
- `register.php` — User self-registration
- `events.php` — CRUD for events
- `upload_voucher.php` — Payment voucher upload with GD compression
- `registrations.php` — Admin/member registration approval workflow
- `seating_engine.php` — Grid management + allocation algorithm
- `checkin.php` — Day-of check-in scanning
- `audit_logger.php` — Audit ledger viewer (admin only)
- `presentation.php` — Reveal data for theatrical presentation engines
- `certificates.php` — Template coordinate storage + QR verification
- `users.php` — User profile and role management
