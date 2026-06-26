-- STU Licitaciones — Schema Supabase
-- Ejecutar en: Supabase → SQL Editor → New Query

-- Tabla de licitaciones
create table if not exists licitaciones (
  id            uuid primary key default gen_random_uuid(),
  titulo        text not null,
  organismo     text,
  importe       numeric,
  plazo         date,
  cpv           text,
  estado        text default 'detectada' check (estado in ('detectada','preparando','presentada','resuelta')),
  resultado     text check (resultado in ('ganada','perdida','desierta',null)),
  url           text,
  expediente    text,
  notas         text,
  creado_por    text,
  creado_en     timestamptz default now(),
  actualizado_en timestamptz default now()
);

-- Historial de cambios en licitaciones
create table if not exists licitaciones_historial (
  id              uuid primary key default gen_random_uuid(),
  licitacion_id   uuid references licitaciones(id) on delete cascade,
  accion          text not null,
  usuario         text,
  fecha           timestamptz default now()
);

-- Tabla de prospectos
create table if not exists prospectos (
  id            uuid primary key default gen_random_uuid(),
  empresa       text not null,
  municipio     text,
  sector        text,
  maquinaria    text,
  contacto_nombre text,
  contacto_email  text,
  contacto_tel    text,
  fuente        text,
  score         integer default 3 check (score between 1 and 5),
  estado        text default 'identificado' check (estado in ('identificado','contactado','interesado','cliente','descartado')),
  notas         text,
  creado_en     timestamptz default now(),
  actualizado_en timestamptz default now()
);

-- Tabla de alertas configuradas
create table if not exists alertas_config (
  id            uuid primary key default gen_random_uuid(),
  email         text not null,
  zona          text default 'bizkaia',
  cpvs          text[] default array['50530000','50000000','42000000','44500000','43000000'],
  keywords      text[],
  activa        boolean default true,
  creado_en     timestamptz default now()
);

-- Log de alertas enviadas
create table if not exists alertas_log (
  id            uuid primary key default gen_random_uuid(),
  fecha         timestamptz default now(),
  licitaciones_encontradas integer default 0,
  emails_enviados integer default 0,
  detalle       jsonb
);

-- Índices para búsquedas frecuentes
create index if not exists idx_licitaciones_estado on licitaciones(estado);
create index if not exists idx_licitaciones_plazo on licitaciones(plazo);
create index if not exists idx_prospectos_estado on prospectos(estado);
create index if not exists idx_prospectos_score on prospectos(score desc);

-- Función para actualizar timestamp automáticamente
create or replace function actualizar_timestamp()
returns trigger as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$ language plpgsql;

-- Triggers de timestamp
create trigger trg_licitaciones_ts
  before update on licitaciones
  for each row execute function actualizar_timestamp();

create trigger trg_prospectos_ts
  before update on prospectos
  for each row execute function actualizar_timestamp();

-- Row Level Security (RLS) — todos los usuarios autenticados pueden leer/escribir
alter table licitaciones enable row level security;
alter table prospectos enable row level security;
alter table licitaciones_historial enable row level security;
alter table alertas_config enable row level security;

create policy "acceso_autenticado_licitaciones"
  on licitaciones for all
  to authenticated
  using (true) with check (true);

create policy "acceso_autenticado_prospectos"
  on prospectos for all
  to authenticated
  using (true) with check (true);

create policy "acceso_autenticado_historial"
  on licitaciones_historial for all
  to authenticated
  using (true) with check (true);

create policy "acceso_autenticado_alertas"
  on alertas_config for all
  to authenticated
  using (true) with check (true);

-- Datos iniciales: CPVs más comunes para STU
comment on table licitaciones is 'CPVs clave: 50530000 (mantenimiento maquinaria), 42000000 (maquinaria industrial), 44500000 (herramientas/repuestos)';
