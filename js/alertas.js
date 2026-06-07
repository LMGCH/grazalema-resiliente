async function cargarAlertas() {

    const respuesta = await fetch('./datos/alertas.json');
    const datos = await respuesta.json();

    const contenedor = document.getElementById('contenedor-alertas');

    if (!datos.hayAvisos) {

        contenedor.innerHTML = `
            <div style="
                padding: 10px;
                background: #d4edda;
                color: #155724;
                border-radius: 6px;
            ">
                🟢 No hay avisos meteorológicos activos en Grazalema
                <br>
                <small>Actualizado: ${datos.fecha}</small>
            </div>
        `;

        return;
    }

    contenedor.innerHTML = `
        <div style="
            padding: 10px;
            background: #f8d7da;
            color: #721c24;
            border-radius: 6px;
        ">
            🔴 AVISO METEOROLÓGICO ACTIVO
            <br><br>
            ${datos.titulo}
            <br><br>
            <a href="${datos.enlace}" target="_blank">
                Ver aviso oficial AEMET
            </a>
        </div>
    `;
}

document.addEventListener('DOMContentLoaded', cargarAlertas);
