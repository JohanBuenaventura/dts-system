# 🚀 DTS — Setup Guide for Collaborators

Follow these steps **in order** after cloning the repository.

---

## ✅ Prerequisites

Make sure you have these installed before starting:

- [Node.js](https://nodejs.org/) — v18 or higher
- [XAMPP](https://www.apachefriends.org/) — for MySQL database
- [Git](https://git-scm.com/)
- [VS Code](https://code.visualstudio.com/) — recommended editor

---

## Step 1 — Clone the Repository

```bash
git clone https://github.com/JohanBuenaventura/dts-system.git
```

Then open the folder in VS Code:

```
File → Open Folder → select edts-system
```

---

## Step 2 — Database Setup

1. Open **XAMPP Control Panel**
2. Start **Apache** and **MySQL**
3. Open **phpMyAdmin** at `http://localhost/phpmyadmin`
4. On the left panel, click **New**
5. Name the database `edts_db` and click **Create**
6. Click on `edts_db` in the left panel
7. Click the **SQL** tab at the top
8. Open the file `edts_db.sql` from the cloned repo
9. Copy everything inside it and paste it into the SQL tab
10. Click **Go**

You should see all 3 tables created: `users`, `documents`, `document_logs`

---

## Step 3 — Backend Setup

Open a terminal in VS Code and run:

```bash
cd edts-backend
```

### 3.1 Install dependencies

```bash
npm install
```

### 3.2 Create your `.env` file

```bash
# Windows CMD
copy .env.example .env

# Mac/Linux
cp .env.example .env
```

### 3.3 Open the `.env` file and fill in your values

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=          ← leave blank if using default XAMPP MySQL
DB_NAME=edts_db
JWT_SECRET=any_long_random_string_you_make_up
JWT_EXPIRES_IN=8h
```

> ⚠️ Never share or push your `.env` file to GitHub.

### 3.4 Start the backend server

```bash
npm run dev
```

✅ You should see:
```
✅  MySQL connected successfully.
🚀  Server running on http://localhost:5000
```

Verify it works by opening: `http://localhost:5000/api/health`

You should see:
```json
{ "status": "OK", "timestamp": "..." }
```

---

## Step 4 — Frontend Setup

Open a **second terminal** in VS Code and run:

```bash
cd edts-frontend
```

### 4.1 Install dependencies

```bash
npm install
```

### 4.2 Start the frontend

```bash
npm run dev
```

✅ You should see:
```
  VITE ready in ... ms
  ➜  Local: http://localhost:5173/
```

Open your browser at: `http://localhost:5173`

---

## Step 5 — Create Your Account

1. Go to `http://localhost:5173/register`
2. Fill in your details
3. Select a **Role** (Admin or Staff)
4. Select your **Department**
5. Click **Create Account**
6. You will be redirected to login
7. Sign in with your credentials

---

## 🖥️ Running the App (Every Time)

You need **two terminals** running simultaneously:

| Terminal | Command | URL |
|----------|---------|-----|
| Terminal 1 (Backend) | `cd edts-backend && npm run dev` | `http://localhost:5000` |
| Terminal 2 (Frontend) | `cd edts-frontend && npm run dev` | `http://localhost:5173` |

Also make sure **XAMPP MySQL is running** before starting the backend.

---

## ❗ Common Issues & Fixes

### MySQL connection failed / Access denied
- Open `.env` and make sure `DB_PASSWORD=` is blank (default XAMPP has no password)
- Make sure MySQL is running in XAMPP Control Panel
- Make sure the database name in `.env` matches: `DB_NAME=edts_db`

### `Cannot use import statement outside a module`
- Open `edts-backend/package.json`
- Make sure it has `"type": "module"` in it

### Tailwind CSS not working / styles missing
- Make sure you are using Tailwind v3:
```bash
cd edts-frontend
npm uninstall tailwindcss
npm install -D tailwindcss@3 postcss autoprefixer
```

### Frontend shows blank page or router error
- Make sure you run `npm run dev` from inside the `edts-frontend` folder
- Check that `vite.config.js` does NOT have `base: ''` (empty string)

### `node_modules not found` or install errors
- Delete the `node_modules` folder and reinstall:
```bash
# Windows CMD
rmdir /s /q node_modules
npm install
```

---

## 📁 Project Structure (Quick Reference)

```
edts-system/
├── edts-backend/          ← Node.js + Express API
│   ├── src/
│   │   ├── config/        ← Database connection
│   │   ├── controllers/   ← Business logic
│   │   ├── middleware/    ← JWT auth guard
│   │   └── routes/        ← API endpoints
│   ├── .env               ← Your local config (not on GitHub)
│   ├── .env.example       ← Template for .env
│   └── package.json
│
├── edts-frontend/         ← React + Vite + Tailwind
│   ├── src/
│   │   ├── api/           ← Axios instance
│   │   ├── components/    ← Navbar, ProtectedRoute
│   │   ├── context/       ← Auth state (AuthContext)
│   │   └── pages/         ← All page components
│   └── package.json
│
├── edts_db.sql            ← Run this in phpMyAdmin
└── README.md              ← Full project documentation
```

---

## 🏢 Available Departments

When registering, choose from:
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

## 🔐 Roles

| Role  | Access |
|-------|--------|
| Admin | Sees all documents across all departments |
| Staff | Sees only documents in their own department |
