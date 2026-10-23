# Kroos Master · Panel de administración

React 19 + Vite + **TypeScript**, con TanStack Query y React Router.
Sustituye al antiguo `admin/` en JavaScript.

```bash
cp .env.example .env   # VITE_API_URL=http://localhost:3000
npm install
npm run dev            # http://localhost:5173
```

Solo pueden entrar usuarios con rol `admin` (se asigna en la tabla `usuarios`).

## Secciones

| Sección | Qué permite |
| --- | --- |
| Resumen | Volumen vendido, entradas, eventos, usuarios y gráfica de ventas (7/30/90 días) |
| Eventos | Buscar y filtrar, destacar en portada, ocultar/publicar, cancelar con reembolso a todos |
| Pedidos | Filtrar por estado y reembolsar pedidos con motivo |
| Usuarios | Buscar, cambiar rol, bloquear (cierra sus sesiones) |
| Auditoría | Quién hizo qué y cuándo en acciones sensibles |
| Ajustes | Gastos de gestión, comisión, tiempo de reserva, registro y modo mantenimiento |

## Estructura

```
src/
├── lib/          api (renovación automática de sesión), auth, tipos, formato, hooks
├── components/   Layout, kit de UI (botones, tablas, modal, avisos…), gráfica SVG
└── pages/        Una página por sección
```

Modo claro y oscuro automáticos según el sistema; adaptado a móvil.
