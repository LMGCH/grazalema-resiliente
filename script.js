// ==========================================
// 1. CONFIGURACIÓN GENERAL Y VARIABLES DE CONTROL
// ==========================================
let tiempoRestante = 60;
let temporizadorRegresivo = null;

// Coordenadas exactas de Grazalema
const latGrazalema = "36.7589";
const lonGrazalema = "-5.3649";

// URLs directas de datos puros libres de proxies y alertas de antivirus
const urlEMSCBase = "https://seismicportal.eu";
const urlMeteoBase = `https://open-meteo.com{latGrazalema}&longitude=${lonGrazalema}&current_weather=true&timezone=Europe%2FMadrid`;

// ==========================================
// 2. CAPTURA DE SISMICIDAD (EMSC) - COMPROBADO
// ==========================================
async function cargarTerremotos() {
    const sismoInfo = document.getElementById('sismo-info');
    const semaforoSismico = document.getElementById('semaforo-sismico');
    if (!sismoInfo) return;

    try {
        const respuesta = await fetch(urlEMSCBase);
        if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);

        const datos = await respuesta.json();
        const seismos = datos.features || [];

        if (seismos.length === 0) {
            sismoInfo.innerHTML = "Sin actividad reciente en la zona.";
            if (semaforoSismico) {
                semaforoSismico.textContent = "Estable";
                semaforoSismico.className = "status-badge alert-verde"; 
            }
            return;
        }

        // CORRECCIÓN DE INDIZACIÓN: Acceso correcto al primer elemento del array GeoJSON
        const primerSeismo = seismos[0];
        const prop = primerSeismo.properties;
        const magnitud = prop.mag;
        const lugar = prop.flynn_region || "Sur de España";
        
        let horaSismo = "--:--";
        if (prop.time) {
            horaSismo = new Date(prop.time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        }

        sismoInfo.innerHTML = `Mág: <strong style="color:#e74c3c;">${magnitud} mbLg</strong> en ${lugar} (${horaSismo}h).`;

        if (semaforoSismico) {
            if (magnitud >= 4.0) {
                semaforoSismico.textContent = "Peligro";
                semaforoSismico.className = "status-badge alert-rojo"; 
            } else if (magnitud >= 2.5) {
                semaforoSismico.textContent = "Atención";
                semaforoSismico.className = "status-badge alert-naranja";
            } else {
                semaforoSismico.textContent = "Estable";
                semaforoSismico.className = "status-badge alert-verde";
            }
        }

    } catch (error) {
        console.error("Error sismológico:", error);
        sismoInfo.innerHTML = "<span style='color:#7f8c8d;'>Dato sísmico retenido por filtro local o red.</span>";
    }
}

// ==========================================
// 3. CAPTURA METEOROLÓGICA (OPEN-METEO) - REPARADO
// ==========================================
async function cargarMeteorologia() {
    const meteoInfo = document.getElementById('meteo-info');
    const semaforoMeteo = document.getElementById('semaforo-meteo');
    if (!meteoInfo) return;

    try {
        const respuesta = await fetch(urlMeteoBase);
        if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
        
        const datos = await respuesta.json();
        
        // CORRECCIÓN CRÍTICA: Mapeo exacto de las variables nativas de la API Open-Meteo
        if (datos && datos.current_weather) {
            const clima = datos.current_weather;
            const temp = clima.temperature ?? 'N/A';
            const viento = clima.windspeed ?? 'N/A';
            const direccion = clima.winddirection ?? 'N/A';

            // Inyección limpia y directa del texto en tu interfaz HTML
            meteoInfo.innerHTML = `${temp}°C | Viento: ${viento} km/h (Dir: ${direccion}°).`;

            // Semáforo dinámico basado en la velocidad del viento (parámetro crítico en la sierra)
            if (semaforoMeteo) {
                const velViento = parseFloat(viento);
                if (velViento > 50) {
                    semaforoMeteo.textContent = "Alerta Viento";
                    semaforoMeteo.className = "status-badge alert-rojo";
                } else if (velViento > 25) {
                    semaforoMeteo.textContent = "Riesgo Moderado";
                    semaforoMeteo.className = "status-badge alert-naranja";
                } else {
                    semaforoMeteo.textContent = "Sin Alertas";
                    semaforoMeteo.className = "status-badge alert-verde";
                }
            }
        }
    } catch (error) {
        console.error("Error meteorológico:", error);
        meteoInfo.innerHTML = "<span style='color:#7f8c8d;'>Esperando actualización de red...</span>";
    }
}

// ==========================================
// 4. TEMPORIZADOR, RELOJ Y CONTROLADORES
// ==========================================
function actualizarHoraSincronizacion() {
    const horaSync = document.getElementById('hora-sync');
    if (horaSync) {
        const ahora = new Date();
        horaSync.textContent = ahora.toLocaleTimeString('es-ES');
    }
}

function iniciarContadorRegresivo() {
    if (temporizadorRegresivo) clearInterval(temporizadorRegresivo);
    tiempoRestante = 60;

    temporizadorRegresivo = setInterval(() => {
        tiempoRestante--;
        const elementoContador = document.getElementById('contador-regresivo');
        if (elementoContador) {
            elementoContador.textContent = tiempoRestante;
        }

        if (tiempoRestante <= 0) {
            clearInterval(temporizadorRegresivo);
            ejecutarCargaCompleta();
        }
    }, 1000);
}

function ejecutarCargaCompleta() {
    cargarTerremotos();
    cargarMeteorologia();
    actualizarHoraSincronizacion();
    iniciarContadorRegresivo();
}

window.addEventListener('DOMContentLoaded', () => {
    ejecutarCargaCompleta();
});



