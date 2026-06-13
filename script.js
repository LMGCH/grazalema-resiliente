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
// SEMÁFORO DE LOGÍSTICA KÁRSTICA E INVERNAL (REVISADO)
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
    // 4. SITUACIÓN ESTABLE: Si no se cumple nada de lo anterior, vuelve a verde limpiamente
    else {
        semaforoMeteo.textContent = "Terreno Estable";
        semaforoMeteo.className = "status-badge alert-verde";
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
