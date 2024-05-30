function validarCampos() {
    var campos = ['mensaje'];
    var formularioValido = true;

    campos.forEach(function (id) {
        var campo = document.getElementById(id);
        if (campo.value.trim() === '') {
            campo.style.backgroundColor = 'red';
            formularioValido = false;
        } else {
            campo.style.backgroundColor = '#fff'; // Restablecer color original
        }
    });

    return formularioValido;
}

document.addEventListener('DOMContentLoaded', function () {
    var crearBoton = document.getElementById('crearBoton');
    var modificarBoton = document.getElementById('modificarBoton');
    var borrarBoton = document.getElementById('borrarBoton');

    if (crearBoton) {
        crearBoton.addEventListener('click', function () {
            if (validarCampos()) {
                // Aquí puedes realizar la acción de creación
                console.log('Campos válidos. Realizando acción de creación...');
            } else {
                console.log('Hay campos vacíos o inválidos.');
            }
        });
    }

    if (modificarBoton) {
        modificarBoton.addEventListener('click', function () {
            if (validarCampos()) {
                // Aquí puedes realizar la acción de modificación
                console.log('Campos válidos. Realizando acción de modificación...');
            } else {
                console.log('Hay campos vacíos o inválidos.');
            }
        });
    }

    if (borrarBoton) {
        borrarBoton.addEventListener('click', function () {
            // Aquí puedes realizar la acción de borrado
            console.log('Realizando acción de borrado...');
            // Puedes reiniciar los campos de texto aquí si es necesario
            reiniciarCampos();
        });
    }
});

function reiniciarCampos() {
    var campos = ['mensaje'];

    campos.forEach(function (id) {
        var campo = document.getElementById(id);
        campo.value = ''; // Limpiar el contenido de cada campo
        campo.style.backgroundColor = '#fff'; // Restablecer color original
    });
}
