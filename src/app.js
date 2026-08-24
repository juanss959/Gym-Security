// ============================================================================
//  Aplicación Express.  Configura seguridad, rutas y archivos estáticos.
// ============================================================================
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/auth.routes');
const miembrosRoutes = require('./routes/miembros.routes');

const app = express();

// Detrás de un proxy (Vercel) para que req.ip y las cookies 'secure' funcionen.
app.set('trust proxy', 1);

// Límite de tamaño del body => mitiga abuso.
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

// Cabeceras de seguridad básicas (sin dependencias extra).
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');                // anti-clickjacking
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; script-src 'self'"
  );
  next();
});

// API
app.use('/api/auth', authRoutes);
app.use('/api/miembros', miembrosRoutes);

// Healthcheck
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Archivos estáticos (frontend)
app.use(express.static(path.join(__dirname, '..', 'public')));

// Fallback 404 para rutas de API
app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));

module.exports = app;
