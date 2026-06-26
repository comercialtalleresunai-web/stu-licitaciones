# STU Licitaciones — CRM de contratación pública

App web para seguimiento de licitaciones públicas en Bizkaia y gestión de prospectos comerciales.

**Empresa:** Suministros Talleres Unai SL (B95993721) · Markina-Xemein / Gernika-Lumo

---

## Qué hace esta app

- **Alertas** — CPVs monitorizados (50530000, 42000000, 44500000...) + configuración de email
- **Seguimiento kanban** — Detectada → Preparando → Presentada → Resuelta
- **Ficha de licitación** — detalle, historial, enlace a plataforma oficial
- **Prospectos** — empresas detectadas en adjudicaciones como clientes potenciales de maquinaria

---

## Stack técnico

| Componente | Tecnología | Coste |
|---|---|---|
| Hosting web | GitHub Pages | Gratis |
| Base de datos | Supabase (PostgreSQL) | Gratis hasta 500MB |
| Autenticación | Supabase Auth | Gratis |
| Automatización alertas | GitHub Actions (cron diario) | Gratis |
| Frontend | HTML + JS vanilla | — |

---

## Puesta en marcha (paso a paso)

### 1. Crear base de datos en Supabase

1. Ir a [supabase.com](https://supabase.com) → crear cuenta → nuevo proyecto
2. Nombre del proyecto: `stu-licitaciones`
3. Contraseña de base de datos: guárdala en lugar seguro
4. Región: `eu-west-1` (Irlanda — más cercana)
5. Una vez creado, ir a **SQL Editor** y pegar el contenido de `supabase/schema.sql`
6. Copiar de **Settings → API**:
   - `Project URL` → pegar en `js/config.js` como `SUPABASE_URL`
   - `anon public key` → pegar en `js/config.js` como `SUPABASE_KEY`

### 2. Configurar GitHub Pages

1. En tu repositorio GitHub → **Settings → Pages**
2. Source: `Deploy from a branch` → rama `main` → carpeta `/ (root)`
3. Guardar — en 2 minutos la app estará en `https://TU-USUARIO.github.io/stu-licitaciones`

### 3. Añadir el proveedor colaborador

1. En GitHub → **Settings → Collaborators** → invitar por email
2. Rol: `Write` (puede editar) o `Read` (solo ver código)
3. Para acceso a datos: en Supabase → **Authentication → Users** → invitar email del proveedor

### 4. Activar alertas automáticas (opcional)

El archivo `.github/workflows/alertas.yml` ejecuta cada día a las 8:00h una búsqueda
de nuevas licitaciones en la API de contratación del Estado y envía email si encuentra
coincidencias con los CPVs configurados.

Para activarlo:
1. GitHub → **Settings → Secrets and variables → Actions**
2. Añadir secret: `EMAIL_DESTINO` con tu dirección de email
3. El workflow se activa solo cada mañana

---

## CPVs configurados por defecto

| CPV | Descripción |
|---|---|
| 50530000 | Servicios de reparación y mantenimiento de maquinaria |
| 50000000 | Servicios de reparación y mantenimiento (genérico) |
| 42000000 | Maquinaria industrial |
| 44500000 | Herramientas, cerraduras y repuestos |
| 43000000 | Maquinaria de minería y construcción |

---

## Estructura de archivos

```
stu-licitaciones/
├── index.html              # App principal
├── js/
│   ├── config.js           # URLs y claves Supabase (NO subir claves privadas)
│   ├── app.js              # Lógica principal
│   └── supabase.js         # Cliente de base de datos
├── css/
│   └── style.css           # Estilos
├── supabase/
│   └── schema.sql          # Tablas de la base de datos
├── .github/
│   └── workflows/
│       └── alertas.yml     # Automatización diaria de alertas
└── README.md
```

---

## Colaboración con el proveedor

El proveedor puede:
- Ver todas las licitaciones y prospectos compartidos
- Añadir sus propias licitaciones y prospectos
- Recibir las mismas alertas diarias por email
- Sugerir mejoras vía GitHub (Pull Requests o Issues)

Los datos son compartidos en tiempo real via Supabase — cualquier cambio de uno lo ve el otro al instante.
