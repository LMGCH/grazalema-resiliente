// ==========================================
// 1. CONFIGURACIÓN E INICIALIZACIÓN DEL MAPA
// ==========================================
// Variable global única para el mapa base de Leaflet
const mapa = L.map('map').setView([36.7589, -5.3649], 10);

// Capa visual de OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
}).addTo(mapa);

// Capa dedicada exclusiva para los marcadores de terremotos
const capaTerremotos = L.layerGroup().addTo(mapa);

// Variables de control para la reconexión y temporizadores
let tiempoRestante = 60; 
let temporizadorRegresivo = null;

// ==========================================
// 2. CONFIGURACIÓN DE LAS APIS
// ==========================================
const urlEMSC = "https://seismicportal.eu";
const urlAEMET = "https://aemet.es";

// IMPORTANTE: Pon aquí tu clave personal de AEMET OpenData
const apiKeyAEMET = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJsdWlzbS5nYWxhY2hvQGdtYWlsLmNvbSIsImp0aSI6IjY3NDk1MTRiLTM2ZmMtNDA2Yi05MTRlLWVjYTIzYzZiNDMyMCIsImlzcyI6IkFFTUVUIiwiaWF0IjoxNzgwNTIwOTEyLCJ1c2VySWQiOiI2NzQ5NTE0Yi0zNmZjLTQwNmItOTE0ZS1lY2EyM2M2YjQzMjAiLCJyb2xlIjoiIn0.bvPNqAZvDfh31fMS6I1p9Wyu2XTRCzU6oCrh10iYv0s"; 

// ==========================================
// 3. MÓDULO SÍSMICO (EMSC - SEISMICPORTAL)
// ==========================================
async function cargarTerremotos() {
    try {
        console.log("Consultando datos sísmicos a EMSC...");
        const respuesta = await fetch(urlEMSC);
        if (!respuesta.ok) throw new Error(`EMSC HTTP ${respuesta.status}`);

        const datos = await respuesta.json();
        const seismos = datos.features || [];

        // Limpiamos los marcadores antiguos antes de pintar los nuevos
        capaTerremotos.clearLayers();

        seismos.forEach(seismo => {
            const prop = seismo.properties;
            const geom = seismo.geometry;

            // CORRECCIÓN CLAVE GeoJSON: [Longitud, Latitud]. Leaflet usa [Lat, Lon]
            const lon = geom.coordinates[0];
            const lat = geom.coordinates[1];

            const magnitud = prop.mag;
            const lugar = prop.flynn_region || "Sur de España";
            const fecha = new Date(prop.time).toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });
            const profundidad = prop.depth;

            // Colores dinámicos según intensidad
            const colorIcono = magnitud >= 4.0 ? '#d9534f' : magnitud >= 2.5 ? '#f0ad4e' : '#5cb85c';
            const radio = magnitud * 4;

            // Crear y añadir el marcador circular a la capa específica
            const marcador = L.circleMarker([lat, lon], {
                radius: radio,
                fillColor: colorIcono,
                color: "#000",
                weight: 1,
                opacity: 1,
                fillOpacity: 0.7
            });

            marcador.bindPopup(`
                <div style="font-family: sans-serif; min-width: 140px;">
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

        console.log(`EMSC cargado con éxito. Seismos pintados: ${seismos.length}`);
    } catch (error) {
        console.error("Fallo en la carga sísmica (EMSC):", error);
    }
}

// ==========================================
// 4. MÓDULO METEOROLÓGICO (AEMET - DOBLE FETCH)
// ==========================================
async function cargarMeteorologia() {
    try {
        console.log("Iniciando Paso 1 de AEMET...");
        const paso1 = await fetch(urlAEMET, {
            method: 'GET',
            headers: {
                'cache-control': 'no-cache',
                'api_key': apiKeyAEMET
            }
        });

        if (!paso1.ok) throw new Error(`AEMET Paso 1 HTTP ${paso1.status}`);
        const resultadoPaso1 = await paso1.json();

        if (resultadoPaso1.estado === 200 && resultadoPaso1.datos) {
            console.log("Paso 1 correcto. Descargando JSON definitivo...");
            
            // Paso 2: Consultar la URL temporal que nos devuelve la API
            const paso2 = await fetch(resultadoPaso1.datos);
            if (!paso2.ok) throw new Error("AEMET Paso 2 falló");
            
            const datosClima = await paso2.json();

            if (datosClima && datosClima.length > 0) {
                // Tomamos la última medición horaria registrada de la estación
                const ultimaMedicion = datosClima[datosClima.length - 1];
                mostrarDatosClimaHTML(ultimaMedicion);
            }
        } else {
            throw new Error(`AEMET rechazó la clave: ${resultadoPaso1.descripcion}`);
        }
    } catch (error) {
        console.error("Fallo en la carga meteorológica (AEMET):", error);
        mostrarErrorClimaHTML();
    }
}

// Interfaz visual para los datos correctos del clima
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

// Interfaz visual si AEMET falla o está reconectando
function mostrarErrorClimaHTML() {
    const contenedor = obtenerContenedorPanel();
    contenedor.innerHTML = `
        <h4 style="margin: 0 0 5px 0; color: #c0392b;">Clima Temporalmente Fuera de Servicio</h4>
        <hr style="margin: 5px 0; border:0; border-top:1px solid #ccc;">
        <p style="margin: 5px 0; font-size: 11px; color: #555;">
            Error de conexión / CORS de AEMET. Intentando reconexión automática.
        </p>
        <div style="background: #f8d7da; color: #721c24; padding: 6px; border-radius: 4px; text-align: center; font-weight: bold;">
            Siguiente intento en: <span id="contador-reconexion">${tiempoRestante}</span>s
        </div>
    `;
}

// Función auxiliar para asegurar que el panel flotante exista en tu web
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
// 5. GESTOR DE RECONEXIÓN AUTOMÁTICA (CONTADOR)
// ==========================================
function iniciarTemporizadorReconexion() {
    // Si ya existía un contador activo, lo destruimos para que no se duplique
    if (temporizadorRegresivo) clearInterval(temporizadorRegresivo);

    tiempoRestante = 60; // Reiniciamos a 1 minuto

    temporizadorRegresivo = setInterval(() => {
        tiempoRestante--;
        
        const elementoContador = document.getElementById('contador-reconexion');
        if (elementoContador) {
            elementoContador.textContent = tiempoRestante;
        }

        if (tiempoRestante <= 0) {
            clearInterval(temporizadorRegresivo);
            console.log("Contador llegó a cero. Ejecutando reconexión activa...");
            ejecutarCargaCompleta();
        }
    }, 1000);
}

// Agrupador de llamadas principales
function ejecutarCargaCompleta() {
    cargarTerremotos();
    cargarMeteorologia();
    iniciarTemporizadorReconexion(); // Reinicia el bucle del contador de 60s
}

// ==========================================
// 6. DISPARADOR INICIAL AL CARGAR LA PÁGINA
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    ejecutarCargaCompleta();
});
