-- Seed de datos de prueba para Kroos Master
-- Ejecutar en Supabase SQL Editor después del schema.sql

-- Eventos
INSERT INTO public.eventos (titulo, descripcion, lugar, categoria, fecha_evento, precio, aforo_total, entradas_disponibles, imagen_url)
VALUES 
  ('Urban Beat Fest 2026', 'Festival de música urbana con los mejores artistas del momento.', 'Auditorio Municipal', 'Conciertos', '2026-08-15T21:00:00', 25.00, 500, 500, 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=600&auto=format&fit=crop'),
  ('Trap & Drill Night', 'Noche de trap y drill con DJs invitados.', 'Club Industrial', 'Festivales', '2026-08-28T23:30:00', 18.50, 300, 300, 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=600&auto=format&fit=crop'),
  ('Match Day: Liga Final', 'Final de la liga. No te lo pierdas.', 'Estadio Central', 'Deportes', '2026-09-02T19:00:00', 40.00, 1000, 1000, 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=600&auto=format&fit=crop'),
  ('Teatro: Hamlet', 'Obra de teatro clásica.', 'Teatro Principal', 'Teatro', '2026-09-10T20:00:00', 30.00, 200, 200, 'https://images.unsplash.com/photo-1503095396549-807759245b35?q=80&w=600&auto=format&fit=crop');

-- Usuario admin de prueba (password: admin123)
-- En Supabase auth, crear el usuario manualmente o por signup y luego insertar aquí su UUID
-- INSERT INTO public.usuarios (id, email, nombre, rol) VALUES ('UUID-DEL-USUARIO', 'admin@kroos.com', 'Admin', 'admin');

-- Usuario fan de prueba (password: fan123)
-- INSERT INTO public.usuarios (id, email, nombre, rol) VALUES ('UUID-DEL-USUARIO', 'fan@kroos.com', 'Fan', 'fan');
