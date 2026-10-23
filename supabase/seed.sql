-- =====================================================================
-- Datos de demostración para desarrollo local (`supabase db reset`).
-- NO ejecutar en producción.
--
-- Cuentas (contraseña: kroosmaster):
--   admin@kroosmaster.dev        → admin
--   sala@kroosmaster.dev         → organizador
--   promotora@kroosmaster.dev    → organizador
--   fan@kroosmaster.dev          → fan con entradas
-- =====================================================================

-- ---------- Usuarios ----------
create or replace function pg_temp.crear_usuario(p_email text, p_nombre text)
returns uuid
language plpgsql
as $$
declare
  nuevo uuid := gen_random_uuid();
begin
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    nuevo, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', p_email,
    crypt('kroosmaster', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', jsonb_build_object('nombre', p_nombre), now(), now(),
    '', '', '', ''
  );
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), nuevo, nuevo::text, jsonb_build_object('sub', nuevo::text, 'email', p_email), 'email', now(), now(), now());
  return nuevo;
end;
$$;

do $$
declare
  i integer;
  nombres text[] := array['Lucía','Hugo','Martina','Mateo','Sofía','Leo','Valeria','Daniel','Julia','Pablo',
                          'Carmen','Álvaro','Paula','Adrián','Elena','Diego','Irene','Marcos','Noa','Javier',
                          'Alba','Sergio','Claudia','Iván'];
begin
  perform pg_temp.crear_usuario('admin@kroosmaster.dev', 'Equipo Kroos');
  perform pg_temp.crear_usuario('sala@kroosmaster.dev', 'Raúl Ortega');
  perform pg_temp.crear_usuario('promotora@kroosmaster.dev', 'Marta Vidal');
  perform pg_temp.crear_usuario('fan@kroosmaster.dev', 'Carlos Ruiz');
  for i in 1..array_length(nombres, 1) loop
    perform pg_temp.crear_usuario(format('fan%s@kroosmaster.dev', i), nombres[i]);
  end loop;
end $$;

update public.usuarios set rol = 'admin' where email = 'admin@kroosmaster.dev';
update public.usuarios set rol = 'organizador', nombre_artistico = 'Sala Malandar', ciudad = 'Sevilla', telefono = '600111222'
 where email = 'sala@kroosmaster.dev';
update public.usuarios set rol = 'organizador', nombre_artistico = 'Sierra Sonora Producciones', ciudad = 'Granada', telefono = '600333444'
 where email = 'promotora@kroosmaster.dev';
update public.usuarios set ciudad = 'Jaén' where email = 'fan@kroosmaster.dev';

-- ---------- Eventos ----------
create temp table demo_eventos (
  org text, titulo text, descripcion text, categoria text, recinto text, direccion text, ciudad text,
  dias integer, hora time, duracion interval, imagen text, destacado boolean, tramos jsonb
);

insert into demo_eventos values
('promotora', 'Festival Sierra Sonora 2026', 'Tres escenarios, cuarenta artistas y la Alhambra de fondo. Indie, electrónica y pop en el festival de otoño más esperado del sur.', 'festivales', 'Recinto Ferial', 'Av. de la Feria s/n', 'Granada', 9, '17:00', '10 hours',
 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=1200&q=80&auto=format&fit=crop', true,
 '[{"nombre":"Abono Early Bird","precio":3900,"total":400,"vendidas":400},{"nombre":"Abono General","precio":5500,"total":1500},{"nombre":"VIP Backstage","precio":12000,"total":120,"descripcion":"Zona elevada, barra propia y acceso al backstage"}]'),
('sala', 'Luna Brava · Gira «Mar de fondo»', 'La banda revelación del año presenta su segundo disco en un concierto íntimo, con las canciones que han sonado en todas partes.', 'conciertos', 'Sala Malandar', 'C. Torneo 43', 'Sevilla', 4, '21:30', '2 hours',
 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=1200&q=80&auto=format&fit=crop', true,
 '[{"nombre":"Anticipada","precio":1800,"total":250},{"nombre":"Taquilla","precio":2200,"total":100}]'),
('sala', 'Noche Indie: Los Faroles + Marea Baja', 'Doble cartel de guitarras: Los Faroles presentan EP y Marea Baja abre la noche.', 'conciertos', 'Sala Malandar', 'C. Torneo 43', 'Sevilla', 12, '21:00', '3 hours',
 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200&q=80&auto=format&fit=crop', false,
 '[{"nombre":"General","precio":1200,"total":300}]'),
('promotora', 'Warehouse: 12 horas de techno', 'Doce horas sin pausa en una nave industrial. Sonido Funktion-One y line-up internacional.', 'clubbing', 'Nave 7', 'Polígono El Florío', 'Granada', 16, '23:00', '12 hours',
 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&q=80&auto=format&fit=crop', true,
 '[{"nombre":"Primera ola","precio":1500,"total":200,"vendidas":200},{"nombre":"Segunda ola","precio":2000,"total":600}]'),
('sala', 'La casa de Bernarda Alba', 'El clásico de Lorca en una puesta en escena contemporánea. Duración: 1 h 40 min sin descanso.', 'teatro', 'Teatro Central', 'Av. José de Gálvez 6', 'Sevilla', 20, '20:00', '100 minutes',
 'https://images.unsplash.com/photo-1503095396549-807759245b35?w=1200&q=80&auto=format&fit=crop', false,
 '[{"nombre":"Platea","precio":2800,"total":180},{"nombre":"Anfiteatro","precio":1800,"total":120}]'),
('promotora', 'CD Olivares vs Atlético Sierra', 'Derbi provincial en la jornada 12. Puertas a las 17:00.', 'deportes', 'Estadio La Victoria', 'Av. de Madrid s/n', 'Jaén', 6, '18:30', '2 hours',
 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200&q=80&auto=format&fit=crop', false,
 '[{"nombre":"Fondo","precio":1500,"total":800},{"nombre":"Tribuna","precio":2500,"total":400}]'),
('sala', 'Monólogos en el Mercado', 'Cuatro cómicos, una barra y mucho humor del sur. Consumición incluida.', 'otros', 'Mercado Lonja del Barranco', 'C. Arjona s/n', 'Sevilla', 3, '22:00', '90 minutes',
 'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=1200&q=80&auto=format&fit=crop', false,
 '[{"nombre":"Entrada + consumición","precio":1400,"total":150}]'),
('promotora', 'Atardecer Sinfónico en la Alhambra', 'La Orquesta Ciudad de Granada interpreta bandas sonoras de cine al caer el sol.', 'conciertos', 'Palacio de Carlos V', 'Alhambra', 'Granada', 27, '19:30', '2 hours',
 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=1200&q=80&auto=format&fit=crop', false,
 '[{"nombre":"Zona A","precio":4500,"total":200},{"nombre":"Zona B","precio":3200,"total":300}]'),
('sala', 'Flamenco de Raíz: Noche de Cante', 'Cante jondo y guitarra en el patio de un corral de vecinos del siglo XVII.', 'conciertos', 'Corral del Conde', 'C. Santiago 27', 'Sevilla', 34, '21:00', '2 hours',
 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&q=80&auto=format&fit=crop', false,
 '[{"nombre":"General","precio":2500,"total":90}]'),
('promotora', 'Costa Neón Festival', 'Electrónica y pop frente al mar. Dos días, camping incluido en el abono.', 'festivales', 'Playa de la Malagueta', 'Paseo Marítimo', 'Málaga', 45, '16:00', '2 days',
 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=1200&q=80&auto=format&fit=crop', true,
 '[{"nombre":"Abono 2 días","precio":6900,"total":2000},{"nombre":"Abono + camping","precio":8900,"total":500}]'),
('sala', 'Jam Session de Jazz', 'Escenario abierto con el trío de la casa. Trae tu instrumento.', 'conciertos', 'Sala Malandar', 'C. Torneo 43', 'Sevilla', 8, '20:30', '3 hours',
 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=1200&q=80&auto=format&fit=crop', false,
 '[{"nombre":"Entrada libre (reserva)","precio":0,"total":80,"max":2}]');

do $$
declare
  ev demo_eventos;
  nuevo_evento uuid;
  t jsonb;
  orden integer;
begin
  for ev in select * from demo_eventos loop
    insert into public.eventos (organizador_id, titulo, descripcion, categoria, recinto, direccion, ciudad, imagen_url,
                                inicia_en, termina_en, estado, destacado)
    values (
      (select id from public.usuarios where email = ev.org || '@kroosmaster.dev'),
      ev.titulo, ev.descripcion, ev.categoria, ev.recinto, ev.direccion, ev.ciudad, ev.imagen,
      (current_date + ev.dias + ev.hora)::timestamp at time zone 'Europe/Madrid',
      (current_date + ev.dias + ev.hora)::timestamp at time zone 'Europe/Madrid' + ev.duracion,
      'publicado', ev.destacado
    )
    returning id into nuevo_evento;

    orden := 0;
    for t in select * from jsonb_array_elements(ev.tramos) loop
      insert into public.tramos (evento_id, nombre, descripcion, precio_centimos, cantidad_total, max_por_pedido, orden)
      values (nuevo_evento, t ->> 'nombre', t ->> 'descripcion', (t ->> 'precio')::integer, (t ->> 'total')::integer,
              coalesce((t ->> 'max')::integer, 8), orden);
      orden := orden + 1;
    end loop;
  end loop;
end $$;

-- ---------- Recintos, artistas y extras de compra ----------
insert into public.recintos (nombre, direccion, ciudad, creado_por)
select distinct on (lower(recinto), lower(ciudad)) recinto, direccion, ciudad, organizador_id
  from public.eventos order by lower(recinto), lower(ciudad), creado_en;

update public.eventos e set recinto_id = r.id, puertas_abren_en = e.inicia_en - interval '1 hour'
  from public.recintos r where lower(r.nombre) = lower(e.recinto) and lower(r.ciudad) = lower(e.ciudad);

update public.recintos set
  aforo = 350,
  como_llegar = 'A 5 minutos andando de Plaza de Armas. Metro: Puerta Jerez. Bus: C3, C4.',
  parking = 'Parking público Plaza de Armas (24 h) a 300 m.',
  accesibilidad = 'Acceso sin escalones, zona reservada para sillas de ruedas y aseo adaptado.',
  objetos_prohibidos = 'Botellas de cristal, latas, paraguas largos y cámaras profesionales.'
 where nombre = 'Sala Malandar';

update public.recintos set
  como_llegar = 'Lanzaderas gratuitas desde la estación de autobuses cada 20 minutos.',
  parking = 'Parking del recinto: 10 € por día (incluido en el abono VIP).',
  accesibilidad = 'Plataforma elevada para personas con movilidad reducida junto a la mesa de sonido.',
  objetos_prohibidos = 'Comida y bebida del exterior, sillas plegables y drones.'
 where nombre = 'Recinto Ferial';

insert into public.artistas (nombre, bio, generos) values
  ('Luna Brava', 'Cuarteto sevillano de pop luminoso. Su segundo disco, «Mar de fondo», ha sido el más escuchado del año.', '{pop,indie}'),
  ('Los Faroles', 'Guitarras, prisas y estribillos para corear desde la primera escucha.', '{indie,rock}'),
  ('Marea Baja', 'Dúo de dream pop nacido en Cádiz.', '{indie}'),
  ('DJ Olivo', 'Techno con raíces andaluzas. Residente de las mejores naves del sur.', '{techno,electrónica}'),
  ('Kora', 'Productora y DJ de house melódico.', '{house,electrónica}'),
  ('Nieve Roja', 'Electropop con letras afiladas.', '{pop,electrónica}'),
  ('Orquesta Sinfónica del Sur', 'Formación sinfónica especializada en bandas sonoras.', '{clásica}'),
  ('Rocío Valle', 'Cantaora de la nueva generación del flamenco.', '{flamenco}'),
  ('Trío Malandar', 'El trío de jazz residente de la sala.', '{jazz}'),
  ('Paco Salas', 'Monologuista. Humor del día a día.', '{comedia}'),
  ('Irene Mar', 'Cómica e improvisadora.', '{comedia}');

insert into public.evento_artistas (evento_id, artista_id, orden)
select e.id, a.id, x.orden
  from (values
    ('Luna Brava%', 'Luna Brava', 0),
    ('Noche Indie%', 'Los Faroles', 0), ('Noche Indie%', 'Marea Baja', 1),
    ('Festival Sierra%', 'Luna Brava', 0), ('Festival Sierra%', 'Nieve Roja', 1), ('Festival Sierra%', 'Los Faroles', 2), ('Festival Sierra%', 'DJ Olivo', 3),
    ('Warehouse%', 'DJ Olivo', 0), ('Warehouse%', 'Kora', 1),
    ('Atardecer%', 'Orquesta Sinfónica del Sur', 0),
    ('Flamenco%', 'Rocío Valle', 0),
    ('Costa Neón%', 'Nieve Roja', 0), ('Costa Neón%', 'Kora', 1), ('Costa Neón%', 'Luna Brava', 2),
    ('Jam Session%', 'Trío Malandar', 0),
    ('Monólogos%', 'Paco Salas', 0), ('Monólogos%', 'Irene Mar', 1)
  ) as x(titulo, artista, orden)
  join public.eventos e on e.titulo like x.titulo
  join public.artistas a on a.nombre = x.artista;

-- Preventa del Costa Neón con código y límite de 4 entradas por persona.
insert into public.tramos (evento_id, nombre, descripcion, precio_centimos, cantidad_total, max_por_pedido, orden, codigo_acceso)
select id, 'Preventa Fan Club', 'Abono 2 días a precio especial para el club de fans', 5900, 300, 4, -1, 'FANCLUB'
  from public.eventos where titulo = 'Costa Neón Festival';

insert into public.codigos_promocionales (evento_id, codigo, descripcion, tipo, valor, usos_max)
select id, 'OTONO10', '10 % de descuento de otoño', 'porcentaje', 10, 200 from public.eventos where titulo like 'Luna Brava%';

-- ---------- Ventas de los últimos 30 días ----------
-- Se crean con las mismas funciones que usa la API, y luego se reparten en el tiempo.
do $$
declare
  fans uuid[] := array(select id from public.usuarios where rol = 'fan' and email <> 'fan@kroosmaster.dev' order by email);
  tr record;
  pendientes integer;
  lote integer;
  ped public.pedidos;
  n integer := 0;
begin
  for tr in
    select t.*, (select (x ->> 'vendidas')::integer from demo_eventos d, jsonb_array_elements(d.tramos) x
                  where d.titulo = e.titulo and x ->> 'nombre' = t.nombre) as objetivo
      from public.tramos t join public.eventos e on e.id = t.evento_id
  loop
    -- Sin objetivo fijo: entre el 15 % y el 70 % del aforo.
    pendientes := coalesce(tr.objetivo, (tr.cantidad_total * (0.15 + random() * 0.55))::integer);
    while pendientes > 0 loop
      lote := least(pendientes, tr.max_por_pedido, 1 + (random() * 3)::integer);
      ped := public.reservar_pedido(fans[1 + (n % array_length(fans, 1))], tr.evento_id,
                                    jsonb_build_array(jsonb_build_object('tramo_id', tr.id, 'cantidad', lote)),
                                    null, tr.codigo_acceso);
      perform public.confirmar_pedido(ped.id, case when ped.total_centimos > 0 then 'pi_demo_' || replace(ped.id::text, '-', '') end);
      update public.pedidos
         set creado_en = now() - (random() * interval '30 days') * power(random(), 0.6),
             pagado_en = null
       where id = ped.id;
      pendientes := pendientes - lote;
      n := n + 1;
    end loop;
  end loop;

  update public.pedidos set pagado_en = creado_en + interval '2 minutes' where estado = 'pagado' and pagado_en is null;
  update public.entradas e set creado_en = p.pagado_en from public.pedidos p where p.id = e.pedido_id;
end $$;

-- Límite por persona (se fija después de generar las ventas de demo).
update public.eventos set max_por_usuario = 4 where titulo = 'Costa Neón Festival';

-- El fan de demo tiene entradas para ver la app con contenido.
do $$
declare
  fan uuid := (select id from public.usuarios where email = 'fan@kroosmaster.dev');
  ped public.pedidos;
begin
  ped := public.reservar_pedido(fan, (select id from public.eventos where titulo like 'Luna Brava%'),
    (select jsonb_build_array(jsonb_build_object('tramo_id', t.id, 'cantidad', 2)) from public.tramos t
       join public.eventos e on e.id = t.evento_id where e.titulo like 'Luna Brava%' and t.nombre = 'Anticipada'));
  perform public.confirmar_pedido(ped.id, 'pi_demo_fan_1');

  ped := public.reservar_pedido(fan, (select id from public.eventos where titulo like 'Festival Sierra%'),
    (select jsonb_build_array(jsonb_build_object('tramo_id', t.id, 'cantidad', 1)) from public.tramos t
       join public.eventos e on e.id = t.evento_id where e.titulo like 'Festival Sierra%' and t.nombre = 'VIP Backstage'));
  perform public.confirmar_pedido(ped.id, 'pi_demo_fan_2');

  insert into public.favoritos (usuario_id, evento_id)
  select fan, id from public.eventos where titulo in ('Warehouse: 12 horas de techno', 'Costa Neón Festival');

  insert into public.seguimientos (usuario_id, artista_id) select fan, id from public.artistas where nombre in ('Luna Brava', 'DJ Olivo');
  insert into public.seguimientos (usuario_id, recinto_id) select fan, id from public.recintos where nombre = 'Sala Malandar';

  insert into public.staff_eventos (evento_id, usuario_id)
  select id, fan from public.eventos where titulo = 'Monólogos en el Mercado';

  insert into public.notificaciones (usuario_id, titulo, cuerpo, tipo) values
    (fan, '¡Entradas listas! 🎟️', 'Ya tienes 2 entradas para Luna Brava · Gira «Mar de fondo».', 'pedido'),
    (fan, 'Recordatorio', 'Festival Sierra Sonora abre puertas en 9 días. ¡Prepara el abono!', 'recordatorio');
end $$;

insert into public.auditoria (actor_id, accion, entidad, entidad_id, datos, creado_en)
select organizador_id, 'evento.publicar', 'evento', id::text, jsonb_build_object('titulo', titulo), creado_en
  from public.eventos;
