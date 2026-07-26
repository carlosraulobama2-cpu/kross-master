const { v4: uuidv4 } = require('uuid');

function crearEntrada(db, { evento_id, usuario_id, codigo_qr, asiento, precio_pagado }) {
  const id = uuidv4();
  db.run(
    `INSERT INTO entradas (id, evento_id, usuario_id, codigo_qr, asiento, precio_pagado, estado)
     VALUES (?, ?, ?, ?, ?, ?, 'VALIDO')`,
    [id, evento_id, usuario_id, codigo_qr, asiento, precio_pagado]
  );
  return { id, evento_id, usuario_id, codigo_qr, asiento, precio_pagado, estado: 'VALIDO' };
}

function obtenerEntradaPorCodigoQr(db, codigo_qr) {
  const stmt = db.prepare('SELECT * FROM entradas WHERE codigo_qr = ?');
  stmt.bind([codigo_qr]);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

function obtenerEntradasPorUsuario(db, usuario_id) {
  const stmt = db.prepare(`
    SELECT e.*, ev.titulo, ev.lugar, ev.fecha_evento, ev.imagen_url
    FROM entradas e
    JOIN eventos ev ON e.evento_id = ev.id
    WHERE e.usuario_id = ?
    ORDER BY e.creado_en DESC
  `);
  stmt.bind([usuario_id]);
  const entradas = [];
  while (stmt.step()) {
    entradas.push(stmt.getAsObject());
  }
  stmt.free();
  return entradas;
}

function marcarEntradaComoUsada(db, id) {
  db.run(
    `UPDATE entradas SET estado = 'USADO', fecha_escaneo = datetime('now') WHERE id = ?`,
    [id]
  );
}

module.exports = {
  crearEntrada,
  obtenerEntradaPorCodigoQr,
  obtenerEntradasPorUsuario,
  marcarEntradaComoUsada,
};
