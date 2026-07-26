const { v4: uuidv4 } = require('uuid');

function crearEvento(db, { titulo, descripcion, lugar, categoria, fecha_evento, precio, aforo_total, imagen_url = null }) {
  const id = uuidv4();
  const entradas_disponibles = aforo_total;
  db.run(
    `INSERT INTO eventos (id, titulo, descripcion, lugar, categoria, fecha_evento, precio, aforo_total, entradas_disponibles, imagen_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, titulo, descripcion, lugar, categoria, fecha_evento, precio, aforo_total, entradas_disponibles, imagen_url]
  );
  return { id, titulo, descripcion, lugar, categoria, fecha_evento, precio, aforo_total, entradas_disponibles, imagen_url };
}

function obtenerEventoPorId(db, id) {
  const stmt = db.prepare('SELECT * FROM eventos WHERE id = ?');
  stmt.bind([id]);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

function listarEventos(db, filtro = {}) {
  let sql = 'SELECT * FROM eventos';
  const params = [];
  if (filtro.categoria) {
    sql += ' WHERE categoria = ?';
    params.push(filtro.categoria);
  }
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const eventos = [];
  while (stmt.step()) {
    eventos.push(stmt.getAsObject());
  }
  stmt.free();
  return eventos;
}

function actualizarEntradasDisponibles(db, eventoId, cantidad) {
  db.run(
    `UPDATE eventos SET entradas_disponibles = entradas_disponibles - ? WHERE id = ?`,
    [cantidad, eventoId]
  );
}

module.exports = {
  crearEvento,
  obtenerEventoPorId,
  listarEventos,
  actualizarEntradasDisponibles,
};
