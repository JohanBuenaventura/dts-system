// src/server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection } from './config/db.js';
import authRoutes from './routes/auth.routes.js';

dotenv.config();

const app  = express();
const PORT = process.env.PORT || 5000;

// ─── Global Middleware ───────────────────────────────────────────────────────

app.use(cors({
  origin:      'http://localhost:5173', // Vite dev server default
  credentials: true,
}));

app.use(express.json());              // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse form data

// ─── Health Check ────────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ─── Route Mounting (stubs — filled in Phase 2 & 3) ─────────────────────────
import documentRoutes from './routes/document.routes.js';
import routingRoutes  from './routes/routing.routes.js';
// import historyRoutes  from './routes/history.routes.js';

app.use('/api/auth',      authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/routing',   routingRoutes);
// app.use('/api/history',   historyRoutes);

// ─── Global Error Handler ────────────────────────────────────────────────────

app.use((err, _req, res, _next) => {
  console.error('[UNHANDLED ERROR]', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// ─── Boot ────────────────────────────────────────────────────────────────────

const start = async () => {
  await testConnection();           // Verify DB before accepting requests
  app.listen(PORT, () => {
    console.log(`🚀  Server running on http://localhost:${PORT}`);
  });
};

start();