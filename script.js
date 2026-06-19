// ==========================================
// 1. CONFIGURACIÓN GENERAL Y VARIABLES DE CONTROL
// ==========================================
let tiempoRestante = 60;
let temporizadorRegresivo = null;

// Coordenadas exactas de Grazalema
const latGrazalema = "36.7589";
const lonGrazalema = "-5.3649";

// SOLUCIÓN TOTAL: Direcciones de consulta estables
const urlEMSCBase = "https://www.seismicportal.eu/fdsnws/event/1/query?format=json&minlatitude=35.5&maxlatitude=39.0&minlongitude=-7.5&maxlongitude=-2.0&limit=1";
const urlMeteoCompleta = `https://api.open-meteo.com/v1/forecast?latitude=${latGrazalema}&longitude=${lonGrazalema}&current=temperature_2m,wind_speed_10m,wind_direction_10m,rain&daily=precipitation_sum&past_days=7&timezone=Europe/Madrid`;

let indiceSaturacionTerreno = 0;

// ==========================================
// 2. CAPTURA DE SISMICIDAD (EMSC) - COMPROBADO
// ==========================================
async function cargarTerremotos() {
    const sismoInfo = document.getElementById('sismo-info');
    const semaforoSismico = document.getElementById('semaforo-sismico');
    if (!sismoInfo) return;

    try {
        // Gestión Offline: Evitamos peticiones fallidas si el vecino no tiene red
        if (!navigator.onLine) {
            sismoInfo.innerHTML = "<span style='color:#e67e22;'>Sin conexión a internet. Modo de espera.</span>";
            if (semaforoSismico) {
                semaforoSismico.textContent = "Desconectado";
                semaforoSismico.className = "status-badge alert-naranja";
            }
            return;
        }

		const urlLocalSismo = "./datos/sismicidad.json";
		const respuesta = await fetch(urlLocalSismo + "?_=" + new Date().getTime());

		if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`); 
        
        const datos = await respuesta.json(); 
        const seismos = (datos && datos.features) ? datos.features : [];

        if (seismos.length === 0) {
            sismoInfo.innerHTML = "Sin actividad reciente en la zona.";
            if (semaforoSismico) {
                semaforoSismico.textContent = "Estable";
                semaforoSismico.className = "status-badge alert-verde"; 
            }
            return;
        }

        const primerSeismo = seismos[0];
	if (!primerSeismo || !primerSeismo.properties) {
            throw new Error("Estructura de sismo inválida.");
        }
        const prop = primerSeismo.properties;
        const magnitud = parseFloat(prop.mag) || 0;
        const lugar = prop.flynn_region || "Sur de España";
        let horaSismo = "--:--";

        if (prop.time) {
            horaSismo = new Date(prop.time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        }
        
        sismoInfo.innerHTML = `Mág: <strong style="color:#e74c3c;">${magnitud} mbLg</strong> en ${lugar} (${horaSismo}h).`;

      if (semaforoSismico) {
            if (magnitud >= 4.0) {
                semaforoSismico.textContent = "Peligro";
                semaforoSismico.className = "status-badge alert-rojo"; // 🔴 Color sólido fijo
            } else if (magnitud >= 2.5) {
                semaforoSismico.textContent = "Atención";
                semaforoSismico.className = "status-badge alert-naranja"; // 🟠 Color sólido fijo
            } else {
                semaforoSismico.textContent = "Estable";
                semaforoSismico.className = "status-badge alert-verde"; // 🟢 Color sólido fijo
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

async function cargarMeteorologia() {
    const meteoInfo = document.getElementById('meteo-info');
    const semaforoMeteo = document.getElementById('semaforo-meteo');
    if (!meteoInfo) return;

    try {
        if (!navigator.onLine) {
            meteoInfo.innerHTML = "<span style='color:#e67e22;'>Esperando red...</span>";
            return;
        }

        const urlConAntiCache = `${urlMeteoCompleta}&_=${new Date().getTime()}`;
        const respuesta = await fetch(urlConAntiCache);
        if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
        const datos = await respuesta.json();
        
        if (datos && datos.current && datos.daily && datos.daily.precipitation_sum) {
            const clima = datos.current;
            const temp = clima.temperature_2m ?? 'N/A';
            const viento = clima.wind_speed_10m ?? 'N/A';
            const direccion = clima.wind_direction_10m ?? 'N/A';
            const lluviaActual = clima.rain ?? 0;
            const lluviasSemanales = Array.isArray(datos.daily.precipitation_sum) ?  datos.daily.precipitation_sum : [];

indiceSaturacionTerreno = lluviasSemanales.reduce((t, d) => t + (d || 0), 0);

            meteoInfo.innerHTML = `${temp}°C | Viento: ${viento} km/h (Dir: ${direccion}°) | Lluvia: ${lluviaActual} mm/h | <strong>Saturación 7d: ${indiceSaturacionTerreno.toFixed(1)} mm</strong>`;
            
            if (semaforoMeteo) {
                const velViento = parseFloat(viento);

                // PRIORIDAD 1: Lluvia crítica inmediata (Peligro actual directo)
                if (lluviaActual > 25) {
                    semaforoMeteo.textContent = "Alerta: Lluvia Torrencial";
                    semaforoMeteo.className = "status-badge alert-rojo";
                } 
                // PRIORIDAD 2: Vientos severos inmediatos en la sierra (Peligro actual directo)
                else if (velViento > 50) {
                    semaforoMeteo.textContent = "Alerta: Viento Fuerte";
                    semaforoMeteo.className = "status-badge alert-rojo";
                } 
                // PRIORIDAD 3: Criterio hidrológico de colmatación por lluvias acumuladas (Riesgo diferido)
                else if (indiceSaturacionTerreno >= 250) {
                    semaforoMeteo.textContent = "Alerta: Riesgo Hidroseísmico";
                    semaforoMeteo.className = "status-badge alert-rojo";
                } 
                // PRIORIDAD 4: Atención por acumulación moderada de agua en el subsuelo
                else if (indiceSaturacionTerreno >= 120) {
                    semaforoMeteo.textContent = "Atención: Acuífero Cargado";
                    semaforoMeteo.className = "status-badge alert-naranja";
                } 
                else if (velViento > 25) {
                    semaforoMeteo.textContent = "Riesgo Moderado Viento";
                    semaforoMeteo.className = "status-badge alert-naranja";
                } 
                // SITUACIÓN ESTABLE: Si no hay peligros actuales ni acumulados críticos
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
// 4. FUNCIÓN PARA OBTENER LOS AVISOS METEOROLÓGICOS DE AEMET (LLAMADA LOCAL DIRECTA)
// ==========================================
async function cargarAvisosAemet() {
    const contenedorAvisos = document.querySelector('.avisos-meteorologicos'); 
    // Usamos la ruta local relativa directa para fulminar el error de CORS y no depender de AllOrigins
    const urlOriginal = "./datos/alertas.json"; 

    try {
        if (!navigator.onLine) return formatearAvisosVerdes();

        const respuesta = await fetch(`${urlOriginal}?_=${new Date().getTime()}`);
        if (!respuesta.ok) throw new Error(`HTTP Error: ${respuesta.status}`);
        
        const datos = await respuesta.json();

        if (contenedorAvisos) {
            if (datos && datos.hayAvisos === true) {
                contenedorAvisos.innerHTML = `
                    <div class="status-badge alert-rojo" style="background-color: #e74c3c; color: white; padding: 5px 10px; border-radius: 4px; display: inline-block;">🔴 AVISO METEOROLÓGICO ACTIVO</div>
                    <p style="margin-top: 15px; font-weight: bold;">${datos.titulo}</p>
                    <p style="margin-top: 10px;"><a href="${datos.enlace}" target="_blank" style="color: #9b59b6; text-decoration: underline; font-weight: bold;">Ver aviso oficial AEMET</a></p>
                `;
            } else {
                formatearAvisosVerdes();
            }
        }
    } catch (error) {
        console.error("Hubo un error al leer los datos de la AEMET:", error);
        formatearAvisosVerdes(); 
    }
}

function formatearAvisosVerdes() {
    const bloqueAvisos = document.querySelector('.avisos-meteorologicos'); 
    if (bloqueAvisos) {
        bloqueAvisos.innerHTML = `
            <div class="status-badge alert-verde" style="background-color: #2ecc71; color: white; padding: 5px 10px; border-radius: 4px; display: inline-block;">✅ Sin avisos activos</div>
            <p style="margin-top: 10px; color: #7f8c8d;">No hay alertas meteorológicas vigentes para el término de Grazalema.</p>
        `;
    }
}

// ==========================================
// 5. TEMPORIZADOR, RELOJ Y CONTROLADORES UNIFICADOS
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
            elementoContador.textContent = `${tiempoRestante}`;
        }
        if (tiempoRestante <= 0) {
            clearInterval(temporizadorRegresivo);
            ejecutarCargaCompleta();
        }
    }, 1000);
}

// ==========================================
// 6. CAPTACIÓN DE INSCRIPCIÓN DE VECINOS
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const formulario = document.getElementById('form-colaboradores');
    
    if (formulario) {
        formulario.addEventListener('submit', async (e) => {
            e.preventDefault(); // Evita que la página se refresque

            // Animación y feedback en el botón original
            const boton = formulario.querySelector('.btn-submit');
            if (boton) boton.innerText = "Sincronizando datos... ";

            // Capturar los campos usando los ID idénticos del HTML
            const datosVecino = {
                nombre: document.getElementById('nombre').value,
                email: document.getElementById('email').value,
                telefono: "'" + (document.getElementById('telefono').value.startsWith('+') ? document.getElementById('telefono').value : '+' + document.getElementById('telefono').value),
                zona: document.getElementById('localidad').value,
                sistema: document.getElementById('dispositivo').value
            };

            // ⚠️ PEGA AQUÍ LA URL DE GOOGLE QUE TERMINA EN /exec
            const URL_API_GOOGLE = 'https://script.google.com/macros/s/AKfycbwbSUarA0oms7f1mf2ZmzSv_sAPYjzcBoNjzFDqpmnUUdGutrLzp0Y_hf4jabOjGkOY9A/exec';

            try {
                await fetch(URL_API_GOOGLE, {
                    method: 'POST',
                    mode: 'no-cors', 
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(datosVecino)
                });

                alert('¡Inscripción completada! Tus datos se han registrado correctamente en el experimento de Grazalema Resiliente.');
                formulario.reset(); // Vacía los campos del formulario

            } catch (error) {
                console.error('Error en el sistema de captación:', error);
                alert('No se pudo conectar con el servidor de bases de datos. Revisa tu conexión.');
            } finally {
                if (boton) boton.innerText = "Enviar Inscripción Voluntaria";
            }
        });
    }
function ejecutarCargaCompleta() {
    cargarTerremotos();
    cargarMeteorologia();
    cargarAvisosAemet(); // <--- INCORPORADO AQUÍ PARA REFRESCARSE CADA 60 SEGUNDOS
    actualizarHoraSincronizacion();
    iniciarContadorRegresivo();
}
});
