// ==========================================
// 1. CONFIGURACIÓN GENERAL Y VARIABLES DE CONTROL
// ==========================================
let tiempoRestante = 60;
let temporizadorRegresivo = null;

// Coordenadas exactas de Grazalema
const latGrazalema = "36.7589";
const lonGrazalema = "-5.3649";

// SOLUCIÓN TOTAL: Direcciones blindadas usando variables de plantilla reales (`${}`)
const urlEMSCBase = "https://www.seismicportal.eu/fdsnws/event/1/query?format=json&minlatitude=35.5&maxlatitude=39.0&minlongitude=-7.5&maxlongitude=-2.0&limit=1";

// CORRECCIÓN SINTÁCTICA CRÍTICA: Inyección de coordenadas y actualización de parámetros Open-Meteo
const urlMeteoBase = `https://api.open-meteo.com{latGrazalema}&longitude=${lonGrazalema}&current=temperature_2m,wind_speed_10m,wind_direction_10m&timezone=Europe%2FMadrid`;

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
// 3. CAPTURA METEOROLÓGICA PREDICTIVA (OPEN-METEO) - UNIFICADO INVIERNO
// ==========================================
// Variable global para cruzar datos con el sismógrafo si fuera necesario
let indiceSaturacionTerreno = 0; 

async function cargarMeteorologia() {
    const meteoInfo = document.getElementById('meteo-info');
    const semaforoMeteo = document.getElementById('semaforo-meteo');
    if (!meteoInfo) return;

    // URL CORREGIDA: Trae datos de temperatura, viento, lluvia horaria y el acumulado diario de los últimos 7 días
    const urlMeteoCompleta = `https://open-meteo.com{latGrazalema}&longitude=${lonGrazalema}&current=temperature_2m,wind_speed_10m,wind_direction_10m,rain&past_days=7&daily=precipitation_sum&timezone=Europe%2FMadrid`;

    try {
        const respuesta = await fetch(urlMeteoCompleta);
        if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
        const datos = await respuesta.json();

        if (datos && datos.current && datos.daily && datos.daily.precipitation_sum) {
            const clima = datos.current;
            const temp = clima.temperature_2m ?? 'N/A';
            const viento = clima.wind_speed_10m ?? 'N/A';
            const direccion = clima.wind_direction_10m ?? 'N/A';
            const lluviaActual = clima.rain ?? 0;
            
            // Calcular el acumulado total de los últimos 7 días (Litros por m²)
            const lluviasSemanales = datos.daily.precipitation_sum;
            indiceSaturacionTerreno = lluviasSemanales.reduce((total, dia) => total + dia, 0);

            // Inyectar telemetría completa: Prioridad Lluvia persistente + Viento de la sierra
            meteoInfo.innerHTML = `${temp}°C | Viento: ${viento} km/h (Dir: ${direccion}°) | Lluvia: ${lluviaActual} mm/h | <strong>Saturación 7d: ${indiceSaturacionTerreno.toFixed(1)} mm</strong>`;

            // SEMÁFORO DE LOGÍSTICA KÁRSTICA E INVERNAL
            if (semaforoMeteo) {
                const velViento = parseFloat(viento);

                // PRIORIDAD 1: Criterio hidrológico de colmatación por lluvias torrenciales/persistentes
                if (indiceSaturacionTerreno >= 250 || lluviaActual > 25) {
                    semaforoMeteo.textContent = "Alerta: Riesgo Hidroseísmico";
                    semaforoMeteo.className = "status-badge alert-rojo";
                } 
                // PRIORIDAD 2: Criterio de alertas por vientos severos en la sierra
                else if (velViento > 50) {
                    semaforoMeteo.textContent = "Alerta: Viento Fuerte";
                    semaforoMeteo.className = "status-badge alert-rojo";
                } 
                // PRIORIDAD 3: Atención por acumulación moderada de agua en el subsuelo
                else if (indiceSaturacionTerreno >= 120) {
                    semaforoMeteo.textContent = "Atención: Acuífero Cargado";
                    semaforoMeteo.className = "status-badge alert-naranja";
                } 
                else if (velViento > 25) {
                    semaforoMeteo.textContent = "Riesgo Moderado Viento";
                    semaforoMeteo.className = "status-badge alert-naranja";
                } 
                // SITUACIÓN ESTABLE
                else {
                    semaforoMeteo.textContent = "Terreno Estable";
                    semaforoMeteo.className = "status-badge alert-verde";
                }
            }
        } else {
            throw new Error("Estructura JSON incompatible.");
        }
    } catch (error) {
        console.error("Error en el modelo meteorológico/hidrológico:", error);
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




