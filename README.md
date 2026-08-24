# 🏋️ GymSec — Sistema de Gestión de Gimnasio

Aplicación web con base de datos, autenticación de usuarios y CRUD completo.
Proyecto para la **Maestría en Seguridad en Bases de Datos**.

- **Stack:** Node.js + Express + PostgreSQL
- **Frontend:** HTML + CSS + JavaScript (vanilla)
- **Despliegue:** Vercel (serverless) + Neon (PostgreSQL gratis en la nube)
- **Tema:** Gestión de miembros de un gimnasio

---

## 1. ¿Qué hace?

- **Autenticación por base de datos:** los usuarios se guardan en la tabla `usuarios`
  y se validan contra la BD al iniciar sesión.
- **CRUD completo** sobre la entidad **Miembros** (crear, listar/buscar, editar, eliminar).
- **Roles:** `admin` (puede eliminar) y `recepcionista` (puede crear/editar).
- **Auditoría:** cada acción sensible queda registrada en la tabla `auditoria`.

---

## 2. Medidas de seguridad implementadas  ⭐ (lo importante para la materia)

| # | Amenaza | Medida en este proyecto | Dónde verlo |
|---|---------|--------------------------|-------------|
| 1 | Robo de contraseñas | Hash con **bcrypt** (cost 12). Nunca se guarda texto plano. | `scripts/seed.js`, `auth.routes.js` |
| 2 | **Inyección SQL** | **Consultas parametrizadas** (`$1, $2`) en TODAS las queries. | `src/db.js`, `*.routes.js` |
| 3 | Acceso no autorizado | JWT en **cookie httpOnly + secure + sameSite**. | `src/middleware/auth.js` |
| 4 | Escalada de privilegios | **RBAC**: DELETE solo para rol `admin`. | `miembros.routes.js` |
| 5 | Fuerza bruta en login | **Rate limiting** (8 intentos / 10 min por IP). | `auth.routes.js` |
| 6 | Enumeración de usuarios | Mensaje de error **genérico** en login. | `auth.routes.js` |
| 7 | Datos corruptos | **Restricciones** en la BD (UNIQUE, CHECK, FK, NOT NULL). | `db/schema.sql` |
| 8 | Fugas de secretos | Credenciales en **variables de entorno** (`.env`, nunca en git). | `.env.example`, `.gitignore` |
| 9 | Exceso de privilegios en BD | Usuario de BD con **mínimo privilegio** (solo SELECT/INSERT/UPDATE/DELETE). | `db/schema.sql` (final) |
| 10 | XSS | Escape de HTML en el frontend + **CSP** y cabeceras de seguridad. | `public/js/app.js`, `src/app.js` |
| 11 | Trazabilidad | **Registro de auditoría** de login, creación, edición y borrado. | `src/audit.js` |
| 12 | Clickjacking | Cabecera `X-Frame-Options: DENY`. | `src/app.js` |

---

## 3. Estructura del proyecto

```
gym-security/
├── api/index.js            # Punto de entrada para Vercel (serverless)
├── server.js               # Punto de entrada para ejecución local
├── src/
│   ├── app.js              # App Express + cabeceras de seguridad
│   ├── db.js               # Pool PostgreSQL + query() parametrizada
│   ├── audit.js            # Registro de auditoría
│   ├── middleware/auth.js  # JWT, cookies, requireAuth, requireRole (RBAC)
│   └── routes/
│       ├── auth.routes.js  # register / login / logout / me
│       └── miembros.routes.js  # CRUD de miembros
├── public/                 # Frontend (HTML, CSS, JS)
├── db/schema.sql           # Esquema + privilegios mínimos
├── scripts/
│   ├── initdb.js           # Crea las tablas
│   └── seed.js             # Usuarios y miembros de demo
├── .env.example
├── vercel.json
└── package.json
```

---

## 4. Ejecutar en LOCAL

**Requisitos:** Node.js 18+ y una base de datos PostgreSQL (local o Neon).

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
copy .env.example .env        # (Windows)   /   cp .env.example .env  (Linux/Mac)
# Edita .env y pon tu DATABASE_URL y un JWT_SECRET largo

# 3. Crear las tablas
npm run db:init

# 4. Cargar datos de demo (usuario admin + miembros)
npm run db:seed

# 5. Arrancar
npm start
```

Abre **http://localhost:3000**

**Usuarios de demo:**
- Admin: `admin@gym.com` / `Admin1234`
- Recepción: `recepcion@gym.com` / `Recepcion1234`

> ⚠️ Cambia estas contraseñas y el `JWT_SECRET` antes de una entrega real.

---

## 5. Desplegar en VERCEL + NEON (gratis)

### Paso A — Base de datos (Neon)
1. Crea una cuenta en <https://neon.tech> (gratis).
2. Crea un proyecto → copia la **connection string** (usa la versión *pooled*, termina en `-pooler`).
3. En la consola SQL de Neon, pega y ejecuta el contenido de `db/schema.sql`.

### Paso B — Sembrar datos (opcional, desde tu PC)
```bash
# con la DATABASE_URL de Neon en tu .env
npm run db:seed
```

### Paso C — Desplegar (Vercel)
1. Sube el proyecto a un repo de **GitHub**.
2. Entra a <https://vercel.com> → **New Project** → importa el repo.
3. En **Settings → Environment Variables** agrega:
   - `DATABASE_URL` = tu cadena de Neon (la *pooled*)
   - `JWT_SECRET` = un texto largo y aleatorio
   - `NODE_ENV` = `production`
4. **Deploy**. Vercel te dará una URL pública tipo `https://gym-security.vercel.app`.

> Alternativa por CLI:
> ```bash
> npm i -g vercel
> vercel        # sigue el asistente
> vercel env add DATABASE_URL
> vercel env add JWT_SECRET
> vercel --prod
> ```

---

## 6. Probar el CRUD

1. Inicia sesión con el admin.
2. **Crear:** botón “+ Nuevo miembro”.
3. **Leer/Buscar:** la tabla y el buscador por nombre/cédula.
4. **Actualizar:** botón “Editar”.
5. **Eliminar:** botón “Eliminar” (solo visible para admin).

---

## 7. Autor
Edison Poveda — Maestría en Seguridad en Bases de Datos, 2026.
