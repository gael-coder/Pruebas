const bcrypt = require('bcrypt')
//funcion para encriptar contraseñas
const encrypPass = async (password) => {
    try {
        const salt = await bcrypt.genSalt(10); // Generar un salt
        const hashedPassword = await bcrypt.hash(password, salt); // Encriptar la contraseña con el salt generado
        return hashedPassword;
    } catch (error) {
        throw error;
    }
}

module.exports = {encrypPass}