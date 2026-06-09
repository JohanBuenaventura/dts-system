import express    from 'express';
import cors       from 'cors';
import dotenv     from 'dotenv';
import { testConnection } from './config/db.js';
import authRoutes       from './routes/auth.routes.js';
import documentRoutes   from './routes/document.routes.js';
import routingRoutes    from './routes/routing.routes.js';
import adminRoutes      from './routes/admin.routes.js';
import attachmentRoutes from './routes/attachment.routes.js';
import deptRoutes       from './routes/dept.routes.js';
dotenv.config();

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin:      'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static('uploads'));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use('/api/auth',       authRoutes);
app.use('/api/documents',  documentRoutes);
app.use('/api/routing',    routingRoutes);
app.use('/api/admin',      adminRoutes);
app.use('/api/documents',  attachmentRoutes);
app.use('/api/dept',       deptRoutes);
// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  // Handle multer errors specifically
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: 'File too large. Max 10MB per file.' });
  }
  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({ success: false, message: 'Too many files. Max 5 files at once.' });
  }
  console.error('[UNHANDLED ERROR]', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

const start = async () => {
  await testConnection();
  app.listen(PORT, () => {
    console.log(`🚀  Server running on http://localhost:${PORT}`);
  });
};

start();