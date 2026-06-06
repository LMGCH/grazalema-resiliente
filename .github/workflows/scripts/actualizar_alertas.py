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

if len(feed.entries) > 0:

    item = feed.entries[0]

    titulo = item.title

    datos["titulo"] = titulo
    datos["fecha"] = item.published
    datos["enlace"] = item.link

    datos["hayAvisos"] = (
        "No hay avisos para Grazalema"
        not in titulo
    )

os.makedirs("datos", exist_ok=True)

with open(
    "datos/alertas.json",
    "w",
    encoding="utf-8"
) as f:
    json.dump(
        datos,
        f,
        ensure_ascii=False,
        indent=2
    )

print("alertas.json actualizado")
