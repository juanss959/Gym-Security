// ============================================================================
//  Inicializa el esquema de la base de datos ejecutando db/schema.sql
//  Uso:  npm run db:init
// ============================================================================
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/db');

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8');
  console.log('[initdb] Creando tablas...');
  await pool.query(sql);
  console.log('[initdb] ✔ Esquema creado correctamente.');
  await pool.end();
}

main().catch((err) => {
  console.error('[initdb] Error:', err.message);
  process.exit(1);
});
