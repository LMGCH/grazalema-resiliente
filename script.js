// ==========================================
// 1. CONFIGURACIÓN GENERAL Y VARIABLES DE CONTROL
// ==========================================
let tiempoRestante = 60;
let temporizadorRegresivo = null;

// Mantendremos el proxy SOLO para la EMSC si fuera estrictamente necesario, 
// pero vamos a probar a llamar a las APIs limpias directamente para evitar al antivirus.
const proxyCors = "https://api.allorigins.win/raw?url=";

// Coordenadas de Grazalema para la consulta meteorológica directa
const latGrazalema = "36.7589";
const lonGrazalema = "-5.3649";

// URLs técnicas completas optimizadas sin bloqueos
const urlEMSCBase = `https://www.seismicportal.eu/fdsnws/event/1/query?format=json&minlatitude=35.5&maxlatitude=39.0&minlongitude=-7.5&maxlongitude=-2.0&limit=30`;
// Nueva API meteorológica profesional limpia y compatible con navegadores directos
const urlMeteoBase = `https://api.open-meteo.com/v1/forecast?${latGrazalema}&longitude=${lonGrazalema}&current=temperature_2m,relative_humidity_2m,&daily=precipitation_sum,precipitation_sink,wind_speed_10m,wind_direction_10m&timezone=Europe%2FMadrid`;

const urlEMSCSegura = proxyCors + encodeURIComponent(urlEMSCBase);

// ==========================================
// 2. CAPTURA DE SISMICIDAD (EMSC)
// ==========================================
async function cargarTerremotos() {
    const sismoInfo = document.getElementById('sismo-info');
    const semaforoSismico = document.getElementById('semaforo-sismico');
    if (!sismoInfo) return;

    try {
        // Intentamos primero una petición directa limpia sin proxy para evitar alertas de antivirus
        let respuesta = await fetch(urlEMSCBase).catch(() => fetch(urlEMSCSegura));
        if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);

        const datos = await respuesta.json();
        const seismos = datos.features || [];

        if (seismos.length === 0) {
            sismoInfo.innerHTML = "Sin actividad reciente en el área de la Sierra.";
            if (semaforoSismico) {
                semaforoSismico.textContent = "Estable";
                semaforoSismico.className = "status-badge alert-verde"; 
            }
            return;
        }

        const ultimoSismo = seismos[0].properties;
        const magnitud = ultimoSismo.mag;
        const lugar = ultimoSismo.flynn_region || "Sur de España";
        
        // Formateo de fecha seguro para baja cobertura
        let horaSismo = "--:--";
        if (ultimoSismo.time) {
            horaSismo = new Date(ultimoSismo.time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
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
// 3. CAPTURA METEOROLÓGICA (OPEN-METEO - LIBRE DE PROXY)
// ==========================================
async function cargarMeteorologia() {
    const meteoInfo = document.getElementById('meteo-info');
    const semaforoMeteo = document.getElementById('semaforo-meteo');
    if (!meteoInfo) return;

    try {
        // Conexión directa pura, ultra rápida y 100% invisible para los antivirus
        const respuesta = await fetch(urlMeteoBase);
        if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
        
        const datos = await respuesta.json();
        
        if (datos && datos.current) {
            const clima = datos.current;
            const temp = clima.temperature_2m ?? 'N/A';
            const lluvia = clima.precipitation ?? '0';
            const viento = clima.wind_speed_10m ?? 'N/A';
            const humedad = clima.relative_humidity_2m ?? 'N/A';

            // Inyectamos los datos directamente en tus campos del HTML
            meteoInfo.innerHTML = `${temp}°C | Humedad: ${humedad}% | Lluvia: ${lluvia}mm | Viento: ${viento}km/h.`;

            // Control automatizado del semáforo según la intensidad de la precipitación actual
            if (semaforoMeteo) {
                const mmLluvia = parseFloat(lluvia);
                if (mmLluvia > 5.0) {
                    semaforoMeteo.textContent = "Alerta Lluvia";
                    semaforoMeteo.className = "status-badge alert-rojo";
                } else if (mmLluvia > 0.5) {
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
        meteoInfo.innerHTML = "<span style='color:#7f8c8d;'>Sincronizando estación local...</span>";
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


