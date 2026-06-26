// STU Licitaciones — Configuración
// ⚠️  Rellena estos valores con los de tu proyecto Supabase
// Supabase → Settings → API

const CONFIG = {
  // Project URL (empieza por https://xxxx.supabase.co)
  SUPABASE_URL: 'https://TU-PROYECTO.supabase.co',

  // anon public key (segura para el frontend)
  SUPABASE_KEY: 'TU-ANON-KEY-AQUI',

  // Nombre de la empresa (aparece en la cabecera)
  EMPRESA: 'Suministros Talleres Unai SL',

  // CPVs que se monitorizan por defecto
  CPVS_DEFAULT: [
    { code: '50530000', label: 'Mantenimiento de maquinaria' },
    { code: '50000000', label: 'Reparación y mantenimiento' },
    { code: '42000000', label: 'Maquinaria industrial' },
    { code: '44500000', label: 'Herramientas y repuestos' },
    { code: '43000000', label: 'Maquinaria minería / construcción' },
  ],

  // Zona geográfica por defecto
  ZONA_DEFAULT: 'bizkaia',
};
