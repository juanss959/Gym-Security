// ============================================================================
//  Frontend GymSec (Vanilla JS).  Consume la API con fetch.
//  Las cookies de sesión (httpOnly) se envían automáticamente => credentials.
// ============================================================================
'use strict';

const API = '/api';
let usuarioActual = null;

// Helper de fetch con manejo de errores y cookies.
async function api(ruta, opciones = {}) {
  const res = await fetch(API + ruta, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    ...opciones,
  });
  let data = {};
  try { data = await res.json(); } catch (_) {}
  if (!res.ok) throw new Error(data.error || 'Error en la solicitud.');
  return data;
}

const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function mostrarMsg(el, texto, tipo) {
  el.textContent = texto;
  el.className = 'msg ' + (tipo || '');
}

// ----------------------- Autenticación -----------------------
function initTabs() {
  document.querySelectorAll('.tab').forEach((t) => {
    t.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((x) => x.classList.remove('activo'));
      t.classList.add('activo');
      const esLogin = t.dataset.tab === 'login';
      $('#form-login').classList.toggle('oculto', !esLogin);
      $('#form-registro').classList.toggle('oculto', esLogin);
      mostrarMsg($('#login-msg'), '', '');
    });
  });
}

$('#form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  try {
    const data = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: f.email.value, password: f.password.value }),
    });
    usuarioActual = data.usuario;
    entrarApp();
  } catch (err) {
    mostrarMsg($('#login-msg'), err.message, 'error');
  }
});

$('#form-registro').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  try {
    await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ nombre: f.nombre.value, email: f.email.value, password: f.password.value }),
    });
    mostrarMsg($('#login-msg'), 'Cuenta creada. Ahora inicia sesión.', 'ok');
    document.querySelector('[data-tab="login"]').click();
    f.reset();
  } catch (err) {
    mostrarMsg($('#login-msg'), err.message, 'error');
  }
});

$('#btn-logout').addEventListener('click', async () => {
  try { await api('/auth/logout', { method: 'POST' }); } catch (_) {}
  usuarioActual = null;
  $('#pantalla-app').classList.add('oculto');
  $('#pantalla-login').classList.remove('oculto');
});

function entrarApp() {
  $('#pantalla-login').classList.add('oculto');
  $('#pantalla-app').classList.remove('oculto');
  $('#usuario-nombre').textContent = usuarioActual.nombre;
  $('#usuario-rol').textContent = usuarioActual.rol;
  cargarMiembros();
}

// ----------------------- CRUD de miembros -----------------------
let debounce;
$('#busqueda').addEventListener('input', () => {
  clearTimeout(debounce);
  debounce = setTimeout(cargarMiembros, 300);
});
$('#filtro-activo').addEventListener('change', cargarMiembros);

async function cargarMiembros() {
  const q = $('#busqueda').value.trim();
  const activo = $('#filtro-activo').value;
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (activo) params.set('activo', activo);

  const tbody = $('#tabla-body');
  try {
    const data = await api('/miembros?' + params.toString());
    if (data.miembros.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="vacio">No hay miembros.</td></tr>';
      return;
    }
    const esAdmin = usuarioActual.rol === 'admin';
    tbody.innerHTML = data.miembros.map((m) => `
      <tr>
        <td>${esc(m.nombre)} ${esc(m.apellido)}</td>
        <td>${esc(m.cedula)}</td>
        <td>${esc(m.telefono || '-')}</td>
        <td>${esc(m.tipo_membresia)}</td>
        <td>${fmt(m.fecha_inicio)}</td>
        <td>${fmt(m.fecha_fin)}</td>
        <td><span class="estado ${m.activo ? 'activo' : 'inactivo'}">${m.activo ? 'Activo' : 'Inactivo'}</span></td>
        <td class="acciones-cel">
          <button class="btn btn-secundario btn-mini" data-editar="${m.id}">Editar</button>
          ${esAdmin ? `<button class="btn btn-peligro btn-mini" data-eliminar="${m.id}">Eliminar</button>` : ''}
        </td>
      </tr>`).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" class="vacio">${esc(err.message)}</td></tr>`;
  }
}

function fmt(fecha) {
  if (!fecha) return '-';
  return String(fecha).slice(0, 10);
}

// Delegación de eventos para botones editar/eliminar.
$('#tabla-body').addEventListener('click', async (e) => {
  const idE = e.target.getAttribute('data-editar');
  const idD = e.target.getAttribute('data-eliminar');
  if (idE) return abrirModal(idE);
  if (idD) return eliminar(idD);
});

async function eliminar(id) {
  if (!confirm('¿Eliminar este miembro? Esta acción no se puede deshacer.')) return;
  try {
    await api('/miembros/' + id, { method: 'DELETE' });
    mostrarMsg($('#app-msg'), 'Miembro eliminado.', 'ok');
    cargarMiembros();
  } catch (err) {
    mostrarMsg($('#app-msg'), err.message, 'error');
  }
}

// ----------------------- Modal crear/editar -----------------------
const modal = $('#modal');
const formMiembro = $('#form-miembro');

$('#btn-nuevo').addEventListener('click', () => abrirModal());
$('#btn-cancelar').addEventListener('click', cerrarModal);
modal.addEventListener('click', (e) => { if (e.target === modal) cerrarModal(); });

async function abrirModal(id) {
  formMiembro.reset();
  mostrarMsg($('#modal-msg'), '', '');
  formMiembro.id.value = '';

  if (id) {
    $('#modal-titulo').textContent = 'Editar miembro';
    try {
      const { miembro } = await api('/miembros/' + id);
      formMiembro.id.value = miembro.id;
      formMiembro.nombre.value = miembro.nombre || '';
      formMiembro.apellido.value = miembro.apellido || '';
      formMiembro.cedula.value = miembro.cedula || '';
      formMiembro.telefono.value = miembro.telefono || '';
      formMiembro.email.value = miembro.email || '';
      formMiembro.fecha_nacimiento.value = fmtInput(miembro.fecha_nacimiento);
      formMiembro.tipo_membresia.value = miembro.tipo_membresia || 'mensual';
      formMiembro.fecha_inicio.value = fmtInput(miembro.fecha_inicio);
      formMiembro.fecha_fin.value = fmtInput(miembro.fecha_fin);
      formMiembro.activo.checked = !!miembro.activo;
    } catch (err) {
      mostrarMsg($('#modal-msg'), err.message, 'error');
    }
  } else {
    $('#modal-titulo').textContent = 'Nuevo miembro';
  }
  modal.classList.remove('oculto');
}

function cerrarModal() { modal.classList.add('oculto'); }
function fmtInput(f) { return f ? String(f).slice(0, 10) : ''; }

formMiembro.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = formMiembro.id.value;
  const payload = {
    nombre: formMiembro.nombre.value,
    apellido: formMiembro.apellido.value,
    cedula: formMiembro.cedula.value,
    telefono: formMiembro.telefono.value || null,
    email: formMiembro.email.value || null,
    fecha_nacimiento: formMiembro.fecha_nacimiento.value || null,
    tipo_membresia: formMiembro.tipo_membresia.value,
    fecha_inicio: formMiembro.fecha_inicio.value || null,
    fecha_fin: formMiembro.fecha_fin.value || null,
    activo: formMiembro.activo.checked,
  };
  try {
    if (id) {
      await api('/miembros/' + id, { method: 'PUT', body: JSON.stringify(payload) });
      mostrarMsg($('#app-msg'), 'Miembro actualizado.', 'ok');
    } else {
      await api('/miembros', { method: 'POST', body: JSON.stringify(payload) });
      mostrarMsg($('#app-msg'), 'Miembro creado.', 'ok');
    }
    cerrarModal();
    cargarMiembros();
  } catch (err) {
    mostrarMsg($('#modal-msg'), err.message, 'error');
  }
});

// ----------------------- Arranque: ¿sesión activa? -----------------------
async function init() {
  initTabs();
  try {
    const data = await api('/auth/me');
    usuarioActual = data.usuario;
    entrarApp();
  } catch (_) {
    // No hay sesión: se queda en el login.
  }
}
init();
