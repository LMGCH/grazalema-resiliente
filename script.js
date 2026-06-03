// ==========================================
// 1. INICIALIZACIÓN DE LA CARTOGRAFÍA (Leaflet)
// ==========================================
const mapa = L.map('map').setView([36.7589, -5.3649], 10);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
}).addTo(mapa);

const capaTerremotos = L.layerGroup().addTo(mapa);

let tiempoRestante = 60;
let temporizadorRegresivo = null;

// ==========================================
// 2. ENRUTAMIENTO CON PROXY CORS (Solución Definitiva)
// ==========================================
// CORREGIDO: URL completa del proxy necesaria para recibir JSON limpio
const proxyCors = "https://allorigins.win";

// CORREGIDO: URLs completas de los servicios de datos
const urlEMSCBase = "https://seismicportal.eu";
const urlAEMETBase = "https://aemet.es";

// Tu clave autorizada de AEMET OpenData (Ya integrada)
const apiKeyAEMET = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJsdWlzbS5nYWxhY2hvQGdtYWlsLmNvbSIsImp0aSI6IjY3NDk1MTRiLTM2ZmMtNDA2Yi05MTRlLWVjYTIzYzZiNDMyMCIsImlzcyI6IkFFTUVUIiwiaWF0IjoxNzgwNTIwOTEyLCJ1c2VySWQiOiI2NzQ5NTE0Yi0zNmZjLTQwNmItOTE0ZS1lY2EyM2M2YjQzMjAiLCJyb2xlIjoiIn0.bvPNqAZvDfh31fMS6I1p9Wyu2XTRCzU6oCrh10iYv0s";

const urlEMSCSegura = proxyCors + encodeURIComponent(urlEMSCBase);
const urlAEMETSegura = proxyCors + encodeURIComponent(urlAEMETBase);

// ==========================================
// 3. CAPTURA DE DATOS SÍSMICOS (EMSC)
// ==========================================
async function cargarTerremotos() {
    try {
        console.log("Iniciando conexión sísmica mediante pasarela proxy...");
        const respuesta = await fetch(urlEMSCSegura);
        if (!respuesta.ok) throw new Error(`EMSC Estado: ${respuesta.status}`);

        const datos = await respuesta.json();
        const seismos = datos.features || [];

        capaTerremotos.clearLayers();

        seismos.forEach(seismo => {
            const prop = seismo.properties;
            const geom = seismo.geometry;

            const lon = geom.coordinates[0];
            const lat = geom.coordinates[1];

            const magnitud = prop.mag;
            const lugar = prop.flynn_region || "Sur de España";
            const fecha = new Date(prop.time).toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });
            const profundidad = prop.depth;

            const colorIcono = magnitud >= 4.0 ? '#d9534f' : magnitud >= 2.5 ? '#f0ad4e' : '#5cb85c';
            const radio = magnitud * 4;

            const marcador = L.circleMarker([lat, lon], {
                radius: radio,
                fillColor: colorIcono,
                color: "#000",
                weight: 1,
                opacity: 1,
                fillOpacity: 0.7
            });

            marcador.bindPopup(`
                <div style="font-family: Arial, sans-serif; min-width: 140px;">
                    <h4 style="margin:0 0 5px; color:${colorIcono};">Terremoto Detectado</h4>
                    <hr style="margin:4px 0; border:0; border-top:1px solid #eee;">
                    <b>Magnitud:</b> ${magnitud}<br>
                    <b>Zona:</b> ${lugar}<br>
                    <b>Fecha:</b> ${fecha}<br>
                    <b>Profundidad:</b> ${profundidad} km
                </div>
            `);

            marcador.addTo(capaTerremotos);
        });

        console.log(`EMSC procesado con éxito. Eventos mapeados: ${seismos.length}`);
    } catch (error) {
        console.error("Error en procesamiento de seísmos:", error);
    }
}

// ==========================================
// 4. CAPTURA DE DATOS METEOROLÓGICOS (AEMET)
// ==========================================
async function cargarMeteorologia() {
    try {
        console.log("Iniciando Paso 1 AEMET mediante pasarela proxy...");
        const paso1 = await fetch(urlAEMETSegura, {
            method: 'GET',
            headers: {
                'api_key': apiKeyAEMET
            }
        });

        if (!paso1.ok) throw new Error(`AEMET Paso 1 Estado: ${paso1.status}`);
        const resultadoPaso1 = await paso1.json();

        if (resultadoPaso1.estado === 200 && resultadoPaso1.datos) {
            console.log("Paso 1 validado. Recuperando datos definitivos de AEMET...");
            
            const urlFinalSegura = proxyCors + encodeURIComponent(resultadoPaso1.datos);
            const paso2 = await fetch(urlFinalSegura);
            if (!paso2.ok) throw new Error("AEMET Paso 2 falló");
            
            const datosClima = await paso2.json();

            if (datosClima && datosClima.length > 0) {
                const ultimaMedicion = datosClima[datosClima.length - 1];
                mostrarDatosClimaHTML(ultimaMedicion);
                if (temporizadorRegresivo) clearInterval(temporizadorRegresivo);
            }
        } else {
            throw new Error(`AEMET denegó el acceso: ${resultadoPaso1.descripcion}`);
        }
    } catch (error) {
        console.error("Error en procesamiento meteorológico:", error);
        mostrarErrorClimaHTML();
    }
}

function mostrarDatosClimaHTML(clima) {
    const contenedor = obtenerContenedorPanel();
    contenedor.innerHTML = `
        <h4 style="margin: 0 0 5px 0; color: #2c3e50;">Clima en Grazalema</h4>
        <hr style="margin: 5px 0; border:0; border-top:1px solid #ccc;">
        <b>Estación:</b> ${clima.ubi}<br>
        <b>Hora Obs:</b> ${clima.fint}<br>
        <b>Temperatura:</b> ${clima.ta ?? 'N/A'} °C<br>
        <b>Precipitación:</b> ${clima.prec ?? '0'} mm<br>
        <b>Viento:</b> ${clima.vv ?? 'N/A'} m/s (${clima.dv ?? 'N/A'})<br>
        <b>Humedad:</b> ${clima.hr ?? 'N/A'} %
    `;
}

function mostrarErrorClimaHTML() {
    const contenedor = obtenerContenedorPanel();
    contenedor.innerHTML = `
        <h4 style="margin: 0 0 5px 0; color: #c0392b;">Clima Fuera de Servicio</h4>
        <hr style="margin: 5px 0; border:0; border-top:1px solid #ccc;">
        <p style="margin: 5px 0; font-size: 11px; color: #555;">
            Estabilizando pasarela proxy. Intentando reconexión automática.
        </p>
        <div style="background: #f8d7da; color: #721c24; padding: 6px; border-radius: 4px; text-align: center; font-weight: bold;">
            Reconexión en: <span id="contador-reconexion">${tiempoRestante}</span>s
        </div>
    `;
    iniciarTemporizadorReconexion();
}

function obtenerContenedorPanel() {
    let panel = document.getElementById('panel-clima');
    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'panel-clima';
        panel.style = "position: absolute; top: 10px; right: 10px; z-index: 1000; background: white; padding: 12px; border-radius: 6px; box-shadow: 0 2px 10px rgba(0,0,0,0.15); font-family: Arial, sans-serif; font-size: 12px; max-width: 220px;";
        document.body.appendChild(panel);
    }
    return panel;
}

// ==========================================
// 5. MOTOR DEL CONTADOR REGRESIVO ASÍNCRONO
// ==========================================
function iniciarTemporizadorReconexion() {
    if (temporizadorRegresivo) clearInterval(temporizadorRegresivo);
    tiempoRestante = 60;

    temporizadorRegresivo = setInterval(() => {
        tiempoRestante--;
        const elementoContador = document.getElementById('contador-reconexion');
        if (elementoContador) {
            elementoContador.textContent = tiempoRestante;
        }

        if (tiempoRestante <= 0) {
            clearInterval(temporizadorRegresivo);
            console.log("Contador a cero. Reejecutando llamadas...");
            ejecutarCargaCompleta();
        }
    }, 1000);
}

function ejecutarCargaCompleta() {
    cargarTerremotos();
    cargarMeteorologia();
}

// ==========================================
// 6. ENTRADA DE EJECUCIÓN DOM
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    ejecutarCargaCompleta();
});
