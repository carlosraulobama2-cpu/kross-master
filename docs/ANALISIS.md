# Kroos Master — Análisis técnico y plan de reprogramación

Fecha: 23-10-2026 · Alcance: `backend/`, `admin/`, `frontend/`, `supabase/`

Este documento recoge el estado real del proyecto antes de la reprogramación,
qué falta para que sea una app de venta de entradas completa y lista para
producción, y la arquitectura nueva que la sustituye.

---

## 1. Resumen ejecutivo

La app tiene muchas pantallas y rutas, pero **el flujo central (comprar → pagar →
recibir entrada → entrar al evento) no funciona y no es seguro**:

| Área | Estado | Gravedad |
| --- | --- | --- |
| Pagos | Se pueden obtener entradas **sin pagar** por 3 caminos distintos | Crítica |
| Roles | Cualquiera puede registrarse como `super_admin` | Crítica |
| QR | La "firma" no es criptográfica y el QR caduca a los 10 min de comprarlo | Crítica |
| Validación en puerta | El endpoint que marca entradas como usadas no exige login | Crítica |
| Panel admin | Usa tablas que no existen y un login que nunca valida | Alta |
| Stock | Condiciones de carrera: se puede vender más que el aforo | Alta |
| Base de datos | Tipos incorrectos (precio `REAL`, fecha `TEXT`), RPC inexistentes | Alta |
| App | Escribe directamente en la base de datos, saltándose el backend | Alta |
| UI/UX | Sin sistema de diseño, sin navegación por pestañas, sin estados de carga/vacío/error | Media |

Conclusión: no merece la pena parchear. Se reprograma con el backend como única
fuente de verdad, pagos confirmados solo por webhook de Stripe, QR dinámico
firmado con HMAC y una UI nueva con sistema de diseño.

---

## 2. Fallos críticos encontrados

### 2.1 Entradas gratis (3 caminos)

1. **`POST /api/eventos/:id/comprar`** (`eventoController.comprar`) crea la
   entrada `VALIDO` sin ningún pago. Solo pide estar logueado.
2. **`POST /api/stripe/confirmar-pago`** confía en el `paymentIntentId` que
   manda el cliente y **no lo comprueba con Stripe**. Basta con inventar un ID.
3. **La app inserta en `entradas` directamente** (`EntradasContext.comprarEntrada`)
   y la política RLS `"Usuarios pueden crear sus entradas"` lo permite.

Además, en `crear-intento-pago` **el importe lo manda el cliente** (`monto`), así
que se puede pagar 0,50 € por una entrada de 80 €.

### 2.2 Escalada de privilegios

- `POST /api/auth/registro` acepta `rol` en el body → `rol: "super_admin"`.
- El panel admin decide el rol con `user_metadata.role`, que **el propio usuario
  puede modificar** desde el SDK de Supabase (`auth.updateUser`).
- `JWT_SECRET` tiene un valor por defecto en el código (`KROOS_MASTER_SECRET_2026`).

### 2.3 QR inseguro e inutilizable

- `generarFirmaSimulada` es un hash de 32 bits no criptográfico: cualquiera
  puede fabricar un QR "válido".
- El QR se genera una sola vez al comprar con `exp` a 10 minutos y se guarda
  fijo en la BD → a los 10 minutos **la entrada ya no se puede validar**.
- Una captura de pantalla del QR sirve igual que la entrada (no rota).
- `POST /api/qr/validar` y `POST /api/staff/validar` **no requieren
  autenticación**: cualquiera puede "quemar" entradas ajenas.
- La política RLS de staff tiene `WHERE evento_id = evento_id` (siempre cierto).

### 2.4 Webhook de Stripe roto

- Se monta después de `express.json()`, así que el cuerpo ya no es raw y la
  verificación de firma **falla siempre**.
- La ruta acaba en `/api/stripe/webhook/webhook`.
- Si llegara a funcionar, emitiría una segunda entrada (no es idempotente).

### 2.5 Autenticación inconsistente

- `/api/auth/login` devuelve un JWT propio, pero `authMiddleware` valida tokens
  de Supabase → el token del login del backend **no sirve para nada**. El panel
  admin usa ese login, por lo que **nunca puede entrar**.
- No hay política RLS de INSERT en `usuarios` → el registro desde la app falla.
- `usuarios.id` no referencia `auth.users`.

---

## 3. Problemas de datos y lógica

- `precio REAL` (errores de redondeo con dinero) → usar céntimos `INTEGER`.
- `fecha_evento TEXT` → `TIMESTAMPTZ`; sin zona horaria ni fecha de fin.
- Stock con lectura‑escritura (`entradas_disponibles - 1`) → sobreventa en
  concurrencia. Necesita `UPDATE ... WHERE disponibles >= n` atómico.
- `rpc('incrementar_reserva')` / `decrementar_reserva` **no existen**.
- Las reservas caducadas no liberan stock (nadie llama a la limpieza).
- El panel consulta `comisiones`, `alertas_fraude`, `logs_auditoria`,
  `stripe_payouts`, `eventos.estado`, `eventos.entradas_vendidas`: **ninguno existe**.
- `select('*, eventos:titulo, lugar...')` es sintaxis inválida de PostgREST.
- Eventos creados sin `artista_id` y solo por `super_admin` (los artistas no
  pueden publicar aunque la app tenga la pantalla).
- No hay concepto de **pedido**: no se pueden comprar varias entradas en una
  operación, ni reembolsar, ni facturar correctamente.
- Asiento por defecto `'A-12'` en todas las entradas.

---

## 4. Higiene del repositorio

- `backend/dist/` versionado (código compilado obsoleto en git).
- `frontend/.env` y `.env.production` versionados (hoy con valores de ejemplo,
  pero cualquier clave real acabaría en GitHub).
- Coexisten `.js` y `.ts` duplicados (`config/supabase.js` y `.ts`, `models/*.js` sin uso).
- `postinstall: npm run build` en el backend rompe instalaciones en CI.
- Tres Edge Functions de Supabase duplican la lógica del backend.
- Sin tests reales salvo `qrSigner`, sin lint, sin CI.
- Variables leídas con `(process.env as any).EXPO_PUBLIC_*`: Expo no las
  sustituye en la web y la app no arranca.
- Mensaje de commit único `hhfjh`; no hay historial útil.

---

## 5. UI/UX — diagnóstico

- **Navegación**: todo es un stack plano. Falta barra de pestañas
  (Explorar · Buscar · Entradas · Perfil) y el área de organizador.
- **Cabecera de inicio** se desborda a 390 px (el avatar queda cortado).
- **Sin estados**: "Cargando eventos…" en texto plano; no hay skeletons, vacíos
  con acción ni errores recuperables (reintentar).
- **Formulario de evento**: la fecha se escribe a mano en ISO
  (`2026-08-15T21:00:00`), un único campo de precio, sin tramos, sin vista previa.
- **Checkout**: no hay selección de cantidad ni resumen con comisiones; el
  asiento es fijo.
- **Entrada**: QR estático, sin brillo máximo, sin modo offline claro.
- Sin sistema de diseño: colores y tamaños repetidos a mano en cada pantalla,
  sin tokens, sin componentes compartidos, sin háptica ni animaciones coherentes.
- Accesibilidad: sin `accessibilityLabel`, contraste bajo en textos secundarios,
  objetivos táctiles < 44 px en chips.

---

## 6. Qué falta para que la app sea completa

**Compra y pagos**
- Pedidos con varias entradas y varios tramos (General, VIP, Early Bird…).
- Reserva temporal (10 min) con cuenta atrás y liberación automática.
- Importe calculado en servidor + gastos de gestión configurables.
- Emisión de entradas solo desde el webhook, idempotente.
- Reembolsos (total/parcial) y cancelación de evento con reembolso masivo.
- Stripe Connect para pagar a organizadores (comisión de plataforma).
- Factura/recibo por pedido.

**Entradas**
- QR dinámico que rota cada 30 s (HMAC‑TOTP), funciona sin conexión.
- Transferencia a otro usuario con aceptación, invalidando el QR anterior.
- Wallet (Apple/Google) — fase posterior.

**Organizador**
- Alta como organizador y verificación.
- Asistente de creación de evento por pasos con tramos, fechas y vista previa.
- Panel con ventas en tiempo real, aforo, ingresos netos.
- Equipo de puerta (staff) con escáner y modo offline.

**Plataforma**
- Panel admin funcional: KPIs, usuarios/roles, moderación de eventos,
  pedidos, reembolsos, auditoría, configuración.
- Registro de auditoría de acciones sensibles.
- Rate limiting, cabeceras de seguridad, validación de entrada, logs estructurados.
- Notificaciones push (compra, recordatorio 24 h, transferencias).
- Legal: términos versionados, privacidad, borrado de cuenta (RGPD).
- Tests, CI y despliegue reproducible.

---

## 7. Arquitectura nueva

```
kross-master/
├── backend/        API Node.js + TypeScript (Express, Zod, Stripe, Supabase service role)
├── admin-panel/    Panel de administración: React + Vite + TypeScript
├── frontend/       App Expo / React Native + TypeScript, rediseñada
└── supabase/       Esquema v2, funciones SQL atómicas y RLS de solo lectura
```

**Principios**
1. **El backend es la única fuente de verdad.** La app y el panel nunca
   escriben en la BD directamente; RLS solo permite lecturas públicas.
2. **El rol vive en `usuarios.rol`** y solo lo cambia un admin.
3. **Dinero en céntimos** y calculado en servidor.
4. **Stock atómico** con funciones SQL (`reservar_pedido`, `confirmar_pedido`,
   `liberar_pedido`).
5. **Entradas solo por webhook** de Stripe (idempotente por `payment_intent`).
6. **QR = HMAC‑TOTP**: cada entrada tiene una semilla secreta; la app muestra
   `KM2.<entrada>.<ventana>.<firma>` que cambia cada 30 s. La puerta valida
   en el backend con login de staff.

**Flujo de compra**

```
App ── POST /api/pedidos {evento, items} ──▶ Backend
                                            ├─ reservar_pedido() (stock atómico, 10 min)
                                            └─ Stripe PaymentIntent (importe del servidor)
App ◀── clientSecret + resumen ─────────────┘
App ── PaymentSheet ──▶ Stripe ── webhook payment_intent.succeeded ──▶ Backend
                                                                      └─ confirmar_pedido() → entradas
App ── GET /api/pedidos/:id (polling) ──▶ "pagado" + entradas
```

---

## 8. Plan de entrega

1. Análisis (este documento).
2. Backend nuevo + esquema v2 de Supabase.
3. `admin-panel/` en React + TypeScript (sustituye `admin/`).
4. App rediseñada: sistema de diseño, pestañas, explorar, detalle, checkout,
   entradas con QR dinámico, perfil, área de organizador y escáner.
5. Limpieza: quitar `dist/`, `.env` versionados, Edge Functions duplicadas.

---

## 9. Estado tras la reprogramación (23-10-2026)

### Hecho y verificado

- **Base de datos v2** aplicada y probada en PostgreSQL 16: reservas sin sobreventa,
  confirmación idempotente, caducidad de reservas, pago tardío, validación en puerta,
  transferencias que invalidan el QR anterior, reembolsos y permisos (el rol anónimo
  no puede ejecutar la lógica de negocio ni leer datos privados).
- **API**: 18 tests unitarios/HTTP en el repo y 29 pruebas de punta a punta contra un
  entorno local tipo Supabase (PostgREST + Stripe simulado). Cubren registro, roles,
  creación y publicación de eventos, compra, webhook, QR, staff, transferencias,
  reembolsos, bloqueo de cuentas, configuración y cancelación con reembolso masivo.
- **Panel admin** (React + TypeScript) y **app** rediseñada: compilan sin errores en modo
  estricto y se han revisado con capturas en navegador sobre datos de demostración.
- El QR que genera la app y el que valida la API son idénticos (comprobado en 200 casos).
- CI en GitHub Actions: tipos, tests y builds de las tres partes.

### Pendiente

| Tema | Detalle |
| --- | --- |
| Probar en dispositivo | El pago (PaymentSheet), la cámara del escáner, el brillo y las push solo se han probado en web. Necesitan una *development build* (`eas build --profile development`). |
| Stripe real | Configurar claves, webhook y Stripe Connect; probar un cobro y un reembolso reales en modo test. |
| Migración de datos | El esquema v2 es nuevo: si había datos en el proyecto antiguo, hay que migrarlos o empezar en limpio. |
| Subida de imágenes | Hoy la imagen del evento es una URL. Falta subida a Supabase Storage desde la app. |
| Reseñas en la app | La API ya las admite (solo asistentes, tras el evento); falta la pantalla. |
| Wallet en dispositivo | Hecho en la tanda 2, pero hacen falta los certificados de Apple y la cuenta de servicio de Google para probarlo de verdad. |
| Calidad | Tests de interfaz de la app, auditoría de accesibilidad con lector de pantalla, analítica y monitorización de errores (p. ej. Sentry). |

---

## 10. Las 30 funciones inspiradas en las grandes ticketeras

Solo se copian las funciones, no la marca, los logos ni los textos. Todas tienen
lógica en base de datos, API, pantalla en la app y pruebas de punta a punta.
Se descartó a propósito el **precio dinámico**.

### Tanda 1 — comprar más y mejor

| # | Función | Dónde |
| --- | --- | --- |
| 1 | Precio final con gastos incluidos desde el primer momento | Catálogo, ficha y compra |
| 2 | Lista de espera con aviso cuando se liberan entradas | Ficha del evento (agotado) |
| 3 | Seguir artistas y recintos, aviso de nuevas fechas | Artista, recinto, Perfil › Siguiendo |
| 4 | Páginas de artista y de recinto | Explorar |
| 5 | Códigos promocionales | Organizador › Códigos; ficha del evento |
| 6 | Preventa con código | Tipos de entrada con código |
| 7 | Límite de entradas por cuenta | Formulario del evento |
| 8 | Añadir al calendario (.ics) | Ficha y entrada |
| 9 | Información práctica del recinto | «Antes de ir» |
| 10 | Historial de pedidos y recibos | Perfil › Mis pedidos |

### Tanda 2 — experiencia de fan

| # | Función | Dónde |
| --- | --- | --- |
| 11 | Reventa oficial entre fans a precio original | Entrada › Revender; ficha del evento |
| 12 | Cola virtual | Ficha y sala de espera |
| 13 | Registro de fans verificados con sorteo | Ficha; Organizador › Demanda |
| 14 | Recomendaciones «Para ti» | Explorar |
| 15 | Cerca de mí | Explorar y Buscar |
| 16 | Filtros por fecha (hoy, finde, 7 días, mes) | Buscar |
| 17 | Apple Wallet y Google Wallet | Entrada |
| 18 | Entradas accesibles con acompañante gratis | Tipos de entrada |
| 19 | Protección de reembolso y reclamaciones | Compra, pedido y panel admin |
| 20 | Recordatorios automáticos (24 h y apertura de puertas) | Trabajo programado |

### Tanda 3 — organizador y negocio

| # | Función | Dónde |
| --- | --- | --- |
| 21 | Plano de butacas numeradas | Ficha del evento (elegir butacas); Organizador › tipo de entrada |
| 22 | Mejor sitio disponible (juntas, delante y centradas) | Plano de butacas |
| 23 | Extras: parking, merch, VIP… con código de canje | Compra, pedido; Organizador › Extras |
| 24 | Invitaciones con cupo por evento | Organizador › Invitar |
| 25 | Exportación CSV de asistentes y ventas por canal | Organizador › Exportar; estadísticas |
| 26 | Venta en taquilla desde el móvil (efectivo, datáfono, Bizum) | Organizador › Taquilla |
| 27 | Aplazamientos con plazo de reembolso | Organizador › Aplazar; pedido del comprador |
| 28 | Fases automáticas (abre al agotarse la anterior) | Organizador › tipo de entrada |
| 29 | Centro de ayuda con preguntas frecuentes y contacto | Perfil › Centro de ayuda; panel › Soporte y FAQs |
| 30 | Idiomas: español, inglés y catalán | Perfil › Idioma |

**Límites de la función 30.** Están traducidas las pantallas del fan (explorar,
buscar, evento, compra, entradas, pedidos, perfil, ayuda). Siguen en español: las
pantallas del organizador, los mensajes de error que devuelve la API, las
notificaciones push y los contenidos que escribe cada organizador o el admin
(descripciones, preguntas frecuentes). Las traducciones viven en
`frontend/src/lib/idiomas/` y la clave es el propio texto en español: si falta una,
se muestra en español.

**Pruebas.** 62 pruebas de punta a punta (29 del flujo base + 11 + 13 + 9 de las
tandas) y 18 unitarias, todas en verde.
