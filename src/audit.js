// ============================================================================
//  Utilidad de auditoría: registra acciones sensibles en la tabla 'auditoria'.
//  No interrumpe la petición si falla el registro (best-effort).
// ============================================================================
const db = require('./db');

async function registrar({ usuarioId = null, accion, entidad = null, entidadId = null, detalle = null, ip = null }) {
  try {
    await db.query(
      `INSERT INTO auditoria (usuario_id, accion, entidad, entidad_id, detalle, ip)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [usuarioId, accion, entidad, entidadId, detalle, ip]
    );
  } catch (err) {
    console.error('[audit] No se pudo registrar la auditoría:', err.message);
  }
}

module.exports = { registrar };
