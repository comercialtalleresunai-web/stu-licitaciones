// STU Licitaciones — Configuración
// ⚠️ Rellena estos valores con los de tu proyecto Supabase
// Supabase → Settings → API

const CONFIG = {
  // Project URL (empieza por https://xxxx.supabase.co)
  SUPABASE_URL: 'https://jlwiikdwlsqwcaoxlljg.supabase.co',

  // anon public key (segura para el frontend)
  SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impsd2lpa2R3bHNxd2Nhb3hsbGpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0NzAzMDAsImV4cCI6MjA5ODA0NjMwMH0.c-Qkr9W_C4fh9vbZySnrGVc2XOJtijI4uYj8_YIOg7c',

  // Nombre de la empresa (aparece en la cabecera)
  EMPRESA: 'Suministros Talleres Unai SL',

  // CPVs de maquinaria agricola y forestal monitorizados
  CPVS_DEFAULT: [
    { code: '16000000', label: 'Maquinaria agrícola (padre)' },
    { code: '16160000', label: 'Equipo diverso para jardinería' },
    { code: '16310000', label: 'Máquinas segadoras' },
    { code: '16311000', label: 'Cortadoras de césped' },
    { code: '16600000', label: 'Maquinaria agrícola/forestal especializada' },
    { code: '16800000', label: 'Partes de maquinaria agrícola y forestal' },
  ],

  // Zona geográfica por defecto
  ZONA_DEFAULT: 'bizkaia',
};
