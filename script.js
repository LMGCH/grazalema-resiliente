// ==========================================
// 1. CONFIGURACIÓN GENERAL Y VARIABLES DE CONTROL
// ==========================================

let tiempoRestante = 60;
let temporizadorRegresivo = null;

// Coordenadas exactas de Grazalema
const latGrazalema = "36.7589";
const lonGrazalema = "-5.3649";

// ELEMENTOS DEL DOM GLOBALES (Añade esto aquí arriba para solucionar el error)
const sismoInfo = document.getElementById('sismo-info');
const semaforoSismico = document.getElementById('semaforo-sismico');
const meteoInfo = document.getElementById('meteo-info');
const semaforoMeteo = document.getElementById('semaforo-meteo'); // <-- Ahora es global y visible para todo el script

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
// 3. SEMÁFORO DE LOGÍSTICA KÁRSTICA E INVERNAL (REVISADO)
// ==========================================
let indiceSaturacionTerreno = 0; 

async function cargarMeteorologia() {
    const meteoInfo = document.getElementById('meteo-info');
    const semaforoMeteo = document.getElementById('semaforo-meteo');
    if (!meteoInfo) return;

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
            indiceSaturacionTerreno = lluviasSemanales.reduce((total, dia) => total + (dia || 0), 0);

            // Actualización de la interfaz de texto
            meteoInfo.innerHTML = `${temp}°C | Viento: ${viento} km/h (Dir: ${direccion}°) | Lluvia: ${lluviaActual} mm/h | <strong>Saturación 7d: ${indiceSaturacionTerreno.toFixed(1)} mm</strong>`;

            // ==========================================
            // 3. SEMÁFORO DE LOGÍSTICA KÁRSTICA E INVERNAL (INTEGRADO CORRECTAMENTE)
            // ==========================================
            if (semaforoMeteo) {
                const velViento = parseFloat(viento);

                // 1. CRITERIO CRÍTICO ACTUAL: Si hay tormenta severa o viento peligroso AHORA
                if (lluviaActual > 25 || velViento > 50) {
                    if (lluviaActual > 25) {
                        semaforoMeteo.textContent = "Alerta: Lluvia Torrencial";
                    } else {
                        semaforoMeteo.textContent = "Alerta: Viento Fuerte";
                    }
                    semaforoMeteo.className = "status-badge alert-rojo";
                } 
                // 2. CRITERIO HISTÓRICO KÁRSTICO: El suelo sigue lleno de agua (Riesgo de Reventón / Hidroseísmico)
                else if (indiceSaturacionTerreno >= 250) {
                    semaforoMeteo.textContent = "Alerta: Riesgo Hidroseísmico";
                    semaforoMeteo.className = "status-badge alert-rojo";
                } 
                // 3. ADVERTENCIAS MODERADAS
                else if (indiceSaturacionTerreno >= 120) {
                    semaforoMeteo.textContent = "Atención: Acuífero Cargado";
                    semaforoMeteo.className = "status-badge alert-naranja";
                } 
                else if (velViento > 25) {
                    semaforoMeteo.textContent = "Riesgo Moderado Viento";
                    semaforoMeteo.className = "status-badge alert-naranja";
                } 
                // 4. SITUACIÓN ESTABLE: Vuelve a verde limpiamente si el peligro actual cesa
                else {
                    semaforoMeteo.textContent = "Terreno Estable";
                    semaforoMeteo.className = "status-badge alert-verde";
                }
            } // Aquí cierra el bloque del semáforo

        } else {
            throw new Error("Estructura JSON incompatible.");
        }
    } catch (error) {
        console.error("Error en el modelo meteorológico/hidrológico:", error);
        meteoInfo.innerHTML = "<span style='color:#7f8c8d;'>Esperando actualización de red...</span>";
    }
} // Aquí cierra correctamente la función cargarMeteorologia

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
