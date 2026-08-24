-- ============================================================================
--  DATOS DE DEMO  (versión SQL, sin necesidad de Node.js)
--
--  Ejecuta este archivo DESPUÉS de schema.sql, por ejemplo en la consola SQL
--  de Neon. Usa la extensión pgcrypto para generar hashes bcrypt ($2a$)
--  compatibles con la verificación de bcryptjs en el backend.
--
--  Usuarios creados:
--    admin@gym.com      / Admin1234       (rol admin)
--    recepcion@gym.com  / Recepcion1234   (rol recepcionista)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------- Usuarios ----------------------
INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES
  ('Administrador', 'admin@gym.com',     crypt('Admin1234',     gen_salt('bf', 12)), 'admin'),
  ('Recepcion',     'recepcion@gym.com', crypt('Recepcion1234', gen_salt('bf', 12)), 'recepcionista')
ON CONFLICT (email) DO NOTHING;

-- ---------------------- Miembros de ejemplo ----------------------
INSERT INTO miembros (nombre, apellido, cedula, telefono, email, fecha_nacimiento, tipo_membresia) VALUES
  ('Carlos', 'Ramirez', '0102030405', '0991112233', 'carlos@mail.com', '1995-04-12', 'mensual'),
  ('Maria',  'Lopez',   '0203040506', '0992223344', 'maria@mail.com',  '1990-09-30', 'anual'),
  ('Jose',   'Torres',  '0304050607', '0993334455', 'jose@mail.com',   '2000-01-15', 'trimestral')
ON CONFLICT (cedula) DO NOTHING;
