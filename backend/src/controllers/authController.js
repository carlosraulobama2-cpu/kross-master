const bcrypt = require('bcryptjs');
const { generarToken } = require('../config/jwt');
const { crearUsuario, obtenerUsuarioPorEmail } = require('../models/Usuario');
const { getDb, saveDb } = require('../config/database');

async function registrar(req, res) {
  try {
    const { email, password, nombre, rol } = req.body;
    if (!email || !password || !nombre) {
      return res.status(400).json({ mensaje: 'email, password y nombre son requeridos' });
    }

    const db = await getDb();
    const existente = await obtenerUsuarioPorEmail(db, email);
    if (existente) {
      return res.status(409).json({ mensaje: 'El email ya está registrado' });
    }

    const usuario = await crearUsuario(db, { email, password, nombre, rol });
    await saveDb(db);

    const token = generarToken(usuario);
    res.status(201).json({ usuario, token });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error en registro', error: error.message });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ mensaje: 'email y password son requeridos' });
    }

    const db = await getDb();
    const usuario = await obtenerUsuarioPorEmail(db, email);
    if (!usuario) {
      return res.status(401).json({ mensaje: 'Credenciales inválidas' });
    }

    const valido = await bcrypt.compare(password, usuario.password_hash);
    if (!valido) {
      return res.status(401).json({ mensaje: 'Credenciales inválidas' });
    }

    const token = generarToken(usuario);
    const { password_hash, ...usuarioSinPassword } = usuario;
    res.json({ usuario: usuarioSinPassword, token });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error en login', error: error.message });
  }
}

async function perfil(req, res) {
  try {
    const db = await getDb();
    const usuario = await obtenerUsuarioPorId(db, req.usuario.id);
    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }
    res.json({ usuario });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener perfil', error: error.message });
  }
}

module.exports = {
  registrar,
  login,
  perfil,
};
