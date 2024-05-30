const express = require('express')
const bodyParser = require('body-parser')
const sql = require('mssql')
const bcrypt = require('bcrypt')
const fs = require('fs');
const path = require('path');



//Importa y configura multer en la aplicacion 
const multer = require('multer');

// Función para crear la carpeta de destino con la ruta completa si no existe
const createUploadsFolder = () => {
    const uploadsFolder = path.join(__dirname, 'videos');
    if (!fs.existsSync(uploadsFolder)) {
        fs.mkdirSync(uploadsFolder, { recursive: true }); // Crear la carpeta de destino de forma recursiva
        // Asignar permisos necesarios
        fs.chmodSync(uploadsFolder, '755'); // Permisos de lectura y escritura para el usuario, y permisos de lectura para el grupo y otros
    }
    return uploadsFolder;
};

// Llamar a la función para crear la carpeta de destino
const uploadsFolder = createUploadsFolder();

// Configuración de multer para guardar los archivos en la carpeta 'uploads'
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsFolder); // Ruta de la carpeta de destino
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});

// Crear instancia de multer con la configuración de almacenamiento
const upload = multer({ storage: storage });

//crea una instancia
const app = express()
const port = 3002

//configuración del middleware para analizar el cuerpo de las solicitudes
app.use(bodyParser.json())

// Configuración para servir archivos estáticos desde el directorio 'public'
app.use(express.static('public'));

// Manejador de ruta para la página principal
app.get('/index.html', (req, res) => {
    // Envía el archivo HTML cuando se solicite la página principal
    res.sendFile(__dirname + '/public/index.html');
});

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/crearCuenta')
})

//le di los privilegios al usuasrio para el manejor de archivos grandes
//configuración de la conexion a la base de datos
const config = {
    user: 'didacti',
    password: '1234',
    server: 'localhost',
    database: 'DIDACTI_LETRAS',
    options: {
        encrypt: true,
        trustServerCertificate: true,
    }
}

app.post('/login', async (req, res) => {
    const { usuario, contraseña } = req.body;

    try {
        // Establecer la conexión a la base de datos
        await sql.connect(config);

        // Consulta para obtener la contraseña encriptada del usuario
        const result = await sql.query`SELECT * FROM USUARIOS WHERE CORREO = ${usuario}`;

        // Si se encuentra un registro con el correo electrónico proporcionado
        if (result.recordset.length > 0) {
            const hashedPassword = result.recordset[0].PASS_USER;
            // Comparar la contraseña proporcionada con la contraseña encriptada en la base de datos
            const passwordMatch = await bcrypt.compare(contraseña, hashedPassword);

            if (passwordMatch) {
                // Consulta para obtener los roles del usuario
                const rolesResult = await sql.query`SELECT r.roles FROM Usuarios u JOIN Roles r ON u.ID_USUARIOS = r.idUsuarios WHERE u.correo =  ${usuario} AND u.PASS_USER = ${hashedPassword};`;

                // Verificar si el usuario tiene el rol 'usuario'
                const roles = rolesResult.recordset.map(role => role.roles);
                if (roles.includes('usuario')) {
                    res.json({ success: true, role: 'usuario' });
                } else if (roles.includes('docente')) {
                    res.json({ success: true, role: 'docente' });
                } else if (roles.includes('administrador')) {
                    res.json({ success: true, role: 'administrador' });
                }
                else {
                    res.json({ success: false, message: 'No se encontró un rol asignado' });
                }
            } else {
                // Contraseña incorrecta
                res.json({ success: false, message: 'Credenciales incorrectas' });
            }
        } else {
            // No se encontró ningún usuario con ese correo electrónico
            res.json({ success: false, message: 'Usuario no encontrado' });
        }

        // Cerrar la conexión
        await sql.close();
    } catch (error) {
        console.error('Error al intentar iniciar sesión:', error.message);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

//endpoint para insertar los datos
app.post('/insertarDatos', async (req, res) => {
    const { nombre, edad } = req.body;

    try {
        // Establecer la conexión a la base de datos
        await sql.connect(config);

        // Insertar los datos en la tabla correspondiente
        await sql.query`INSERT INTO Datos (Nombre, Edad) VALUES (${nombre}, ${edad})`;

        // Cerrar la conexión
        await sql.close();

        res.json({ success: true, message: 'Datos insertados correctamente' });
    } catch (error) {
        console.error('Error al intentar insertar datos:', error.message);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});
//enpoint para verificar el estado de la base de datos
app.get('/estadoDB', async (req, res) => {
    try {
        // Intenta conectar con la  base de datos
        await sql.connect(config);

        // Si la conexión fue exitosa, envía una respuesta exitosa
        res.json({ message: 'La conexión a la base de datos está activa' });
    } catch (error) {
        // Si hay un error al conectar, envía un mensaje de error
        console.error('Error al intentar conectar a la base de datos:', error.message);
        res.status(500).json({ message: 'Error al conectar a la base de datos' });
    }
});

// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor escuchando en el puerto ${port}`);
});

async function getConnection() {
    try {
        //traer la conexion
        const pool = await sql.connect(config)
        console.log('conexion exitosa')
    } catch (error) {
        console.error('error al conectar con la base de datos: ', error)
    }



}

// getConnection()

//t
//endpoint para crear una cuenta
app.post('/registro', async (req, res) => {
    const { nombre, apellido, correo, telefono, password } = req.body;
    if (!nombre || !apellido || !correo || !telefono || !password) {
        return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios' })
    }
    try {
        // Establecemos la conexión
        await sql.connect(config);
        // Verificamos si el correo ya está registrado
        const correoExistente = await sql.query`SELECT * FROM USUARIOS WHERE CORREO = ${correo}`;
        if (correoExistente.recordset.length > 0) {
            return res.status(400).json({ success: false, message: 'El correo ya está registrado' });
        }
        // Encriptamos la contraseña
        const hashedPassword = await bcrypt.hash(password, 10);
        // Query de inserción de datos
        const query = `INSERT INTO USUARIOS (NOMBRE,APELLIDOS,CORREO,TELEFONO,PASS_USER) VALUES ('${nombre}','${apellido}','${correo}','${telefono}','${hashedPassword}')
            DECLARE @ID_USUARIOS INT;
            SET @ID_USUARIOS = SCOPE_IDENTITY();
            INSERT INTO Roles (idUsuarios, roles)
            VALUES (@ID_USUARIOS, 'usuario')`;
        // Ejecutamos la consulta SQL
        const result = await sql.query(query);
        // Enviamos respuesta al cliente
        res.json({ success: true, message: 'Cuenta creada exitosamente' });
    } catch (error) {
        console.error('Error al crear la cuenta:', error)
        res.status(500).json({ success: false, message: 'Error al crear cuenta' })
    }
});

// Endpoint para crear una leccion
app.post('/registroLeccion', async (req, res) => {
    // Obtenemos los datos de la solicitud
    const { descripcion, numeroIDInput } = req.body;
    if (!descripcion || !numeroIDInput) {
        return res.status(400).json({
            success: false,
            message: 'Todos los campos son obligatorios'
        });
    }

    try {
        await sql.connect(config);
        // Verificar si la leccion ya existe en la base de datos
        const existingLeccion = await sql.query`SELECT * FROM Leccion WHERE numero_leccion = ${numeroIDInput}`;
        if (existingLeccion.recordset.length > 0) {
            // La leccion ya existe
            const leccion = existingLeccion.recordset[0];
            if (leccion.validar === false) {
                // Reactivar la leccion
                await sql.query`UPDATE Leccion SET validar = 1 WHERE idLeccion = ${leccion.idLeccion}`;
                res.json({ success: true, message: `Se reactivó la lección ${leccion.numero_leccion}` });
            } else {
                // La leccion ya está activa
                res.json({ success: false, message: `La lección ${leccion.numero_leccion} ya existe` });
            }
        } else {
            // La leccion no existe, la creamos
            const query = `INSERT INTO Leccion (descripcion, numero_leccion, validar) VALUES ('${descripcion}', '${numeroIDInput}', 1)`;
            await sql.query(query);
            res.json({ success: true, message: 'Lección creada exitosamenet' });
        }
    } catch (error) {
        console.error('Error al crear la lección:', error);
        res.status(500).json({ success: false, message: 'Error al crear la lección' });
    }
});


//endponit para devolver los datos de la tabla evaluacion
app.get('/evaluaciones', async (req, res) => {
    try {
        await sql.connect(config);
        const result = await sql.query`SELECT idEvaluacion, Link_forms FROM Evaluacion`;
        await sql.close();
        res.json(result.recordset);
    } catch (error) {
        console.error('Error al obtener las evaluaciones:', error.message);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

//endponit para modificar una leccion
app.post('/modificarLeccion', async (req, res) => {
    //obtenemos los datos de la solicitud
    const { descripcion, numeroIDInput } = req.body;
    if (!descripcion || !numeroIDInput) {
        return res.status(400).json({
            success: false,
            message: 'Todos los campos son obligatorios'
        })

    }
    try {
        await sql.connect(config)


        const query = `UPDATE Leccion
        SET descripcion = '${descripcion}'
        WHERE numero_leccion = '${numeroIDInput}';`;
        const result = await sql.query(query)
        res.json({ success: true, message: 'Leccion Modificada exitosamente' })

    } catch (error) {
        console.error('Error al crear la Leccion:', error)
        res.status(500).json({ success: false, message: 'Error al modificar Leccion' })
    }

})


//endponit para eliminar una leccion
app.post('/borrarLeccion', async (req, res) => {
    //obtenemos los datos de la solicitud
    const { numeroIDInput } = req.body;
    if (!numeroIDInput) {
        return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios' })

    }
    try {
        await sql.connect(config)
        const query = `UPDATE Leccion
        SET validar = 0
        WHERE numero_leccion = ${numeroIDInput};
        `;
        const result = await sql.query(query)
        res.json({ success: true, message: 'Leccion borrada exitosamente' })

    } catch (error) {
        console.error('Error al crear la Leccion:', error)
        res.status(500).json({ success: false, message: 'Error al borrar Leccion 3' })
    }

})


//endponit para devovler las id de las lecciones creadas
app.get('/actualizarNumeroLeccion', async (req, res) => {
    try {
        await sql.connect(config);
        const result = await sql.query`SELECT * FROM Leccion`;
        await sql.close();
        res.json(result.recordset);
    } catch (error) {
        console.error('Error al obtener las lecciones:', error.message);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

//--------------------------------------------------------------------------------------------



// Endpoint para obtener los datos de las lecciones
//endponit para devolver los ID de los usuarios
app.get('/actualizarIDLecciones', async (req, res) => {
    try {
        await sql.connect(config);
        const result = await sql.query`SELECT * FROM Leccion ;`;
        await sql.close();
        res.json(result.recordset);
    } catch (error) {
        console.error('Error al obtener las evaluaciones:', error.message);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});



// Endpoints para usuario por docentes ------------------------------------------------------------

//endponit para crear un usuario
app.post('/crearUsuarioDocente', async (req, res) => {
    // Obtenemos los datos de la solicitud
    const { nombre, apellido, email, telefono, password } = req.body;
    if (!nombre || !apellido || !email || !telefono || !password) {
        return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios' })
    }

    try {
        // Establecemos la conexión
        await sql.connect(config);

        const correoExistente = await sql.query`SELECT * FROM USUARIOS WHERE CORREO = ${email}`;
        if (correoExistente.recordset.length > 0) {
            return res.status(400).json({ success: false, message: 'El correo ya está registrado' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Query de inserción de datos
        const query = `
            INSERT INTO USUARIOS (NOMBRE, APELLIDOS, CORREO, TELEFONO, PASS_USER)
            VALUES ('${nombre}', '${apellido}', '${email}', '${telefono}', '${hashedPassword}');
            
            DECLARE @ID_USUARIOS INT;
            SET @ID_USUARIOS = SCOPE_IDENTITY();
            
            INSERT INTO Roles (idUsuarios, roles)
            VALUES (@ID_USUARIOS, 'docente');
        `;

        // Ejecutamos la consulta SQL
        const result = await sql.query(query);

        // Enviamos la respuesta al cliente
        res.json({ success: true, message: 'Cuenta creada exitosamente' });
    } catch (error) {
        console.error('Error al crear la cuenta:', error);
        res.status(500).json({ success: false, message: 'Error al crear cuenta' });
    } finally {
        // Cerramos la conexión después de ejecutar la consulta
        if (sql) {
            await sql.close();
        }
    }
});


//endponit para modificar una usuario
app.post('/ModificarUsuarioDocente', async (req, res) => {
    //obtenemos los datos de la solicitud
    const { nombre, apellido, email, telefono, password, ID_usuario } = req.body;
    if (!nombre || !apellido || !email || !telefono || !password || !ID_usuario) {
        return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios' })
    }
    try {

        await sql.connect(config)


        const hashedPassword = await bcrypt.hash(password, 10);
        const query = `
        BEGIN TRANSACTION;
            UPDATE Usuarios
            SET nombre = '${nombre}',
                apellidos = '${apellido}',
                correo = '${email}',
                telefono = ${telefono},
                PASS_USER = '${hashedPassword}'
            FROM Usuarios
            JOIN Roles ON Usuarios.ID_USUARIOS = Roles.idUsuarios
            WHERE Usuarios.ID_USUARIOS = ${ID_usuario};

            
            COMMIT;
    `;
        const result = await sql.query(query)
        res.json({ success: true, message: 'Leccion Modificada exitosamente' })

    } catch (error) {
        console.error('Error al crear la Leccion:', error)
        res.status(500).json({ success: false, message: 'Error al modificar Leccion 3' })
    }

})

//endponit para ELiminar una usuario
app.post('/borrarUsuarioDocente', async (req, res) => {
    // Obtenemos los datos de la solicitud
    const { ID_usuario } = req.body;
    if (!ID_usuario) {
        return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios' });
    }

    try {
        await sql.connect(config);

        // Verificamos si el usuario a borrar es administrador
        const adminQuery = `SELECT roles FROM Roles WHERE idUsuarios = ${ID_usuario}`;
        const adminResult = await sql.query(adminQuery);
        if (adminResult.recordset.length > 0 && adminResult.recordset[0].roles === 'administrador') {
            return res.status(400).json({ success: false, message: 'No se puede borrar el usuario administrador' });
        }

        // Si el usuario no es administrador, procedemos con el borrado
        const query = `
            BEGIN TRANSACTION;
            DECLARE @UserID INT = ${ID_usuario};
            DELETE FROM Roles WHERE idUsuarios =  ${ID_usuario};
            DELETE FROM Usuarios WHERE ID_USUARIOS =  ${ID_usuario};
            COMMIT TRANSACTION;`;
        await sql.query(query);

        res.json({ success: true, message: 'Usuario borrado exitosamente' });
    } catch (error) {
        console.error('Error al borrar el usuario:', error);
        res.status(500).json({ success: false, message: 'Error al borrar el usuario' });
    }
});


//endponit para devolver los ID de los usuarios
app.get('/actualizarID', async (req, res) => {
    try {
        await sql.connect(config);
        const result = await sql.query`SELECT Usuarios.*, Roles.roles AS Rol
        FROM Usuarios
        JOIN Roles ON Usuarios.ID_USUARIOS = Roles.idUsuarios;
        `;
        await sql.close();
        res.json(result.recordset);
    } catch (error) {
        console.error('Error al obtener las evaluaciones:', error.message);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});


//endponit para devolver los ID de los usuarios
app.get('/actualizarID2', async (req, res) => {
    try {
        await sql.connect(config);
        const result = await sql.query`
        SELECT 
            Usuarios.*, 
            Roles.roles AS Rol
        FROM 
            Usuarios
        JOIN 
            Roles ON Usuarios.ID_USUARIOS = Roles.idUsuarios
        WHERE 
            Roles.roles = 'docente'
            or Roles.roles = 'administrador';
        `;
        await sql.close();
        res.json(result.recordset);
    } catch (error) {
        console.error('Error al obtener las evaluaciones:', error.message);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});
//endponit para sacar los datos
app.get('/obtenerUsuario/:id', async (req, res) => {
    let userId = req.params.id;
    //verifica si el user id es nullo numero no valido 
    if (userId === 'null' || isNaN(parseInt(userId))) {
        return res.status(400).json({ error: 'ID de usuario no valido' })
    }
    userId = parseInt(userId);
    try {
        await sql.connect(config);
        const result = await sql.query`SELECT * FROM Usuarios WHERE ID_USUARIOS = ${userId}`;
        await sql.close();

        // Si se encontraron resultados, enviar la información del usuario
        if (result.recordset.length > 0) {
            res.json(result.recordset[0]);
        } else {
            res.status(404).json({ error: 'Usuario no encontrado' });
        }
    } catch (error) {
        console.error('Error al obtener el usuario:', error.message);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});
//endponit para sacar los datos de los docentes
app.get('/obtenerDocewnte/:id', async (req, res) => {
    let userId = req.params.id;
    //verifica si el user id es nullo numero no valido 
    if (userId === 'null' || isNaN(parseInt(userId))) {
        return res.status(400).json({ error: 'ID de usuario no valido' })
    }
    userId = parseInt(userId);
    try {
        await sql.connect(config);
        const result = await sql.query`
        SELECT 
        U.ID_USUARIOS,
        U.nombre,
        U.apellidos,
        U.correo,
        U.telefono,
        U.PASS_USER,
        R.idRoles,
        R.idUsuarios,
        R.roles
    FROM 
        Usuarios U
    JOIN 
        Roles R ON U.ID_USUARIOS = R.idUsuarios
    WHERE 
        (R.roles = 'docente' OR R.roles = 'administrador')
        AND U.ID_USUARIOS = ${userId};
    
        `;
        await sql.close();

        // Si se encontraron resultados, enviar la información del usuario
        if (result.recordset.length > 0) {
            res.json(result.recordset[0]);
        } else {
            res.status(404).json({ error: 'Usuario no encontrado' });
        }
    } catch (error) {
        console.error('Error al obtener el usuario:', error.message);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});
//evaluaciones parciales
//endponit para crear una leccion
app.post('/registroEvaluacion', async (req, res) => {
    // Obtener los datos de la solicitud
    const { NumeroEvaluacion2, mensaje, numeroIDInput, calculo } = req.body;

    // Verificar si los campos están vacíos
    if (!NumeroEvaluacion2 || !mensaje || !numeroIDInput || !calculo) {
        if (!NumeroEvaluacion2) console.log("El campo NumeroEvaluacion está vacío");
        if (!mensaje) console.log("El campo mensaje está vacío");
        if (!numeroIDInput) console.log("El campo numeroIDInput está vacío");
        if (!calculo) console.log("El campo calculo está vacío");

        return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios' });
    }

    try {
        // Conectarse a la base de datos
        await sql.connect(config);

        // Verificar si el número de evaluación ya existe


        // Insertar los datos si el número de evaluación no existe
        const insertQuery = `INSERT INTO evaluacionParcial(idLeccion, forms, numero_evaluacionParcial,Link_calculo) 
                             VALUES (${numeroIDInput},'${mensaje}',${NumeroEvaluacion2},'${calculo}')`;
        await sql.query(insertQuery);

        res.json({ success: true, message: 'Evaluacion parcial creada exitosamente' });

    } catch (error) {
        console.error('Error al crear la Leccion:', error);
        res.status(500).json({ success: false, message: 'Error al crear evaluacion' });
    }
});


//endponit para modificar una leccion
app.post('/modificarEvaluacion', async (req, res) => {
    //obtenemos los datos de la solicitud
    const { NumeroEvaluacion2, mensaje, numeroIDInput, numeroIDInput2, calculo } = req.body;
    if (!NumeroEvaluacion2 || !mensaje || !numeroIDInput || !numeroIDInput2 || !calculo) {
        if (!NumeroEvaluacion2) console.log("El campo NumeroEvaluacion2 está vacío");
        if (!mensaje) console.log("El campo mensaje está vacío");
        if (!numeroIDInput1) console.log("El campo numeroIDInput1 está vacío");
        if (!numeroIDInput2) console.log("El campo numeroIDInput2 está vacío");
        if (!calculo) console.log("El campo calculo está vacío");
        return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios' });
    }
    try {
        await sql.connect(config)

        const query = `update evaluacionParcial set idLeccion='${numeroIDInput}', forms='${mensaje}',
        numero_evaluacionParcial='${NumeroEvaluacion2}',
        Link_calculo='${calculo}' 
        where idevaluacionParcial='${numeroIDInput2}'`;
        const result = await sql.query(query)
        res.json({ success: true, message: 'Evaluacion parcial Modificada exitosamente' })

    } catch (error) {
        console.error('Error al crear la Leccion:', error)
        res.status(500).json({ success: false, message: 'Error al modificar la evaluacion' })
    }

})

//endponit para eliminar una leccion
app.post('/BorrarEvaluacion', async (req, res) => {
    //obtenemos los datos de la solicitud
    const { numeroIDInput2 } = req.body;
    if (!numeroIDInput2) {
        return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios' })

    }
    try {
        await sql.connect(config)
        const query = `DELETE FROM evaluacionParcial  
        where idevaluacionParcial=${numeroIDInput2}`;
        const result = await sql.query(query)
        res.json({ success: true, message: 'evaluacion borrada exitosamente' })

    } catch (error) {
        console.error('Error al crear la Leccion:', error)
        res.status(500).json({ success: false, message: 'Error al borrar evaluacion 3' })
    }

})


//endponit para devovler las id de las lecciones creadas
app.get('/actualizarIDLeccionesEvaluacion', async (req, res) => {
    try {
        await sql.connect(config);
        const result = await sql.query`SELECT * FROM Leccion where validar=1`;
        await sql.close();
        res.json(result.recordset);
    } catch (error) {
        console.error('Error al obtener las lecciones:', error.message);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

//endponit para devovler las id de las evaluaciones
app.get('/actualizarIDEvaluaciones', async (req, res) => {
    try {
        await sql.connect(config);
        const result = await sql.query`
			SELECT ep.*, l.descripcion, l.numero_leccion
            FROM evaluacionParcial ep
            JOIN Leccion l ON ep.idLeccion = l.idLeccion
            ORDER BY ep.numero_evaluacionParcial ASC;
        ;
        `;
        await sql.close();
        res.json(result.recordset);
    } catch (error) {
        console.error('Error al obtener las lecciones:', error.message);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

//Parte del codigo que agrega las actividades--------------------------------------------------

//endponit para devovler las id de las lecciones creadas
app.get('/actualizarIDActividad', async (req, res) => {
    try {
        await sql.connect(config);
        const result = await sql.query`SELECT TipoDeActividad.idActividad, TipoDeActividad.Tipo_actividad,
        Actividad.numeroDeActividad, Actividad.idLeccion, Leccion.numero_leccion
        FROM TipoDeActividad
        JOIN Actividad ON TipoDeActividad.idActividad = Actividad.idActividad
        JOIN Leccion ON Actividad.idLeccion = Leccion.idLeccion;;`;
        await sql.close();
        res.json(result.recordset);
    } catch (error) {
        console.error('Error al obtener las lecciones:', error.message);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});


//endpoint para obtener los datos por el correo del usuario
app.get('/obtenerUsuarioCliente/:correo', async (req, res) => {
    let correo = req.params.correo;

    // Verifica si el correo es null o vacío
    if (!correo || correo.trim() === '') {
        return res.status(400).json({ error: 'Correo de usuario no válido' });
    }

    try {
        await sql.connect(config);
        const result = await sql.query`select * from Usuarios where correo = ${correo}`;
        await sql.close();

        // Si se encontraron resultados, enviar la información del usuario
        if (result.recordset.length > 0) {
            res.json(result.recordset[0]);
        } else {
            res.status(404).json({ error: 'Usuario no encontrado' });
        }
    } catch (error) {
        console.error('Error al obtener el usuario:', error.message);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});


//endpoint de las activdades----------------------------------------------------------------------
//endponit de las actividades preguntas----------------------------------------------------------
app.post('/registroActividadPregunta', async (req, res) => {
    //obtenemos los datos de la solicitud
    const { identificador, idLeccion, NumeroDeActividad, TipoDeActividad,
        cuadro1Pregunta, cuadro2Pregunta, cuadro3Pregunta, cuadro4Pregunta,
        valor1, valor2, valor3, valor4
    } = req.body;


    if (
        !identificador || !idLeccion || !NumeroDeActividad || !TipoDeActividad ||
        !cuadro1Pregunta || !cuadro2Pregunta || !cuadro3Pregunta || !cuadro4Pregunta ||
        valor1 === null || valor1 === undefined ||
        valor2 === null || valor2 === undefined ||
        valor3 === null || valor3 === undefined ||
        valor4 === null || valor4 === undefined
    ) {
        console.log("Los siguientes campos están vacíos:");
        if (!identificador) console.log("identificador");
        if (!idLeccion) console.log("idLeccion");
        if (!NumeroDeActividad) console.log("NumeroDeActividad");
        if (!TipoDeActividad) console.log("TipoDeActividad");
        if (!cuadro1Pregunta) console.log("cuadro1Pregunta");
        if (!cuadro2Pregunta) console.log("cuadro2Pregunta");
        if (!cuadro3Pregunta) console.log("cuadro3Pregunta");
        if (!cuadro4Pregunta) console.log("cuadro4Pregunta");
        if (valor1 === null || valor1 === undefined) console.log("valor1");
        if (valor2 === null || valor2 === undefined) console.log("valor2");
        if (valor3 === null || valor3 === undefined) console.log("valor3");
        if (valor4 === null || valor4 === undefined) console.log("valor4");

        return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios' });
    }
    if (valor1 === 0 && valor2 === 0 && valor3 === 0 && valor4 === 0) {
        return res.status(400).json({ success: false, message: 'Selecciona al menos una respuesta verdadera' });
    }
    try {
        await sql.connect(config)

        const existsQuery = `SELECT COUNT(*) AS count FROM Actividad WHERE idLeccion = '${idLeccion}' AND numeroDeActividad = '${NumeroDeActividad}'`;
        const existsResult = await sql.query(existsQuery);

        if (existsResult.recordset[0].count > 0) {
            return res.status(400).json({ success: false, message: 'Ya existe una actividad con el mismo número en esta lección' });
        }


        const query = `BEGIN TRANSACTION;

        DECLARE @ID_ACTIVIDAD INT;
        
        -- Insertar en la tabla Actividad
        INSERT INTO Actividad (idLeccion, numeroDeActividad
            , descripcion)
        VALUES ('${idLeccion}', '${NumeroDeActividad}', '${identificador}');
        
        -- Obtener el ID de la actividad recién insertada
        SET @ID_ACTIVIDAD = SCOPE_IDENTITY();
        
        -- Insertar en la tabla TipoDeActividad con el tipo de actividad "Pregunta"
        INSERT INTO TipoDeActividad (idActividad, Tipo_actividad)
        VALUES (@ID_ACTIVIDAD, '${TipoDeActividad}');

        INSERT INTO Respuestas(idActividad,Respuesta,valor)
        values
        (@ID_ACTIVIDAD,'${cuadro1Pregunta}','${valor1}'),
        (@ID_ACTIVIDAD,'${cuadro2Pregunta}','${valor2}'),
        (@ID_ACTIVIDAD,'${cuadro3Pregunta}','${valor3}'),
        (@ID_ACTIVIDAD,'${cuadro4Pregunta}','${valor4}');

        COMMIT TRANSACTION;
        `;
        const result = await sql.query(query)
        res.json({ success: true, message: 'Actividad de tipo pregunta fue creada correctamente' })

    } catch (error) {
        console.error('Error al crear la Leccion:', error)
        res.status(500).json({ success: false, message: 'Error al crear la actividad de tipo pregunta' })
    }

})

//endoponit para modificar la actividad pregunta
app.post('/modificarActividadPregunta', async (req, res) => {
    //obtenemos los datos de la solicitud
    const { id_actividad, identificador, idLeccion, NumeroDeActividad, TipoDeActividad,
        cuadro1Pregunta, cuadro2Pregunta, cuadro3Pregunta, cuadro4Pregunta,
        valor1, valor2, valor3, valor4
    } = req.body;
    if (
        !id_actividad || !identificador || !idLeccion || !NumeroDeActividad || !TipoDeActividad ||
        !cuadro1Pregunta || !cuadro2Pregunta || !cuadro3Pregunta || !cuadro4Pregunta ||
        valor1 === null || valor1 === undefined ||
        valor2 === null || valor2 === undefined ||
        valor3 === null || valor3 === undefined ||
        valor4 === null || valor4 === undefined
    ) {
        console.log("Los siguientes campos están vacíos:");
        if (!identificador) console.log("identificador");
        if (!idLeccion) console.log("idLeccion");
        if (!NumeroDeActividad) console.log("NumeroDeActividad");
        if (!TipoDeActividad) console.log("TipoDeActividad");
        if (!cuadro1Pregunta) console.log("cuadro1Pregunta");
        if (!cuadro2Pregunta) console.log("cuadro2Pregunta");
        if (!cuadro3Pregunta) console.log("cuadro3Pregunta");
        if (!cuadro4Pregunta) console.log("cuadro4Pregunta");
        if (valor1 === null || valor1 === undefined) console.log("valor1");
        if (valor2 === null || valor2 === undefined) console.log("valor2");
        if (valor3 === null || valor3 === undefined) console.log("valor3");
        if (valor4 === null || valor4 === undefined) console.log("valor4");

        return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios' });
    }
    if (valor1 === 0 && valor2 === 0 && valor3 === 0 && valor4 === 0) {
        return res.status(400).json({ success: false, message: 'Selecciona al menos una respuesta verdadera' });
    }
    try {
        await sql.connect(config)

        const query = `
        UPDATE Actividad
        SET  idLeccion=${idLeccion} ,numeroDeActividad = ${NumeroDeActividad}, descripcion = '${identificador}'
        WHERE idActividad = ${id_actividad};
        
        DECLARE @idActividad INT = ${id_actividad}
        DECLARE @respuesta1 VARCHAR(255) = '${cuadro1Pregunta}'
        DECLARE @respuesta2 VARCHAR(255) = '${cuadro2Pregunta}'
        DECLARE @respuesta3 VARCHAR(255) = '${cuadro3Pregunta}'
        DECLARE @respuesta4 VARCHAR(255) = '${cuadro4Pregunta}'
        DECLARE @valor1 BIT = ${valor1}
        DECLARE @valor2 BIT = ${valor2}
        DECLARE @valor3 BIT = ${valor3}
        DECLARE @valor4 BIT = ${valor4}

        ;WITH CTE AS (
            SELECT r.idRespuestas, r.Respuesta, r.Valor,
                ROW_NUMBER() OVER (ORDER BY r.idRespuestas) AS RowNum
            FROM Respuestas AS r
            WHERE r.idActividad = @idActividad
        )
        UPDATE CTE
        SET Respuesta = CASE
                WHEN RowNum = 1 THEN @respuesta1
                WHEN RowNum = 2 THEN @respuesta2
                WHEN RowNum = 3 THEN @respuesta3
                WHEN RowNum = 4 THEN @respuesta4
            END,
            Valor = CASE
                WHEN RowNum = 1 THEN @valor1
                WHEN RowNum = 2 THEN @valor2
                WHEN RowNum = 3 THEN @valor3
                WHEN RowNum = 4 THEN @valor4
            END;
        `;
        const result = await sql.query(query)
        res.json({ success: true, message: 'Actividad de tipo pregunta fue creada correctamente' })

    } catch (error) {
        console.error('Error al crear la Leccion:', error)
        res.status(500).json({ success: false, message: 'Error al crear la actividad de tipo pregunta' })
    }

})

//endpoint para eliminar actividades de tipo pregunta
app.post('/eliminarActividadPregunta', async (req, res) => {
    //obtenemos los datos de la solicitud
    const { id_actividad
    } = req.body;
    if (
        !id_actividad
    ) {
        return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios' });
    }
    try {
        await sql.connect(config)
        const query = `
        DELETE FROM Respuestas
        WHERE idActividad = ${id_actividad};
        
        DELETE FROM TipoDeActividad
        WHERE idActividad = ${id_actividad};
        
        DELETE FROM Actividad
        WHERE idActividad = ${id_actividad};
        `;
        const result = await sql.query(query)
        res.json({ success: true, message: 'Actividad de tipo pregunta fue creada correctamente' })

    } catch (error) {
        console.error('Error al crear la Leccion:', error)
        res.status(500).json({ success: false, message: 'Error al crear la actividad de tipo pregunta' })
    }

})

//endponit de las actividades preguntas----------------------------------------------------------

//endponit de las actividades preguntas videos----------------------------------------------------------

app.post('/registroActividadVideo', upload.single('video'), async (req, res) => {
    const { identificador, idLeccion, NumeroDeActividad, TipoDeActividad,
        cuadro1Pregunta, cuadro2Pregunta, cuadro3Pregunta, cuadro4Pregunta,
        valor1, valor2, valor3, valor4
    } = req.body;
    if (
        !identificador || !idLeccion || !NumeroDeActividad || !TipoDeActividad ||
        !cuadro1Pregunta || !cuadro2Pregunta || !cuadro3Pregunta || !cuadro4Pregunta ||
        valor1 === null || valor1 === undefined ||
        valor2 === null || valor2 === undefined ||
        valor3 === null || valor3 === undefined ||
        valor4 === null || valor4 === undefined
    ) {
        console.log("Los siguientes campos están vacíos:");
        if (!identificador) console.log("identificador");
        if (!idLeccion) console.log("idLeccion");
        if (!NumeroDeActividad) console.log("NumeroDeActividad");
        if (!TipoDeActividad) console.log("TipoDeActividad");
        if (!cuadro1Pregunta) console.log("cuadro1Pregunta");
        if (!cuadro2Pregunta) console.log("cuadro2Pregunta");
        if (!cuadro3Pregunta) console.log("cuadro3Pregunta");
        if (!cuadro4Pregunta) console.log("cuadro4Pregunta");
        if (valor1 === null || valor1 === undefined) console.log("valor1");
        if (valor2 === null || valor2 === undefined) console.log("valor2");
        if (valor3 === null || valor3 === undefined) console.log("valor3");
        if (valor4 === null || valor4 === undefined) console.log("valor4");

        return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios' });
    }
    if (valor1 == 0 && valor2 == 0 && valor3 == 0 && valor4 == 0) {
        return res.status(400).json({ success: false, message: 'Selecciona al menos una respuesta verdadera' });
    }
    console.log(valor1);
    console.log(valor2);
    console.log(valor3);
    console.log(valor4);
    const filePath = path.join(__dirname, 'videos', req.file.filename); // Construir la ruta completa al archivo

    try {


        await sql.connect(config)
        const existsQuery = `SELECT COUNT(*) AS count FROM Actividad WHERE idLeccion = '${idLeccion}' AND numeroDeActividad = '${NumeroDeActividad}'`;
        const existsResult = await sql.query(existsQuery);

        if (existsResult.recordset[0].count > 0) {
            return res.status(400).json({ success: false, message: 'Ya existe una actividad con el mismo número en esta lección' });
        }
        const query = `BEGIN TRANSACTION;

        DECLARE @ID_ACTIVIDAD INT;
        
        -- Insertar en la tabla Actividad
        INSERT INTO Actividad (idLeccion, numeroDeActividad
            , descripcion)
        VALUES ('${idLeccion}', '${NumeroDeActividad}', '${identificador}');
        
        -- Obtener el ID de la actividad recién insertada
        SET @ID_ACTIVIDAD = SCOPE_IDENTITY();
        
        --insertar el video en la tabla multimedia
        INSERT INTO Multimedia (idMultimedia, archivo, idActividad, ruta)
                SELECT NEWID(), bulkColumn, @ID_ACTIVIDAD, '${filePath}'
                FROM OPENROWSET(BULK '${filePath}', SINGLE_BLOB) AS f;
        
        -- Insertar en la tabla TipoDeActividad con el tipo de actividad "Pregunta"
        INSERT INTO TipoDeActividad (idActividad, Tipo_actividad)
        VALUES (@ID_ACTIVIDAD, '${TipoDeActividad}');

        INSERT INTO Respuestas(idActividad,Respuesta,valor)
        values
        (@ID_ACTIVIDAD,'${cuadro1Pregunta}','${valor1}'),
        (@ID_ACTIVIDAD,'${cuadro2Pregunta}','${valor2}'),
        (@ID_ACTIVIDAD,'${cuadro3Pregunta}','${valor3}'),
        (@ID_ACTIVIDAD,'${cuadro4Pregunta}','${valor4}');

        COMMIT TRANSACTION;
        `;
        const result = await sql.query(query)
        res.json({ success: true, message: 'Actividad de tipo video fue creada correctamente' })

    } catch (error) {
        console.error('Error al crear la la ctividad de video:', error)
        res.status(500).json({ success: false, message: 'Error al crear la actividad de tipo video' })
    }

})
//endpoint para modificar actividades de video
app.post('/modificarActividadVideo', upload.single('video'), async (req, res) => {
    const { id_actividad, identificador, idLeccion, NumeroDeActividad, TipoDeActividad,
        cuadro1Pregunta, cuadro2Pregunta, cuadro3Pregunta, cuadro4Pregunta,
        valor1, valor2, valor3, valor4
    } = req.body;
    if (
        !identificador || !idLeccion || !NumeroDeActividad || !TipoDeActividad ||
        !cuadro1Pregunta || !cuadro2Pregunta || !cuadro3Pregunta || !cuadro4Pregunta ||
        valor1 === null || valor1 === undefined ||
        valor2 === null || valor2 === undefined ||
        valor3 === null || valor3 === undefined ||
        valor4 === null || valor4 === undefined
    ) {
        console.log("Los siguientes campos están vacíos:");
        if (!id_actividad) console.log("idActividad");
        if (!identificador) console.log("identificador");
        if (!idLeccion) console.log("idLeccion");
        if (!NumeroDeActividad) console.log("NumeroDeActividad");
        if (!TipoDeActividad) console.log("TipoDeActividad");
        if (!cuadro1Pregunta) console.log("cuadro1Pregunta");
        if (!cuadro2Pregunta) console.log("cuadro2Pregunta");
        if (!cuadro3Pregunta) console.log("cuadro3Pregunta");
        if (!cuadro4Pregunta) console.log("cuadro4Pregunta");
        if (valor1 === null || valor1 === undefined) console.log("valor1");
        if (valor2 === null || valor2 === undefined) console.log("valor2");
        if (valor3 === null || valor3 === undefined) console.log("valor3");
        if (valor4 === null || valor4 === undefined) console.log("valor4");

        return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios' });
    }
    if (valor1 == 0 && valor2 == 0 && valor3 == 0 && valor4 == 0) {
        return res.status(400).json({ success: false, message: 'Selecciona al menos una respuesta verdadera' });
    }
    const filePath = path.join(__dirname, 'videos', req.file.filename); // Construir la ruta completa al archivo

    try {
        await sql.connect(config)

        const query = `
        -- Actualizar la tabla Actividad
        UPDATE Actividad
        SET idLeccion = ${idLeccion},
            numeroDeActividad = ${NumeroDeActividad},
            descripcion = '${identificador}'
        WHERE idActividad = ${id_actividad};

        -- Declarar variables
        DECLARE @idActividad INT = ${id_actividad};
        DECLARE @respuesta1 VARCHAR(255) = '${cuadro1Pregunta}';
        DECLARE @respuesta2 VARCHAR(255) = '${cuadro2Pregunta}';
        DECLARE @respuesta3 VARCHAR(255) = '${cuadro3Pregunta}';
        DECLARE @respuesta4 VARCHAR(255) = '${cuadro4Pregunta}';
        DECLARE @valor1 BIT = ${valor1};
        DECLARE @valor2 BIT = ${valor2};
        DECLARE @valor3 BIT = ${valor3};
        DECLARE @valor4 BIT = ${valor4};

        -- Actualizar la tabla Multimedia
        UPDATE Multimedia
        SET archivo = (SELECT bulkColumn FROM OPENROWSET(BULK '${filePath}', SINGLE_BLOB) AS f),
            ruta = '${filePath}'
        WHERE idActividad = @idActividad;

        -- Usar CTE para actualizar la tabla Respuestas
        ;WITH CTE AS (
        SELECT r.idRespuestas, r.Respuesta, r.Valor,
            ROW_NUMBER() OVER (ORDER BY r.idRespuestas) AS RowNum
        FROM Respuestas AS r
        WHERE r.idActividad = @idActividad
        )
        UPDATE CTE
        SET Respuesta = CASE
                        WHEN RowNum = 1 THEN @respuesta1
                        WHEN RowNum = 2 THEN @respuesta2
                        WHEN RowNum = 3 THEN @respuesta3
                        WHEN RowNum = 4 THEN @respuesta4
                    END,
        Valor = CASE
                    WHEN RowNum = 1 THEN @valor1
                    WHEN RowNum = 2 THEN @valor2
                    WHEN RowNum = 3 THEN @valor3
                    WHEN RowNum = 4 THEN @valor4
                END;

            `;
        const result = await sql.query(query)
        res.json({ success: true, message: 'Actividad de tipo video fue modificada correctamente' })

    } catch (error) {
        console.error('Error al modificada la la ctividad de video:', error)
        res.status(500).json({ success: false, message: 'Error al modificada la actividad de tipo video' })
    }

})
//endpoint para eliminar todo de las actividades de tipo video
app.post('/borrarActividadVideo', async (req, res) => {
    //obtenemos los datos de la solicitud
    const { id_actividad } = req.body;
    if (!id_actividad) {
        return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios' });
    }
    try {
        await sql.connect(config)
        const query = `
        DELETE FROM Respuestas
        WHERE idActividad = ${id_actividad};
        
        DELETE FROM TipoDeActividad
        WHERE idActividad = ${id_actividad};
        
        DELETE FROM Multimedia
        WHERE idActividad =${id_actividad};

        DELETE FROM Actividad
        WHERE idActividad = ${id_actividad};
        `;
        const result = await sql.query(query)
        res.json({ success: true, message: 'Actividad de tipo video fue borrada correctamente' })

    } catch (error) {
        console.error('Error al borrar la actividad:', error)
        res.status(500).json({ success: false, message: 'Error al borrar la actividad de tipo video' })
    }

})

//endponit de las actividades preguntas audios----------------------------------------------------------
app.post('/registroActividadAudio', upload.single('audio'), async (req, res) => {
    const { identificador, idLeccion, NumeroDeActividad, TipoDeActividad,
        cuadro1Pregunta, cuadro2Pregunta, cuadro3Pregunta, cuadro4Pregunta,
        valor1, valor2, valor3, valor4
    } = req.body;
    if (
        !identificador || !idLeccion || !NumeroDeActividad || !TipoDeActividad ||
        !cuadro1Pregunta || !cuadro2Pregunta || !cuadro3Pregunta || !cuadro4Pregunta ||
        valor1 === null || valor1 === undefined ||
        valor2 === null || valor2 === undefined ||
        valor3 === null || valor3 === undefined ||
        valor4 === null || valor4 === undefined
    ) {
        console.log("Los siguientes campos están vacíos:");
        if (!identificador) console.log("identificador");
        if (!idLeccion) console.log("idLeccion");
        if (!NumeroDeActividad) console.log("NumeroDeActividad");
        if (!TipoDeActividad) console.log("TipoDeActividad");
        if (!cuadro1Pregunta) console.log("cuadro1Pregunta");
        if (!cuadro2Pregunta) console.log("cuadro2Pregunta");
        if (!cuadro3Pregunta) console.log("cuadro3Pregunta");
        if (!cuadro4Pregunta) console.log("cuadro4Pregunta");
        if (valor1 === null || valor1 === undefined) console.log("valor1");
        if (valor2 === null || valor2 === undefined) console.log("valor2");
        if (valor3 === null || valor3 === undefined) console.log("valor3");
        if (valor4 === null || valor4 === undefined) console.log("valor4");

        return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios' });
    }
    if (valor1 == 0 && valor2 == 0 && valor3 == 0 && valor4 == 0) {
        return res.status(400).json({ success: false, message: 'Selecciona al menos una respuesta verdadera' });
    }
    const filePath2 = path.join(__dirname, 'videos', req.file.filename); // Construir la ruta completa al archivo
    console.log(filePath2);
    try {
        await sql.connect(config)
        const existsQuery = `SELECT COUNT(*) AS count FROM Actividad WHERE idLeccion = '${idLeccion}' AND numeroDeActividad = '${NumeroDeActividad}'`;
        const existsResult = await sql.query(existsQuery);

        if (existsResult.recordset[0].count > 0) {
            return res.status(400).json({ success: false, message: 'Ya existe una actividad con el mismo número en esta lección' });
        }
        const query = `BEGIN TRANSACTION;

        DECLARE @ID_ACTIVIDAD INT;
        
        -- Insertar en la tabla Actividad
        INSERT INTO Actividad (idLeccion, numeroDeActividad
            , descripcion)
        VALUES ('${idLeccion}', '${NumeroDeActividad}', '${identificador}');
        
        -- Obtener el ID de la actividad recién insertada
        SET @ID_ACTIVIDAD = SCOPE_IDENTITY();
        
        --insertar el video en la tabla multimedia
        INSERT INTO Multimedia (idMultimedia, archivo, idActividad, ruta)
                SELECT NEWID(), bulkColumn, @ID_ACTIVIDAD, '${filePath2}'
                FROM OPENROWSET(BULK '${filePath2}', SINGLE_BLOB) AS f;
        
        -- Insertar en la tabla TipoDeActividad con el tipo de actividad "Pregunta"
        INSERT INTO TipoDeActividad (idActividad, Tipo_actividad)
        VALUES (@ID_ACTIVIDAD, '${TipoDeActividad}');

        INSERT INTO Respuestas(idActividad,Respuesta,valor)
        values
        (@ID_ACTIVIDAD,'${cuadro1Pregunta}','${valor1}'),
        (@ID_ACTIVIDAD,'${cuadro2Pregunta}','${valor2}'),
        (@ID_ACTIVIDAD,'${cuadro3Pregunta}','${valor3}'),
        (@ID_ACTIVIDAD,'${cuadro4Pregunta}','${valor4}');

        COMMIT TRANSACTION;
        `;
        const result = await sql.query(query)
        res.json({ success: true, message: 'Actividad de tipo audio fue creada correctamente' })

    } catch (error) {
        console.error('Error al crear la la ctividad de audio:', error)
        res.status(500).json({ success: false, message: 'Error al crear la actividad de tipo audio' })
    }

})
//endpoint para modificar las catividades de audio
app.post('/modificarActividadAudio', upload.single('audio'), async (req, res) => {
    const { id_actividad, identificador, idLeccion, NumeroDeActividad, TipoDeActividad,
        cuadro1Pregunta, cuadro2Pregunta, cuadro3Pregunta, cuadro4Pregunta,
        valor1, valor2, valor3, valor4
    } = req.body;
    if (
        !identificador || !idLeccion || !NumeroDeActividad || !TipoDeActividad ||
        !cuadro1Pregunta || !cuadro2Pregunta || !cuadro3Pregunta || !cuadro4Pregunta ||
        valor1 === null || valor1 === undefined ||
        valor2 === null || valor2 === undefined ||
        valor3 === null || valor3 === undefined ||
        valor4 === null || valor4 === undefined
    ) {
        console.log("Los siguientes campos están vacíos:");
        if (!id_actividad) console.log("idActividad");
        if (!identificador) console.log("identificador");
        if (!idLeccion) console.log("idLeccion");
        if (!NumeroDeActividad) console.log("NumeroDeActividad");
        if (!TipoDeActividad) console.log("TipoDeActividad");
        if (!cuadro1Pregunta) console.log("cuadro1Pregunta");
        if (!cuadro2Pregunta) console.log("cuadro2Pregunta");
        if (!cuadro3Pregunta) console.log("cuadro3Pregunta");
        if (!cuadro4Pregunta) console.log("cuadro4Pregunta");
        if (valor1 === null || valor1 === undefined) console.log("valor1");
        if (valor2 === null || valor2 === undefined) console.log("valor2");
        if (valor3 === null || valor3 === undefined) console.log("valor3");
        if (valor4 === null || valor4 === undefined) console.log("valor4");

        return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios' });
    }
    if (valor1 == 0 && valor2 == 0 && valor3 == 0 && valor4 == 0) {
        return res.status(400).json({ success: false, message: 'Selecciona al menos una respuesta verdadera' });
    }
    const filePath2 = path.join(__dirname, 'videos', req.file.filename); // Construir la ruta completa al archivo

    try {
        await sql.connect(config)

        const query = `
        -- Actualizar la tabla Actividad
        UPDATE Actividad
        SET idLeccion = ${idLeccion},
            numeroDeActividad = ${NumeroDeActividad},
            descripcion = '${identificador}'
        WHERE idActividad = ${id_actividad};

        -- Declarar variables
        DECLARE @idActividad INT = ${id_actividad};
        DECLARE @respuesta1 VARCHAR(255) = '${cuadro1Pregunta}';
        DECLARE @respuesta2 VARCHAR(255) = '${cuadro2Pregunta}';
        DECLARE @respuesta3 VARCHAR(255) = '${cuadro3Pregunta}';
        DECLARE @respuesta4 VARCHAR(255) = '${cuadro4Pregunta}';
        DECLARE @valor1 BIT = ${valor1};
        DECLARE @valor2 BIT = ${valor2};
        DECLARE @valor3 BIT = ${valor3};
        DECLARE @valor4 BIT = ${valor4};

        -- Actualizar la tabla Multimedia
        UPDATE Multimedia
        SET archivo = (SELECT bulkColumn FROM OPENROWSET(BULK '${filePath2}', SINGLE_BLOB) AS f),
            ruta = '${filePath2}'
        WHERE idActividad = @idActividad;

        -- Usar CTE para actualizar la tabla Respuestas
        ;WITH CTE AS (
        SELECT r.idRespuestas, r.Respuesta, r.Valor,
            ROW_NUMBER() OVER (ORDER BY r.idRespuestas) AS RowNum
        FROM Respuestas AS r
        WHERE r.idActividad = @idActividad
        )
        UPDATE CTE
        SET Respuesta = CASE
                        WHEN RowNum = 1 THEN @respuesta1
                        WHEN RowNum = 2 THEN @respuesta2
                        WHEN RowNum = 3 THEN @respuesta3
                        WHEN RowNum = 4 THEN @respuesta4
                    END,
        Valor = CASE
                    WHEN RowNum = 1 THEN @valor1
                    WHEN RowNum = 2 THEN @valor2
                    WHEN RowNum = 3 THEN @valor3
                    WHEN RowNum = 4 THEN @valor4
                END;

            `;
        const result = await sql.query(query)
        res.json({ success: true, message: 'Actividad de tipo audio fue modificada correctamente' })

    } catch (error) {
        console.error('Error al modificada la la actividad de audio:', error)
        res.status(500).json({ success: false, message: 'Error al modificada la actividad de tipo audio' })
    }

})
//endpoint para eliminar todo de las actividades de tipo audio
app.post('/borrarActividadAudio', async (req, res) => {
    //obtenemos los datos de la solicitud
    const { id_actividad } = req.body;
    if (!id_actividad) {
        return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios' });
    }
    try {
        await sql.connect(config)
        const query = `
        DELETE FROM Respuestas
        WHERE idActividad = ${id_actividad};
        
        DELETE FROM TipoDeActividad
        WHERE idActividad = ${id_actividad};
        
        DELETE FROM Multimedia
        WHERE idActividad =${id_actividad};

        DELETE FROM Actividad
        WHERE idActividad = ${id_actividad};
        `;
        const result = await sql.query(query)
        res.json({ success: true, message: 'Actividad de tipo video fue borrada correctamente' })

    } catch (error) {
        console.error('Error al borrar la actividad:', error)
        res.status(500).json({ success: false, message: 'Error al borrar la actividad de tipo video' })
    }

})
//endponit del material audiovisual----------------------------------------------------------
app.post('/registroMaterialAudioVisual', upload.single('video'), async (req, res) => {
    const { identificador, idLeccion, NumeroDeActividad, TipoDeActividad
    } = req.body;
    if (
        !identificador || !idLeccion || !NumeroDeActividad || !TipoDeActividad
    ) {
        console.log("Los siguientes campos están vacíos:");
        if (!identificador) console.log("identificador");
        if (!idLeccion) console.log("idLeccion");
        if (!NumeroDeActividad) console.log("NumeroDeActividad");
        if (!TipoDeActividad) console.log("TipoDeActividad");
        return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios' });
    }

    const filePath = path.join(__dirname, 'videos', req.file.filename); // Construir la ruta completa al archivo

    try {
        await sql.connect(config)
        const existsQuery = `SELECT COUNT(*) AS count FROM Actividad WHERE idLeccion = '${idLeccion}' AND numeroDeActividad = '${NumeroDeActividad}'`;
        const existsResult = await sql.query(existsQuery);

        if (existsResult.recordset[0].count > 0) {
            return res.status(400).json({ success: false, message: 'Ya existe una un material audiovisual con el mismo número en esta lección' });
        }
        const query = `BEGIN TRANSACTION;

        DECLARE @ID_ACTIVIDAD INT;
        
        -- Insertar en la tabla Actividad
        INSERT INTO Actividad (idLeccion, numeroDeActividad
            , descripcion)
        VALUES ('${idLeccion}', '${NumeroDeActividad}', '${identificador}');
        
        -- Obtener el ID de la actividad recién insertada
        SET @ID_ACTIVIDAD = SCOPE_IDENTITY();

        -- Insertar en la tabla TipoDeActividad con el tipo de actividad "Pregunta"
        INSERT INTO TipoDeActividad (idActividad, Tipo_actividad)
        VALUES (@ID_ACTIVIDAD, '${TipoDeActividad}');
        
        --insertar el video en la tabla multimedia
        INSERT INTO Multimedia (idMultimedia, archivo, idActividad, ruta)
                SELECT NEWID(), bulkColumn, @ID_ACTIVIDAD, '${filePath}'
                FROM OPENROWSET(BULK '${filePath}', SINGLE_BLOB) AS f;
        COMMIT TRANSACTION;
        `;
        const result = await sql.query(query)
        res.json({ success: true, message: 'Actividad de tipo video fue creada correctamente' })

    } catch (error) {
        console.error('Error al crear la la ctividad de video:', error)
        res.status(500).json({ success: false, message: 'Error al crear la actividad de tipo video' })
    }

})
//endpoint para modificar actividades de video
app.post('/modificarMaterialAudioVisual', upload.single('video'), async (req, res) => {
    const { id_actividad, identificador, idLeccion, NumeroDeActividad, TipoDeActividad
    } = req.body;
    if (
        !identificador || !idLeccion || !NumeroDeActividad || !TipoDeActividad
    ) {
        console.log("Los siguientes campos están vacíos:");
        if (!id_actividad) console.log("idActividad");
        if (!identificador) console.log("identificador");
        if (!idLeccion) console.log("idLeccion");
        if (!NumeroDeActividad) console.log("NumeroDeActividad");
        if (!TipoDeActividad) console.log("TipoDeActividad");
        return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios' });
    }

    const filePath = path.join(__dirname, 'videos', req.file.filename); // Construir la ruta completa al archivo

    try {
        await sql.connect(config)

        const query = `
        -- Actualizar la tabla Actividad
        UPDATE Actividad
        SET idLeccion = ${idLeccion},
            numeroDeActividad = ${NumeroDeActividad},
            descripcion = '${identificador}'
        WHERE idActividad = ${id_actividad};

        -- Declarar variables
        DECLARE @idActividad INT = ${id_actividad};

        -- Actualizar la tabla Multimedia
        UPDATE Multimedia
        SET archivo = (SELECT bulkColumn FROM OPENROWSET(BULK '${filePath}', SINGLE_BLOB) AS f),
            ruta = '${filePath}'
        WHERE idActividad = @idActividad;

            `;
        const result = await sql.query(query)
        res.json({ success: true, message: 'Actividad de tipo video fue modificada correctamente' })

    } catch (error) {
        console.error('Error al modificada la la ctividad de video:', error)
        res.status(500).json({ success: false, message: 'Error al modificada la actividad de tipo video' })
    }

})
//endpoint para eliminar todo el material audio visual
app.post('/borrarMaterialAudioVisual', async (req, res) => {
    //obtenemos los datos de la solicitud
    const { id_actividad } = req.body;
    if (!id_actividad) {
        return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios' });
    }
    try {
        await sql.connect(config)
        const query = `      
        DELETE FROM TipoDeActividad
        WHERE idActividad = ${id_actividad};
        
        DELETE FROM Multimedia
        WHERE idActividad =${id_actividad};

        DELETE FROM Actividad
        WHERE idActividad = ${id_actividad};
        `;
        const result = await sql.query(query)
        res.json({ success: true, message: 'Actividad de tipo video fue borrada correctamente' })

    } catch (error) {
        console.error('Error al borrar la actividad:', error)
        res.status(500).json({ success: false, message: 'Error al borrar la actividad de tipo video' })
    }

})

//endponts para conseguir los datos de las interfaces
//endponit para sacar los datos de las actividades------------------------------------------------------------------
//endpoint para las lecciones
app.get('/obtenerLeccion/:id', async (req, res) => {
    let userId = req.params.id;
    //verifica si el user id es nullo numero no valido 
    if (userId === 'null' || isNaN(parseInt(userId))) {
        return res.status(400).json({ error: 'ID de usuario no valido' })
    }
    userId = parseInt(userId);
    try {
        await sql.connect(config);
        const result = await sql.query`select * from Leccion WHERE numero_leccion = ${userId}`;
        await sql.close();

        // Si se encontraron resultados, enviar la información del usuario
        if (result.recordset.length > 0) {
            res.json(result.recordset[0]);
        } else {
            res.status(404).json({ error: 'Usuario no encontrado' });
        }
    } catch (error) {
        console.error('Error al obtener el usuario:', error.message);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

//endpoint para las evaluaciones parciales
app.get('/obtenerInfoEvaluacionParcial/:id', async (req, res) => {
    let userId = req.params.id;
    //verifica si el user id es nullo numero no valido 
    if (userId === 'null' || isNaN(parseInt(userId))) {
        return res.status(400).json({ error: 'ID de usuario no valido' })
    }
    userId = parseInt(userId);
    try {
        await sql.connect(config);
        const result = await sql.query`select * from evaluacionParcial
        WHERE idevaluacionParcial = ${userId}`;
        await sql.close();

        // Si se encontraron resultados, enviar la información del usuario
        if (result.recordset.length > 0) {
            res.json(result.recordset[0]);
        } else {
            res.status(404).json({ error: 'Usuario no encontrado' });
        }
    } catch (error) {
        console.error('Error al obtener el usuario:', error.message);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});
//endpoint para las actividades parciales
app.get('/obtenerInfoActividades/:id', async (req, res) => {
    let userId = req.params.id;
    //verifica si el user id es nullo numero no valido 
    if (userId === 'null' || isNaN(parseInt(userId))) {
        return res.status(400).json({ error: 'ID de usuario no valido' })
    }
    userId = parseInt(userId);
    try {
        await sql.connect(config);
        const result = await sql.query`SELECT 
        A.idActividad,
        A.idLeccion,
        A.numeroDeActividad,
        A.descripcion,
        M.idMultimedia,
        M.archivo,
		M.ruta,
        R.idRespuestas,
        R.Respuesta,
        R.Valor,
        T.idTipoDeActividad,
        T.Tipo_actividad
    FROM 
        Actividad A
    LEFT JOIN 
        Multimedia M ON A.idActividad = M.idActividad
    LEFT JOIN 
        Respuestas R ON A.idActividad = R.idActividad
    LEFT JOIN 
        TipoDeActividad T ON A.idActividad = T.idActividad
    WHERE 
        A.idActividad = ${userId}`;
        await sql.close();

        // Si se encontraron resultados, enviar la información del usuario
        if (result.recordset.length > 0) {
            res.json(result.recordset[0]);
        } else {
            res.status(404).json({ error: 'Usuario no encontrado' });
        }
    } catch (error) {
        console.error('Error al obtener el usuario:', error.message);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// Nuevo endpoint para obtener actividades en grupos de cuatro
app.get('/obtenerRespuestasYValores/:id', async (req, res) => {
    let userId = req.params.id;
    // Verificar si el userId es nulo o no es un número válido
    if (userId === 'null' || isNaN(parseInt(userId))) {
        return res.status(400).json({ error: 'ID de usuario no válido' })
    }
    userId = parseInt(userId);
    try {
        await sql.connect(config);
        const result = await sql.query`
        SELECT 
        r.*,
        ta.Tipo_actividad,
        ROW_NUMBER() OVER(ORDER BY r.idRespuestas) AS RowNumber
        FROM 
        Respuestas AS r
        INNER JOIN 
        TipoDeActividad AS ta ON r.idActividad = ta.idActividad
        INNER JOIN 
        Actividad AS a ON r.idActividad = a.idActividad
            WHERE a.idActividad = ${userId}`;
        await sql.close();

        // Si se encontraron resultados, enviar la información del usuario
        if (result.recordset.length > 0) {
            res.json(result.recordset);
        } else {
            res.status(404).json({ error: 'No se encontraron respuestas para este usuario' });
        }
    } catch (error) {
        console.error('Error al obtener las respuestas:', error.message);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});
//endponit para sacar los datos de las actividades------------------------------------------------------------------

app.get('/transmitir-video/:idActividad', async (req, res) => {
    let activdadId = req.params.id;
    if (activdadId === 'null' || isNaN(parseInt(activdadId))) {
        return res.status(400).json({ error: 'ID de usuario no valido' })
    }
    activdadId = parseInt(activdadId);
    try {
        // Conectarse a la base de datos
        await sql.connect(config);
        const result = await sql.query`SELECT archivo
         FROM Multimedia WHERE idActividad = ${req.params.idActividad}`;
        if (result.recordset.length === 0) {
            return res.status(404).send('No se encontró ningún video para el ID de actividad proporcionado.');
        }
        const videoData = result.recordset[0].archivo;

        res.set({
            'Content-Type': 'video/mp4',
            'Content-Length': videoData.length
        });
        res.send(videoData);
    } catch (error) {
        console.error('Error al transmitir el video:', error);
        res.status(500).send('Se produjo un error al transmitir el video.');
    } finally {
        // Cerrar la conexión a la base de datos
        await sql.close();
    }

});



//endpoint para crear dinamicamente las pestañas para pagina-----------------------------------------

app.get('/leccion', async (req, res) => {
    try {
        await sql.connect(config);
        const result = await sql.query`
        SELECT 
        L.idLeccion,
        L.descripcion ,
        L.numero_leccion,
        L.validar,
        A.numeroDeActividad,
        A.descripcion AS descripcionActividad
    FROM 
        Leccion L
    LEFT JOIN 
        (SELECT 
             idLeccion,
             MAX(numeroDeActividad) AS numeroDeActividad,
             MAX(descripcion) AS descripcion
         FROM 
             Actividad 
         GROUP BY 
             idLeccion) A ON L.idLeccion = A.idLeccion;
    `;
        await sql.close();

        const lecciones = result.recordset;

        res.json(lecciones);
    } catch (error) {
        console.error('Error al obtener las lecciones:', error.message);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

//..............
app.get('/actividades/:id', async (req, res) => {
    try {
        const idLeccion = req.params.id;
        await sql.connect(config);
        const result = await sql.query`
        SELECT 
        A.idActividad,
        A.idLeccion,
        A.numeroDeActividad,
        A.descripcion,
        T.Tipo_actividad
    FROM 
        Actividad A
    INNER JOIN 
        TipoDeActividad T ON A.idActividad = T.idActividad
        where A.idLeccion=${idLeccion};
        `;
        await sql.close();

        const actividades = result.recordset;

        res.json(actividades);
    } catch (error) {
        console.error('Error al obtener las actividades:', error.message);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

app.get('/evaluacionparcial/:id', async (req, res) => {
    try {
        const idLeccion = req.params.id;
        await sql.connect(config);
        const result = await sql.query`
            SELECT * 
            FROM evaluacionParcial 
            WHERE idLeccion = ${idLeccion};
        `;
        await sql.close();

        const evaluacionParcial = result.recordset;

        res.json(evaluacionParcial);
    } catch (error) {
        console.error('Error al obtener la evaluación parcial:', error.message);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});



//-------------------------------------------------------------------------------------------
//..............
app.get('/actividadesDeTipoPRegunta/:id', async (req, res) => {
    try {
        const idLeccion = req.params.id;
        await sql.connect(config);
        const result = await sql.query`
            SELECT * 
            FROM Actividad 
            WHERE idLeccion = ${idLeccion};
        `;
        await sql.close();

        const actividades = result.recordset;

        res.json(actividades);
    } catch (error) {
        console.error('Error al obtener las actividades:', error.message);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});



//crud de los comentarios----------------------------------------------------------------

app.post('/crearComentario', async (req, res) => {
    // Obtener los datos de la solicitud
    const { correo, texto } = req.body;

    // Verificar si los campos están vacíos
    if (!correo || !texto) {
        if (!correo) console.log("correo");
        if (!texto) console.log("texto");
        return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios' });
    }

    try {
        // Conectarse a la base de datos
        await sql.connect(config);

        // Insertar los datos si el número de evaluación no existe
        const insertQuery = `DECLARE @idUsuario INT;
        SELECT @idUsuario = ID_USUARIOS FROM Usuarios WHERE correo = '${correo}';
        
        -- Insertar el comentario con el ID del usuario obtenido
        INSERT INTO Comentario (idUsuarios, comentario, fecha)
        VALUES (@idUsuario, '${texto}', GETDATE());
        `;
        await sql.query(insertQuery);

        res.json({ success: true, message: 'Evaluacion parcial creada exitosamente' });

    } catch (error) {
        console.error('Error al crear la Leccion:', error);
        res.status(500).json({ success: false, message: 'Error al crear evaluacion' });
    }
});
//crud de cliente
app.post('/ModificarUsuarioCliente', async (req, res) => {
    // obtenemos los datos de la solicitud
    const { nombre, apellido, email, telefono, password, ID_email } = req.body;
    if (!nombre || !apellido || !email || !telefono || !password || !ID_email) {
        return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios' });
    }

    try {
        await sql.connect(config);

        // Verificar si el correo ya existe
        const checkEmailQuery = `
            SELECT COUNT(*) as count
            FROM Usuarios
            WHERE correo = '${email}' AND correo != '${ID_email}'
        `;
        const checkEmailResult = await sql.query(checkEmailQuery);
        const emailCount = checkEmailResult.recordset[0].count;

        if (emailCount > 0) {
            return res.status(400).json({ success: false, message: 'El correo electrónico ya está en uso' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const updateQuery = `
            UPDATE Usuarios
            SET nombre = '${nombre}',
                apellidos = '${apellido}',
                correo = '${email}',
                telefono = ${telefono},
                PASS_USER = '${hashedPassword}'
            WHERE correo = '${ID_email}';
        `;
        const result = await sql.query(updateQuery);
        res.json({ success: true, message: 'Usuario modificado exitosamente' });

    } catch (error) {
        console.error('Error al modificar el usuario:', error);
        res.status(500).json({ success: false, message: 'Error al modificar el usuario' });
    }
});


//-------------------------EJEMPLO de SUBIR ARCHIVOS--------------------------------------------
app.post('/upload-video', upload.single('video'), async (req, res) => {
    try {
        // Verificar si req.file existe y si tiene una ruta válida
        if (!req.file || !req.file.path) {
            throw new Error('No se recibió ningún archivo');
        }

        // await insertVideoPathIntoDatabase(req.file.filename); // Usamos req.file.path en lugar de req.file.filename

        try {
            // Conectar a la base de datos y ejecutar el query
            await sql.connect(config);

            const filePath = path.join(__dirname, 'videos', req.file.filename); // Construir la ruta completa al archivo
            const query = `
            INSERT INTO Multimedia (idMultimedia, archivo, idActividad)
            SELECT NEWID(), bulkColumn, 1007
            FROM OPENROWSET(BULK '${filePath}', SINGLE_BLOB) AS f;
            `;

            //console.log(query);
            await sql.query(query);
        } catch (error) {
            throw new Error(`Error al insertar la ruta del video en la base de datos: ${error.message}`);
        } finally {
            await sql.close();
        }

        res.send('Video subido exitosamente');

    } catch (error) {
        // Manejar errores
        console.error('Error al subir el video:', error);
        res.status(500).send(`Error al subir el video: ${error.message}`);
    }
});

// Función para insertar la ruta del video en la base de datos


//-----------------EJERCICIOS COMPARAR RESPUESTAS-----------------------------------------------
app.post('/enviarRespuestas', async (req, res) => {
    const { valor1, valor2, valor3, valor4, idActividad } = req.body; // Asegúrate de que las variables se obtengan correctamente

    if (typeof valor1 === 'undefined' || typeof valor2 === 'undefined' ||
        typeof valor3 === 'undefined' || typeof valor4 === 'undefined' || typeof idActividad === 'undefined') {
        return res.status(400).json({ success: false, message: 'Valores incompletos recibidos' });
    }

    const query = `
        DECLARE @idActividad INT = ${idActividad};
        DECLARE @valor1 BIT = ${valor1};
        DECLARE @valor2 BIT = ${valor2};
        DECLARE @valor3 BIT = ${valor3};
        DECLARE @valor4 BIT = ${valor4};

        WITH CTE AS (
            SELECT 
                r.idRespuestas, r.Respuesta, r.Valor,
                ROW_NUMBER() OVER (ORDER BY r.idRespuestas) AS RowNum
            FROM Respuestas AS r
            WHERE r.idActividad = @idActividad
        )
        SELECT 
            CTE.idRespuestas, CTE.Respuesta, CTE.Valor,
            CASE 
                WHEN CTE.RowNum = 1 AND CTE.Valor = @valor1 THEN 'Correcto'
                WHEN CTE.RowNum = 2 AND CTE.Valor = @valor2 THEN 'Correcto'
                WHEN CTE.RowNum = 3 AND CTE.Valor = @valor3 THEN 'Correcto'
                WHEN CTE.RowNum = 4 AND CTE.Valor = @valor4 THEN 'Correcto'
                ELSE 'Incorrecto'
            END AS Resultado
        FROM CTE;
    `;

    try {
        await sql.connect(config);
        const result = await sql.query(query);
        await sql.close();
        res.status(200).json(result.recordset);
    } catch (error) {
        console.error('Error al obtener los valores:', error.message);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});


//------------------------crud de evaluacion inicial y final---------------------------------------
app.post('/crearEvaluacionFYI', async (req, res) => {
    // Obtener los datos de la solicitud
    const { mensaje, tipoEvaluacion, calculo } = req.body;

    // Verificar si los campos están vacíos
    if (!mensaje || !tipoEvaluacion || !calculo) {
        if (!mensaje) console.log("El campo mensaje está vacío");
        if (!calculo) console.log("El campo calculo está vacío");
        if (!tipoEvaluacion) console.log("El campo tipoEvaluacion está vacío");
        return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios' });
    }

    try {
        // Conectarse a la base de datos
        await sql.connect(config);

        // Verificar si ya existe una evaluación del tipo especificado
        const existingEvaluation = await sql.query`
            SELECT idEvaluacion
            FROM TipoDeEvaliacion
            WHERE Tipo = ${tipoEvaluacion};
        `;

        if (existingEvaluation.recordset.length > 0) {
            return res.status(400).json({ success: false, message: `Ya existe una evaluación del tipo ${tipoEvaluacion}` });
        }

        // Insertar los datos si el número de evaluación no existe
        const insertQuery = `
        -- Primero, insertamos en la tabla 'Evaluacion'
        INSERT INTO Evaluacion (Link_forms,Link_calculo)
        VALUES ('${mensaje}','${calculo}');

        -- Después, obtenemos el ID de la evaluación recién insertada
        DECLARE @idEvaluacion INT;
        SET @idEvaluacion = SCOPE_IDENTITY();

        -- Luego, insertamos en la tabla 'TipoDeEvaluacion' utilizando el ID de la evaluación obtenido
        INSERT INTO TipoDeEvaliacion (idEvaluacion, Tipo)
        VALUES (@idEvaluacion, '${tipoEvaluacion}');

        `;
        await sql.query(insertQuery);

        res.json({ success: true, message: 'Evaluacion parcial creada exitosamente' });

    } catch (error) {
        console.error('Error al crear la Leccion:', error);
        res.status(500).json({ success: false, message: 'Error al crear evaluacion' });
    }
});

//modificar
app.post('/modificarEvaluacionFYI', async (req, res) => {
    // Obtener los datos de la solicitud
    const { numeroIDInput2, mensaje, tipoEvaluacion, calculo } = req.body;

    // Verificar si los campos están vacíos
    if (!numeroIDInput2 || !mensaje || !tipoEvaluacion) {
        if (!mensaje) console.log("El campo mensaje está vacío");
        if (!calculo) console.log("El campo calculo está vacío");

        if (!numeroIDInput2) console.log("El campo numeroIDInput2 está vacío");
        if (!tipoEvaluacion) console.log("El campo tipoEvaluacion está vacío");
        return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios' });
    }

    try {
        // Conectarse a la base de datos
        await sql.connect(config);

        // Verificar si ya existe una evaluación del tipo especificado


        // Insertar los datos si el número de evaluación no existe
        const insertQuery = `
        UPDATE Evaluacion
        SET Link_forms = '${mensaje}',
         Link_calculo = '${calculo}'

        WHERE idEvaluacion =${numeroIDInput2};

        `;
        await sql.query(insertQuery);

        res.json({ success: true, message: 'Evaluacion parcial creada exitosamente' });

    } catch (error) {
        console.error('Error al crear la Leccion:', error);
        res.status(500).json({ success: false, message: 'Error al crear evaluacion' });
    }
});

app.post('/BorrarEvaluacionFYI', async (req, res) => {
    // Obtener los datos de la solicitud
    const { numeroIDInput2 } = req.body;

    // Verificar si los campos están vacíos
    if (!numeroIDInput2) {
        if (!numeroIDInput2) console.log("El campo numeroIDInput2 está vacío");
        return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios' });
    }

    try {
        // Conectarse a la base de datos
        await sql.connect(config);

        // Verificar si ya existe una evaluación del tipo especificado

        // Insertar los datos si el número de evaluación no existe
        const insertQuery = `
        BEGIN TRANSACTION; -- Comenzar una transacción para asegurar que ambas eliminaciones se realicen correctamente

        DELETE FROM TipoDeEvaliacion
        WHERE idEvaluacion = ${numeroIDInput2}; -- Eliminar el tipo de evaluación asociado a la evaluación específica

        DELETE FROM Evaluacion
        WHERE idEvaluacion = ${numeroIDInput2}; -- Eliminar la evaluación específica

        COMMIT; 

        `;
        await sql.query(insertQuery);

        res.json({ success: true, message: 'Evaluacion parcial creada exitosamente' });

    } catch (error) {
        console.error('Error al crear la Leccion:', error);
        res.status(500).json({ success: false, message: 'Error al crear evaluacion' });
    }
});



//para la visualizacion de las evalauciones iniciales y parciales 

app.get('/actualizarIDEvaluacionesInicalYFinal', async (req, res) => {
    try {
        await sql.connect(config);
        const result = await sql.query`
        SELECT E.idEvaluacion, E.Link_forms, TE.Tipo
        FROM Evaluacion E
        INNER JOIN TipoDeEvaliacion TE ON E.idEvaluacion = TE.idEvaluacion;
        `;
        await sql.close();
        res.json(result.recordset);
    } catch (error) {
        console.error('Error al obtener las lecciones:', error.message);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});


//obtener los datos
app.get('/obtenerInfoEvaluacionIyF/:id', async (req, res) => {
    let userId = req.params.id;
    if (userId === 'null' || isNaN(parseInt(userId))) {
        return res.status(400).json({ error: 'ID de usuario no valido' })
    }
    try {
        await sql.connect(config);
        const result = await sql.query`
            SELECT
            E.idEvaluacion,
            E.Link_forms,
            E.Link_calculo,
            T.idTipoDeEvaliacion,
            T.Tipo
        FROM
            Evaluacion E
        LEFT JOIN
            TipoDeEvaliacion T ON E.idEvaluacion = T.idEvaluacion
        WHERE
            E.idEvaluacion = ${userId};
        `;
        await sql.close();

        // Si se encontraron resultados, enviar la primera fila
        if (result.recordset.length > 0) {
            res.json(result.recordset[0]);
        } else {
            res.status(404).json({ error: 'Evaluación no encontrada' });
        }
    } catch (error) {
        console.error('Error al obtener la evaluación:', error.message);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});
/**
 * 
 */



app.get('/calificaciones', async (req, res) => {
    try {
        await sql.connect(config);
        const result = await sql.query`        
        SELECT 
        U.ID_USUARIOS, 
        U.nombre, 
        U.apellidos, 
        U.correo, 
        U.telefono, 
        C.idComentario, 
        C.comentario, 
        C.fecha, 
        E.idEvaluacion, 
        E.calificacion,
        TE.Tipo AS TipoDeEvaliacion
        FROM 
        Usuarios U
        LEFT JOIN 
        Comentario C ON U.ID_USUARIOS = C.idUsuarios
        LEFT JOIN 
        Evaluacion_has_Usuarios E ON U.ID_USUARIOS = E.idUsuarios
        LEFT JOIN
        Roles R ON U.ID_USUARIOS = R.idUsuarios
        LEFT JOIN
        TipoDeEvaliacion TE ON E.idEvaluacion = TE.idEvaluacion
        WHERE
        R.roles = 'usuario';
        `;
        await sql.close();

        res.json(result.recordset);
    } catch (err) {
        console.error('Error querying the database:', err);
        res.status(500).send('Error querying the database');
    }
});





app.get('/evaluacion-inicial', async (req, res) => {
    try {
        await sql.connect(config);
        const result = await sql.query(`
        SELECT e.Link_forms,e.Link_calculo
        FROM Evaluacion e
        INNER JOIN TipoDeEvaliacion te ON e.idEvaluacion = te.idEvaluacion
        WHERE te.Tipo = 'Evaluacion_Inicial'
      `);
        sql.close();
        if (result.recordset.length > 0) {
            res.json(result.recordset[0]);
        } else {
            res.status(404).json({ error: 'No se encontraron datos de Evaluacion_Inicial' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.get('/evaluacion-final', async (req, res) => {
    try {
        await sql.connect(config);
        const result = await sql.query(`
        SELECT e.Link_forms,e.Link_calculo
        FROM Evaluacion e
        INNER JOIN TipoDeEvaliacion te ON e.idEvaluacion = te.idEvaluacion
        WHERE te.Tipo = 'Evaluacion_Final'
      `);
        sql.close();
        if (result.recordset.length > 0) {
            res.json(result.recordset[0]);
        } else {
            res.status(404).json({ error: 'No se encontraron datos de Evaluacion_Inicial' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});



//crud de las calificaciones----------------------------------------------------------------
app.post('/crearCalificacionInicial', async (req, res) => {
    const { calificacionInicial, usuario } = req.body;

    // Verificar si los campos están vacíos
    if (!calificacionInicial || !usuario) {
        if (!calificacionInicial) console.log("calificacionInicial está vacío");
        if (!usuario) console.log("usuario está vacío");
        return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios' });
    }

    try {
        // Conectarse a la base de datos
        await sql.connect(config);
        // Verificar si ya existe una calificación para este usuario
        const checkQuery = `
            DECLARE @idUsuario INT = ${usuario};
            DECLARE @tipoEvaluacion VARCHAR(255) = 'Evaluacion_Inicial';

            DECLARE @idEvaluacion INT;

            SELECT @idEvaluacion = idEvaluacion
            FROM Evaluacion
            WHERE Link_forms IS NOT NULL
            AND EXISTS (
                SELECT 1
                FROM TipoDeEvaliacion
                WHERE idEvaluacion = Evaluacion.idEvaluacion
                AND Tipo = @tipoEvaluacion
            );

            SELECT COUNT(*) AS count
            FROM Evaluacion_has_Usuarios
            WHERE idEvaluacion = @idEvaluacion AND idUsuarios = @idUsuario;
        `;

        const result = await sql.query(checkQuery);

        if (result.recordset[0].count > 0) {
            return res.status(400).json({ success: false, message: 'Ya existe una calificación para este usuario.' });
        }
        // Insertar los datos si el número de evaluación no existe
        const insertQuery = `
            DECLARE @idUsuario INT = ${usuario};
            DECLARE @tipoEvaluacion VARCHAR(255) = 'Evaluacion_Inicial';

            DECLARE @idEvaluacion INT;

            SELECT @idEvaluacion = idEvaluacion
            FROM Evaluacion
            WHERE Link_forms IS NOT NULL
            AND EXISTS (
                SELECT 1
                FROM TipoDeEvaliacion
                WHERE idEvaluacion = Evaluacion.idEvaluacion
                AND Tipo = @tipoEvaluacion
            );

            INSERT INTO Evaluacion_has_Usuarios (idEvaluacion, idUsuarios, calificacion)
            VALUES (@idEvaluacion, @idUsuario, ${calificacionInicial});
        `;
        await sql.query(insertQuery);

        res.json({ success: true, message: 'Calificación ingresada exitosamente' });

    } catch (error) {
        console.error('Error al crear la calificación:', error);
        res.status(500).json({ success: false, message: 'Error al crear calificación' });
    }
});

app.post('/modificarCalificacioninicial', async (req, res) => {
    const { calificacionInicial, usuario } = req.body;

    // Verificar si los campos están vacíos
    if (!calificacionInicial || !usuario) {
        if (!calificacionInicial) console.log("calificacionInicial está vacío");
        if (!usuario) console.log("usuario está vacío");
        return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios' });
    }

    try {
        // Conectarse a la base de datos
        await sql.connect(config);

        // Verificar si existe el registro
        const checkQuery = `
            DECLARE @idUsuario INT = ${usuario};
            DECLARE @tipoEvaluacion VARCHAR(255) = 'Evaluacion_Inicial';

            DECLARE @idEvaluacion INT;

            -- Obtener el idEvaluacion según el tipo de evaluación
            SELECT @idEvaluacion = idEvaluacion
            FROM Evaluacion
            WHERE Link_forms IS NOT NULL
            AND EXISTS (
                SELECT 1
                FROM TipoDeEvaliacion
                WHERE idEvaluacion = Evaluacion.idEvaluacion
                AND Tipo = @tipoEvaluacion
            );

            -- Comprobar si existe el registro en Evaluacion_has_Usuarios
            SELECT COUNT(*) as count
            FROM Evaluacion_has_Usuarios
            WHERE idEvaluacion = @idEvaluacion AND idUsuarios = @idUsuario;
        `;
        const result = await sql.query(checkQuery);
        const count = result.recordset[0].count;

        if (count > 0) {
            // Actualizar los datos si el registro existe
            const updateQuery = `
            DECLARE @idUsuario INT = ${usuario};
            DECLARE @tipoEvaluacion VARCHAR(255) = 'Evaluacion_Inicial';

            DECLARE @idEvaluacion INT;

            -- Obtener el idEvaluacion según el tipo de evaluación
            SELECT @idEvaluacion = idEvaluacion
            FROM Evaluacion
            WHERE Link_forms IS NOT NULL
            AND EXISTS (
                SELECT 1
                FROM TipoDeEvaliacion
                WHERE idEvaluacion = Evaluacion.idEvaluacion
                AND Tipo = @tipoEvaluacion
            );

                UPDATE Evaluacion_has_Usuarios
                SET calificacion = ${calificacionInicial}
                WHERE idEvaluacion = @idEvaluacion AND idUsuarios = @idUsuario;
            `;
            await sql.query(updateQuery);
            res.json({ success: true, message: 'Calificación actualizada exitosamente' });
        } else {
            res.status(404).json({ success: false, message: 'No se encontró el registro para actualizar' });
        }

    } catch (error) {
        console.error('Error al actualizar la calificación:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar la calificación' });
    }
});

app.post('/eliminarCalificacionInicial', async (req, res) => {
    const { usuario } = req.body;

    // Verificar si los campos están vacíos
    if (!usuario) {
        console.log("usuario está vacío");
        return res.status(400).json({ success: false, message: 'El campo usuario es obligatorio' });
    }

    try {
        // Conectarse a la base de datos
        await sql.connect(config);

        // Declarar y asignar las variables para la consulta
        const deleteQuery = `
            DECLARE @idUsuario INT = ${usuario};
            DECLARE @tipoEvaluacion VARCHAR(255) = 'Evaluacion_Inicial';

            DECLARE @idEvaluacion INT;

            -- Obtener el idEvaluacion según el tipo de evaluación
            SELECT @idEvaluacion = idEvaluacion
            FROM Evaluacion
            WHERE Link_forms IS NOT NULL
            AND EXISTS (
                SELECT 1
                FROM TipoDeEvaliacion
                WHERE idEvaluacion = Evaluacion.idEvaluacion
                AND Tipo = @tipoEvaluacion
            );

            -- Eliminar el registro en Evaluacion_has_Usuarios
            DELETE FROM Evaluacion_has_Usuarios
            WHERE idEvaluacion = @idEvaluacion AND idUsuarios = @idUsuario;
        `;

        await sql.query(deleteQuery);

        res.json({ success: true, message: 'Calificación eliminada exitosamente' });

    } catch (error) {
        console.error('Error al eliminar la calificación:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar la calificación' });
    }
});

//-------CALIFICACION FINAL----------------
app.post('/crearcalificacionFinal', async (req, res) => {
    const { calificacionFinal, usuario } = req.body;

    // Verificar si los campos están vacíos
    if (!calificacionFinal || !usuario) {
        if (!calificacionInicial) console.log("calificacionInicial está vacío");
        if (!usuario) console.log("usuario está vacío");
        return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios' });
    }

    try {
        // Conectarse a la base de datos
        await sql.connect(config);
        const checkQuery = `
        DECLARE @idUsuario INT = ${usuario};
        DECLARE @tipoEvaluacion VARCHAR(255) = 'Evaluacion_Final';

        DECLARE @idEvaluacion INT;

        SELECT @idEvaluacion = idEvaluacion
        FROM Evaluacion
        WHERE Link_forms IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM TipoDeEvaliacion
            WHERE idEvaluacion = Evaluacion.idEvaluacion
            AND Tipo = @tipoEvaluacion
        );

        SELECT COUNT(*) AS count
        FROM Evaluacion_has_Usuarios
        WHERE idEvaluacion = @idEvaluacion AND idUsuarios = @idUsuario;
    `;

        const result = await sql.query(checkQuery);

        if (result.recordset[0].count > 0) {
            return res.status(400).json({ success: false, message: 'Ya existe una calificación para este usuario.' });
        }
        // Insertar los datos si el número de evaluación no existe
        const insertQuery = `
            DECLARE @idUsuario INT = ${usuario};
            DECLARE @tipoEvaluacion VARCHAR(255) = 'Evaluacion_Final';

            DECLARE @idEvaluacion INT;

            SELECT @idEvaluacion = idEvaluacion
            FROM Evaluacion
            WHERE Link_forms IS NOT NULL
            AND EXISTS (
                SELECT 1
                FROM TipoDeEvaliacion
                WHERE idEvaluacion = Evaluacion.idEvaluacion
                AND Tipo = @tipoEvaluacion
            );

            INSERT INTO Evaluacion_has_Usuarios (idEvaluacion, idUsuarios, calificacion)
            VALUES (@idEvaluacion, @idUsuario, ${calificacionFinal});
        `;
        await sql.query(insertQuery);

        res.json({ success: true, message: 'Calificación ingresada exitosamente' });

    } catch (error) {
        console.error('Error al crear la calificación:', error);
        res.status(500).json({ success: false, message: 'Error al crear calificación' });
    }
});

app.post('/modificarCalificacionfinal', async (req, res) => {
    const { calificacionFinal, usuario } = req.body;

    // Verificar si los campos están vacíos
    if (!calificacionFinal || !usuario) {
        if (!calificacionFinal) console.log("calificacionInicial está vacío");
        if (!usuario) console.log("usuario está vacío");
        return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios' });
    }

    try {
        // Conectarse a la base de datos
        await sql.connect(config);

        // Verificar si existe el registro
        const checkQuery = `
            DECLARE @idUsuario INT = ${usuario};
            DECLARE @tipoEvaluacion VARCHAR(255) = 'Evaluacion_Final';

            DECLARE @idEvaluacion INT;

            -- Obtener el idEvaluacion según el tipo de evaluación
            SELECT @idEvaluacion = idEvaluacion
            FROM Evaluacion
            WHERE Link_forms IS NOT NULL
            AND EXISTS (
                SELECT 1
                FROM TipoDeEvaliacion
                WHERE idEvaluacion = Evaluacion.idEvaluacion
                AND Tipo = @tipoEvaluacion
            );

            -- Comprobar si existe el registro en Evaluacion_has_Usuarios
            SELECT COUNT(*) as count
            FROM Evaluacion_has_Usuarios
            WHERE idEvaluacion = @idEvaluacion AND idUsuarios = @idUsuario;
        `;
        const result = await sql.query(checkQuery);
        const count = result.recordset[0].count;

        if (count > 0) {
            // Actualizar los datos si el registro existe
            const updateQuery = `
            DECLARE @idUsuario INT = ${usuario};
            DECLARE @tipoEvaluacion VARCHAR(255) = 'Evaluacion_Final';

            DECLARE @idEvaluacion INT;

            -- Obtener el idEvaluacion según el tipo de evaluación
            SELECT @idEvaluacion = idEvaluacion
            FROM Evaluacion
            WHERE Link_forms IS NOT NULL
            AND EXISTS (
                SELECT 1
                FROM TipoDeEvaliacion
                WHERE idEvaluacion = Evaluacion.idEvaluacion
                AND Tipo = @tipoEvaluacion
            );

                UPDATE Evaluacion_has_Usuarios
                SET calificacion = ${calificacionFinal}
                WHERE idEvaluacion = @idEvaluacion AND idUsuarios = @idUsuario;
            `;
            await sql.query(updateQuery);
            res.json({ success: true, message: 'Calificación actualizada exitosamente' });
        } else {
            res.status(404).json({ success: false, message: 'No se encontró el registro para actualizar' });
        }

    } catch (error) {
        console.error('Error al actualizar la calificación:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar la calificación' });
    }
});

app.post('/eliminarCalificacionFInal', async (req, res) => {
    const { usuario } = req.body;

    // Verificar si los campos están vacíos
    if (!usuario) {
        console.log("usuario está vacío");
        return res.status(400).json({ success: false, message: 'El campo usuario es obligatorio' });
    }

    try {
        // Conectarse a la base de datos
        await sql.connect(config);

        // Declarar y asignar las variables para la consulta
        const deleteQuery = `
            DECLARE @idUsuario INT = ${usuario};
            DECLARE @tipoEvaluacion VARCHAR(255) = 'Evaluacion_Final';

            DECLARE @idEvaluacion INT;

            -- Obtener el idEvaluacion según el tipo de evaluación
            SELECT @idEvaluacion = idEvaluacion
            FROM Evaluacion
            WHERE Link_forms IS NOT NULL
            AND EXISTS (
                SELECT 1
                FROM TipoDeEvaliacion
                WHERE idEvaluacion = Evaluacion.idEvaluacion
                AND Tipo = @tipoEvaluacion
            );

            -- Eliminar el registro en Evaluacion_has_Usuarios
            DELETE FROM Evaluacion_has_Usuarios
            WHERE idEvaluacion = @idEvaluacion AND idUsuarios = @idUsuario;
        `;

        await sql.query(deleteQuery);

        res.json({ success: true, message: 'Calificación eliminada exitosamente' });

    } catch (error) {
        console.error('Error al eliminar la calificación:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar la calificación' });
    }
});

//obtener los calificaciones
// Ruta para obtener la calificación

app.get('/calificacion', async (req, res) => {
    const correo = req.query.correo; // Obtener el correo de los parámetros de consulta

    try {
        await sql.connect(config);
        const result = await sql.query`
        SELECT ehu.calificacion
        FROM Usuarios u
        INNER JOIN Evaluacion_has_Usuarios ehu ON u.ID_USUARIOS = ehu.idUsuarios
        INNER JOIN Evaluacion e ON ehu.idEvaluacion = e.idEvaluacion
        INNER JOIN TipoDeEvaliacion te ON e.idEvaluacion = te.idEvaluacion
        WHERE u.correo = ${correo} AND te.Tipo = 'Evaluacion_Inicial';
    `;
        await sql.close();

        const lecciones = result.recordset;

        res.json(lecciones);
    } catch (error) {
        console.error('Error al obtener las lecciones:', error.message);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

app.get('/rol', async (req, res) => {
    const correo = req.query.correo; // Obtener el correo de los parámetros de consulta

    try {
        await sql.connect(config);
        const result = await sql.query`
            SELECT r.*
            FROM Usuarios u
            INNER JOIN Roles r ON u.ID_USUARIOS = r.idUsuarios
            WHERE u.correo = '${correo}';
        `;
        await sql.close();

        const rol = result.recordset;
        res.json(rol);

    } catch (error) {
        console.error('Error al obtener los roles:', error.message);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

//-------------------------
app.get('/calificacionFinal', async (req, res) => {
    const correo = req.query.correo; // Obtener el correo de los parámetros de consulta

    try {
        await sql.connect(config);
        const result = await sql.query`
        SELECT ehu.calificacion
        FROM Usuarios u
        INNER JOIN Evaluacion_has_Usuarios ehu ON u.ID_USUARIOS = ehu.idUsuarios
        INNER JOIN Evaluacion e ON ehu.idEvaluacion = e.idEvaluacion
        INNER JOIN TipoDeEvaliacion te ON e.idEvaluacion = te.idEvaluacion
        WHERE u.correo = ${correo} AND te.Tipo = 'Evaluacion_Final';
    `;
        await sql.close();

        const lecciones = result.recordset;

        res.json(lecciones);
    } catch (error) {
        console.error('Error al obtener las lecciones:', error.message);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

//-------------------------
app.get('/datosUsuario', async (req, res) => {
    const correo = req.query.correo;

    try {
        await sql.connect(config);
        const result = await sql.query`SELECT * FROM usuarios WHERE correo = ${correo}`;
        await sql.close();

        const usuario = result.recordset[0]; // Suponiendo que solo esperas un usuario

        res.json(usuario);
    } catch (error) {
        console.error('Error al obtener los datos del usuario:', error.message);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

getConnection()