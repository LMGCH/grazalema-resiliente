document.addEventListener("DOMContentLoaded", () => {
    const btnPermiso = document.getElementById("btn-permiso");
    const panelDatos = document.getElementById("panel-datos");
    const listaEventos = document.getElementById("lista-eventos");
    
    // Variables para el algoritmo de filtrado de ruido (Umbrales lógicos)
    const UMBRAL_VIBRACION_CRITICA = 15; // Ajuste de sensibilidad física
    let ultimaActualizacion = 0;
    
    btnPermiso.addEventListener("click", () => {
        // Verificar si el navegador móvil soporta la API de movimiento
        if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
            // Requisito obligatorio de seguridad para Apple iOS
            DeviceMotionEvent.requestPermission()
                .then(response => {
                    if (response === 'granted') {
                        iniciarCapturaSensores();
                    } else {
                        registrarLog("Permiso denegado por el usuario.");
                    }
                })
                .catch(error => {
                    console.error(error);
                    registrarLog("Error al solicitar permisos de hardware.");
                });
        } else {
            // Navegadores Android comunes o navegadores de escritorio
            iniciarCapturaSensores();
        }
    });

    function iniciarCapturaSensores() {
        btnPermiso.style.display = "none";
        panelDatos.style.display = "block";
        listaEventos.innerHTML = ""; // Limpiar log inicial
        registrarLog("Sensor emparejado. Calibrando ruido de fondo urbano...");

        // Escuchar el movimiento físico del hardware en tiempo real
        window.addEventListener("devicemotion", (evento) => {
            const aceleracion = evento.accelerationIncludingGravity;
            if (!aceleracion) return;

            // Extraer las lecturas espaciales de los tres ejes físicos
            const x = aceleracion.x || 0;
            const y = aceleracion.y || 0;
            const z = aceleracion.z || 0;

            // Pintar los ejes brutos en pantalla
            document.getElementById("eje-x").textContent = x.toFixed(2);
            document.getElementById("eje-y").textContent = y.toFixed(2);
            document.getElementById("eje-z").textContent = z.toFixed(2);

            // Algoritmo Matemático de Filtrado: Cálculo del Vector de Aceleración Neto
            // Restamos la gravedad base aproximada para medir solo la sacudida neta
            const magnitudNeta = Math.sqrt(x*x + y*y + z*z) - 9.8;
            const vibracionAbsoluta = Math.max(0, magnitudNeta);

            // Actualizar gráficamente la barra de intensidad
            const porcentajeBarra = Math.min(100, vibracionAbsoluta * 5);
            document.getElementById("barra-vibracion").style.width = `${porcentajeBarra}%`;

            // Control de tiempo para no saturar el log de alertas (máximo una por segundo)
            const tiempoActual = new Date().getTime();
            if (tiempoActual - ultimaActualizacion > 1200) {
                // Si la vibración supera el umbral crítico establecido, disparamos alerta
                if (vibracionAbsoluta > UMBRAL_VIBRACION_CRITICA) {
                    if (vibracionAbsoluta > UMBRAL_VIBRACION_CRITICA) {
    registrarLog(`⚠️ Local: Sacudida detectada (${vibracionAbsoluta.toFixed(1)} m/s²). Enviando señal al servidor...`);
    
    // Simulamos la respuesta del servidor en 1 segundo (Consenso de Red)
    setTimeout(() => {
        registrarLog(`📡 RED: Red comunitaria sincronizada. 4 nodos en Grazalema reportan la misma vibración.`);
        registrarLog(`🚨 PREVISIÓN SEMI-DOMÉSTICA: Posible micro-sismo local detectado por Consenso.`);
        
        // Cambiamos el color de la barra a peligro
        document.getElementById("barra-vibracion").style.backgroundColor = "#dc2626";
    }, 1000);

    ultimaActualizacion = tiempoActual;
}

                    // Cambiar el color de la barra a modo peligro temporalmente
                    document.getElementById("barra-vibracion").style.backgroundColor = "#dc2626";
                    ultimaActualizacion = tiempoActual;
                } else {
                    document.getElementById("barra-vibracion").style.backgroundColor = "var(--secondary-color)";
                }
            }
        });
    }

    function registrarLog(texto) {
        const marcaTiempo = new Date().toLocaleTimeString();
        const nuevoItem = document.createElement("li");
        nuevoItem.innerHTML = `[${marcaTiempo}] ${texto}`;
        listaEventos.insertBefore(nuevoItem, listaEventos.firstChild);
    }
});
