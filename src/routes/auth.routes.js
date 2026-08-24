// ============================================================================
//  Rutas de autenticación: registro, login, logout y "quién soy".
//
//  SEGURIDAD:
//   * Contraseñas verificadas con bcrypt.compare (nunca se comparan en texto).
//   * Rate limiting en /login => mitiga ataques de fuerza bruta.
//   * Mensajes de error genéricos => no revelan si el email existe o no.
//   * Registro de auditoría de LOGIN, LOGIN_FAIL y LOGOUT.
// ============================================================================
const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const audit = require('../audit');
const { firmarToken, opcionesCookie, requireAuth, COOKIE_NAME } = require('../middleware/auth');

const router = express.Router();

// Máximo 8 intentos de login por IP cada 10 minutos.
const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Espera unos minutos e intenta de nuevo.' },
});

function emailValido(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 150;
}

// NOTA DE SEGURIDAD: No existe registro publico de usuarios. El sistema es de
// uso interno y solo el administrador (o el DBA) crea cuentas del personal
// directamente en la base de datos. Esto reduce la superficie de ataque:
// nadie externo puede crearse una cuenta para acceder al sistema.

// -------------------- LOGIN --------------------
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!emailValido(email) || !password) {
      return res.status(400).json({ error: 'Credenciales inválidas.' });
    }

    const { rows } = await db.query(
      `SELECT id, nombre, email, password_hash, rol, activo
       FROM usuarios WHERE email = $1`,
      [email.toLowerCase()]
    );
    const usuario = rows[0];

    // Mismo mensaje tanto si el email no existe como si la clave es incorrecta.
    const passwordOk = usuario ? await bcrypt.compare(password, usuario.password_hash) : false;

    if (!usuario || !usuario.activo || !passwordOk) {
      await audit.registrar({ usuarioId: usuario ? usuario.id : null, accion: 'LOGIN_FAIL', detalle: email, ip: req.ip });
      return res.status(401).json({ error: 'Email o contraseña incorrectos.' });
    }

    const token = firmarToken(usuario);
    res.cookie(COOKIE_NAME, token, opcionesCookie());
    await audit.registrar({ usuarioId: usuario.id, accion: 'LOGIN', ip: req.ip });

    return res.json({
      mensaje: 'Bienvenido',
      usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol },
    });
  } catch (err) {
    console.error('[login]', err.message);
    return res.status(500).json({ error: 'Error al iniciar sesión.' });
  }
});

// -------------------- LOGOUT --------------------
router.post('/logout', requireAuth, async (req, res) => {
  res.clearCookie(COOKIE_NAME, { path: '/' });
  await audit.registrar({ usuarioId: req.user.id, accion: 'LOGOUT', ip: req.ip });
  return res.json({ mensaje: 'Sesión cerrada.' });
});

// -------------------- QUIÉN SOY --------------------
router.get('/me', requireAuth, (req, res) => {
  return res.json({ usuario: req.user });
});

module.exports = router;
