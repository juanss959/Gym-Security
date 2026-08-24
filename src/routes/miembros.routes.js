// ============================================================================
//  CRUD de MIEMBROS del gimnasio.  (Create, Read, Update, Delete)
//
//  SEGURIDAD:
//   * Todas las rutas exigen autenticación (requireAuth).
//   * TODAS las consultas son parametrizadas ($1, $2...) => anti-inyección SQL.
//   * Validación de entrada en el servidor (no confiamos en el cliente).
//   * DELETE restringido al rol 'admin' (RBAC).
//   * Cada cambio queda registrado en auditoría.
// ============================================================================
const express = require('express');
const db = require('../db');
const audit = require('../audit');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

const TIPOS = ['diaria', 'mensual', 'trimestral', 'anual'];

// Valida y normaliza el cuerpo de un miembro. Devuelve {datos} o {error}.
function validarMiembro(body, { parcial = false } = {}) {
  const d = {};
  const req = (v) => v !== undefined && v !== null && String(v).trim() !== '';

  if (!parcial || body.nombre !== undefined) {
    if (!req(body.nombre) || String(body.nombre).length > 100)
      return { error: 'Nombre obligatorio (máx 100 caracteres).' };
    d.nombre = String(body.nombre).trim();
  }
  if (!parcial || body.apellido !== undefined) {
    if (!req(body.apellido) || String(body.apellido).length > 100)
      return { error: 'Apellido obligatorio (máx 100 caracteres).' };
    d.apellido = String(body.apellido).trim();
  }
  if (!parcial || body.cedula !== undefined) {
    if (!req(body.cedula) || !/^[0-9A-Za-z-]{5,20}$/.test(String(body.cedula).trim()))
      return { error: 'Cédula inválida (5 a 20 caracteres alfanuméricos).' };
    d.cedula = String(body.cedula).trim();
  }
  if (body.telefono !== undefined) {
    if (body.telefono && !/^[0-9+\-\s()]{6,20}$/.test(String(body.telefono).trim()))
      return { error: 'Teléfono inválido.' };
    d.telefono = body.telefono ? String(body.telefono).trim() : null;
  }
  if (body.email !== undefined) {
    if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.email).trim()))
      return { error: 'Email inválido.' };
    d.email = body.email ? String(body.email).trim().toLowerCase() : null;
  }
  if (body.fecha_nacimiento !== undefined) {
    d.fecha_nacimiento = body.fecha_nacimiento || null;
  }
  if (!parcial || body.tipo_membresia !== undefined) {
    const t = body.tipo_membresia || 'mensual';
    if (!TIPOS.includes(t)) return { error: 'Tipo de membresía inválido.' };
    d.tipo_membresia = t;
  }
  if (body.fecha_inicio !== undefined) d.fecha_inicio = body.fecha_inicio || null;
  if (body.fecha_fin !== undefined) d.fecha_fin = body.fecha_fin || null;
  if (body.activo !== undefined) d.activo = !!body.activo;

  return { datos: d };
}

// Todas las rutas requieren estar logueado.
router.use(requireAuth);

// -------------------- LISTAR / BUSCAR (READ) --------------------
router.get('/', async (req, res) => {
  try {
    const { q, activo } = req.query;
    const params = [];
    const cond = [];

    if (q) {
      params.push(`%${q}%`);
      cond.push(`(nombre ILIKE $${params.length} OR apellido ILIKE $${params.length} OR cedula ILIKE $${params.length})`);
    }
    if (activo === 'true' || activo === 'false') {
      params.push(activo === 'true');
      cond.push(`activo = $${params.length}`);
    }

    const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
    const { rows } = await db.query(
      `SELECT id, nombre, apellido, cedula, telefono, email, fecha_nacimiento,
              tipo_membresia, fecha_inicio, fecha_fin, activo, creado_en
       FROM miembros ${where}
       ORDER BY apellido, nombre
       LIMIT 500`,
      params
    );
    return res.json({ total: rows.length, miembros: rows });
  } catch (err) {
    console.error('[miembros:list]', err.message);
    return res.status(500).json({ error: 'Error al listar miembros.' });
  }
});

// -------------------- OBTENER UNO (READ) --------------------
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID inválido.' });
  try {
    const { rows } = await db.query('SELECT * FROM miembros WHERE id = $1', [id]);
    if (!rows[0]) return res.status(404).json({ error: 'Miembro no encontrado.' });
    return res.json({ miembro: rows[0] });
  } catch (err) {
    console.error('[miembros:get]', err.message);
    return res.status(500).json({ error: 'Error al obtener el miembro.' });
  }
});

// -------------------- CREAR (CREATE) --------------------
router.post('/', async (req, res) => {
  const { datos, error } = validarMiembro(req.body || {});
  if (error) return res.status(400).json({ error });
  try {
    const { rows } = await db.query(
      `INSERT INTO miembros
         (nombre, apellido, cedula, telefono, email, fecha_nacimiento, tipo_membresia, fecha_inicio, fecha_fin, creado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7, COALESCE($8, CURRENT_DATE), $9, $10)
       RETURNING *`,
      [
        datos.nombre, datos.apellido, datos.cedula, datos.telefono ?? null, datos.email ?? null,
        datos.fecha_nacimiento ?? null, datos.tipo_membresia, datos.fecha_inicio ?? null,
        datos.fecha_fin ?? null, req.user.id,
      ]
    );
    await audit.registrar({ usuarioId: req.user.id, accion: 'CREATE', entidad: 'miembros', entidadId: rows[0].id, ip: req.ip });
    return res.status(201).json({ mensaje: 'Miembro creado.', miembro: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Ya existe un miembro con esa cédula.' });
    if (err.code === '23514') return res.status(400).json({ error: 'Datos inválidos (revisa fechas o tipo).' });
    console.error('[miembros:create]', err.message);
    return res.status(500).json({ error: 'Error al crear el miembro.' });
  }
});

// -------------------- ACTUALIZAR (UPDATE) --------------------
router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID inválido.' });

  const { datos, error } = validarMiembro(req.body || {}, { parcial: true });
  if (error) return res.status(400).json({ error });
  const campos = Object.keys(datos);
  if (campos.length === 0) return res.status(400).json({ error: 'Nada que actualizar.' });

  try {
    // Construcción segura del SET con placeholders (nombres de columna de lista blanca).
    const set = campos.map((c, i) => `${c} = $${i + 1}`);
    set.push(`actualizado_en = NOW()`);
    const params = campos.map((c) => datos[c]);
    params.push(id);

    const { rows } = await db.query(
      `UPDATE miembros SET ${set.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );
    if (!rows[0]) return res.status(404).json({ error: 'Miembro no encontrado.' });

    await audit.registrar({ usuarioId: req.user.id, accion: 'UPDATE', entidad: 'miembros', entidadId: id, ip: req.ip });
    return res.json({ mensaje: 'Miembro actualizado.', miembro: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Ya existe un miembro con esa cédula.' });
    if (err.code === '23514') return res.status(400).json({ error: 'Datos inválidos (revisa fechas o tipo).' });
    console.error('[miembros:update]', err.message);
    return res.status(500).json({ error: 'Error al actualizar el miembro.' });
  }
});

// -------------------- ELIMINAR (DELETE) - solo admin --------------------
router.delete('/:id', requireRole('admin'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID inválido.' });
  try {
    const { rowCount } = await db.query('DELETE FROM miembros WHERE id = $1', [id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Miembro no encontrado.' });
    await audit.registrar({ usuarioId: req.user.id, accion: 'DELETE', entidad: 'miembros', entidadId: id, ip: req.ip });
    return res.json({ mensaje: 'Miembro eliminado.' });
  } catch (err) {
    console.error('[miembros:delete]', err.message);
    return res.status(500).json({ error: 'Error al eliminar el miembro.' });
  }
});

module.exports = router;
