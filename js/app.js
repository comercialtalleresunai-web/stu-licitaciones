// STU Licitaciones — Lógica principal

let LICITACIONES = [];
let PROSPECTOS = [];
const CPV_LIST = CONFIG.CPVS_DEFAULT.map(c => ({ ...c, on: true }));

// ── INIT ─────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  const ok = initSupabase();
  document.getElementById('estado-db').textContent = ok ? 'Supabase conectado' : 'Modo local';
  document.getElementById('estado-db').className = 'badge ' + (ok ? 'badge-success' : 'badge-warn');

  renderCPVs();
  await cargarDatos();

  if (ok) {
    db_suscribir('licitaciones', () => cargarDatos());
    db_suscribir('prospectos', () => cargarProspectos());
  }
});

async function cargarDatos() {
  await cargarLicitaciones();
  await cargarProspectos();
  await cargarAlertaConfig();
}

// ── TABS ─────────────────────────────────────────────────

function showTab(tab) {
  document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
}

// ── ALERTAS ──────────────────────────────────────────────

function renderCPVs() {
  const el = document.getElementById('cpv-grid');
  el.innerHTML = CPV_LIST.map((c, i) => `
    <span class="cpv-chip ${c.on ? 'on' : ''}" onclick="toggleCPV(${i})">
      <span>${c.code}</span>
      <span style="color:inherit;opacity:.75">— ${c.label}</span>
    </span>
  `).join('');
  document.getElementById('m-cpvs').textContent = CPV_LIST.filter(c => c.on).length;
}

function toggleCPV(i) {
  CPV_LIST[i].on = !CPV_LIST[i].on;
  renderCPVs();
}

async function guardarAlerta() {
  const email = document.getElementById('alerta-email').value.trim();
  if (!email) { alert('Introduce un email válido'); return; }
  const config = {
    email,
    zona: document.getElementById('alerta-zona').value,
    cpvs: CPV_LIST.filter(c => c.on).map(c => c.code),
    keywords: document.getElementById('alerta-keywords').value.split(',').map(k => k.trim()).filter(Boolean),
    activa: true,
  };
  await db_saveAlertaConfig(config);
  document.getElementById('m-alertas').textContent = '1';
  alert(`Configuración guardada para ${email}.\n\nPara que las alertas lleguen automáticamente cada mañana, activa el workflow en GitHub → Actions.`);
}

async function cargarAlertaConfig() {
  const cfg = await db_getAlertaConfig();
  if (cfg) {
    document.getElementById('alerta-email').value = cfg.email || '';
    document.getElementById('alerta-zona').value = cfg.zona || 'bizkaia';
    document.getElementById('alerta-keywords').value = (cfg.keywords || []).join(', ');
    document.getElementById('m-alertas').textContent = cfg.activa ? '1' : '0';
  }
}

// ── LICITACIONES ─────────────────────────────────────────

async function cargarLicitaciones() {
  LICITACIONES = await db_getLicitaciones();
  renderKanban();
  renderMetricsKanban();
}

function renderKanban() {
  const estados = ['detectada', 'preparando', 'presentada', 'resuelta'];
  const hoy = new Date();

  estados.forEach(estado => {
    const items = LICITACIONES.filter(l => l.estado === estado);
    document.getElementById('cnt-' + estado).textContent = items.length;
    document.getElementById('col-' + estado).innerHTML = items.length
      ? items.map(l => {
          const urgente = l.plazo && diasHasta(l.plazo) <= 7 && diasHasta(l.plazo) >= 0;
          return `
            <div class="kanban-card ${urgente ? 'kanban-urgente' : ''}" onclick="verLicitacion('${l.id}')">
              <div class="kanban-card-title">${esc(l.titulo)}</div>
              <div class="kanban-card-meta">
                <span>${l.organismo || '—'}</span>
                ${l.plazo ? `<span>${urgente ? '⚠ ' : ''}Plazo: ${formatFecha(l.plazo)}</span>` : ''}
                ${l.importe ? `<span>${Number(l.importe).toLocaleString('es-ES')} €</span>` : ''}
              </div>
            </div>
          `;
        }).join('')
      : `<div style="font-size:11px;color:var(--text-3);text-align:center;padding:16px 0;">Vacío</div>`;
  });
}

function renderMetricsKanban() {
  document.getElementById('k-total').textContent = LICITACIONES.filter(l => l.estado !== 'resuelta').length;
  const urgentes = LICITACIONES.filter(l => l.plazo && diasHasta(l.plazo) <= 7 && diasHasta(l.plazo) >= 0);
  document.getElementById('k-urgentes').textContent = urgentes.length;
  document.getElementById('k-pres').textContent = LICITACIONES.filter(l => l.estado === 'presentada').length;
  document.getElementById('k-ganadas').textContent = LICITACIONES.filter(l => l.resultado === 'ganada').length;
}

async function guardarLicitacion() {
  const titulo = document.getElementById('lic-titulo').value.trim();
  if (!titulo) { alert('El título es obligatorio'); return; }
  const lic = {
    titulo,
    organismo: document.getElementById('lic-organismo').value,
    importe: parseFloat(document.getElementById('lic-importe').value) || null,
    plazo: document.getElementById('lic-plazo').value || null,
    cpv: document.getElementById('lic-cpv').value,
    estado: document.getElementById('lic-estado').value,
    url: document.getElementById('lic-url').value,
    expediente: document.getElementById('lic-expediente').value,
    notas: document.getElementById('lic-notas').value,
    creado_por: 'STU',
  };
  const saved = await db_saveLicitacion(lic);
  if (saved) {
    cerrarModal('modal-lic');
    limpiarFormLic();
    await cargarLicitaciones();
  }
}

function limpiarFormLic() {
  ['lic-titulo','lic-organismo','lic-importe','lic-plazo','lic-url','lic-expediente','lic-notas'].forEach(id => {
    document.getElementById(id).value = '';
  });
}

function verLicitacion(id) {
  const l = LICITACIONES.find(x => x.id === id);
  if (!l) return;
  const opciones = ['detectada','preparando','presentada','resuelta'].filter(e => e !== l.estado);
  const html = `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:300;display:flex;align-items:flex-start;justify-content:center;padding:3rem 1rem;overflow-y:auto;" onclick="if(event.target===this)this.remove()">
      <div style="background:var(--surface);border-radius:12px;padding:1.5rem;width:100%;max-width:560px;border:0.5px solid var(--border-2);">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1rem;">
          <h3 style="font-size:15px;font-weight:500;flex:1;padding-right:8px;">${esc(l.titulo)}</h3>
          <button class="btn-icon" onclick="this.closest('[onclick]').remove()">✕</button>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:1rem;">
          <span class="badge badge-teal">${l.estado}</span>
          ${l.cpv ? `<span class="badge badge-info">${l.cpv}</span>` : ''}
          ${l.importe ? `<span class="badge badge-gray">${Number(l.importe).toLocaleString('es-ES')} €</span>` : ''}
        </div>
        <table style="width:100%;font-size:13px;border-collapse:collapse;">
          <tr><td style="color:var(--text-2);padding:4px 0;width:120px;">Organismo</td><td style="font-weight:500;">${esc(l.organismo||'—')}</td></tr>
          <tr><td style="color:var(--text-2);padding:4px 0;">Plazo</td><td>${l.plazo ? formatFecha(l.plazo) : '—'}</td></tr>
          <tr><td style="color:var(--text-2);padding:4px 0;">Expediente</td><td>${esc(l.expediente||'—')}</td></tr>
          ${l.url ? `<tr><td style="color:var(--text-2);padding:4px 0;">Enlace</td><td><a href="${l.url}" target="_blank">Ver licitación ↗</a></td></tr>` : ''}
        </table>
        ${l.notas ? `<div style="margin-top:10px;font-size:13px;color:var(--text-2);background:var(--bg);padding:10px;border-radius:var(--radius);">${esc(l.notas)}</div>` : ''}
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:1rem;">
          ${opciones.map(e => `<button class="btn btn-sm" onclick="cambiarEstado('${id}','${e}');this.closest('[onclick]').remove();">→ ${e}</button>`).join('')}
          <button class="btn btn-sm" onclick="window.open('${l.url||'#'}')">Ver en plataforma ↗</button>
          <button class="btn btn-sm btn-primary" onclick="this.closest('[onclick]').remove();prepararOferta('${id}')">Preparar oferta ↗</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
}

async function cambiarEstado(id, estado) {
  await db_updateEstado(id, estado, 'STU');
  await cargarLicitaciones();
}

function prepararOferta(id) {
  const l = LICITACIONES.find(x => x.id === id);
  if (!l) return;
  window.parent.postMessage({
    type: 'sendPrompt',
    prompt: `Necesito preparar la oferta para esta licitación pública:\n\nTítulo: ${l.titulo}\nOrganismo: ${l.organismo||'—'}\nCPV: ${l.cpv||'—'}\nImporte base: ${l.importe||'—'} €\nPlazo: ${l.plazo||'—'}\n\n¿Qué documentación necesito y cómo estructuro la oferta técnica para Suministros Talleres Unai SL?`
  }, '*');
}

// ── PROSPECTOS ───────────────────────────────────────────

async function cargarProspectos() {
  PROSPECTOS = await db_getProspectos();
  renderProspectos();
  renderMetricsProspectos();
}

function renderProspectos() {
  const el = document.getElementById('prospectos-list');
  if (!PROSPECTOS.length) {
    el.innerHTML = `<div style="text-align:center;padding:3rem;color:var(--text-3);">
      <div style="font-size:32px;margin-bottom:8px;">🏭</div>
      Añade prospectos detectados en adjudicaciones históricas.
    </div>`;
    return;
  }
  const sorted = [...PROSPECTOS].sort((a, b) => (b.score||0) - (a.score||0));
  el.innerHTML = sorted.map(p => `
    <div class="prospecto-card">
      <div class="prospecto-header">
        <div class="prospecto-nombre">${esc(p.empresa)}</div>
        <div class="score-dots">
          ${[1,2,3,4,5].map(n => `<span class="score-dot ${n <= p.score ? 'on' : ''}"></span>`).join('')}
        </div>
      </div>
      <div class="prospecto-tags">
        ${p.municipio ? `<span class="badge badge-gray">${esc(p.municipio)}</span>` : ''}
        <span class="badge badge-info">${esc(p.sector||'—')}</span>
        <span class="badge badge-${estadoBadge(p.estado)}">${p.estado||'identificado'}</span>
      </div>
      ${p.maquinaria ? `<div class="prospecto-row"><span>Maquinaria de interés</span><strong>${esc(p.maquinaria)}</strong></div>` : ''}
      ${p.contacto_nombre ? `<div class="prospecto-row"><span>Contacto</span><strong>${esc(p.contacto_nombre)}</strong></div>` : ''}
      ${p.fuente ? `<div style="font-size:11px;color:var(--text-3);margin-top:5px;">Fuente: ${esc(p.fuente)}</div>` : ''}
      <div class="prospecto-actions">
        <button class="btn btn-sm" onclick="cambiarEstadoP('${p.id}','contactado')">Contactado</button>
        <button class="btn btn-sm" onclick="cambiarEstadoP('${p.id}','interesado')">Interesado</button>
        <button class="btn btn-sm" onclick="cambiarEstadoP('${p.id}','cliente')">Cliente ✓</button>
        <button class="btn btn-sm btn-primary" onclick="redactarContacto('${p.id}')">Redactar contacto ↗</button>
      </div>
    </div>
  `).join('');
}

function renderMetricsProspectos() {
  document.getElementById('p-total').textContent = PROSPECTOS.length;
  document.getElementById('p-cont').textContent = PROSPECTOS.filter(p => p.estado === 'contactado').length;
  document.getElementById('p-int').textContent = PROSPECTOS.filter(p => p.estado === 'interesado').length;
  document.getElementById('p-cli').textContent = PROSPECTOS.filter(p => p.estado === 'cliente').length;
}

async function guardarProspecto() {
  const empresa = document.getElementById('p-empresa').value.trim();
  if (!empresa) { alert('El nombre de empresa es obligatorio'); return; }
  const p = {
    empresa,
    municipio: document.getElementById('p-municipio').value,
    sector: document.getElementById('p-sector').value,
    maquinaria: document.getElementById('p-maquinaria').value,
    score: parseInt(document.getElementById('p-score').value),
    contacto_nombre: document.getElementById('p-contacto').value,
    fuente: document.getElementById('p-fuente').value,
    notas: document.getElementById('p-notas').value,
    estado: 'identificado',
  };
  const saved = await db_saveProspecto(p);
  if (saved) {
    cerrarModal('modal-prosp');
    ['p-empresa','p-municipio','p-maquinaria','p-contacto','p-fuente','p-notas'].forEach(id => document.getElementById(id).value = '');
    await cargarProspectos();
  }
}

async function cambiarEstadoP(id, estado) {
  await db_updateEstadoProspecto(id, estado);
  await cargarProspectos();
}

function redactarContacto(id) {
  const p = PROSPECTOS.find(x => x.id === id);
  if (!p) return;
  window.parent.postMessage({
    type: 'sendPrompt',
    prompt: `Redacta un email comercial para contactar con ${p.empresa}${p.municipio ? ' (' + p.municipio + ')' : ''}, empresa del sector ${p.sector||'industrial'}, interesada en ${p.maquinaria||'maquinaria industrial'}. Los hemos detectado como prospecto a partir de adjudicaciones públicas.\n\nEmisor: Suministros Talleres Unai SL, Markina-Xemein (Bizkaia). Vendemos y reparamos maquinaria industrial.\n\nEl tono debe ser profesional y directo, sin ser agresivo. Incluye asunto.`
  }, '*');
}

// ── MODALES ──────────────────────────────────────────────

function abrirModal(id) { document.getElementById(id).classList.add('open'); }
function cerrarModal(id) { document.getElementById(id).classList.remove('open'); }
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-backdrop')) e.target.classList.remove('open');
});

// ── UTILIDADES ───────────────────────────────────────────

function diasHasta(fechaStr) {
  const d = new Date(fechaStr);
  return Math.round((d - new Date()) / 86400000);
}

function formatFecha(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function estadoBadge(estado) {
  const m = { identificado:'gray', contactado:'warn', interesado:'teal', cliente:'success', descartado:'danger' };
  return m[estado] || 'gray';
}
