// ============================================================================
//  Capa de acceso a datos - Pool de conexiones PostgreSQL
//
//  SEGURIDAD:
//   * Se exporta SOLO una función query() que usa CONSULTAS PARAMETRIZADAS.
//     Los valores viajan por separado del texto SQL => previene inyección SQL.
//   * La conexión se toma de DATABASE_URL (variable de entorno), nunca en código.
//   * SSL se habilita automáticamente en producción (Neon/Vercel lo exigen).
// ============================================================================
require('dotenv').config();
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.warn('[db] ADVERTENCIA: DATABASE_URL no está definida. Revisa tu .env');
}

const useSSL =
  process.env.NODE_ENV === 'production' ||
  /neon\.tech|render\.com|amazonaws\.com|supabase/.test(process.env.DATABASE_URL || '');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSSL ? { rejectUnauthorized: false } : false,
  max: 5,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.error('[db] Error inesperado en el pool de conexiones:', err.message);
});

/**
 * Ejecuta una consulta parametrizada.
 * @param {string} text  SQL con placeholders $1, $2, ...
 * @param {Array}  params  valores (se envían por separado, sin concatenar)
 */
function query(text, params) {
  return pool.query(text, params);
}

module.exports = { query, pool };
