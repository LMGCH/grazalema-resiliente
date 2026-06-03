// ==========================================
// 0. CONFIGURACIÓN GENERAL Y VARIABLES DE CONTROL
// ==========================================
let tiempoRestante = 60;
let temporizadorRegresivo = null;

// Pasarela proxy para evadir el bloqueo de seguridad CORS del navegador
// ==========================================
// 1. ENRUTAMIENTO CON PROXY CORS (Solución Definitiva)
// ==========================================
// El proxy completo e inalterado para inyectar cabeceras CORS
const proxyCors = "https://api.allorigins.win/raw?url=";

// Los endpoints completos con todos sus parámetros geográficos y de filtrado
const urlEMSCBase = "https://www.seismicportal.eu/fdsnws/event/1/query?format=json&minlatitude=35.5&maxlatitude=39.0&minlongitude=-7.5&maxlongitude=-2.0&limit=30";
const urlAEMETBase = "https://opendata.aemet.es/opendata/api/observacion/datos/estacion/11041Y";

// Tu clave autorizada de AEMET OpenData
const apiKeyAEMET = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJsdWlzbS5nYWxhY2hvQGdtYWlsLmNvbSIsImp0aSI6IjY3NDk1MTRiLTM2ZmMtNDA2Yi05MTRlLWVjYTIzYzZiNDMyMCIsImlzcyI6IkFFTUVUIiwiaWF0IjoxNzgwNTIwOTEyLCJ1c2VySWQiOiI2NzQ5NTE0Yi0zNmZjLTQwNmItOTE0ZS1lY2EyM2M2YjQzMjAiLCJyb2xlIjoiIn0.bvPNqAZvDfh31fMS6I1p9Wyu2XTRCzU6oCrh10iYv0s";

// UNIÓN SEGURA: Pasamos la clave en la URL de AEMET para evitar usar 'headers' que rompan el CORS
const urlEMSCSegura = proxyCors + encodeURIComponent(urlEMSCBase);
const urlAEMETSegura = proxyCors + encodeURIComponent(urlAEMETBase + "?api_key=" + apiKeyAEMET);


// ==========================================
// 2. CAPTURA DE SISMICIDAD (EMSC)
// ==========================================
async function cargarTerremotos() {
    const sismoInfo = document.getElementById('sismo-info');
    const semaforoSismico = document.getElementById('semaforo-sismico');
    if (!sismoInfo) return;

    try {
        const respuesta = await fetch(urlEMSCSegura);
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

        // Tomamos el seísmo más cercano/reciente (el primero del array)
        const ultimoSismo = seismos[0].properties;
        const magnitud = ultimoSismo.mag;
        const lugar = ultimoSismo.flynn_region || "Sur de España";
        const fecha = new Date(ultimoSismo.time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

        // Pintamos el texto corto ideal para conexiones lentas
        sismoInfo.innerHTML = `Mág: <strong style="color:#e74c3c;">${magnitud} mbLg</strong> en ${lugar} a las ${fecha}.`;

        // Ajustamos tu semáforo HTML dinámicamente según la magnitud
        if (semaforoSismico) {
            if (magnitud >= 4.0) {
                semaforoSismico.textContent = "Peligro";
                semaforoSismico.className = "status-badge alert-rojo"; // Asegúrate de tener estos estilos en tu CSS
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
        sismoInfo.innerHTML = "<span style='color:#c0392b;'>Error de enlace sísmico.</span>";
    }
}

// ==========================================
// 3. CAPTURA METEOROLÓGICA (AEMET)
// ==========================================
async function cargarMeteorologia() {
    const meteoInfo = document.getElementById('meteo-info');
    const semaforoMeteo = document.getElementById('semaforo-meteo');
    if (!meteoInfo) return;

    try {
        const paso1 = await fetch(urlAEMETSegura);
        if (!paso1.ok) throw new Error(`Paso 1 HTTP ${paso1.status}`);
        
        const resultadoPaso1 = await paso1.json();

        if (resultadoPaso1.estado === 200 && resultadoPaso1.datos) {
            const urlFinalSegura = proxyCors + encodeURIComponent(resultadoPaso1.datos);
            const paso2 = await fetch(urlFinalSegura);
            if (!paso2.ok) throw new Error("Paso 2 falló");
            
            const datosClima = await paso2.json();

            if (datosClima && datosClima.length > 0) {
                const clima = datosClima[datosClima.length - 1]; // Última medición disponible
                
                const temp = clima.ta ?? 'N/A';
                const lluvia = clima.prec ?? '0';
                const viento = clima.vv ?? 'N/A';

                // Inyectamos el texto resumido y ultra Rápido en tu campo HTML
                meteoInfo.innerHTML = `${temp}°C | Lluvia: ${lluvia}mm | Viento: ${viento}m/s.`;

                // Control dinámico de tu semáforo meteorológico según precipitaciones (ideal para el Reventón kárstico)
                if (semaforoMeteo) {
                    if (parseFloat(lluvia) > 10) {
                        semaforoMeteo.textContent = "Alerta Lluvia";
                        semaforoMeteo.className = "status-badge alert-rojo";
                    } else if (parseFloat(lluvia) > 2) {
                        semaforoMeteo.textContent = "Riesgo Moderado";
                        semaforoMeteo.className = "status-badge alert-naranja";
                    } else {
                        semaforoMeteo.textContent = "Sin Alertas";
                        semaforoMeteo.className = "status-badge alert-verde";
                    }
                }
            }
        } else {
            throw new Error(resultadoPaso1.descripcion);
        }
    } catch (error) {
        console.error("Error meteorológico:", error);
        meteoInfo.innerHTML = "<span style='color:#c0392b;'>Estación inaccesible / Esperando refresco.</span>";
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

// Disparador principal cuando el HTML esté completamente listo en pantalla
window.addEventListener('DOMContentLoaded', () => {
    ejecutarCargaCompleta();
});

