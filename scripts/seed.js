// ============================================================================
//  Datos iniciales (seed).
//  Crea un usuario administrador y algunos miembros de ejemplo.
//  Las contraseñas se guardan HASHEADAS con bcrypt (nunca en texto plano).
//  Uso:  npm run db:seed
// ============================================================================
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../src/db');

const ADMIN = {
  nombre: 'Administrador',
  email: 'admin@gym.com',
  password: 'Admin1234',      // contraseña de DEMO: cámbiala luego
  rol: 'admin',
};

const RECEPCION = {
  nombre: 'Recepcion',
  email: 'recepcion@gym.com',
  password: 'Recepcion1234',
  rol: 'recepcionista',
};

async function crearUsuario(u) {
  const hash = await bcrypt.hash(u.password, 12);
  await pool.query(
    `INSERT INTO usuarios (nombre, email, password_hash, rol)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO NOTHING`,
    [u.nombre, u.email, hash, u.rol]
  );
  console.log(`  usuario: ${u.email}  /  ${u.password}   (rol: ${u.rol})`);
}

async function main() {
  console.log('[seed] Insertando usuarios de demo...');
  await crearUsuario(ADMIN);
  await crearUsuario(RECEPCION);

  console.log('[seed] Insertando miembros de ejemplo...');
  const miembros = [
    ['Carlos', 'Ramirez', '0102030405', '0991112233', 'carlos@mail.com', '1995-04-12', 'mensual'],
    ['Maria', 'Lopez', '0203040506', '0992223344', 'maria@mail.com', '1990-09-30', 'anual'],
    ['Jose', 'Torres', '0304050607', '0993334455', 'jose@mail.com', '2000-01-15', 'trimestral'],
  ];
  for (const m of miembros) {
    await pool.query(
      `INSERT INTO miembros
         (nombre, apellido, cedula, telefono, email, fecha_nacimiento, tipo_membresia)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (cedula) DO NOTHING`,
      m
    );
  }

  console.log('[seed] Listo. Usuarios y miembros de demo creados.');
  await pool.end();
}

main().catch((err) => {
  console.error('[seed] Error:', err.message);
  process.exit(1);
});
