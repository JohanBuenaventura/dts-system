✅ Completed
Backend (100% Done)
WhatDetailsProject initNode.js + Express, ES Modules, nodemonDatabaseMySQL via mysql2 pool, UTC timestampsdb.jsConnection pool with startup health checkserver.jsExpress app, CORS, global error handlerAuth ModuleRegister, Login, Get MePassword securitybcrypt with 12 salt roundsJWTToken issuance, verification, expiryprotect middlewareGuards all private routesauthorize middlewareRole-based access (Admin/Staff)Document ModuleCreate, List (role-filtered), Get by ID, Search by tracking codeTracking codeAuto-generated EDTS-YYYYMMDD-XXXX formatRouting ModuleForward, Receive, CompleteAudit TrailImmutable document_logs, full history endpointSQL Injection protection100% parameterized queries throughout

Frontend (100% Done)
WhatDetailsProject initReact + Vite + Tailwind CSS v3axios.jsBase URL, auto JWT header, 401 redirectAuthContextGlobal auth state, login/logout, localStorageProtectedRouteRedirects unauthenticated users to /loginNavbarActive links, user info, logout, mobile responsiveLogin PageJWT login, error handlingRegister PageRole + department selection, success redirectDashboard PageStat cards (total, in transit, received, completed), recent documentsDocuments PageFull table, search by title/tracking code, status filterCreate Document PageForm with type selector, auto dept from JWTDocument Detail PageDocument info, Forward, Receive, Complete actions, full Audit Trail timelineReact RouterAll routes defined, fallback redirect

Documentation & GitHub (Done)
FilePurposeREADME.mdFull project overview, API docs, roles, tech stackSETUP.mdStep by step clone and run guide for collaboratorsedts_db.sqlReady to run MySQL schema.env.exampleSafe template for environment variables.gitignoreExcludes node_modules, .env, dist

⚠️ Currently Unresolved
IssueStatusUnable to get absolute uri error on Login/Register pagesPossibly caused by moving into edts-system folder — partially investigated, not fully confirmed fixed

❌ Not Yet Built (Possible Enhancements)
These were not part of the original scope but could be added:
FeatureDescriptionAdmin user management pageView/manage all registered usersForgot passwordReset via email tokenEmail notificationsNotify department when document is forwarded to themDocument file attachmentUpload actual PDF/Word files per documentSearch by date rangeFilter documents by creation dateExport to PDF/CSVExport document list or audit trailDepartment-level dashboardStats per department for AdminPaginationFor large document listsDark modeUI theme toggle

🔌 Ports Summary
ServiceURLBackend APIhttp://localhost:5000Frontendhttp://localhost:5173phpMyAdminhttp://localhost/phpmyadmin