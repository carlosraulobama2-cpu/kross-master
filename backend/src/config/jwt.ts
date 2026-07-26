import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'KROOS_MASTER_SECRET_2026';
const JWT_EXPIRES = '7d';

interface TokenPayload {
  id: string;
  email: string;
  rol: string;
}

function generarToken(usuario: TokenPayload) {
  return jwt.sign(
    { id: usuario.id, email: usuario.email, rol: usuario.rol },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

function verificarToken(token: string) {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}

export { generarToken, verificarToken, JWT_SECRET };
