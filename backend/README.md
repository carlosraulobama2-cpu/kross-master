# Kroos Master - Backend

Backend real para la app Kroos Master. API REST construida con Express, SQLite (sql.js) y JWT.

## Estructura

```
backend/
├── src/
│   ├── config/
│   │   ├── database.js
│   │   └── jwt.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── eventoController.js
│   │   ├── entradaController.js
│   │   └── qrController.js
│   ├── middleware/
│   │   └── auth.js
│   ├── models/
│   │   ├── Usuario.js
│   │   ├── Evento.js
│   │   └── Entrada.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── eventos.js
│   │   ├── entradas.js
│   │   └── qr.js
│   ├── utils/
│   │   └── qrSigner.js
│   └── app.js
├── .env
├── .gitignore
└── package.json
```

## Requisitos

- Node.js >= 18

## Instalación

```bash
cd backend
npm install
```

## Variables de entorno

```env
PORT=3000
JWT_SECRET=KROOS_MASTER_SECRET_2026
DB_PATH=./kroos_master.db
```

## Ejecución

```bash
npm start
```

O en modo watch:

```bash
npm run dev
```

El servidor corre en `http://localhost:3000`.

## Endpoints principales

### Auth
- `POST /api/auth/registro`
- `POST /api/auth/login`
- `GET /api/auth/perfil`

### Eventos
- `GET /api/eventos`
- `GET /api/eventos/:id`
- `POST /api/eventos` (admin)
- `POST /api/eventos/:id/comprar`

### Entradas
- `GET /api/entradas/mis-entradas`

### QR
- `POST /api/qr/validar`

## Health check

- `GET /health`
