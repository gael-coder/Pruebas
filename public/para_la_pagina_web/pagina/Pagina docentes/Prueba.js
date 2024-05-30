/**
 * En este Scrip se encuentra la conexión con el SQL, asi como los metodos para
 * insertar, eliminar, actualizar y ver el estado de la base de datos
 */

const sql = require('mssql')
//creamos la conexión
// /** 
const dbSetting = {
    user: 'didacti',
    password: '1234',
    server: 'ABIGAIL',
    database: 'DIDACTI_LETRAS',
    options: {
        encrypt: true,
        trustServerCertificate: true,
    }
}

//se crea una función mediante la cual se conectara
async function getConnection() {
    try {
        const pool = await sql.connect(dbSetting);
        alert('Conexion Exitosa')
        console.log('Conexión exitosa'); // Mensaje de éxito
        //const result = await pool.request().query('SELECT * FROM USUARIOS');
        //console.log(result);
    } catch (error) {
       alert('Error al conectar a la base de datos:')
        console.error('Error al conectar a la base de datos:', error);
    }
}
//funcion que permite iniciar sesión 
async function iniciarSesion(usern, passn) {
    try {
        const pool = await sql.connect(dbSetting);
        const query = await pool.request().input('usern', sql.NVarChar, usern).input('passn', sql.NVarChar, passn).query('SELECT * FROM USUARIOS WHERE TEL_USER = 8445679021 AND PASS_USER = 1234');

        if (query.recordset.length > 0) {
            alert('INICIO DE SESION EXITOSO')
            console.log('INICIO DE SESION EXITOSO')
            return true;
        } else {
            alert('USUARIO O CONTRASEÑA INVALIDOS')
            console.log('USUARIO O CONTRASEÑA INVALIDOS')
            return false;
        }
    } catch (error) {
        alert('Error al iniciar sesion')
        console.error('error al iniciar sesion: ', error);
        throw error;
    }
}

//funcion que permite la insersion de datos
async function insertarDatos() {
    try {
        //obtenemos la conexion
        const pool = await sql.connect(dbSetting);
        //query de insertar datos
        const query = await pool.request().query("INSERT INTO USUARIOS (NOMBRE_USER, CORREO_USER, TEL_USER, PASS_USER) VALUES ('nayeli', 'nayS@gmail.com', '8442348901', '8901')")
        console.log('INSERSION EXITOSA')
    } catch (error) {
        console.log('ERROR AL INSERTAR LOS DATOS')
        console.error('Error al insertar los datos: ', error)
    }
}
//funcion que permite la actualización de datos
async function actualizarDatos() {
    try {
        //obtenemos la conexion
        const pool = await sql.connect(dbSetting);
        //query 
        const query = await pool.request().query("UPDATE USUARIOS SET NOMBRE_USER = 'Alex' WHERE ID_USER='4'")
        console.log('ACTUALIZACIÓN EXITOSA')
    } catch (error) {
        console.log('ERROR AL INSERTAR LOS DATOS')
        console.error('Error al insertar los datos: ', error)
    }
}
//funcion que permite la eliminación de datos
async function eliminarDatos() {
    try {
        //obtenemos la conexion
        const pool = await sql.connect(dbSetting);
        //query de eliminar
        const query = await pool.request().query("DELETE FROM USUARIOS WHERE NOMBRE_USER = 'nayeli'")
        console.log('ELIMINACIÓN EXITOSA')
    } catch (error) {
        console.log('ERROR AL ELIMINAR LOS DATOS')
        console.error('Error al elimina los datos: ', error)
    }
}
//función para comprobar el estado de la BD
async function estadoBD() {
    try {
        //obtenemos la conexion de la BD
        const pool = await sql.connect(dbSetting);
        //realizamos una consulta para verficar la conexion
        const result = await pool.request().query('SELECT 1')
        //Verificamos la consulta con ayuda de condicionales
        if (result.recordset.length > 0) {
         //   alert('Conexion Establecida')
            console.log('Conexion Establecida')
            //return true
        } else {
            alert('Conexion Perdida')
            console.log('Conexión perdida')
            return false
        }
    } catch (error) {
       // alert('Error al verificar la conexión ', error)
        console.log('Error al verificar la conexión ', error)
        throw error
    }
}
//exportamos las funciones: esto nos permite usarlas fuera del script (mandolas a llamar)
// module.exports = { iniciarSesion };
// module.exports = { estadoBD }
// module.exports = { getConnection }
// module.exports = { actualizarDatos }
// module.exports = { eliminarDatos }
// module.exports = { insertarDatos }
//se ejecutan por consola 
/*
* La funciones estan comentarizadas porque utilizamos (nodemon) el cual
* nos permite realizar los cambios en tiempo y forma, pero al momento de
* estar guardando cambios se ejecutaran 
*/
estadoBD();
getConnection();
//eliminarDatos();
iniciarSesion();
//insertarDatos();
//actualizarDatos();