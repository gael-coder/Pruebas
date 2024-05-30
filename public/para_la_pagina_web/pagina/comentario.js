// JavaScript Document
// Obtener los elementos del DOM
var modal = document.getElementById("myModal");
var btnEnviar = document.getElementById("enviar");
var spanCerrar = document.getElementsByClassName("close")[0];

// Cuando se haga clic en el botón "ENVIAR", mostrar el modal
btnEnviar.onclick = function() {
    modal.style.display = "block";
}

// Cuando se haga clic en la 'x', cerrar el modal
spanCerrar.onclick = function() {
    modal.style.display = "none";
}

// Cuando se haga clic fuera del modal, cerrar el modal
window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
}
