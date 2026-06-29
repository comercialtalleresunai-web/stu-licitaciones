#!/usr/bin/env python3
"""
STU Alertas - Script de busqueda diaria de licitaciones de maquinaria agricola
Ejecutado por GitHub Actions cada manana a las 8:00h (hora peninsular)
"""
import requests
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import date, timedelta
import os
import json

# --- Configuracion (desde secrets de GitHub Actions) ---
SUPABASE_URL = os.environ['SUPABASE_URL']
SUPABASE_KEY = os.environ['SUPABASE_SERVICE_KEY']
EMAIL_DESTINO = os.environ['EMAIL_DESTINO']
EMAIL_ORIGEN = os.environ['EMAIL_ORIGEN']
EMAIL_PASSWORD = os.environ['EMAIL_PASSWORD']

SMTP_HOST = 'smtp.hostinger.com'
SMTP_PORT = 465

# --- CPVs de maquinaria agricola y forestal (corregidos) ---
CPV_LIST = [
    {'codigo': '16000000', 'descripcion': 'Maquinaria agricola (CPV padre)'},
    {'codigo': '16160000', 'descripcion': 'Equipo diverso para jardineria'},
    {'codigo': '16310000', 'descripcion': 'Maquinas segadoras'},
    {'codigo': '16311000', 'descripcion': 'Maquinas cortadoras de cesped'},
    {'codigo': '16600000', 'descripcion': 'Maquinaria agricola o forestal especializada'},
    {'codigo': '16800000', 'descripcion': 'Partes de maquinaria agricola y forestal'},
]

SUPABASE_HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}


def get_expedientes_existentes():
    """Obtiene los expedientes ya guardados para evitar duplicados"""
    try:
        resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/licitaciones?select=expediente&not.expediente.is.null",
            headers=SUPABASE_HEADERS,
            timeout=30
        )
        if resp.status_code == 200:
            return {r['expediente'] for r in resp.json() if r.get('expediente')}
    except Exception as e:
        print(f"Error obteniendo expedientes: {e}")
    return set()


def buscar_licitaciones_api():
    """Busca licitaciones nuevas en la API de contratacion publica"""
    hoy = date.today()
    ayer = hoy - timedelta(days=1)
    nuevas = []
    existentes = get_expedientes_existentes()
    print(f"Expedientes ya en BD: {len(existentes)}")

    for cpv_info in CPV_LIST:
        cpv = cpv_info['codigo']
        desc = cpv_info['descripcion']
        print(f"Buscando CPV {cpv} ({desc})...")

        try:
            # API PLACE (Plataforma de Licitacion Electronica)
            # Endpoint de datos abiertos de contratacion del Estado
            url = "https://contrataciondelestado.es/wps/PA_1_GENERAL_ACTIONSOCIAL83KG532DO53UOJ/ObtenerDocumento"
            params = {
                'tipo': 'licitaciones',
                'codCPV': cpv,
                'fechaDesde': ayer.strftime('%d-%m-%Y'),
                'fechaHasta': hoy.strftime('%d-%m-%Y')
            }
            resp = requests.get(url, params=params, timeout=30,
                                headers={'Accept': 'application/json'})

            print(f"  -> Status: {resp.status_code}")

            if resp.status_code == 200:
                try:
                    data = resp.json()
                    lics = data if isinstance(data, list) else data.get('licitaciones', [])
                    for lic in lics:
                        exp = str(lic.get('expediente', lic.get('numeroExpediente', lic.get('id', ''))))
                        if exp and exp not in existentes:
                            lic['_cpv_buscado'] = cpv
                            lic['_cpv_desc'] = desc
                            nuevas.append(lic)
                            existentes.add(exp)
                            print(f"  -> Nueva: {str(lic.get('titulo', ''))[:60]}")
                except Exception as e:
                    print(f"  -> Error parseando JSON: {e}")

        except Exception as e:
            print(f"  -> Error conectando: {e}")

    return nuevas


def guardar_licitacion(lic):
    """Guarda una licitacion en Supabase"""
    try:
        data = {
            'titulo': str(lic.get('titulo', lic.get('descripcion', lic.get('title', 'Sin titulo'))))[:500],
            'organismo': str(lic.get('organoContratacion', lic.get('organismo', lic.get('entidad', ''))))[:300],
            'importe': float(lic.get('importeLicitacion', lic.get('importe', lic.get('presupuesto', 0))) or 0),
            'cpv': str(lic.get('_cpv_buscado', lic.get('cpv', '')))[:50],
            'url': str(lic.get('url', lic.get('enlace', lic.get('link', ''))))[:500],
            'expediente': str(lic.get('expediente', lic.get('numeroExpediente', lic.get('id', ''))))[:100],
            'plazo': lic.get('plazo') or None,
            'estado': 'detectada',
            'creado_por': 'robot-alertas'
        }
        resp = requests.post(
            f"{SUPABASE_URL}/rest/v1/licitaciones",
            headers=SUPABASE_HEADERS,
            json=data,
            timeout=30
        )
        if resp.status_code in [200, 201]:
            return data
        print(f"Error guardando en Supabase: {resp.status_code} - {resp.text[:200]}")
    except Exception as e:
        print(f"Excepcion guardando licitacion: {e}")
    return None


def enviar_email(licitaciones):
    """Envia email con resumen de nuevas licitaciones"""
    if not licitaciones:
        return

    asunto = f"STU Alertas: {len(licitaciones)} licitacion(es) nueva(s) [{date.today().strftime('%d/%m/%Y')}]"

    html = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;margin:20px;color:#1f2937">
  <div style="max-width:600px;margin:0 auto">
    <h2 style="color:#2563eb;border-bottom:2px solid #e5e7eb;padding-bottom:10px">
      STU Licitaciones &mdash; Nuevas alertas
    </h2>
    <p>Se han detectado <strong>{len(licitaciones)}</strong> licitacion(es) nueva(s) el {date.today().strftime('%d/%m/%Y')}:</p>
"""

    for lic in licitaciones:
        importe = float(lic.get('importe', 0) or 0)
        imp_str = f"{importe:,.0f} &euro;" if importe > 0 else "No especificado"
        url = lic.get('url', '')
        html += f"""
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-left:4px solid #2563eb;
                padding:16px;margin:12px 0;border-radius:4px">
      <h3 style="margin:0 0 8px;color:#1e40af;font-size:15px">{lic.get('titulo', 'Sin titulo')}</h3>
      <table style="font-size:13px;color:#374151;width:100%">
        <tr><td style="padding:2px 8px 2px 0;font-weight:bold;white-space:nowrap">Organismo:</td>
            <td>{lic.get('organismo', 'No especificado')}</td></tr>
        <tr><td style="padding:2px 8px 2px 0;font-weight:bold">Importe:</td>
            <td>{imp_str}</td></tr>
        <tr><td style="padding:2px 8px 2px 0;font-weight:bold">CPV:</td>
            <td>{lic.get('cpv', '')} &mdash; {lic.get('_cpv_desc', '')}</td></tr>
        <tr><td style="padding:2px 8px 2px 0;font-weight:bold">Expediente:</td>
            <td>{lic.get('expediente', '')}</td></tr>
      </table>
      {f'<p style="margin:8px 0 0"><a href="{url}" style="color:#2563eb">Ver licitacion &rarr;</a></p>' if url else ''}
    </div>
"""

    html += f"""
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0">
    <p style="font-size:12px;color:#6b7280">
      Generado automaticamente por STU Licitaciones &bull;
      <a href="https://comercialtalleresunai-web.github.io/stu-licitaciones/" style="color:#2563eb">
        Abrir aplicacion
      </a>
    </p>
  </div>
</body>
</html>"""

    msg = MIMEMultipart('alternative')
    msg['Subject'] = asunto
    msg['From'] = EMAIL_ORIGEN
    msg['To'] = EMAIL_DESTINO
    msg.attach(MIMEText(html, 'html', 'utf-8'))

    context = ssl.create_default_context()
    with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=context) as server:
        server.login(EMAIL_ORIGEN, EMAIL_PASSWORD)
        server.sendmail(EMAIL_ORIGEN, EMAIL_DESTINO, msg.as_string())
    print(f"Email enviado a {EMAIL_DESTINO}")


def main():
    print(f"=== STU Alertas --- {date.today()} ===")
    print(f"CPVs monitorizados: {[c['codigo'] for c in CPV_LIST]}")

    licitaciones = buscar_licitaciones_api()
    print(f"Total nuevas encontradas: {len(licitaciones)}")

    guardadas = []
    for lic in licitaciones:
        resultado = guardar_licitacion(lic)
        if resultado:
            guardadas.append(resultado)

    print(f"Guardadas en Supabase: {len(guardadas)}")

    if guardadas:
        enviar_email(guardadas)
    else:
        print("No hay licitaciones nuevas hoy - no se envia email")

    print("=== Proceso completado ===")


if __name__ == '__main__':
    main()
