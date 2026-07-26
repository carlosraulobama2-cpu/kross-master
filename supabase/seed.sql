-- Seed de datos para Supabase

INSERT INTO public.usuarios (id, email, nombre, rol, nombre_artistico, bio, telefono, sitio_web)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'fan@kroos.local', 'Fan Uno', 'fan', NULL, 'Soy fan de eventos', NULL, NULL),
  ('22222222-2222-2222-2222-222222222222', 'artista@kroos.local', 'Artista Uno', 'artista', 'DJ Kroos', 'Artista principal', '+34 600 000 000', 'https://artista.kroos.local')
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.eventos (id, titulo, descripcion, lugar, categoria, fecha_evento, precio, aforo_total, entradas_disponibles, imagen_url, artista_id)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Festival de Verano', 'Festival al aire libre', 'Madrid', 'Festivales', '2026-08-15T20:00:00Z', 45.00, 500, 500, 'https://images.kroos.local/festival.jpg', '22222222-2222-2222-2222-222222222222'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Concierto de Rock', 'Banda internacional', 'Barcelona', 'Conciertos', '2026-09-10T21:00:00Z', 35.00, 300, 300, 'https://images.kroos.local/rock.jpg', '22222222-2222-2222-2222-222222222222')
ON CONFLICT (id) DO NOTHING;
