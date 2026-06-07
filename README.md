# 📄 DTS — Document Tracking System

A full-stack web application for tracking documents across departments.
Built with Node.js, Express, MySQL, and React (Vite + Tailwind CSS).

---

## 🧱 Tech Stack

| Layer     | Technology                              |
|-----------|-----------------------------------------|
| Backend   | Node.js, Express.js                     |
| Database  | MySQL (via `mysql2` with Promise API)   |
| Frontend  | React (Vite), Tailwind CSS v3           |
| Auth      | JWT (`jsonwebtoken`), `bcrypt`          |
| Security  | Parameterized SQL queries, role guards  |

---

## 📁 Project Structure

```
edts-system/
├── edts-backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js               # MySQL connection pool
│   │   ├── controllers/
│   │   │   ├── auth.controller.js  # Register, Login, Me
│   │   │   ├── document.controller.js
│   │   │   └── routing.controller.js
│   │   ├── middleware/
│   │   │   └── auth.middleware.js  # JWT protect + role authorize
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── document.routes.js
│   │   │   └── routing.routes.js
│   │   └── server.js               # Express entry point
│   ├── .env.example
│   └── package.json
│
└── edts-frontend/
    ├── src/
    │   ├── api/
    │   │   └── axios.js            # Axios instance + interceptors
    │   ├── components/
    │   │   ├── Navbar.jsx
    │   │   └── ProtectedRoute.jsx
    │   ├── context/
    │   │   └── AuthContext.jsx     # Global auth state
    │   ├── pages/
    │   │   ├── LoginPage.jsx
    │   │   ├── RegisterPage.jsx
    │   │   ├── DashboardPage.jsx
    │   │   ├── DocumentsPage.jsx
    │   │   ├── CreateDocumentPage.jsx
    │   │   └── DocumentDetailPage.jsx
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
5. Paste and run the following SQL:

```sql
-- Create database
CREATE DATABASE IF NOT EXISTS edts_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE edts_db;

-- Users table
CREATE TABLE users (
    id            INT UNSIGNED          NOT NULL AUTO_INCREMENT,
    full_name     VARCHAR(100)          NOT NULL,
    email         VARCHAR(150)          NOT NULL UNIQUE,
    password_hash VARCHAR(255)          NOT NULL,
    role          ENUM('Admin','Staff') NOT NULL DEFAULT 'Staff',
    department    VARCHAR(100)          NOT NULL,
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

### 2.3 Create your `.env` file

Copy the example file:

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
> If your MySQL has a password set, enter it there.

### 2.4 Start the backend server

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

### 3.3 Start the frontend

```bash
npm run dev
```

Open your browser at: `http://localhost:5173`

---

## 👤 Step 4 — Create Your First Account

1. Go to `http://localhost:5173/register`
2. Fill in your details, select a **Role** and **Department**
3. Click **Create Account**
4. You will be redirected to the login page
5. Log in with your credentials

---

## 🚀 API Endpoints

### Auth
| Method | Endpoint                | Description              | Auth Required |
|--------|-------------------------|--------------------------|---------------|
| POST   | `/api/auth/register`    | Register a new user      | No            |
| POST   | `/api/auth/login`       | Login and receive JWT    | No            |
| GET    | `/api/auth/me`          | Get current user profile | Yes           |

### Documents
| Method | Endpoint                    | Description                        | Auth Required |
|--------|-----------------------------|------------------------------------|---------------|
| GET    | `/api/documents`            | List all documents (role-filtered) | Yes           |
| POST   | `/api/documents`            | Create a new document              | Yes           |
| GET    | `/api/documents/:id`        | Get a single document              | Yes           |
| GET    | `/api/documents/search`     | Search by tracking code            | Yes           |

### Routing & History
| Method | Endpoint                        | Description               | Auth Required |
|--------|---------------------------------|---------------------------|---------------|
| POST   | `/api/routing/:id/forward`      | Forward to a department   | Yes           |
| POST   | `/api/routing/:id/receive`      | Receive a document        | Yes           |
| POST   | `/api/routing/:id/complete`     | Mark as completed         | Yes           |
| GET    | `/api/routing/:id/history`      | View full audit trail     | Yes           |

---

## 🔐 Roles & Permissions

| Feature                    | Admin | Staff         |
|----------------------------|-------|---------------|
| View all documents         | ✅    | ❌ (own dept only) |
| Create documents           | ✅    | ✅            |
| Forward documents          | ✅    | ✅            |
| Receive documents          | ✅    | ✅            |
| Mark as completed          | ✅    | ✅            |

---

## 🏢 Available Departments

- Registrar
- Finance
- HR
- IT
- Academic Affairs
- Student Affairs
- Research
- Procurement
- Administration

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

---

## 📝 .gitignore

Make sure both projects have a `.gitignore` to avoid pushing sensitive files:

**edts-backend/.gitignore**
```
node_modules/
.env
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
