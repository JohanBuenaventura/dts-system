# 📄 EDTS — Enterprise Document Tracking System

A full-stack web application for tracking documents across departments in an organization.
Built with Node.js, Express, MySQL, and React (Vite + Tailwind CSS).

---

## 🧱 Tech Stack

| Layer     | Technology                              |
|-----------|-----------------------------------------|
| Backend   | Node.js, Express.js                     |
| Database  | MySQL (via `mysql2` with Promise API)   |
| Frontend  | React (Vite), Tailwind CSS v3           |
| Auth      | JWT (`jsonwebtoken`), `bcrypt`          |
| Charts    | Recharts                                |
| Exports   | jsPDF, jsPDF-AutoTable, PapaParse       |
| File Uploads | Multer                                |
| Security  | Parameterized SQL queries, role guards, activity logging |

---

## 📁 Project Structure

```
edts-system/
├── edts-backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js                   # MySQL connection pool
│   │   │   └── multer.js               # File upload config
│   │   ├── controllers/
│   │   │   ├── auth.controller.js      # Register, Login, Me
│   │   │   ├── document.controller.js  # CRUD + pagination
│   │   │   ├── routing.controller.js   # Forward, Receive, Complete, History
│   │   │   ├── admin.controller.js     # Users, Departments, Logs, Stats
│   │   │   └── attachment.controller.js
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js      # JWT protect + role guards
│   │   │   └── logger.middleware.js    # System activity logging
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── document.routes.js
│   │   │   ├── routing.routes.js
│   │   │   ├── admin.routes.js         # Super Admin only
│   │   │   ├── dept.routes.js          # Admin — own department mgmt
│   │   │   └── attachment.routes.js
│   │   └── server.js                   # Express entry point
│   ├── uploads/documents/              # Uploaded file storage
│   ├── .env.example
│   └── package.json
│
└── edts-frontend/
    ├── src/
    │   ├── api/
    │   │   └── axios.js                # Axios instance + interceptors
    │   ├── components/
    │   │   ├── Navbar.jsx
    │   │   └── ProtectedRoute.jsx
    │   ├── context/
    │   │   └── AuthContext.jsx         # Global auth state
    │   ├── utils/
    │   │   └── exportUtils.js          # CSV/PDF export helpers
    │   ├── pages/
    │   │   ├── LoginPage.jsx
    │   │   ├── RegisterPage.jsx
    │   │   ├── DashboardPage.jsx
    │   │   ├── DocumentsPage.jsx
    │   │   ├── CreateDocumentPage.jsx
    │   │   ├── DocumentDetailPage.jsx
    │   │   ├── AnalyticsPage.jsx        # Admin + Super Admin
    │   │   ├── MyDepartmentPage.jsx     # Admin only
    │   │   └── AdminPage.jsx            # Super Admin only
    │   ├── App.jsx
    │   └── main.jsx
    ├── tailwind.config.js
    ├── postcss.config.js
    └── package.json
```

---

## ⚙️ Prerequisites

Make sure you have the following installed before proceeding:

- [Node.js](https://nodejs.org/) v18 or higher
- [XAMPP](https://www.apachefriends.org/) (for MySQL) or any MySQL server
- [Git](https://git-scm.com/)
- A code editor (e.g. [VS Code](https://code.visualstudio.com/))

---

## 🗄️ Step 1 — Database Setup

1. Start **XAMPP** and make sure **MySQL** is running.
2. Open **phpMyAdmin** at `http://localhost/phpmyadmin`.
3. Click **New** on the left panel, name the database `edts_db`, and click **Create**.
4. Click on `edts_db`, then click the **SQL** tab.
5. Paste and run the following SQL **in order**:

### 1.1 — Core Tables

```sql
CREATE DATABASE IF NOT EXISTS edts_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE edts_db;

-- Users table
CREATE TABLE users (
    id            INT UNSIGNED          NOT NULL AUTO_INCREMENT,
    full_name     VARCHAR(100)          NOT NULL,
    email         VARCHAR(150)          NOT NULL UNIQUE,
    password_hash VARCHAR(255)          NOT NULL,
    role          ENUM('Super Admin','Admin','Staff') NOT NULL DEFAULT 'Staff',
    department    VARCHAR(100)          NOT NULL,
    is_active     TINYINT(1)            NOT NULL DEFAULT 1,
    created_at    DATETIME              NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB;

-- Documents table
CREATE TABLE documents (
    id                    INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    tracking_code         VARCHAR(20)   NOT NULL UNIQUE,
    title                 VARCHAR(200)  NOT NULL,
    description           TEXT,
    type                  VARCHAR(100)  NOT NULL,
    status                ENUM('Created','In Transit','Received','Completed')
                                        NOT NULL DEFAULT 'Created',
    current_location_dept VARCHAR(100)  NOT NULL,
    created_by            INT UNSIGNED  NOT NULL,
    created_at            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_doc_creator FOREIGN KEY (created_by)
        REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Document logs (immutable audit trail)
CREATE TABLE document_logs (
    id                   INT UNSIGNED NOT NULL AUTO_INCREMENT,
    document_id          INT UNSIGNED NOT NULL,
    action_taken         VARCHAR(255) NOT NULL,
    from_department      VARCHAR(100) NULL,
    to_department        VARCHAR(100) NULL,
    performed_by_user_id INT UNSIGNED NOT NULL,
    timestamp            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_log_document FOREIGN KEY (document_id)
        REFERENCES documents(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_log_user FOREIGN KEY (performed_by_user_id)
        REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;
```

### 1.2 — Departments Table

```sql
CREATE TABLE departments (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(100) NOT NULL UNIQUE,
  is_archived TINYINT(1)   NOT NULL DEFAULT 0,
  archived_at DATETIME     NULL,
  archived_by INT UNSIGNED NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_dept_archived_by FOREIGN KEY (archived_by)
    REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Seed default departments
INSERT INTO departments (name) VALUES
  ('Registrar'),
  ('Finance'),
  ('HR'),
  ('IT'),
  ('Academic Affairs'),
  ('Student Affairs'),
  ('Research'),
  ('Procurement'),
  ('Administration'),
  ('System Administrator');
```

### 1.3 — Document Attachments Table

```sql
CREATE TABLE document_attachments (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  document_id INT UNSIGNED  NOT NULL,
  file_name   VARCHAR(255)  NOT NULL,
  file_path   VARCHAR(500)  NOT NULL,
  file_type   VARCHAR(100)  NOT NULL,
  file_size   INT UNSIGNED  NOT NULL,
  uploaded_by INT UNSIGNED  NOT NULL,
  uploaded_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_attach_document FOREIGN KEY (document_id)
    REFERENCES documents(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_attach_user FOREIGN KEY (uploaded_by)
    REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;
```

### 1.4 — System Logs Table

```sql
CREATE TABLE system_logs (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED  NULL,
  action      VARCHAR(100)  NOT NULL,
  description TEXT          NOT NULL,
  ip_address  VARCHAR(45)   NULL,
  status      ENUM('success','warning','error') NOT NULL DEFAULT 'success',
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_syslog_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;
```

### 1.5 — Seed the Super Admin Account

```sql
-- Password: superadmin123 (already bcrypt hashed below)
INSERT INTO users (full_name, email, password_hash, role, department, is_active)
VALUES (
  'Super Administrator',
  'superadmin@gmail.com',
  '$2b$12$GX6S3sMqMrzgHlAVKSvFdO9tvSCCJnCqauLDiRBBbHMUbPMkZJbLi',
  'Super Admin',
  'System Administrator',
  1
);
```

> ⚠️ **Important:** Change this password immediately after first login, or generate a fresh hash using:
> ```bash
> node -e "const bcrypt=require('bcrypt'); bcrypt.hash('your_new_password', 12).then(console.log)"
> ```

---

## 🔧 Step 2 — Backend Setup

### 2.1 Clone the repository

```bash
git clone https://github.com/JohanBuenaventura/edts-system.git
cd edts-system/edts-backend
```

### 2.2 Install dependencies

```bash
npm install
```

This installs: `express`, `mysql2`, `bcrypt`, `jsonwebtoken`, `dotenv`, `cors`, `multer`.

### 2.3 Create your `.env` file

```bash
# Windows CMD
copy .env.example .env

# Mac/Linux
cp .env.example .env
```

Then open `.env` and fill in your values:

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=edts_db
JWT_SECRET=replace_with_a_long_random_secret_string
JWT_EXPIRES_IN=8h
```

> **Note:** If you are using default XAMPP MySQL, `DB_PASSWORD` is blank.

### 2.4 Create the uploads folder

```bash
# Windows CMD
mkdir uploads\documents
type nul > uploads\documents\.gitkeep

# Mac/Linux
mkdir -p uploads/documents
touch uploads/documents/.gitkeep
```

### 2.5 Start the backend server

```bash
npm run dev
```

You should see:

```
✅  MySQL connected successfully.
🚀  Server running on http://localhost:5000
```

Verify with: `http://localhost:5000/api/health`

---

## 🎨 Step 3 — Frontend Setup

### 3.1 Navigate to the frontend folder

```bash
cd ../edts-frontend
```

### 3.2 Install dependencies

```bash
npm install
```

This installs: `react`, `react-router-dom`, `axios`, `recharts`, `jspdf`, `jspdf-autotable`, `papaparse`, plus Tailwind v3.

### 3.3 Start the frontend

```bash
npm run dev
```

Open your browser at: `http://localhost:5173`

---

## 👤 Step 4 — Logging In

### Option A — Use the Seeded Super Admin

```
Email:    superadmin@edts.com
Password: superadmin123
```

From here, the Super Admin can create Admin accounts for each department via **User Management**.

### Option B — Self-Register as Staff

1. Go to `http://localhost:5173/register`
2. Fill in your details and select a **Department**
3. All self-registrations are created as **Staff** — Admin/Super Admin accounts can only be created by a Super Admin
4. Log in with your credentials

---

## 🚀 API Endpoints

### Auth
| Method | Endpoint                | Description                          | Auth Required |
|--------|-------------------------|---------------------------------------|---------------|
| POST   | `/api/auth/register`    | Register a new Staff account          | No            |
| POST   | `/api/auth/login`       | Login and receive JWT                 | No            |
| GET    | `/api/auth/me`          | Get current user profile              | Yes           |

### Documents
| Method | Endpoint                    | Description                                  | Auth Required |
|--------|-----------------------------|-----------------------------------------------|---------------|
| GET    | `/api/documents`            | List documents (paginated, filterable, role-scoped) | Yes     |
| POST   | `/api/documents`            | Create a new document                         | Yes           |
| GET    | `/api/documents/:id`        | Get a single document                         | Yes           |
| GET    | `/api/documents/search`     | Search by tracking code                       | Yes           |

> `GET /api/documents` supports query params: `page`, `limit`, `search`, `status`, `type`

### Routing & Audit Trail
| Method | Endpoint                        | Description               | Auth Required |
|--------|---------------------------------|---------------------------|---------------|
| POST   | `/api/routing/:id/forward`      | Forward to a department   | Yes           |
| POST   | `/api/routing/:id/receive`      | Receive a document        | Yes           |
| POST   | `/api/routing/:id/complete`     | Mark as completed         | Yes           |
| GET    | `/api/routing/:id/history`      | View full audit trail     | Yes           |

### Attachments
| Method | Endpoint                                  | Description                       | Auth Required |
|--------|--------------------------------------------|------------------------------------|---------------|
| POST   | `/api/documents/:id/attachments`           | Upload up to 5 files (max 10MB each) | Yes        |
| GET    | `/api/documents/:id/attachments`           | List attachments for a document    | Yes           |
| GET    | `/api/documents/attachments/:attachmentId` | View/download a file               | Yes           |
| DELETE | `/api/documents/attachments/:attachmentId` | Delete a file (own or Super Admin) | Yes           |

### Department Self-Management (Admin)
| Method | Endpoint                                       | Description                       | Auth Required |
|--------|--------------------------------------------------|------------------------------------|------------|
| GET    | `/api/dept/my-department/users`                 | List Staff in own department      | Admin+        |
| POST   | `/api/dept/my-department/users`                 | Create Staff in own department    | Admin+        |
| PUT    | `/api/dept/my-department/users/:id`             | Edit Staff in own department      | Admin+        |
| PATCH  | `/api/dept/my-department/users/:id/password`    | Reset Staff password              | Admin+        |
| PATCH  | `/api/dept/my-department/users/:id/toggle`      | Activate/Deactivate Staff         | Admin+        |

### System Administration (Super Admin Only)
| Method | Endpoint                              | Description                              |
|--------|------------------------------------------|--------------------------------------------|
| GET    | `/api/admin/users`                    | List all users                           |
| POST   | `/api/admin/users`                    | Create Admin or Staff account            |
| PUT    | `/api/admin/users/:id`                | Edit any user (except Super Admin)       |
| PATCH  | `/api/admin/users/:id/password`       | Reset any user's password                |
| PATCH  | `/api/admin/users/:id/toggle`         | Activate/Deactivate any user             |
| DELETE | `/api/admin/users/:id`                | Delete user (soft-deletes if has docs)   |
| GET    | `/api/admin/departments`              | List departments (with user counts)      |
| POST   | `/api/admin/departments`              | Create a new department                  |
| PUT    | `/api/admin/departments/:id`          | Rename department (cascades to users/docs) |
| PATCH  | `/api/admin/departments/:id/archive`  | Archive or restore a department          |
| DELETE | `/api/admin/departments/:id`          | Permanently delete (archived only)       |
| GET    | `/api/admin/logs`                     | View system activity logs (paginated, filterable) |
| DELETE | `/api/admin/logs/clear`               | Clear logs older than N days             |
| GET    | `/api/admin/stats`                    | System-wide KPI statistics               |

---

## 🔐 Roles & Permissions

| Feature                              | Staff | Admin | Super Admin |
|---------------------------------------|:---:|:---:|:---:|
| View documents in own department      | ✅  | ✅  | ✅  |
| View all documents (any department)   | ❌  | ✅  | ✅  |
| Create documents                      | ✅  | ✅  | ✅  |
| Forward / Receive / Complete documents| ✅  | ✅  | ✅  |
| Upload / view attachments             | ✅  | ✅  | ✅  |
| View Analytics page                   | ❌  | ✅ (own dept) | ✅ (system-wide) |
| Manage Staff in own department        | ❌  | ✅  | ✅  |
| Manage Admin accounts                 | ❌  | ❌  | ✅  |
| Manage departments (add/rename/archive) | ❌ | ❌  | ✅  |
| View system activity logs             | ❌  | ❌  | ✅  |

> **Note:** Self-registration via `/register` always creates a **Staff** account. Admin and Super Admin accounts can only be created by a Super Admin via User Management.

---

## 📊 Analytics Page (`/analytics`)

Available to **Admin** and **Super Admin** only — hidden from Staff and from the navbar entirely.

| Chart | Admin (own dept) | Super Admin (system-wide) |
|---|:---:|:---:|
| Document Status Breakdown (Pie) | ✅ | ✅ |
| Documents by Type (Bar) | ✅ | ✅ |
| Monthly Document Volume (Line) | — | ✅ |
| Documents per Department (Bar) | — | ✅ |
| Active Users / Departments stat cards | — | ✅ |

Charts that aren't applicable to a role are simply not rendered — no locked or "unavailable" placeholders.

---

## 📤 Export & Pagination

- Documents list (`/documents`) supports server-side pagination, search, and filtering by status/type.
- Export the current filtered list to **CSV** or **PDF** (landscape table report).
- Each document's Audit Trail can be exported individually to **CSV** or **PDF**.

---

## 🏢 Department Management

- Departments are stored in the database (not hardcoded) and managed by the Super Admin.
- Departments can be **archived** (soft-disabled) instead of deleted — preserves historical data integrity.
- A department can only be archived if it has no active users.
- A department can only be permanently deleted if it is already archived and has no active users.
- Renaming a department cascades the new name to all affected users and documents.

---

## 📋 System Activity Logs

Super Admin can view a full audit log of system-level events, including:

- Login successes, failures, and blocked (deactivated account) attempts
- User registration, creation, edits, password resets, activation/deactivation, deletion
- Department creation, renaming, archiving, restoring, deletion
- Each entry records: status (success/warning/error), action type, description, performing user, IP address, and timestamp

Logs can be filtered by status and action, and old logs (30+ days) can be cleared.

---

## 🏢 Available Departments (Default Seed)

- Registrar
- Finance
- HR
- IT
- Academic Affairs
- Student Affairs
- Research
- Procurement
- Administration
- System Administrator *(reserved for Super Admin)*

> Super Admin can add, rename, or archive departments at any time via `/admin`.

---

## ❗ Common Issues

### `Cannot use import statement outside a module`
Add `"type": "module"` to `edts-backend/package.json`.

### `Access denied for user 'root'@'localhost'`
Your MySQL password in `.env` is wrong. For default XAMPP, leave `DB_PASSWORD=` blank.

### `npx tailwindcss init -p` fails
You have Tailwind v4. Install v3 instead:
```bash
npm uninstall tailwindcss
npm install -D tailwindcss@3 postcss autoprefixer
npx tailwindcss init -p
```

### Frontend shows `Cannot GET /`
This is normal for the backend root URL. Use `http://localhost:5000/api/health` to verify the backend is running.

### File upload fails with "Invalid file type"
Only PDF, Word (.doc/.docx), Excel (.xls/.xlsx), JPG, PNG, and GIF are accepted, max 10MB per file, up to 5 files at once.

### `npm install multer` shows vulnerability warnings
Run `npm audit fix` (not `--force`). Safe for this project.

---

## 📝 .gitignore

**edts-backend/.gitignore**
```
node_modules/
.env
uploads/*
!uploads/documents/.gitkeep
```

**edts-frontend/.gitignore**
```
node_modules/
dist/
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "Add your feature"`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 👨‍💻 Built With

- [Express.js](https://expressjs.com/)
- [MySQL2](https://github.com/sidorares/node-mysql2)
- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [JSON Web Token](https://jwt.io/)
- [bcrypt](https://github.com/kelektiv/node.bcrypt.js)
- [Axios](https://axios-http.com/)
- [React Router](https://reactrouter.com/)
- [Recharts](https://recharts.org/)
- [jsPDF](https://github.com/parallax/jsPDF) + [jsPDF-AutoTable](https://github.com/simonbengtsson/jsPDF-AutoTable)
- [PapaParse](https://www.papaparse.com/)
- [Multer](https://github.com/expressjs/multer)