import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import stateRoutes from './routes/stateRoutes.js';
import deliverablesRoutes from './routes/deliverablesRoutes.js';
import projectsRoutes from './routes/projectsRoutes.js';
import ideasRoutes from './routes/ideasRoutes.js';
import responsibilitiesRoutes from './routes/responsibilitiesRoutes.js';
import logbookRoutes from './routes/logbookRoutes.js';
import meetingsRoutes from './routes/meetingsRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import authRoutes from './routes/authRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

// Middlewares
app.use(cors({
  origin: '*', // Permite acceso desde cualquier origen (local o red)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging ligero de peticiones
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (!req.url.startsWith('/dist') && !req.url.startsWith('/assets')) {
      console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Rutas Modulares API
app.use('/api', stateRoutes);
app.use('/api/deliverables', deliverablesRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/ideas', ideasRoutes);
app.use('/api/responsibilities', responsibilitiesRoutes);
app.use('/api/logbook', logbookRoutes);
app.use('/api/meetings', meetingsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/auth', authRoutes);

// Servir frontend compilado en producción si existe la carpeta 'dist'
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.url.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Iniciar Servidor
app.listen(PORT, HOST, () => {
  console.log(`====================================================`);
  console.log(`🚀 SERVIDOR CONTROL DE GESTIÓN (API MODULAR ACTIVA)`);
  console.log(`📡 Local:           http://localhost:${PORT}`);
  console.log(`🌐 Red Local / Web: http://${HOST}:${PORT}`);
  console.log(`💾 Base de datos:   server/data/database.json`);
  console.log(`====================================================`);
});
