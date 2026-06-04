document.addEventListener("DOMContentLoaded", () => {
    const btnPermiso = document.getElementById("btn-permiso");
    const panelDatos = document.getElementById("panel-datos");
    const listaEventos = document.getElementById("lista-eventos");
    const barra = document.getElementById("barra-vibracion");
    
    // VARIABLES CRÍTICAS DEL FILTRO SÍSMICO
    const UMBRAL_HIDROSEISMO = 1.8; // Umbral de aceleración neta m/s² (más sensible y real para sismos)
    let ultimaActualizacion = 0;

    // Variables para el aislamiento de la Gravedad (Filtro de paso alto)
    let gravX = 0, gravY = 0, gravZ = 0;
    const ALFA = 0.8; // Factor de suavizado para aislar la gravedad constante

    btnPermiso.addEventListener("click", () => {
        if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
            DeviceMotionEvent.requestPermission()
                .then(response => {
                    if (response === 'granted') iniciarCapturaSensores();
                    else registrarLog("Permiso denegado por el usuario.");
                })
                .catch(error => {
                    console.error(error);
                    registrarLog("Error de hardware en los sensores.");
                });
        } else {
            iniciarCapturaSensores();
        }
    });

    function iniciarCapturaSensores() {
        btnPermiso.style.display = "none";
        panelDatos.style.display = "block";
        listaEventos.innerHTML = "";
        registrarLog("Sensor calibrando. Escuchando pulsos mecánicos del Karst...");

        window.addEventListener("devicemotion", (evento) => {
            // Preferimos 'accelerationIncludingGravity' porque está disponible de forma más universal
            const acc = evento.accelerationIncludingGravity;
            if (!acc) return;

            const rawX = acc.x || 0;
            const rawY = acc.y || 0;
            const rawZ = acc.z || 0;

            // 1. FILTRO DE PASO BAJO: Aislar la gravedad base (hacia dónde apunta el tlf de forma estática)
            gravX = ALFA * gravX + (1 - ALFA) * rawX;
            gravY = ALFA * gravY + (1 - ALFA) * rawY;
            gravZ = ALFA * gravZ + (1 - ALFA) * rawZ;

            // 2. FILTRO DE PASO ALTO: Restar la gravedad para obtener SÓLO la aceleración dinámica (la sacudida)
            const aceleracionNetaX = rawX - gravX;
            const aceleracionNetaY = rawY - gravY;
            const aceleracionNetaZ = rawZ - gravZ;

            // Renderizar los valores puros filtrados del sismógrafo
            document.getElementById("eje-x").textContent = aceleracionNetaX.toFixed(2);
            document.getElementById("eje-y").textContent = aceleracionNetaY.toFixed(2);
            document.getElementById("eje-z").textContent = aceleracionNetaZ.toFixed(2);

            // 3. MAGNITUD VECTORIAL: Magnitud de la sacudida real sin influencia de la orientación
            const intensidadSacudida = Math.sqrt(aceleracionNetaX**2 + aceleracionNetaY**2 + aceleracionNetaZ**2);

            // Actualizar la interfaz gráfica (barra de progreso)
            const porcentajeBarra = Math.min(100, intensidadSacudida * 20); // Multiplicador visual
            barra.style.width = `${porcentajeBarra}%`;

            // 4. LÓGICA DE ALERTA COMUNITARIA
            const tiempoActual = Date.now();
            if (tiempoActual - ultimaActualizacion > 2000) { // Ventana de bloqueo de 2 segundos
                
                if (intensidadSacudida > UMBRAL_HIDROSEISMO) {
                    ultimaActualizacion = tiempoActual;
                    
                    // Activación visual inmediata
                    barra.style.backgroundColor = "#dc2626"; // Rojo alerta
                    registrarLog(`⚠️ LOCAL: Vibración anómala detectada (${intensidadSacudida.toFixed(2)} m/s²).`);

                    // Simulación del Consenso Web (Reemplazar en el futuro con WebSockets o Fetch)
                    ejecutarConsensoDeRed();
                } else {
                    barra.style.backgroundColor = "var(--secondary-color, #2563eb)";
                }
            }
        });
    }

    function ejecutarConsensoDeRed() {
        registrarLog("📡 MESH: Transmitiendo telemetría al nodo central de Grazalema...");
        setTimeout(() => {
            registrarLog(`🚨 CONSENSO: Confirmado por nodos vecinos. Actividad registrada en zona kárstica.`);
        }, 1200);
    }

    function registrarLog(texto) {
        const marcaTiempo = new Date().toLocaleTimeString();
        const nuevoItem = document.createElement("li");
        nuevoItem.innerHTML = `<span style="color: #6b7280;">[${marcaTiempo}]</span> ${texto}`;
        listaEventos.insertBefore(nuevoItem, listaEventos.firstChild);
    }
});

