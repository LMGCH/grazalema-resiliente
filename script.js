// ==========================================
// 0. TIEMPO Y CONTADOR REGRESIVO
// ==========================================
let tiempoRestante = 60;
let intervaloContador;

async function actualizarPlataforma() {
    const horaActual = new Date().toLocaleTimeString();
    const horaSyncElem = document.getElementById("hora-sync");
    if (horaSyncElem) horaSyncElem.textContent = horaActual;
}

// ==========================================
// 1. INICIALIZACIÓN DEL MAPA (Leaflet)
// ==========================================
// Centrado en Grazalema (Cádiz)
const map = L.map('map').setView([36.7589, -5.3649], 10);

// Capa base de OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
}).addTo(map);

// ==========================================
// 2. MÓDULO SÍSMICO: EMSC (Alternativa al IGN)
// ==========================================
// Filtro geográfico: Caja sobre el sur de España / Andalucía
const urlEMSC = "https://seismicportal.eu";

async function cargarTerremotos() {
    try {
        const respuesta = await fetch(urlEMSC);
        if (!respuesta.ok) throw new Error(`Error EMSC: ${respuesta.status}`);
        
        const datos = await respuesta.json();
        const seismos = datos.features || [];

        seismos.forEach(seismo => {
            const prop = seismo.properties;
            const geom = seismo.geometry;
            
            // CORRECCIÓN CLAVE: GeoJSON entrega [Lon, Lat]. Leaflet necesita [Lat, Lon]
            const lon = geom.coordinates[0];
            const lat = geom.coordinates[1];
            
            const magnitud = prop.mag;
            const lugar = prop.flynn_region || "Sur de España";
            const fecha = new Date(prop.time).toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });
            const prof = prop.depth;

            // Estética del marcador según potencia
            const colorIcono = magnitud >= 4.0 ? '#d9534f' : magnitud >= 2.5 ? '#f0ad4e' : '#5cb85c';
            const radio = magnitud * 4;

            const marcador = L.circleMarker([lat, lon], {
                radius: radio,
                fillColor: colorIcono,
                color: "#000",
                weight: 1,
                opacity: 1,
                fillOpacity: 0.7
            }).addTo(map);

            marcador.bindPopup(`
                <div style="font-family: sans-serif;">
                    <h4 style="margin:0 0 5px; color:${colorIcono};">Terremoto Detectado</h4>
                    <b>Magnitud:</b> ${magnitud}<br>
                    <b>Zona:</b> ${lugar}<br>
                    <b>Fecha:</b> ${fecha}<br>
                    <b>Profundidad:</b> ${prof} km
                </div>
            `);
        });
        console.log("Módulo EMSC cargado con éxito.");
    } catch (error) {
        console.error("Error en módulo EMSC:", error);
    }
}

// ==========================================
// 3. MÓDULO METEOROLÓGICO: AEMET (Doble Fetch Obligatorio)
// ==========================================
// ID 11041Y corresponde a la estación de Grazalema
const apiAemetUrl = "https://aemet.es";
// NOTA: Tu API KEY debe estar activa. Si da error 401, renuévala en la web de AEMET OpenData.
const apiKey = "TU_API_KEY_AQUI"; 

async function cargarMeteorologia() {
    try {
        // PASO 1: Petición inicial para obtener la URL temporal de los datos [5]
        const respuestaPaso1 = await fetch(apiAemetUrl, {
            method: 'GET',
            headers: {
                'cache-control': 'no-cache',
                'api_key': apiKey
            }
        });

        if (!respuestaPaso1.ok) throw new Error(`AEMET Paso 1 falló: ${respuestaPaso1.status}`);
        
        const resultadoPaso1 = await respuestaPaso1.json();
        
        // Verificamos si AEMET nos ha devuelto la URL temporal de descarga [5]
        if (resultadoPaso1.estado === 200 && resultadoPaso1.datos) {
            const urlDatosTemporales = resultadoPaso1.datos;

            // PASO 2: Petición real al servidor seguro donde residen los datos JSON [5]
            const respuestaPaso2 = await fetch(urlDatosTemporales);
            if (!respuestaPaso2.ok) throw new Error("AEMET Paso 2 falló al descargar el JSON definitivo.");

            const datosClima = await respuestaPaso2.json();
            
            // Estación Grazalema: tomamos la última lectura disponible (el final del array)
            if (datosClima && datosClima.length > 0) {
                const ultimaLectura = datosClima[datosClima.length - 1];
                mostrarDatosClimaEnPantalla(ultimaLectura);
            }
        } else {
            console.error("AEMET no autorizó la llamada. Revisa si tu API Key ha caducado. Mensaje:", resultadoPaso1.descripcion);
        }
    } catch (error) {
        console.error("Error en módulo AEMET:", error);
    }
}

// Función auxiliar para pintar los datos del clima en tu interfaz HTML
function mostrarDatosClimaEnPantalla(clima) {
    // Buscamos contenedores en tu HTML. Si no existen, los crea en un panel flotante.
    let panelClima = document.getElementById('panel-clima');
    
    if (!panelClima) {
        panelClima = document.createElement('div');
        panelClima.id = 'panel-clima';
        panelClima.style = "position: absolute; top: 10px; right: 10px; z-index: 1000; background: white; padding: 10px; border-radius: 5px; box-shadow: 0 0 15px rgba(0,0,0,0.2); font-family: Arial, sans-serif; font-size: 13px;";
        document.body.appendChild(panelClima);
    }

    panelClima.innerHTML = `
        <h4 style="margin: 0 0 5px 0; color: #2c3e50;">Clima en Grazalema</h4>
        <hr style="margin: 5px 0;">
        <b>Estación:</b> ${clima.ubi}<br>
        <b>Hora Obs:</b> ${clima.fint}<br>
        <b>Temperatura:</b> ${clima.ta ?? 'N/A'} °C<br>
        <b>Precipitación:</b> ${clima.prec ?? '0'} mm<br>
        <b>Viento:</b> ${clima.vv ?? 'N/A'} m/s (${clima.dv ?? 'N/A'})<br>
        <b>Humedad:</b> ${clima.hr ?? 'N/A'} %
    `;
}

// ==========================================
// 4. DISPARADOR DE CARGA
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    cargarTerremotos();
    cargarMeteorologia();
});
