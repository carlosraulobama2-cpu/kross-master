const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'KROOS_MASTER_SECRET_2026';
const JWT_EXPIRES = '7d';

function generarToken(usuario) {
  return jwt.sign(
    { id: usuario.id, email: usuario.email, rol: usuario.rol },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

function verificarToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = {
  generarToken,
  verificarToken,
  JWT_SECRET,
};
