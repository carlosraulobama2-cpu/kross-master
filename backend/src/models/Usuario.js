const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

async function crearUsuario(db, { email, password, nombre, rol = 'fan', imagen_url = null }) {
  const id = uuidv4();
  const password_hash = await bcrypt.hash(password, 10);
  db.run(
    `INSERT INTO usuarios (id, email, password_hash, nombre, rol, imagen_url) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, email, password_hash, nombre, rol, imagen_url]
  );
  return { id, email, nombre, rol, imagen_url };
}

async function obtenerUsuarioPorEmail(db, email) {
  const stmt = db.prepare('SELECT * FROM usuarios WHERE email = ?');
  stmt.bind([email]);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

async function obtenerUsuarioPorId(db, id) {
  const stmt = db.prepare('SELECT id, email, nombre, rol, imagen_url, creado_en FROM usuarios WHERE id = ?');
  stmt.bind([id]);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

async function listarUsuarios(db) {
  const stmt = db.prepare('SELECT id, email, nombre, rol, imagen_url, creado_en FROM usuarios');
  const usuarios = [];
  while (stmt.step()) {
    usuarios.push(stmt.getAsObject());
  }
  stmt.free();
  return usuarios;
}

module.exports = {
  crearUsuario,
  obtenerUsuarioPorEmail,
  obtenerUsuarioPorId,
  listarUsuarios,
};
