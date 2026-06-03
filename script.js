async function consultarEstadisticas() {
    const elemInfo = document.getElementById("elem-info");
    const elemAlerta = document.getElementById("registro-alerta-sismica");

    if (elemInfo) {
        elemInfo.setAttribute("style", "color:white;");
        elemInfo.textContent = "Consultando datos...";
    }

    try {
        // 1. URL exacta del JSON de terremotos próximos del IGN
        const respuesta = await fetch("https://ign.es");
        
        if (!respuesta.ok) {
            throw new Error("Error en la respuesta del servidor");
        }

        // 2. El JSON del IGN es un Array de objetos directamente (no usa .features)
        const ultimosDatos = await respuesta.json(); 

        if (ultimosDatos && ultimosDatos.length > 0) {
            const magnitudes = [];

            // 3. Filtrar buscando coincidencias en la propiedad 'poblacion'
            const elementosLocalidad = ultimosDatos.filter(sismo => {
                const poblacion = (sismo.poblacion || "").toLowerCase();
                return (
                    poblacion.includes("grazalema") ||
                    poblacion.includes("ubrique") ||
                    poblacion.includes("benamahoma") ||
                    poblacion.includes("benaocaz")
                );
            });

            // 4. Procesar si hay sismos en tu zona objetivo
            if (elementosLocalidad.length > 0) {
                elementosLocalidad.forEach(sismo => {
                    if (sismo.magnitud) {
                        magnitudes.push(parseFloat(sismo.magnitud));
                    }
                });

                const tieneMagnitudCritica = magnitudes.some(mag => mag >= 1.0);

                if (tieneMagnitudCritica) {
                    if (elemInfo) elemInfo.textContent = "Actividad detectada en la zona";
                    if (elemAlerta) {
                        elemAlerta.className = "status-badge alert-amarilla";
                        elemAlerta.textContent = "Alerta Activa";
                    }
                } else {
                    if (elemInfo) elemInfo.textContent = "Actividad baja";
                    if (elemAlerta) {
                        elemAlerta.className = "status-badge alert-verde";
                        elemAlerta.textContent = "Normalidad";
                    }
                }
            } else {
                // No hay sismos en las localidades indicadas
                if (elemInfo) elemInfo.textContent = "Sin novedades sísmicas en la zona";
                if (elemAlerta) {
                    elemAlerta.className = "status-badge alert-verde";
                    elemAlerta.textContent = "Normalidad";
                }
            }
        } else {
            if (elemInfo) elemInfo.textContent = "No se encontraron registros recientes";
        }
    } catch (error) {
        console.error("Error al procesar el script:", error);
        if (elemInfo) {
            elemInfo.setAttribute("style", "color:red;");
            elemInfo.textContent = "Error: Temporalmente desconectado";
        }
        if (elemAlerta) {
            elemAlerta.className = "status-badge alert-roja";
            elemAlerta.textContent = "Desconectado";
        }
    }
}

