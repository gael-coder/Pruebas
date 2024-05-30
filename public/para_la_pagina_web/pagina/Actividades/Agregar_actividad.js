// Función para manejar la visibilidad de cada identificadorDiv
function gestionarVisibilidad(identificadorDiv, identificador) {
    const selectTipoActividad = document.getElementById('TipoDeActividad');
    const valorSeleccionado = selectTipoActividad.value;

    // Ocultar todos los identificadorDiv
    identificadorDiv.style.display = 'none';

    // Mostrar el identificadorDiv correspondiente al valor seleccionado
    if (valorSeleccionado === identificador) {
        identificadorDiv.style.display = 'block'; // Mostrar el elemento
    }
}

// Función para gestionar las opciones seleccionadas
function gestionarOpciones() {
    // Obtener todos los pares de opciones
    const paresOpciones = document.querySelectorAll('.opciones');

    // Agregar un evento de clic a cada par de opciones
    paresOpciones.forEach(par => {
        const opciones = par.querySelectorAll('.opcion');
        opciones.forEach(opcion => {
            opcion.addEventListener('click', () => {
                // Si la opción clicada ya está activa y es la única opción activa en el par, no se hace nada
                if (!opcion.classList.contains('opcion-activa') || par.querySelector('.opcion-activa') === null) {
                    // Desactivar todas las opciones dentro del mismo par
                    opciones.forEach(o => o.classList.remove('opcion-activa'));

                    // Activar la opción clicada
                    opcion.classList.add('opcion-activa');

                    // Obtener el valor booleano correspondiente y establecerlo como atributo de datos personalizado
                   // const valorBooleano = opcion.textContent === 'V'; // Si la opción es 'V', el valor es true, de lo contrario, es false
                    //par.dataset.booleano = valorBooleano;
                }
            });
        });
    });
}

// Obtener el elemento select
const selectTipoActividad = document.getElementById('TipoDeActividad');

// Obtener los elementos identificadorDiv
const identificadorDiv = document.getElementById('identificadorDiv');
const identificadorDiv2 = document.getElementById('identificadorDiv2');
const identificadorDiv3 = document.getElementById('identificadorDiv3');
const identificadorDiv4 = document.getElementById('identificadorDiv4'); // Nuevo identificadorDiv

// Agregar evento de cambio al select para manejar la visibilidad de cada identificadorDiv
selectTipoActividad.addEventListener('change', () => {
    gestionarVisibilidad(identificadorDiv, 'pregunta');
    gestionarVisibilidad(identificadorDiv2, 'seleccion_palabras_audio');
    gestionarVisibilidad(identificadorDiv3, 'seleccion_palabras_video');
    gestionarVisibilidad(identificadorDiv4, 'contenido_audiovisual'); // Mostrar identificadorDiv4 para "material audiovisual"
});

// Llamar a la función inicialmente para asegurar que los identificadorDiv estén ocultos al cargar la página
gestionarVisibilidad(identificadorDiv, 'pregunta');
gestionarVisibilidad(identificadorDiv2, 'seleccion_palabras_audio');
gestionarVisibilidad(identificadorDiv3, 'seleccion_palabras_video');
gestionarVisibilidad(identificadorDiv4, 'contenido_audiovisual'); // Mostrar identificadorDiv4 al cargar la página inicialmente

// Llamar a la función para gestionar las opciones seleccionadas
gestionarOpciones();



