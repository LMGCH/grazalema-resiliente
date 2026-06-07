import feedparser
import json
import os

RSS_URL = "https://www.aemet.es/documentos_d/eltiempo/prediccion/avisos/rss/CAP_AFAZ611101_RSS.xml"

feed = feedparser.parse(RSS_URL)

datos = {
    "hayAvisos": False,
    "titulo": "",
    "fecha": "",
    "enlace": ""
}

# Comprobamos si hay entradas reales
if hasattr(feed, "entries") and len(feed.entries) > 0:

    item = feed.entries[0]

    titulo = getattr(item, "title", "")

    datos["titulo"] = titulo
    datos["fecha"] = getattr(item, "published", "")
    datos["enlace"] = getattr(item, "link", "")

    # Detectamos si hay avisos reales
    datos["hayAvisos"] = "No hay avisos" not in titulo

else:
    # Caso seguro: no hay avisos o feed vacío
    datos["titulo"] = "No hay avisos para Grazalema"
    datos["hayAvisos"] = False

os.makedirs("datos", exist_ok=True)

with open("datos/alertas.json", "w", encoding="utf-8") as f:
    json.dump(datos, f, ensure_ascii=False, indent=2)

print("OK - alertas.json generado")
