// ==========================================
// 1. CONFIGURACIÓN GENERAL Y VARIABLES DE CONTROL
// ==========================================
let tiempoRestante = 60;
let temporizadorRegresivo = null;

// Coordenadas exactas de Grazalema
const latGrazalema = "36.7589";
const lonGrazalema = "-5.3649";

// SOLUCIÓN TOTAL: Direcciones blindadas y limpias sin variables duplicadas
const urlEMSCBase = "https://www.seismicportal.eu/fdsnws/event/1/query?format=json&minlatitude=35.5&maxlatitude=39.0&minlongitude=-7.5&maxlongitude=-2.0&limit=1";

// URL INTEGRAL REVISADA: Añadido obligatoriamente el parámetro '&daily=precipitation_sum' para que no falle el filtro
const urlMeteoCompleta = `https://api.open-meteo.com/v1/forecast?latitude=${latGrazalema}&longitude=${lonGrazalema}&current=temperature_2m,wind_speed_10m,wind_direction_10m,rain&hourly=rain&daily=precipitation_sum&past_days=7&timezone=Europe%2FMadrid`;


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

	    // Actualización de la interfaz
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

// Función para obtener y filtrar las alertas del 112
async function cargarAlertas112() {
    // Usamos un convertidor gratuito que transforma el feed de X en formato JSON amigable
    const urlFeed = "https://rss2json.com";

    try {
        const respuesta = await fetch(urlFeed);
        const datos = await respuesta.json();

        // 1. Lista de palabras clave que nos interesan para el filtro local
        const palabrasClave = ["cádiz", "grazalema", "benamahoma", "villaluenga", "benaocaz", "ubrique", "sierra"];

        // 2. Filtramos los mensajes para quedarnos solo con los que mencionen nuestra zona
        const alertasLocales = datos.items.filter(item => {
            const textoMensaje = item.description.toLowerCase();
            // Comprueba si alguna de nuestras palabras clave está dentro del texto
            return palabrasClave.some(palabra => textoMensaje.includes(palabra));
        });

        // 3. Mandamos los datos filtrados a la pantalla de tu web
        mostrarAlertasEnPantalla(alertasLocales);

    } catch (error) {
        console.error("Hubo un error al leer los datos del 112:", error);
        document.getElementById("contenedor-alertas").innerHTML = "<p>No se pudieron cargar las alertas en este momento.</p>";
    }
}

// Función auxiliar para pintar los resultados en tu HTML
function mostrarAlertasEnPantalla(alertas) {
    const contenedor = document.getElementById("contenedor-alertas");
    
    // Si no hay alertas recientes de nuestra zona
    if (alertas.length === 0) {
        contenedor.innerHTML = "<p>Sin alertas recientes para la Sierra de Cádiz.</p>";
        return;
    }

    // Si hay alertas, las limpiamos y las mostramos una a una
    contenedor.innerHTML = ""; 
    alertas.forEach(alerta => {
        const elementoAlerta = document.createElement("div");
        elementoAlerta.className = "tarjeta-alerta"; // Puedes darle estilos en tu estilos.css
        elementoAlerta.innerHTML = `
            <p><strong>🚨 Alerta Oficial 112:</strong> ${alerta.description}</p>
            <small>📅 Publicado el: ${new Date(alerta.pubDate).toLocaleString()}</small>
            <hr>
        `;
        contenedor.appendChild(elementoAlerta);
    });
}

// Ejecutamos la función automáticamente cuando se cargue la web
document.addEventListener("DOMContentLoaded", cargarAlertas112);

window.addEventListener('DOMContentLoaded', () => {
    ejecutarCargaCompleta();
});
