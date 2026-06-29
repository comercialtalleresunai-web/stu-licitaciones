// STU Licitaciones — Cliente Supabase
// Importado desde CDN en index.html

var db = null;

function initSupabase() {
  if (!CONFIG.SUPABASE_URL || CONFIG.SUPABASE_URL.includes('TU-PROYECTO')) {
    console.warn('⚠️ Supabase no configurado. Usando modo local (localStorage).');
    return false;
  }
  db = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
  return true;
}

// ── LICITACIONES ──────────────────────────────────────────

async function db_getLicitaciones() {
  if (!db) return localGet('licitaciones', []);
  const { data, error } = await db
    .from('licitaciones')
    .select('*')
    .order('creado_en', { ascending: false });
  if (error) { console.error(error); return []; }
  return data;
}

async function db_saveLicitacion(lic) {
  if (!db) {
    const arr = localGet('licitaciones', []);
    const idx = arr.findIndex(x => x.id === lic.id);
    if (idx >= 0) arr[idx] = lic; else arr.unshift({ ...lic, id: crypto.randomUUID() });
    localSet('licitaciones', arr);
    return lic;
  }
  const { data, error } = lic.id
    ? await db.from('licitaciones').upsert(lic).select().single()
            : await db.from('licitaciones').insert(lic).select().single();
  if (error) { console.error(error); return null; }
  return data;
}

async function db_updateEstado(id, estado, usuario) {
  if (!db) {
    const arr = localGet('licitaciones', []);
    const lic = arr.find(x => x.id === id);
    if (lic) { lic.estado = estado; localSet('licitaciones', arr); }
    return;
  }
  await db.from('licitaciones').update({ estado }).eq('id', id);
  await db.from('licitaciones_historial').insert({
    licitacion_id: id,
    accion: `Estado → ${estado}`,
    usuario: usuario || 'usuario',
  });
}

async function db_deleteLicitacion(id) {
  if (!db) {
    localSet('licitaciones', localGet('licitaciones', []).filter(x => x.id !== id));
    return;
  }
  await db.from('licitaciones').delete().eq('id', id);
}

async function db_getHistorial(licitacion_id) {
  if (!db) return [];
  const { data } = await db
    .from('licitaciones_historial')
    .select('*')
    .eq('licitacion_id', licitacion_id)
    .order('fecha', { ascending: true });
  return data || [];
}

// ── PROSPECTOS ────────────────────────────────────────────

async function db_getProspectos() {
  if (!db) return localGet('prospectos', []);
  const { data, error } = await db
    .from('prospectos')
    .select('*')
    .order('score', { ascending: false });
  if (error) { console.error(error); return []; }
  return data;
}

async function db_saveProspecto(p) {
  if (!db) {
    const arr = localGet('prospectos', []);
    const idx = arr.findIndex(x => x.id === p.id);
    if (idx >= 0) arr[idx] = p; else arr.unshift({ ...p, id: crypto.randomUUID() });
    localSet('prospectos', arr);
    return p;
  }
  const { data, error } = p.id
    ? await db.from('prospectos').upsert(p).select().single()
            : await db.from('prospectos').insert(p).select().single();
  if (error) { console.error(error); return null; }
  return data;
}

async function db_updateEstadoProspecto(id, estado) {
  if (!db) {
    const arr = localGet('prospectos', []);
    const p = arr.find(x => x.id === id);
    if (p) { p.estado = estado; localSet('prospectos', arr); }
    return;
  }
  await db.from('prospectos').update({ estado }).eq('id', id);
}

// ── ALERTAS ───────────────────────────────────────────────

async function db_saveAlertaConfig(config) {
  if (!db) { localSet('alerta_config', config); return; }
  await db.from('alertas_config').upsert(config);
}

async function db_getAlertaConfig() {
  if (!db) return localGet('alerta_config', null);
  const { data } = await db
    .from('alertas_config')
    .select('*')
    .limit(1)
    .single();
  return data;
}

// ── SUSCRIPCIÓN TIEMPO REAL ───────────────────────────────

function db_suscribir(tabla, callback) {
  if (!db) return;
  db
    .channel(`realtime-${tabla}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: tabla }, callback)
    .subscribe();
}

// ── UTILIDADES LOCAL ──────────────────────────────────────

function localGet(key, def) {
  try { return JSON.parse(localStorage.getItem('stu_' + key)) ?? def; }
  catch { return def; }
}

function localSet(key, val) {
  localStorage.setItem('stu_' + key, JSON.stringify(val));
}
