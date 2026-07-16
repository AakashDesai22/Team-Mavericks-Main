# Bodhantra Event OS — Universal Club Event Platform

Bodhantra Event OS is a premium, high-performance event management system designed for club symposia, workshops, cohort allocation, dynamic form design, and theatrical results reveal. Built with a decoupled **React + Vite** frontend and a native, lightweight **PHP** backend gateway, it operates with zero heavy framework overhead and minimal external dependencies.

---

## 🚀 Key Features

*   **⚡ Seating & Allocation Engine**: A custom, in-memory PHP algorithm that maps participants to seating matrices while maximizing department/academic branch diversity and dynamically avoiding historical group collisions.
*   **🎭 Theatrical Reveal Stage**: Dual high-fidelity presentation dashboards (including Noir and Finale themes) utilizing GSAP and canvas-confetti for theatrical team reveal shows.
*   **🛠️ Dynamic Form & Feedback Builder**: Create and render custom JSON-based registration fields and feedback templates per event without changing the database schema.
*   **📜 Canvas Certificate Designer**: Renders client-side dynamic completion certificates on high-resolution HTML5 canvas, supporting drag-and-drop coordinate adjustment and direct PDF/PNG export.
*   **🔐 Dual-Environment Mail Engine**: Local development intercepts OTP verifications to local logs (`public_html/api/logs/otp_debug.log`) for rapid sandbox testing, while production dispatches SMTP emails with SPF/DKIM compliant headers.
*   **🔍 Forensic Audit Ledger**: Automatically logs every incoming API request with actor details, IP resolution, targeted endpoint, and server timestamps.

---

## 📁 Repository Structure

```
.
├── .env.example              # Env configuration template
├── .gitignore                # Restricts local dependencies/credentials/logs
├── run_app.bat               # Windows local startup script
├── package.json              # Client packages and build steps
├── vite.config.js            # Vite build parameters and local API proxies
├── src/                      # React Frontend Source
│   ├── api/                  # Unified fetch network layer
│   ├── components/           # Reusable widgets (Certificates, Forms, Navs)
│   ├── context/              # Context Providers (Auth, Theme)
│   ├── layouts/              # Sidebars & shell templates
│   └── pages/                # Public Portal, Admin panel, & Reveal screen views
└── public_html/              # Serve Directory (includes assets & backend)
    ├── index.html            # Compiled SPA entrypoint
    ├── router.php            # Built-in dev server routing logic
    └── api/                  # PHP REST Backend
        ├── index.php         # Central Front-Controller Gateway
        ├── db.php            # Connection Singleton with prepared statement enforcement
        ├── config/           # Auto-environment setups
        ├── controllers/      # Route dispatch handlers
        ├── utils/            # Shared mailers & code generator helpers
        └── *.sql             # Database schema migrations
```

---

## 🛠️ Installation & Setup

### 1. Prerequisites
*   **PHP 8.0+**
*   **Node.js 18.0+**
*   **MySQL 8.0+** (or MariaDB 10.5+)

### 2. Environment Configuration
Copy the `.env.example` at the root folder to `.env`:
```bash
cp .env.example .env
```
Fill in your local database credentials in `.env`:
```ini
APP_ENV=local
DB_HOST=localhost
DB_PORT=3306
DB_NAME=bodhantra_os
DB_USER=root
DB_PASS=your_password_here
```

### 3. Database Migration
1. Open your database administrator console (e.g. phpMyAdmin / MySQL CLI).
2. Create a database named `bodhantra_os`.
3. Import the schema files inside `public_html/api/` in sequence:
   *   `schema.sql` (Foundational tables structure)
   *   `migration_phase1.sql` (Phase 1 OTP registrations additions)
   *   `migration_phase2.sql` (High-throughput logs & Custom Feedback tables)
   *   `migration_phase3.sql` (Invitations & session cache additions)

### 4. Install Dependencies
Run the package installations:
```bash
npm install
```

---

## 💻 Running the Application

### Local Sandbox Mode (Windows)
Double-click the **`run_app.bat`** script at the root directory. It will:
1. Locate your PHP installation.
2. Spin up the local PHP backend server on `http://localhost:8000`.
3. Start the Vite React development server on `http://localhost:5173`.
4. Open the browser to the application portal.

### Manual Launch
If you are on Linux/macOS or launching manually:
1. Start the PHP backend server pointing to the router:
   ```bash
   php -S localhost:8000 -t public_html public_html/router.php
   ```
2. Start the Vite React development server:
   ```bash
   npm run dev
   ```

---

## 🔒 Production Deployment Checklist (Hostinger)

When preparing to publish to production Hostinger webspaces:
1. Configure `vite.config.js` and build static production bundles:
   ```bash
   npm run build
   ```
   *Note: Built assets compile into `public_html/assets/`.*
2. Set `APP_ENV=production` inside `public_html/api/config/config.php` (The environment loader automatically handles this check via Hostinger server names).
3. Set your production database configuration arrays inside `public_html/api/config/config.php`.
4. Verify SPF, DKIM, and DMARC settings in your domain DNS registry for production email delivery.