-- ============================================================================
--  ESQUEMA DE BASE DE DATOS  -  Sistema de Gestión de Gimnasio
--  Maestría en Seguridad en Bases de Datos
--
--  Notas de seguridad incluidas en el diseño:
--   * Contraseñas NUNCA en texto plano -> columna password_hash (bcrypt).
--   * Restricciones (UNIQUE, CHECK, NOT NULL, FK) para integridad de datos.
--   * Tabla de auditoría para trazabilidad (quién hizo qué y cuándo).
--   * Roles con control de acceso a nivel de aplicación (columna rol).
--   * Se recomienda un usuario de BD con PRIVILEGIOS MÍNIMOS (ver más abajo).
-- ============================================================================

-- ---------------------------------------------------------------------------
--  Limpieza (útil para reinicializar en desarrollo)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS auditoria CASCADE;
DROP TABLE IF EXISTS miembros  CASCADE;
DROP TABLE IF EXISTS usuarios  CASCADE;

-- ---------------------------------------------------------------------------
--  TABLA: usuarios  (para la AUTENTICACIÓN por base de datos)
-- ---------------------------------------------------------------------------
CREATE TABLE usuarios (
    id            SERIAL PRIMARY KEY,
    nombre        VARCHAR(100) NOT NULL,
    email         VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,               -- hash bcrypt, jamás texto plano
    rol           VARCHAR(20)  NOT NULL DEFAULT 'recepcionista'
                  CHECK (rol IN ('admin', 'recepcionista')),
    activo        BOOLEAN      NOT NULL DEFAULT TRUE,
    creado_en     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  usuarios IS 'Usuarios del sistema que pueden iniciar sesión';
COMMENT ON COLUMN usuarios.password_hash IS 'Hash bcrypt de la contraseña (cost 12)';

-- ---------------------------------------------------------------------------
--  TABLA: miembros  (la entidad principal del CRUD)
-- ---------------------------------------------------------------------------
CREATE TABLE miembros (
    id               SERIAL PRIMARY KEY,
    nombre           VARCHAR(100) NOT NULL,
    apellido         VARCHAR(100) NOT NULL,
    cedula           VARCHAR(20)  NOT NULL UNIQUE,
    telefono         VARCHAR(20),
    email            VARCHAR(150),
    fecha_nacimiento DATE,
    tipo_membresia   VARCHAR(20)  NOT NULL DEFAULT 'mensual'
                     CHECK (tipo_membresia IN ('diaria', 'mensual', 'trimestral', 'anual')),
    fecha_inicio     DATE         NOT NULL DEFAULT CURRENT_DATE,
    fecha_fin        DATE,
    activo           BOOLEAN      NOT NULL DEFAULT TRUE,
    creado_por       INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL,
    creado_en        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    actualizado_en   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_fechas CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio)
);

COMMENT ON TABLE miembros IS 'Miembros/clientes del gimnasio (CRUD principal)';

CREATE INDEX idx_miembros_cedula   ON miembros (cedula);
CREATE INDEX idx_miembros_activo   ON miembros (activo);
CREATE INDEX idx_miembros_apellido ON miembros (apellido);

-- ---------------------------------------------------------------------------
--  TABLA: auditoria  (trazabilidad / seguridad)
-- ---------------------------------------------------------------------------
CREATE TABLE auditoria (
    id          BIGSERIAL PRIMARY KEY,
    usuario_id  INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL,
    accion      VARCHAR(20)  NOT NULL,     -- LOGIN, LOGIN_FAIL, CREATE, UPDATE, DELETE
    entidad     VARCHAR(40),               -- p.ej. 'miembros'
    entidad_id  INTEGER,
    detalle     TEXT,
    ip          VARCHAR(60),
    creado_en   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE auditoria IS 'Registro de auditoría de acciones sensibles';

CREATE INDEX idx_auditoria_usuario ON auditoria (usuario_id);
CREATE INDEX idx_auditoria_fecha   ON auditoria (creado_en);

-- ============================================================================
--  PRIVILEGIOS MÍNIMOS (defensa en profundidad)
--  La aplicación NO debe conectarse como superusuario.
--  Ejecuta esto UNA VEZ como administrador de la base para crear el usuario
--  de aplicación con solo los permisos que necesita (principio de mínimo
--  privilegio). En Neon/gestionados quizá uses el usuario que te dan; deja
--  esto documentado como la práctica recomendada.
-- ============================================================================
-- CREATE USER gym_app WITH PASSWORD 'cambia_esta_clave_fuerte';
-- GRANT CONNECT ON DATABASE gym TO gym_app;
-- GRANT USAGE ON SCHEMA public TO gym_app;
-- -- Solo DML sobre las tablas de la app (sin DROP/ALTER/CREATE):
-- GRANT SELECT, INSERT, UPDATE, DELETE ON usuarios, miembros, auditoria TO gym_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO gym_app;
-- -- La app no necesita borrar usuarios físicamente; se podría restringir aún más.
