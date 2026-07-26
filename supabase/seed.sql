-- Seed de datos para Supabase
-- Ejecutar después de aplicar schema.sql

-- 1. Usuarios
INSERT INTO public.usuarios (id, email, nombre, rol, nombre_artistico, bio, telefono, sitio_web, razon_social, dni_cif)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'fan@kroos.local', 'Fan Uno', 'fan', NULL, 'Soy fan de eventos', NULL, NULL, NULL, NULL),
  ('22222222-2222-2222-2222-222222222222', 'artista@kroos.local', 'Artista Uno', 'artista', 'DJ Kroos', 'Artista principal', '+34 600 000 000', 'https://artista.kroos.local', 'Kroos Producciones SL', 'B12345678'),
  ('33333333-3333-3333-3333-333333333333', 'staff@kroos.local', 'Staff Uno', 'validador', NULL, 'Staff de eventos', '+34 600 000 001', NULL, NULL, NULL),
  ('44444444-4444-4444-4444-444444444444', 'staff2@kroos.local', 'Staff Dos', 'validador', NULL, 'Staff puerta', '+34 600 000 002', NULL, NULL, NULL)
ON CONFLICT (email) DO NOTHING;

-- 2. Eventos
INSERT INTO public.eventos (id, titulo, descripcion, lugar, categoria, fecha_evento, precio, aforo_total, entradas_disponibles, imagen_url, artista_id, politica_devolucion)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Festival de Verano', 'Festival al aire libre', 'Madrid', 'Festivales', '2026-08-15T20:00:00Z', 45.00, 500, 500, 'https://images.kroos.local/festival.jpg', '22222222-2222-2222-2222-222222222222', 'Si el evento se cancela, se reembolsa en 5-10 días hábiles.'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Concierto de Rock', 'Banda internacional', 'Barcelona', 'Conciertos', '2026-09-10T21:00:00Z', 35.00, 300, 300, 'https://images.kroos.local/rock.jpg', '22222222-2222-2222-2222-222222222222', 'Si el concierto se cancela, se reembolsa en 5-10 días hábiles.')
ON CONFLICT (id) DO NOTHING;

-- 3. Tramos de entrada
INSERT INTO public.tramos_entrada (id, evento_id, nombre, precio, aforo_total, entradas_disponibles, orden, activo)
VALUES
  ('tttttttt-tttt-tttt-tttt-tttttttttttt', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Early Bird', 25.00, 100, 100, 1, true),
  ('uuuuuuuu-uuuu-uuuu-uuuu-uuuuuuuuuuuu', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'General', 45.00, 350, 350, 2, true),
  ('vvvvvvvv-vvvv-vvvv-vvvv-vvvvvvvvvvvv', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'General', 35.00, 300, 300, 1, true)
ON CONFLICT (id) DO NOTHING;

-- 4. Códigos de acceso para staff
INSERT INTO public.codigos_acceso (id, evento_id, codigo, tipo, activo, usos_maximos, usos_actuales, expira_en)
VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'FESTIVAL2026', 'staff', true, 50, 0, '2026-08-16T23:59:59Z'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'ROCK2026', 'staff', true, 30, 0, '2026-09-11T23:59:59Z')
ON CONFLICT (codigo) DO NOTHING;

-- 5. Staff asignado a eventos
INSERT INTO public.staff_evento (id, evento_id, usuario_id, rol_staff, autorizado)
VALUES
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'validador', true),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '44444444-4444-4444-4444-444444444444', 'validador', true)
ON CONFLICT (evento_id, usuario_id) DO NOTHING;

-- 6. Entradas de prueba
INSERT INTO public.entradas (id, evento_id, usuario_id, tramo_id, codigo_qr, asiento, precio_pagado, estado)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'tttttttt-tttt-tttt-tttt-tttttttttttt', '{"ticket_id":"TK-1001","event_id":"EV-2026-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","seat":"Early Bird","exp":1755000000,"nonce":"test-nonce-1","firma":"SIG-TEST"}', 'Early Bird', 25.00, 'VALIDO'),
  ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'uuuuuuuu-uuuu-uuuu-uuuu-uuuuuuuuuuuu', '{"ticket_id":"TK-1002","event_id":"EV-2026-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","seat":"General","exp":1755000000,"nonce":"test-nonce-2","firma":"SIG-TEST"}', 'General', 45.00, 'VALIDO')
ON CONFLICT (id) DO NOTHING;

-- 7. Términos aceptados
INSERT INTO public.terminos_aceptados (id, usuario_id, version, tipo)
VALUES
  ('tttttttt-tttt-tttt-tttt-tttttttttttt', '11111111-1111-1111-1111-111111111111', '1.0', 'terminos'),
  ('uuuuuuuu-uuuu-uuuu-uuuu-uuuuuuuuuuuu', '22222222-2222-2222-2222-222222222222', '1.0', 'terminos')
ON CONFLICT (id) DO NOTHING;

-- 8. Favoritos
INSERT INTO public.favoritos (id, usuario_id, evento_id)
VALUES
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
ON CONFLICT (usuario_id, evento_id) DO NOTHING;

-- 9. Reseñas
INSERT INTO public.resenas (id, usuario_id, evento_id, calificacion, comentario)
VALUES
  ('rrrrrrrr-rrrr-rrrr-rrrr-rrrrrrrrrrrr', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 5, '¡Increíble experiencia!')
ON CONFLICT (id) DO NOTHING;

-- 11. Configuración global de la app
INSERT INTO public.configuracion_app (
  id,
  nombre_plataforma,
  logo_url,
  color_principal,
  email_soporte,
  registro_abierto,
  limite_intentos_login,
  duracion_sesion_minutos,
  codigo_acceso_evento_activado,
  comision_por_defecto,
  moneda,
  redondeo_comisiones,
  minimo_retiro,
  push_globales_activadas,
  email_alertas_criticas,
  notificar_comisiones_creacion,
  modo_mantenimiento,
  retencion_logs_dias,
  validacion_automatica_entradas,
  limite_eventos_organizador,
  zona_horaria,
  idioma_default,
  mostrar_aforo_disponible,
  tamano_maximo_archivo_mb
)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Kroos Master',
  NULL,
  '#00FF87',
  'soporte@kroos.local',
  true,
  5,
  60,
  true,
  10,
  'EUR',
  2,
  50,
  true,
  'alertas@kroos.local',
  true,
  false,
  90,
  true,
  10,
  'Europe/Madrid',
  'es',
  true,
  5
)
ON CONFLICT (id) DO NOTHING;
