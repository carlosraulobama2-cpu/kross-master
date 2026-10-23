-- =====================================================================
-- Kroos Master · Esquema v2
--
-- Principios:
--   * El backend (service_role) es el único que escribe. La app y el
--     panel solo leen datos públicos con la anon key; todo lo demás pasa
--     por la API.
--   * Dinero en céntimos (INTEGER). Fechas en TIMESTAMPTZ.
--   * Stock atómico: reservar/confirmar/liberar se hacen en funciones SQL
--     con UPDATE condicionado, nunca leyendo y restando desde Node.
--
-- Aplicar sobre un proyecto Supabase limpio (`supabase db push` o pegar
-- en el SQL Editor).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Usuarios (perfil 1:1 con auth.users)
-- ---------------------------------------------------------------------
create table if not exists public.usuarios (
  id                         uuid primary key references auth.users(id) on delete cascade,
  email                      text not null unique,
  nombre                     text not null default '',
  rol                        text not null default 'fan'
                               check (rol in ('fan', 'organizador', 'admin')),
  avatar_url                 text,
  telefono                   text,
  bio                        text,
  nombre_artistico           text,
  ciudad                     text,
  stripe_account_id          text,
  stripe_onboarding_completo boolean not null default false,
  push_token                 text,
  bloqueado                  boolean not null default false,
  creado_en                  timestamptz not null default now(),
  actualizado_en             timestamptz not null default now()
);

-- Crea el perfil automáticamente al registrarse. El rol SIEMPRE empieza
-- en 'fan': nunca se lee de user_metadata (lo puede editar el usuario).
create or replace function public.crear_perfil_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.usuarios (id, email, nombre)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'nombre', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.crear_perfil_usuario();

-- ---------------------------------------------------------------------
-- Eventos y tramos
-- ---------------------------------------------------------------------
create table if not exists public.eventos (
  id                  uuid primary key default gen_random_uuid(),
  organizador_id      uuid not null references public.usuarios(id),
  titulo              text not null check (char_length(titulo) between 3 and 120),
  descripcion         text not null default '',
  categoria           text not null
                        check (categoria in ('conciertos', 'festivales', 'deportes', 'teatro', 'clubbing', 'otros')),
  recinto             text not null,
  direccion           text,
  ciudad              text not null,
  imagen_url          text,
  inicia_en           timestamptz not null,
  termina_en          timestamptz,
  edad_minima         integer check (edad_minima between 0 and 21),
  politica_devolucion text not null default 'Si el evento se cancela, se reembolsa el importe íntegro en 5-10 días hábiles.',
  estado              text not null default 'borrador'
                        check (estado in ('borrador', 'publicado', 'cancelado', 'finalizado')),
  destacado           boolean not null default false,
  creado_en           timestamptz not null default now(),
  actualizado_en      timestamptz not null default now(),
  check (termina_en is null or termina_en > inicia_en)
);

create table if not exists public.tramos (
  id                 uuid primary key default gen_random_uuid(),
  evento_id          uuid not null references public.eventos(id) on delete cascade,
  nombre             text not null,
  descripcion        text,
  precio_centimos    integer not null check (precio_centimos >= 0),
  cantidad_total     integer not null check (cantidad_total > 0),
  cantidad_vendida   integer not null default 0 check (cantidad_vendida >= 0),
  cantidad_reservada integer not null default 0 check (cantidad_reservada >= 0),
  max_por_pedido     integer not null default 10 check (max_por_pedido between 1 and 50),
  venta_inicia_en    timestamptz,
  venta_termina_en   timestamptz,
  orden              integer not null default 0,
  activo             boolean not null default true,
  creado_en          timestamptz not null default now(),
  check (cantidad_vendida + cantidad_reservada <= cantidad_total)
);

-- ---------------------------------------------------------------------
-- Pedidos y entradas
-- ---------------------------------------------------------------------
create table if not exists public.pedidos (
  id                       uuid primary key default gen_random_uuid(),
  usuario_id               uuid not null references public.usuarios(id),
  evento_id                uuid not null references public.eventos(id),
  estado                   text not null default 'pendiente'
                             check (estado in ('pendiente', 'pagado', 'expirado', 'cancelado', 'reembolsado')),
  subtotal_centimos        integer not null check (subtotal_centimos >= 0),
  gastos_centimos          integer not null check (gastos_centimos >= 0),
  total_centimos           integer not null check (total_centimos >= 0),
  moneda                   text not null default 'eur',
  stripe_payment_intent_id text unique,
  expira_en                timestamptz not null,
  pagado_en                timestamptz,
  creado_en                timestamptz not null default now()
);

create table if not exists public.pedido_items (
  id                       uuid primary key default gen_random_uuid(),
  pedido_id                uuid not null references public.pedidos(id) on delete cascade,
  tramo_id                 uuid not null references public.tramos(id),
  cantidad                 integer not null check (cantidad > 0),
  precio_unitario_centimos integer not null check (precio_unitario_centimos >= 0)
);

create table if not exists public.entradas (
  id              uuid primary key default gen_random_uuid(),
  pedido_id       uuid not null references public.pedidos(id),
  evento_id       uuid not null references public.eventos(id),
  tramo_id        uuid not null references public.tramos(id),
  usuario_id      uuid not null references public.usuarios(id),
  codigo          text not null unique,
  -- Semilla HMAC del QR dinámico. Solo la ve el titular; se regenera al transferir.
  qr_semilla      text not null,
  estado          text not null default 'valida'
                    check (estado in ('valida', 'usada', 'anulada', 'reembolsada')),
  usada_en        timestamptz,
  validada_por    uuid references public.usuarios(id),
  creado_en       timestamptz not null default now()
);

create table if not exists public.transferencias (
  id             uuid primary key default gen_random_uuid(),
  entrada_id     uuid not null references public.entradas(id),
  de_usuario_id  uuid not null references public.usuarios(id),
  a_usuario_id   uuid not null references public.usuarios(id),
  estado         text not null default 'pendiente'
                   check (estado in ('pendiente', 'aceptada', 'cancelada', 'rechazada')),
  creado_en      timestamptz not null default now(),
  resuelta_en    timestamptz
);

-- Solo una transferencia pendiente por entrada.
create unique index if not exists transferencias_una_pendiente
  on public.transferencias(entrada_id) where estado = 'pendiente';

-- ---------------------------------------------------------------------
-- Puerta
-- ---------------------------------------------------------------------
create table if not exists public.staff_eventos (
  evento_id  uuid not null references public.eventos(id) on delete cascade,
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  creado_en  timestamptz not null default now(),
  primary key (evento_id, usuario_id)
);

create table if not exists public.escaneos (
  id         uuid primary key default gen_random_uuid(),
  evento_id  uuid not null references public.eventos(id),
  entrada_id uuid references public.entradas(id),
  staff_id   uuid not null references public.usuarios(id),
  resultado  text not null
               check (resultado in ('valida', 'ya_usada', 'invalida', 'otro_evento', 'anulada', 'caducada')),
  creado_en  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Social
-- ---------------------------------------------------------------------
create table if not exists public.favoritos (
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  evento_id  uuid not null references public.eventos(id) on delete cascade,
  creado_en  timestamptz not null default now(),
  primary key (usuario_id, evento_id)
);

create table if not exists public.resenas (
  id          uuid primary key default gen_random_uuid(),
  evento_id   uuid not null references public.eventos(id) on delete cascade,
  usuario_id  uuid not null references public.usuarios(id) on delete cascade,
  puntuacion  integer not null check (puntuacion between 1 and 5),
  comentario  text check (char_length(comentario) <= 1000),
  creado_en   timestamptz not null default now(),
  unique (evento_id, usuario_id)
);

create table if not exists public.notificaciones (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null references public.usuarios(id) on delete cascade,
  titulo      text not null,
  cuerpo      text not null,
  tipo        text not null default 'info',
  datos       jsonb not null default '{}'::jsonb,
  leida       boolean not null default false,
  creado_en   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Plataforma
-- ---------------------------------------------------------------------
create table if not exists public.configuracion (
  id                             integer primary key default 1 check (id = 1),
  gastos_gestion_porcentaje      numeric(5, 2) not null default 5,
  gastos_gestion_fijo_centimos   integer not null default 50,
  comision_plataforma_porcentaje numeric(5, 2) not null default 3,
  minutos_reserva                integer not null default 10 check (minutos_reserva between 3 and 60),
  moneda                         text not null default 'eur',
  registro_abierto               boolean not null default true,
  mantenimiento                  boolean not null default false,
  mensaje_mantenimiento          text,
  email_soporte                  text,
  actualizado_en                 timestamptz not null default now()
);
insert into public.configuracion (id) values (1) on conflict (id) do nothing;

create table if not exists public.auditoria (
  id         uuid primary key default gen_random_uuid(),
  actor_id   uuid references public.usuarios(id),
  accion     text not null,
  entidad    text not null,
  entidad_id text,
  datos      jsonb not null default '{}'::jsonb,
  creado_en  timestamptz not null default now()
);

-- Eventos de Stripe ya procesados (idempotencia del webhook).
create table if not exists public.stripe_eventos (
  id        text primary key,
  tipo      text not null,
  creado_en timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------
create index if not exists eventos_estado_inicia_idx on public.eventos(estado, inicia_en);
create index if not exists eventos_organizador_idx  on public.eventos(organizador_id);
create index if not exists eventos_categoria_idx    on public.eventos(categoria);
create index if not exists tramos_evento_idx        on public.tramos(evento_id);
create index if not exists pedidos_usuario_idx      on public.pedidos(usuario_id, creado_en desc);
create index if not exists pedidos_pendientes_idx   on public.pedidos(expira_en) where estado = 'pendiente';
create index if not exists pedidos_evento_idx       on public.pedidos(evento_id);
create index if not exists items_pedido_idx         on public.pedido_items(pedido_id);
create index if not exists entradas_usuario_idx     on public.entradas(usuario_id);
create index if not exists entradas_evento_idx      on public.entradas(evento_id);
create index if not exists entradas_pedido_idx      on public.entradas(pedido_id);
create index if not exists escaneos_evento_idx      on public.escaneos(evento_id, creado_en desc);
create index if not exists notificaciones_usr_idx   on public.notificaciones(usuario_id, creado_en desc);
create index if not exists resenas_evento_idx       on public.resenas(evento_id);
create index if not exists auditoria_creado_idx     on public.auditoria(creado_en desc);

-- ---------------------------------------------------------------------
-- Vista de catálogo con disponibilidad agregada.
-- Se ejecuta con permisos del propietario y solo expone columnas públicas.
-- ---------------------------------------------------------------------
create or replace view public.catalogo_eventos as
select
  e.id, e.organizador_id, e.titulo, e.descripcion, e.categoria, e.recinto,
  e.direccion, e.ciudad, e.imagen_url, e.inicia_en, e.termina_en,
  e.edad_minima, e.politica_devolucion, e.destacado, e.creado_en,
  coalesce(nullif(u.nombre_artistico, ''), u.nombre)                               as organizador_nombre,
  coalesce(min(t.precio_centimos) filter (where t.activo), 0)                      as precio_desde_centimos,
  coalesce(sum(t.cantidad_total - t.cantidad_vendida - t.cantidad_reservada)
           filter (where t.activo), 0)::integer                                     as disponibles,
  coalesce(sum(t.cantidad_total) filter (where t.activo), 0)::integer               as aforo
from public.eventos e
join public.usuarios u on u.id = e.organizador_id
left join public.tramos t on t.evento_id = e.id
where e.estado = 'publicado'
group by e.id, u.nombre_artistico, u.nombre;

grant select on public.catalogo_eventos to anon, authenticated;

-- ---------------------------------------------------------------------
-- Funciones de negocio (solo service_role)
-- ---------------------------------------------------------------------

-- Genera un código legible: KM-XXXX-XXXX (sin caracteres ambiguos).
create or replace function public.generar_codigo_entrada()
returns text
language plpgsql
as $$
declare
  alfabeto constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea := gen_random_bytes(8);
  resultado text := 'KM-';
  i integer;
begin
  for i in 0..7 loop
    if i = 4 then resultado := resultado || '-'; end if;
    resultado := resultado || substr(alfabeto, (get_byte(bytes, i) % 32) + 1, 1);
  end loop;
  return resultado;
end;
$$;

-- Reserva stock y crea un pedido pendiente.
-- p_items: [{"tramo_id": "...", "cantidad": 2}, ...]
-- Errores: EVENTO_NO_DISPONIBLE, TRAMO_INVALIDO, LIMITE_POR_PEDIDO, SIN_STOCK.
create or replace function public.reservar_pedido(
  p_usuario_id uuid,
  p_evento_id  uuid,
  p_items      jsonb
)
returns public.pedidos
language plpgsql
security definer
set search_path = public
as $$
declare
  cfg        public.configuracion;
  ev         public.eventos;
  item       jsonb;
  tr         public.tramos;
  cant       integer;
  subtotal   integer := 0;
  n_entradas integer := 0;
  gastos     integer := 0;
  pedido     public.pedidos;
begin
  select * into cfg from public.configuracion where id = 1;

  select * into ev from public.eventos where id = p_evento_id;
  if not found or ev.estado <> 'publicado' or ev.inicia_en < now() then
    raise exception 'EVENTO_NO_DISPONIBLE';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'TRAMO_INVALIDO';
  end if;

  insert into public.pedidos (usuario_id, evento_id, subtotal_centimos, gastos_centimos, total_centimos, moneda, expira_en)
  values (p_usuario_id, p_evento_id, 0, 0, 0, cfg.moneda, now() + make_interval(mins => cfg.minutos_reserva))
  returning * into pedido;

  for item in select * from jsonb_array_elements(p_items) loop
    cant := (item ->> 'cantidad')::integer;
    if cant is null or cant <= 0 then
      raise exception 'TRAMO_INVALIDO';
    end if;

    -- UPDATE condicionado = reserva atómica, sin sobreventa.
    update public.tramos t
       set cantidad_reservada = t.cantidad_reservada + cant
     where t.id = (item ->> 'tramo_id')::uuid
       and t.evento_id = p_evento_id
       and t.activo
       and (t.venta_inicia_en is null or t.venta_inicia_en <= now())
       and (t.venta_termina_en is null or t.venta_termina_en > now())
       and cant <= t.max_por_pedido
       and t.cantidad_total - t.cantidad_vendida - t.cantidad_reservada >= cant
    returning * into tr;

    if not found then
      select * into tr from public.tramos where id = (item ->> 'tramo_id')::uuid and evento_id = p_evento_id;
      if not found or not tr.activo then
        raise exception 'TRAMO_INVALIDO';
      elsif cant > tr.max_por_pedido then
        raise exception 'LIMITE_POR_PEDIDO';
      else
        raise exception 'SIN_STOCK';
      end if;
    end if;

    insert into public.pedido_items (pedido_id, tramo_id, cantidad, precio_unitario_centimos)
    values (pedido.id, tr.id, cant, tr.precio_centimos);

    subtotal := subtotal + tr.precio_centimos * cant;
    n_entradas := n_entradas + cant;
  end loop;

  -- Las entradas gratuitas no llevan gastos de gestión.
  if subtotal > 0 then
    gastos := round(subtotal * cfg.gastos_gestion_porcentaje / 100.0)::integer
              + cfg.gastos_gestion_fijo_centimos * n_entradas;
  end if;

  update public.pedidos
     set subtotal_centimos = subtotal,
         gastos_centimos   = gastos,
         total_centimos    = subtotal + gastos
   where id = pedido.id
  returning * into pedido;

  return pedido;
end;
$$;

-- Marca el pedido como pagado y emite las entradas. Idempotente: si ya
-- está pagado devuelve 0. Si el pedido había expirado (pago tardío),
-- intenta recuperar stock; si no hay, lanza SIN_STOCK para reembolsar.
create or replace function public.confirmar_pedido(
  p_pedido_id         uuid,
  p_payment_intent_id text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  ped   public.pedidos;
  it    public.pedido_items;
  i     integer;
  total integer := 0;
begin
  select * into ped from public.pedidos where id = p_pedido_id for update;
  if not found then
    raise exception 'PEDIDO_NO_ENCONTRADO';
  end if;

  if ped.estado = 'pagado' then
    return 0;
  end if;

  if ped.estado not in ('pendiente', 'expirado', 'cancelado') then
    raise exception 'PEDIDO_NO_CONFIRMABLE';
  end if;

  for it in select * from public.pedido_items where pedido_id = ped.id loop
    if ped.estado = 'pendiente' then
      update public.tramos
         set cantidad_reservada = cantidad_reservada - it.cantidad,
             cantidad_vendida   = cantidad_vendida + it.cantidad
       where id = it.tramo_id;
    else
      update public.tramos
         set cantidad_vendida = cantidad_vendida + it.cantidad
       where id = it.tramo_id
         and cantidad_total - cantidad_vendida - cantidad_reservada >= it.cantidad;
      if not found then
        raise exception 'SIN_STOCK';
      end if;
    end if;

    for i in 1..it.cantidad loop
      insert into public.entradas (pedido_id, evento_id, tramo_id, usuario_id, codigo, qr_semilla)
      values (ped.id, ped.evento_id, it.tramo_id, ped.usuario_id,
              public.generar_codigo_entrada(), encode(gen_random_bytes(32), 'hex'));
      total := total + 1;
    end loop;
  end loop;

  update public.pedidos
     set estado = 'pagado',
         pagado_en = now(),
         stripe_payment_intent_id = coalesce(p_payment_intent_id, stripe_payment_intent_id)
   where id = ped.id;

  return total;
end;
$$;

-- Devuelve el stock reservado de un pedido pendiente.
create or replace function public.liberar_pedido(p_pedido_id uuid, p_estado text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  ped public.pedidos;
  it  public.pedido_items;
begin
  if p_estado not in ('expirado', 'cancelado') then
    raise exception 'ESTADO_INVALIDO';
  end if;

  select * into ped from public.pedidos where id = p_pedido_id for update;
  if not found or ped.estado <> 'pendiente' then
    return false;
  end if;

  for it in select * from public.pedido_items where pedido_id = ped.id loop
    update public.tramos
       set cantidad_reservada = greatest(cantidad_reservada - it.cantidad, 0)
     where id = it.tramo_id;
  end loop;

  update public.pedidos set estado = p_estado where id = ped.id;
  return true;
end;
$$;

create or replace function public.liberar_pedidos_expirados()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  p_id uuid;
  n integer := 0;
begin
  for p_id in
    select id from public.pedidos
     where estado = 'pendiente' and expira_en < now()
     for update skip locked
  loop
    if public.liberar_pedido(p_id, 'expirado') then
      n := n + 1;
    end if;
  end loop;
  return n;
end;
$$;

-- Anula las entradas de un pedido reembolsado. Solo vuelven a la venta
-- las que seguían válidas (las ya usadas no liberan aforo).
create or replace function public.reembolsar_pedido(p_pedido_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  ped public.pedidos;
  n   integer;
begin
  select * into ped from public.pedidos where id = p_pedido_id for update;
  if not found or ped.estado <> 'pagado' then
    raise exception 'PEDIDO_NO_REEMBOLSABLE';
  end if;

  with anuladas as (
    update public.entradas set estado = 'reembolsada'
     where pedido_id = ped.id and estado = 'valida'
    returning tramo_id
  ), por_tramo as (
    select tramo_id, count(*)::integer as cantidad from anuladas group by tramo_id
  ), devueltas as (
    update public.tramos t
       set cantidad_vendida = greatest(t.cantidad_vendida - pt.cantidad, 0)
      from por_tramo pt
     where t.id = pt.tramo_id
    returning pt.cantidad
  )
  select coalesce(sum(cantidad), 0)::integer into n from devueltas;

  update public.pedidos set estado = 'reembolsado' where id = ped.id;
  return n;
end;
$$;

-- Marca una entrada como usada (la firma del QR ya la comprobó el backend)
-- y deja constancia en escaneos.
create or replace function public.validar_entrada(
  p_entrada_id uuid,
  p_evento_id  uuid,
  p_staff_id   uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  ent    public.entradas;
  existe boolean;
  res    text;
begin
  select * into ent from public.entradas where id = p_entrada_id for update;
  existe := found;

  if not existe then
    res := 'invalida';
  elsif ent.evento_id <> p_evento_id then
    res := 'otro_evento';
  elsif ent.estado = 'usada' then
    res := 'ya_usada';
  elsif ent.estado <> 'valida' then
    res := 'anulada';
  else
    update public.entradas
       set estado = 'usada', usada_en = now(), validada_por = p_staff_id
     where id = ent.id;
    res := 'valida';
  end if;

  insert into public.escaneos (evento_id, entrada_id, staff_id, resultado)
  values (p_evento_id, case when existe then p_entrada_id end, p_staff_id, res);

  return res;
end;
$$;

-- Acepta una transferencia: cambia el titular y regenera la semilla del QR
-- para que el QR del remitente deje de valer.
create or replace function public.aceptar_transferencia(p_transferencia_id uuid, p_usuario_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  tr  public.transferencias;
  ent public.entradas;
begin
  select * into tr from public.transferencias where id = p_transferencia_id for update;
  if not found or tr.estado <> 'pendiente' or tr.a_usuario_id <> p_usuario_id then
    raise exception 'TRANSFERENCIA_NO_DISPONIBLE';
  end if;

  select * into ent from public.entradas where id = tr.entrada_id for update;
  if ent.estado <> 'valida' or ent.usuario_id <> tr.de_usuario_id then
    update public.transferencias set estado = 'cancelada', resuelta_en = now() where id = tr.id;
    raise exception 'ENTRADA_NO_TRANSFERIBLE';
  end if;

  update public.entradas
     set usuario_id = p_usuario_id,
         qr_semilla = encode(gen_random_bytes(32), 'hex')
   where id = ent.id;

  update public.transferencias set estado = 'aceptada', resuelta_en = now() where id = tr.id;
  return ent.id;
end;
$$;

-- Cierra los eventos que ya han terminado (job periódico del backend).
create or replace function public.finalizar_eventos_pasados()
returns integer
language sql
security definer
set search_path = public
as $$
  with f as (
    update public.eventos
       set estado = 'finalizado', actualizado_en = now()
     where estado = 'publicado'
       and coalesce(termina_en, inicia_en + interval '12 hours') < now()
    returning 1
  )
  select count(*)::integer from f;
$$;

-- Métricas de un evento para el organizador.
create or replace function public.estadisticas_evento(p_evento_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'vendidas',   (select count(*) from public.entradas where evento_id = p_evento_id and estado in ('valida', 'usada')),
    'validadas',  (select count(*) from public.entradas where evento_id = p_evento_id and estado = 'usada'),
    'aforo',      (select coalesce(sum(cantidad_total), 0) from public.tramos where evento_id = p_evento_id and activo),
    'ingresos_centimos', (select coalesce(sum(subtotal_centimos), 0) from public.pedidos where evento_id = p_evento_id and estado = 'pagado'),
    'pedidos',    (select count(*) from public.pedidos where evento_id = p_evento_id and estado = 'pagado'),
    'por_tramo',  (select coalesce(jsonb_agg(jsonb_build_object(
                     'id', t.id, 'nombre', t.nombre, 'precio_centimos', t.precio_centimos,
                     'vendidas', t.cantidad_vendida, 'reservadas', t.cantidad_reservada, 'total', t.cantidad_total
                   ) order by t.orden, t.creado_en), '[]'::jsonb)
                   from public.tramos t where t.evento_id = p_evento_id),
    'serie',      (select coalesce(jsonb_agg(jsonb_build_object('dia', dia, 'entradas', entradas, 'ingresos_centimos', ingresos) order by dia), '[]'::jsonb)
                   from (
                     select date_trunc('day', p.pagado_en)::date as dia,
                            sum(i.cantidad)::integer as entradas,
                            sum(i.cantidad * i.precio_unitario_centimos)::integer as ingresos
                       from public.pedidos p
                       join public.pedido_items i on i.pedido_id = p.id
                      where p.evento_id = p_evento_id and p.estado = 'pagado'
                      group by 1
                   ) s)
  );
$$;

-- KPIs globales para el panel de administración.
create or replace function public.resumen_plataforma(p_dias integer default 30)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'usuarios',            (select count(*) from public.usuarios),
    'organizadores',       (select count(*) from public.usuarios where rol = 'organizador'),
    'eventos_publicados',  (select count(*) from public.eventos where estado = 'publicado'),
    'entradas_vendidas',   (select count(*) from public.entradas where estado in ('valida', 'usada')),
    'gmv_centimos',        (select coalesce(sum(total_centimos), 0) from public.pedidos where estado = 'pagado'),
    'ingresos_centimos',   (select coalesce(sum(gastos_centimos), 0) from public.pedidos where estado = 'pagado'),
    'reembolsado_centimos',(select coalesce(sum(total_centimos), 0) from public.pedidos where estado = 'reembolsado'),
    'pedidos_hoy',         (select count(*) from public.pedidos where estado = 'pagado' and pagado_en >= date_trunc('day', now())),
    'serie', (
      select coalesce(jsonb_agg(jsonb_build_object('dia', d.dia::date, 'pedidos', coalesce(s.pedidos, 0), 'gmv_centimos', coalesce(s.gmv, 0)) order by d.dia), '[]'::jsonb)
        from generate_series(current_date - (p_dias - 1), current_date, interval '1 day') as d(dia)
        left join (
          select date_trunc('day', pagado_en)::date as dia, count(*)::integer as pedidos, sum(total_centimos)::integer as gmv
            from public.pedidos
           where estado = 'pagado' and pagado_en >= current_date - (p_dias - 1)
           group by 1
        ) s on s.dia = d.dia::date
    ),
    'top_eventos', (
      select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        select e.id, e.titulo, count(en.id)::integer as vendidas
          from public.eventos e
          join public.entradas en on en.evento_id = e.id and en.estado in ('valida', 'usada')
         group by e.id
         order by vendidas desc
         limit 5
      ) t
    )
  );
$$;

-- Solo el backend (service_role) puede ejecutar la lógica de negocio.
revoke all on function public.reservar_pedido(uuid, uuid, jsonb)   from public, anon, authenticated;
revoke all on function public.confirmar_pedido(uuid, text)         from public, anon, authenticated;
revoke all on function public.liberar_pedido(uuid, text)           from public, anon, authenticated;
revoke all on function public.liberar_pedidos_expirados()          from public, anon, authenticated;
revoke all on function public.reembolsar_pedido(uuid)              from public, anon, authenticated;
revoke all on function public.validar_entrada(uuid, uuid, uuid)    from public, anon, authenticated;
revoke all on function public.aceptar_transferencia(uuid, uuid)    from public, anon, authenticated;
revoke all on function public.generar_codigo_entrada()             from public, anon, authenticated;
revoke all on function public.finalizar_eventos_pasados()          from public, anon, authenticated;
revoke all on function public.estadisticas_evento(uuid)            from public, anon, authenticated;
revoke all on function public.resumen_plataforma(integer)          from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Row Level Security: lectura pública mínima, sin escrituras de cliente.
-- ---------------------------------------------------------------------
alter table public.usuarios        enable row level security;
alter table public.eventos         enable row level security;
alter table public.tramos          enable row level security;
alter table public.pedidos         enable row level security;
alter table public.pedido_items    enable row level security;
alter table public.entradas        enable row level security;
alter table public.transferencias  enable row level security;
alter table public.staff_eventos   enable row level security;
alter table public.escaneos        enable row level security;
alter table public.favoritos       enable row level security;
alter table public.resenas         enable row level security;
alter table public.notificaciones  enable row level security;
alter table public.configuracion   enable row level security;
alter table public.auditoria       enable row level security;
alter table public.stripe_eventos  enable row level security;

drop policy if exists "eventos publicados visibles" on public.eventos;
create policy "eventos publicados visibles" on public.eventos
  for select using (estado = 'publicado');

drop policy if exists "tramos de eventos publicados visibles" on public.tramos;
create policy "tramos de eventos publicados visibles" on public.tramos
  for select using (
    activo and exists (select 1 from public.eventos e where e.id = evento_id and e.estado = 'publicado')
  );

drop policy if exists "resenas visibles" on public.resenas;
create policy "resenas visibles" on public.resenas
  for select using (true);

drop policy if exists "perfil propio visible" on public.usuarios;
create policy "perfil propio visible" on public.usuarios
  for select using (auth.uid() = id);
