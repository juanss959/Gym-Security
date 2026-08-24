// ============================================================================
//  Middleware de autenticación y autorización.
//
//  SEGURIDAD:
//   * El token JWT viaja en una cookie httpOnly => JavaScript del navegador
//     NO puede leerlo, mitigando robo de token por XSS.
//   * cookie 'secure' + 'sameSite' en producción => protección CSRF/HTTPS.
//   * requireRole() aplica control de acceso basado en roles (RBAC).
// ============================================================================
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_inseguro_cambiar';
const COOKIE_NAME = 'gym_token';

function firmarToken(usuario) {
  // Solo metemos datos NO sensibles en el token.
  return jwt.sign(
    { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol },
    JWT_SECRET,
    { expiresIn: '2h' }
  );
}

function opcionesCookie() {
  const prod = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: prod,                 // solo se envía por HTTPS en producción
    sameSite: prod ? 'strict' : 'lax',
    maxAge: 2 * 60 * 60 * 1000,   // 2 horas
    path: '/',
  };
}

// Exige que haya un usuario autenticado válido.
function requireAuth(req, res, next) {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: 'No autenticado. Inicia sesión.' });
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Sesión inválida o expirada.' });
  }
}

// Exige que el usuario tenga uno de los roles indicados.
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'No autenticado.' });
    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({ error: 'No tienes permisos para esta acción.' });
    }
    return next();
  };
}

module.exports = {
  COOKIE_NAME,
  firmarToken,
  opcionesCookie,
  requireAuth,
  requireRole,
};
