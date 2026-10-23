-- =====================================================================
-- Tanda 2 · Experiencia de fan
--   11 Reventa oficial entre fans a precio original
--   12 Cola virtual para lanzamientos con mucha demanda
--   13 Registro de fans verificados con sorteo de acceso a preventa
--   15 «Cerca de mí» (coordenadas de recintos)
--   18 Entradas accesibles con acompañante gratuito
--   19 Protección de reembolso opcional al comprar
--   20 Recordatorios automáticos (24 h antes y apertura de puertas)
-- (14 recomendaciones, 16 filtro por fechas y 17 Wallet no necesitan esquema)
-- =====================================================================

-- ---------- Columnas nuevas ----------
alter table public.entradas drop constraint if exists entradas_estado_check;
alter table public.entradas add constraint entradas_estado_check
  check (estado in ('valida', 'usada', 'anulada', 'reembolsada', 'en_venta', 'revendida'));
alter table public.entradas add column if not exists es_acompanante boolean not null default false;

alter table public.tramos
  add column if not exists accesible           boolean not null default false,
  add column if not exists incluye_acompanante boolean not null default false;

alter table public.pedidos
  add column if not exists es_reventa      boolean not null default false,
  add column if not exists seguro_centimos integer not null default 0 check (seguro_centimos >= 0);

alter table public.configuracion
  add column if not exists seguro_porcentaje numeric(5, 2) not null default 7 check (seguro_porcentaje between 0 and 30);

alter table public.eventos
  add column if not exists cola_activa         boolean not null default false,
  add column if not exists cola_ritmo          integer not null default 50 check (cola_ritmo between 1 and 10000),
  add column if not exists registro_fan_activo boolean not null default false;

alter table public.recintos
  add column if not exists lat double precision check (lat between -90 and 90),
  add column if not exists lng double precision check (lng between -180 and 180);

-- ---------- Reventa ----------
create table if not exists public.reventas (
  id                     uuid primary key default gen_random_uuid(),
  entrada_id             uuid not null references public.entradas(id),
  vendedor_id            uuid not null references public.usuarios(id),
  evento_id              uuid not null references public.eventos(id),
  tramo_id               uuid not null references public.tramos(id),
  -- Precio original de la entrada: la reventa nunca puede ser más cara.
  precio_centimos        integer not null check (precio_centimos >= 0),
  estado                 text not null default 'activa' check (estado in ('activa', 'reservada', 'vendida', 'cancelada')),
  pedido_id              uuid references public.pedidos(id),
  creado_en              timestamptz not null default now(),
  vendida_en             timestamptz,
  reembolso_vendedor_en  timestamptz
);
create unique index if not exists reventas_una_viva on public.reventas(entrada_id) where estado in ('activa', 'reservada');
create index if not exists reventas_tramo_activas on public.reventas(tramo_id, creado_en) where estado = 'activa';
create index if not exists reventas_pedido_idx on public.reventas(pedido_id);

-- ---------- Cola virtual ----------
create table if not exists public.cola_turnos (
  evento_id   uuid not null references public.eventos(id) on delete cascade,
  usuario_id  uuid not null references public.usuarios(id) on delete cascade,
  posicion    bigint generated always as identity,
  entrado_en  timestamptz not null default now(),
  admitido_en timestamptz,
  expira_en   timestamptz,
  primary key (evento_id, usuario_id)
);
create index if not exists cola_espera_idx on public.cola_turnos(evento_id, posicion) where admitido_en is null;

-- ---------- Fans verificados ----------
create table if not exists public.registros_fan (
  evento_id  uuid not null references public.eventos(id) on delete cascade,
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  estado     text not null default 'inscrito' check (estado in ('inscrito', 'seleccionado', 'no_seleccionado')),
  creado_en  timestamptz not null default now(),
  primary key (evento_id, usuario_id)
);

-- ---------- Protección de reembolso ----------
create table if not exists public.reclamaciones_seguro (
  id           uuid primary key default gen_random_uuid(),
  pedido_id    uuid not null unique references public.pedidos(id),
  usuario_id   uuid not null references public.usuarios(id),
  motivo       text not null check (char_length(motivo) between 10 and 1000),
  estado       text not null default 'pendiente' check (estado in ('pendiente', 'aprobada', 'rechazada')),
  respuesta    text,
  creado_en    timestamptz not null default now(),
  resuelta_en  timestamptz,
  resuelta_por uuid references public.usuarios(id)
);

-- ---------- Recordatorios ----------
create table if not exists public.recordatorios_enviados (
  evento_id  uuid not null references public.eventos(id) on delete cascade,
  tipo       text not null check (tipo in ('24h', 'puertas')),
  enviado_en timestamptz not null default now(),
  primary key (evento_id, tipo)
);

alter table public.reventas               enable row level security;
alter table public.cola_turnos            enable row level security;
alter table public.registros_fan          enable row level security;
alter table public.reclamaciones_seguro   enable row level security;
alter table public.recordatorios_enviados enable row level security;

-- ---------- Catálogo: añade reventas disponibles ----------
drop view if exists public.catalogo_eventos;
create view public.catalogo_eventos as
select
  e.id, e.organizador_id, e.titulo, e.descripcion, e.categoria,
  coalesce(r.nombre, e.recinto)       as recinto,
  coalesce(r.direccion, e.direccion)  as direccion,
  coalesce(r.ciudad, e.ciudad)        as ciudad,
  e.recinto_id, e.imagen_url, e.inicia_en, e.termina_en, e.puertas_abren_en,
  e.edad_minima, e.politica_devolucion, e.destacado, e.max_por_usuario, e.creado_en,
  e.cola_activa, e.registro_fan_activo, r.lat, r.lng,
  coalesce(nullif(u.nombre_artistico, ''), u.nombre)                                           as organizador_nombre,
  coalesce(min(t.precio_centimos) filter (where t.activo and t.codigo_acceso is null), 0)      as precio_desde_centimos,
  public.gastos_unitarios(coalesce(min(t.precio_centimos) filter (where t.activo and t.codigo_acceso is null), 0))
    + coalesce(min(t.precio_centimos) filter (where t.activo and t.codigo_acceso is null), 0) as precio_desde_total_centimos,
  coalesce(sum(t.cantidad_total - t.cantidad_vendida - t.cantidad_reservada)
           filter (where t.activo and t.codigo_acceso is null), 0)::integer                    as disponibles,
  coalesce(sum(t.cantidad_total) filter (where t.activo and t.codigo_acceso is null), 0)::integer as aforo,
  bool_or(t.activo and t.codigo_acceso is not null)                                            as tiene_preventa,
  bool_or(t.activo and t.accesible)                                                            as tiene_accesibles,
  (select count(*) from public.reventas rv where rv.evento_id = e.id and rv.estado = 'activa')::integer as reventa_disponibles,
  coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'nombre', a.nombre, 'imagen_url', a.imagen_url) order by ea.orden)
              from public.evento_artistas ea join public.artistas a on a.id = ea.artista_id
             where ea.evento_id = e.id), '[]'::jsonb)                                          as artistas
from public.eventos e
join public.usuarios u on u.id = e.organizador_id
left join public.recintos r on r.id = e.recinto_id
left join public.tramos t on t.evento_id = e.id
where e.estado = 'publicado'
group by e.id, u.nombre_artistico, u.nombre, r.id;

grant select on public.catalogo_eventos to anon, authenticated;

-- ---------- Reserva: cola, fans verificados y protección de reembolso ----------
drop function if exists public.reservar_pedido(uuid, uuid, jsonb, text, text);

-- Errores nuevos: COLA_TURNO.
create or replace function public.reservar_pedido(
  p_usuario_id    uuid,
  p_evento_id     uuid,
  p_items         jsonb,
  p_codigo        text default null,
  p_codigo_acceso text default null,
  p_seguro        boolean default false
)
returns public.pedidos
language plpgsql
security definer
set search_path = public
as $$
declare
  cfg         public.configuracion;
  ev          public.eventos;
  item        jsonb;
  tr          public.tramos;
  promo       public.codigos_promocionales;
  cant        integer;
  subtotal    integer := 0;
  aplicable   integer := 0;
  descuento   integer := 0;
  n_entradas  integer := 0;
  ya_tiene    integer := 0;
  gastos      integer := 0;
  seguro      integer := 0;
  base        integer;
  fan_ok      boolean;
  pedido      public.pedidos;
begin
  select * into cfg from public.configuracion where id = 1;

  select * into ev from public.eventos where id = p_evento_id;
  if not found or ev.estado <> 'publicado' or ev.inicia_en < now() then
    raise exception 'EVENTO_NO_DISPONIBLE';
  end if;

  -- Cola virtual: solo compra quien tiene turno admitido y vigente.
  if ev.cola_activa and not exists (
    select 1 from public.cola_turnos
     where evento_id = p_evento_id and usuario_id = p_usuario_id and admitido_en is not null and expira_en > now()
  ) then
    raise exception 'COLA_TURNO';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'TRAMO_INVALIDO';
  end if;

  fan_ok := exists (select 1 from public.registros_fan where evento_id = p_evento_id and usuario_id = p_usuario_id and estado = 'seleccionado');

  if p_codigo is not null and btrim(p_codigo) <> '' then
    select * into promo from public.codigos_promocionales
     where evento_id = p_evento_id and codigo = upper(btrim(p_codigo)) and activo
       and (valido_desde is null or valido_desde <= now())
       and (valido_hasta is null or valido_hasta > now())
       and (usos_max is null or usos < usos_max)
     for update;
    if not found then
      raise exception 'CODIGO_INVALIDO';
    end if;
  end if;

  insert into public.pedidos (usuario_id, evento_id, subtotal_centimos, gastos_centimos, total_centimos, moneda, expira_en)
  values (p_usuario_id, p_evento_id, 0, 0, 0, cfg.moneda, now() + make_interval(mins => cfg.minutos_reserva))
  returning * into pedido;

  for item in select * from jsonb_array_elements(p_items) loop
    cant := (item ->> 'cantidad')::integer;
    if cant is null or cant <= 0 then
      raise exception 'TRAMO_INVALIDO';
    end if;

    -- Preventa: con el código o siendo fan verificado seleccionado.
    select * into tr from public.tramos where id = (item ->> 'tramo_id')::uuid and evento_id = p_evento_id;
    if found and tr.codigo_acceso is not null and not fan_ok
       and upper(btrim(coalesce(p_codigo_acceso, ''))) <> tr.codigo_acceso then
      raise exception 'PREVENTA_CODIGO';
    end if;

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
    if promo.id is not null and (promo.tramo_ids is null or tr.id = any (promo.tramo_ids)) then
      aplicable := aplicable + tr.precio_centimos * cant;
    end if;
  end loop;

  if ev.max_por_usuario is not null then
    select count(*) into ya_tiene from public.entradas
     where evento_id = p_evento_id and usuario_id = p_usuario_id and estado in ('valida', 'usada', 'en_venta') and not es_acompanante;
    select ya_tiene + coalesce(sum(i.cantidad), 0) into ya_tiene
      from public.pedidos p join public.pedido_items i on i.pedido_id = p.id
     where p.evento_id = p_evento_id and p.usuario_id = p_usuario_id and p.estado = 'pendiente' and p.id <> pedido.id;
    if ya_tiene + n_entradas > ev.max_por_usuario then
      raise exception 'LIMITE_POR_USUARIO';
    end if;
  end if;

  if promo.id is not null then
    if aplicable = 0 then
      raise exception 'CODIGO_INVALIDO';
    end if;
    descuento := case promo.tipo
                   when 'porcentaje' then round(aplicable * promo.valor / 100.0)::integer
                   else least(promo.valor, aplicable)
                 end;
    update public.codigos_promocionales set usos = usos + 1 where id = promo.id;
  end if;

  base := subtotal - descuento;
  if base > 0 then
    gastos := round(base * cfg.gastos_gestion_porcentaje / 100.0)::integer
              + cfg.gastos_gestion_fijo_centimos * n_entradas;
    if p_seguro then
      seguro := round(base * cfg.seguro_porcentaje / 100.0)::integer;
    end if;
  end if;

  update public.pedidos
     set subtotal_centimos     = subtotal,
         descuento_centimos    = descuento,
         codigo_promocional_id = promo.id,
         gastos_centimos       = gastos,
         seguro_centimos       = seguro,
         total_centimos        = base + gastos + seguro
   where id = pedido.id
  returning * into pedido;

  return pedido;
end;
$$;

-- ---------- Comprar en reventa ----------
-- Toma las reventas más antiguas del tipo de entrada y crea un pedido pendiente.
create or replace function public.reservar_reventa(
  p_usuario_id uuid,
  p_evento_id  uuid,
  p_tramo_id   uuid,
  p_cantidad   integer,
  p_seguro     boolean default false
)
returns public.pedidos
language plpgsql
security definer
set search_path = public
as $$
declare
  cfg      public.configuracion;
  ev       public.eventos;
  ids      uuid[];
  precio   integer;
  ya_tiene integer;
  base     integer;
  gastos   integer := 0;
  seguro   integer := 0;
  pedido   public.pedidos;
begin
  select * into cfg from public.configuracion where id = 1;
  select * into ev from public.eventos where id = p_evento_id;
  if not found or ev.estado <> 'publicado' or ev.inicia_en < now() then
    raise exception 'EVENTO_NO_DISPONIBLE';
  end if;
  if p_cantidad is null or p_cantidad < 1 or p_cantidad > 10 then
    raise exception 'LIMITE_POR_PEDIDO';
  end if;

  select array_agg(id), max(precio_centimos) into ids, precio from (
    select id, precio_centimos from public.reventas
     where tramo_id = p_tramo_id and evento_id = p_evento_id and estado = 'activa' and vendedor_id <> p_usuario_id
     order by creado_en
     limit p_cantidad
     for update skip locked
  ) r;
  if coalesce(array_length(ids, 1), 0) < p_cantidad then
    raise exception 'SIN_STOCK';
  end if;

  if ev.max_por_usuario is not null then
    select count(*) into ya_tiene from public.entradas
     where evento_id = p_evento_id and usuario_id = p_usuario_id and estado in ('valida', 'usada', 'en_venta') and not es_acompanante;
    if ya_tiene + p_cantidad > ev.max_por_usuario then
      raise exception 'LIMITE_POR_USUARIO';
    end if;
  end if;

  -- Todas las reventas de un mismo tipo de entrada tienen el mismo precio original.
  base := precio * p_cantidad;
  if base > 0 then
    gastos := round(base * cfg.gastos_gestion_porcentaje / 100.0)::integer + cfg.gastos_gestion_fijo_centimos * p_cantidad;
    if p_seguro then
      seguro := round(base * cfg.seguro_porcentaje / 100.0)::integer;
    end if;
  end if;

  insert into public.pedidos (usuario_id, evento_id, es_reventa, subtotal_centimos, gastos_centimos, seguro_centimos, total_centimos, moneda, expira_en)
  values (p_usuario_id, p_evento_id, true, base, gastos, seguro, base + gastos + seguro, cfg.moneda, now() + make_interval(mins => cfg.minutos_reserva))
  returning * into pedido;

  insert into public.pedido_items (pedido_id, tramo_id, cantidad, precio_unitario_centimos)
  values (pedido.id, p_tramo_id, p_cantidad, precio);

  update public.reventas set estado = 'reservada', pedido_id = pedido.id where id = any (ids);
  return pedido;
end;
$$;

-- ---------- Confirmar: reventas y acompañantes ----------
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
  tr    public.tramos;
  rv    public.reventas;
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

  if ped.es_reventa then
    -- Si el pago llegó tarde y las reventas ya no están reservadas para este pedido, se reembolsa.
    select count(*) into i from public.reventas where pedido_id = ped.id and estado = 'reservada';
    if i <> (select coalesce(sum(cantidad), 0) from public.pedido_items where pedido_id = ped.id) then
      raise exception 'SIN_STOCK';
    end if;
    for rv in select * from public.reventas where pedido_id = ped.id and estado = 'reservada' for update loop
      update public.entradas set estado = 'revendida' where id = rv.entrada_id;
      insert into public.entradas (pedido_id, evento_id, tramo_id, usuario_id, codigo, qr_semilla)
      values (ped.id, ped.evento_id, rv.tramo_id, ped.usuario_id, public.generar_codigo_entrada(), encode(gen_random_bytes(32), 'hex'));
      update public.reventas set estado = 'vendida', vendida_en = now() where id = rv.id;
      total := total + 1;
    end loop;
  else
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

      select * into tr from public.tramos where id = it.tramo_id;
      for i in 1..it.cantidad loop
        insert into public.entradas (pedido_id, evento_id, tramo_id, usuario_id, codigo, qr_semilla)
        values (ped.id, ped.evento_id, it.tramo_id, ped.usuario_id, public.generar_codigo_entrada(), encode(gen_random_bytes(32), 'hex'));
        total := total + 1;
        -- Entrada accesible: acompañante gratis.
        if tr.incluye_acompanante then
          insert into public.entradas (pedido_id, evento_id, tramo_id, usuario_id, codigo, qr_semilla, es_acompanante)
          values (ped.id, ped.evento_id, it.tramo_id, ped.usuario_id, public.generar_codigo_entrada(), encode(gen_random_bytes(32), 'hex'), true);
          total := total + 1;
        end if;
      end loop;
    end loop;
  end if;

  update public.pedidos
     set estado = 'pagado', pagado_en = now(),
         stripe_payment_intent_id = coalesce(p_payment_intent_id, stripe_payment_intent_id)
   where id = ped.id;
  return total;
end;
$$;

-- ---------- Liberar: reventas vuelven a estar disponibles ----------
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

  if ped.es_reventa then
    update public.reventas set estado = 'activa', pedido_id = null where pedido_id = ped.id and estado = 'reservada';
  else
    for it in select * from public.pedido_items where pedido_id = ped.id loop
      update public.tramos set cantidad_reservada = greatest(cantidad_reservada - it.cantidad, 0) where id = it.tramo_id;
    end loop;
  end if;

  if ped.codigo_promocional_id is not null then
    update public.codigos_promocionales set usos = greatest(usos - 1, 0) where id = ped.codigo_promocional_id;
  end if;
  update public.pedidos set estado = p_estado where id = ped.id;
  return true;
end;
$$;

-- ---------- Reembolso: los acompañantes no ocupan aforo ----------
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

  -- Si alguna entrada estaba en reventa, se retira.
  update public.reventas set estado = 'cancelada'
   where estado = 'activa' and entrada_id in (select id from public.entradas where pedido_id = ped.id);

  with anuladas as (
    update public.entradas set estado = 'reembolsada'
     where pedido_id = ped.id and estado in ('valida', 'en_venta')
    returning tramo_id, es_acompanante
  ), por_tramo as (
    select tramo_id, count(*) filter (where not es_acompanante)::integer as cantidad, count(*)::integer as todas
      from anuladas group by tramo_id
  ), devueltas as (
    update public.tramos t
       set cantidad_vendida = greatest(t.cantidad_vendida - pt.cantidad, 0)
      from por_tramo pt
     where t.id = pt.tramo_id
    returning pt.todas
  )
  select coalesce(sum(todas), 0)::integer into n from devueltas;

  update public.pedidos set estado = 'reembolsado' where id = ped.id;
  return n;
end;
$$;

-- ---------- Poner y quitar de la reventa ----------
-- Solo entradas compradas por uno mismo (el reembolso vuelve a quien pagó) y no acompañantes.
create or replace function public.publicar_reventa(p_entrada_id uuid, p_usuario_id uuid)
returns public.reventas
language plpgsql
security definer
set search_path = public
as $$
declare
  ent public.entradas;
  ped public.pedidos;
  ev  public.eventos;
  rv  public.reventas;
  pr  integer;
begin
  select * into ent from public.entradas where id = p_entrada_id for update;
  if not found or ent.usuario_id <> p_usuario_id then
    raise exception 'REVENTA_NO_PERMITIDA';
  end if;
  select * into ped from public.pedidos where id = ent.pedido_id;
  select * into ev from public.eventos where id = ent.evento_id;
  if ent.estado <> 'valida' or ent.es_acompanante or ped.usuario_id <> p_usuario_id
     or ev.estado <> 'publicado' or ev.inicia_en < now()
     or exists (select 1 from public.transferencias where entrada_id = ent.id and estado = 'pendiente') then
    raise exception 'REVENTA_NO_PERMITIDA';
  end if;

  select precio_unitario_centimos into pr from public.pedido_items where pedido_id = ped.id and tramo_id = ent.tramo_id limit 1;

  insert into public.reventas (entrada_id, vendedor_id, evento_id, tramo_id, precio_centimos)
  values (ent.id, p_usuario_id, ent.evento_id, ent.tramo_id, pr)
  returning * into rv;

  -- El QR anterior deja de valer mientras está a la venta.
  update public.entradas set estado = 'en_venta', qr_semilla = encode(gen_random_bytes(32), 'hex') where id = ent.id;
  return rv;
end;
$$;

create or replace function public.cancelar_reventa(p_entrada_id uuid, p_usuario_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  rv public.reventas;
begin
  select * into rv from public.reventas where entrada_id = p_entrada_id and estado = 'activa' for update;
  if not found or rv.vendedor_id <> p_usuario_id then
    raise exception 'REVENTA_NO_CANCELABLE';
  end if;
  update public.reventas set estado = 'cancelada' where id = rv.id;
  update public.entradas set estado = 'valida' where id = rv.entrada_id;
  return true;
end;
$$;

-- ---------- Cola virtual ----------
-- Da paso a los siguientes de cada cola según su ritmo por minuto (15 min para comprar).
create or replace function public.admitir_cola()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  ev record;
  n  integer := 0;
  k  integer;
begin
  for ev in select id, cola_ritmo from public.eventos where cola_activa and estado = 'publicado' loop
    with siguientes as (
      select evento_id, usuario_id from public.cola_turnos
       where evento_id = ev.id and admitido_en is null
       order by posicion
       limit ev.cola_ritmo
       for update skip locked
    )
    update public.cola_turnos c set admitido_en = now(), expira_en = now() + interval '15 minutes'
      from siguientes s where c.evento_id = s.evento_id and c.usuario_id = s.usuario_id;
    get diagnostics k = row_count;
    n := n + k;
  end loop;
  return n;
end;
$$;

-- ---------- Sorteo de fans verificados ----------
create or replace function public.sortear_fans(p_evento_id uuid, p_plazas integer)
returns setof uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with elegidos as (
    select usuario_id from public.registros_fan
     where evento_id = p_evento_id and estado = 'inscrito'
     order by random()
     limit p_plazas
  ), marcados as (
    update public.registros_fan r set estado = 'seleccionado'
      from elegidos e where r.evento_id = p_evento_id and r.usuario_id = e.usuario_id
    returning r.usuario_id
  )
  select usuario_id from marcados;

  update public.registros_fan set estado = 'no_seleccionado' where evento_id = p_evento_id and estado = 'inscrito';
end;
$$;

-- ---------- Cerca de mí ----------
create or replace function public.eventos_cerca(p_lat double precision, p_lng double precision, p_km double precision)
returns table (id uuid, distancia_km double precision)
language sql
stable
security definer
set search_path = public
as $$
  select id, d from (
    select c.id,
           6371 * 2 * asin(sqrt(power(sin(radians(c.lat - p_lat) / 2), 2)
             + cos(radians(p_lat)) * cos(radians(c.lat)) * power(sin(radians(c.lng - p_lng) / 2), 2))) as d
      from public.catalogo_eventos c
     where c.lat is not null and c.inicia_en > now()
  ) x
  where d <= p_km
  order by d;
$$;

-- ---------- Recordatorios ----------
-- Devuelve a quién avisar (titulares de entradas válidas) y marca el recordatorio como enviado.
create or replace function public.recordatorios_pendientes()
returns table (usuario_id uuid, evento_id uuid, titulo text, tipo text, inicia_en timestamptz)
language sql
security definer
set search_path = public
as $$
  with candidatos as (
    select e.id, e.titulo, e.inicia_en, '24h'::text as tipo from public.eventos e
     where e.estado = 'publicado' and e.inicia_en > now() and e.inicia_en <= now() + interval '24 hours'
    union all
    select e.id, e.titulo, e.inicia_en, 'puertas' from public.eventos e
     where e.estado = 'publicado' and e.puertas_abren_en <= now() and e.inicia_en > now() - interval '1 hour'
  ), nuevos as (
    insert into public.recordatorios_enviados (evento_id, tipo)
    select id, tipo from candidatos
    on conflict do nothing
    returning evento_id, tipo
  )
  select distinct en.usuario_id, c.id, c.titulo, c.tipo, c.inicia_en
    from nuevos n
    join candidatos c on c.id = n.evento_id and c.tipo = n.tipo
    join public.entradas en on en.evento_id = c.id and en.estado = 'valida';
$$;

revoke all on function public.reservar_pedido(uuid, uuid, jsonb, text, text, boolean)  from public, anon, authenticated;
revoke all on function public.reservar_reventa(uuid, uuid, uuid, integer, boolean)     from public, anon, authenticated;
revoke all on function public.confirmar_pedido(uuid, text)                             from public, anon, authenticated;
revoke all on function public.liberar_pedido(uuid, text)                               from public, anon, authenticated;
revoke all on function public.reembolsar_pedido(uuid)                                  from public, anon, authenticated;
revoke all on function public.publicar_reventa(uuid, uuid)                             from public, anon, authenticated;
revoke all on function public.cancelar_reventa(uuid, uuid)                             from public, anon, authenticated;
revoke all on function public.admitir_cola()                                           from public, anon, authenticated;
revoke all on function public.sortear_fans(uuid, integer)                              from public, anon, authenticated;
revoke all on function public.eventos_cerca(double precision, double precision, double precision) from public, anon, authenticated;
revoke all on function public.recordatorios_pendientes()                               from public, anon, authenticated;
