// JavaScript Document
// Función para mostrar el cuadro emergente
function showPopup() {
    var overlay = document.getElementById('overlay');
    overlay.style.display = 'block';
}

// Función para cerrar el cuadro emergente
function closePopup() {
    var overlay = document.getElementById('overlay');
    overlay.style.display = 'none';
}
function redirectToAnotherPage() {
    window.location.href = "EvaluacionInicial.html"; // Cambia "otroArchivo.html" al nombre de tu archivo HTML de destino
}
// Evento al hacer clic en el cuadro pequeño
document.getElementById('smallBox').addEventListener('click', function() {
    showPopup();
});
