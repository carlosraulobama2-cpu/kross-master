require('dotenv').config();
const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || './kroos_master.db';

let db = null;

async function getDb() {
  if (db) return db;

  const SQL = await initSqlJs();
  const dbPath = path.resolve(DB_PATH);
  const exists = fs.existsSync(dbPath);

  db = new SQL.Database();

  if (exists) {
    const buffer = fs.readFileSync(dbPath);
    db.run(buffer);
  } else {
    createTables(db);
    saveDb(db, dbPath);
  }

  return db;
}

function createTables(database) {
  database.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      nombre TEXT NOT NULL,
      rol TEXT NOT NULL DEFAULT 'fan',
      imagen_url TEXT,
      creado_en TEXT DEFAULT (datetime('now')),
      actualizado_en TEXT DEFAULT (datetime('now'))
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS eventos (
      id TEXT PRIMARY KEY,
      titulo TEXT NOT NULL,
      descripcion TEXT,
      lugar TEXT,
      categoria TEXT,
      fecha_evento TEXT NOT NULL,
      precio REAL NOT NULL,
      aforo_total INTEGER NOT NULL,
      entradas_disponibles INTEGER NOT NULL,
      imagen_url TEXT,
      creado_en TEXT DEFAULT (datetime('now'))
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS entradas (
      id TEXT PRIMARY KEY,
      evento_id TEXT NOT NULL,
      usuario_id TEXT NOT NULL,
      codigo_qr TEXT UNIQUE NOT NULL,
      asiento TEXT,
      precio_pagado REAL NOT NULL,
      estado TEXT NOT NULL DEFAULT 'VALIDO',
      fecha_compra TEXT DEFAULT (datetime('now')),
      fecha_escaneo TEXT,
      creado_en TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (evento_id) REFERENCES eventos(id),
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    )
  `);
}

function saveDb(database, dbPath) {
  const data = database.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = {
  getDb,
  saveDb,
  closeDb,
};
