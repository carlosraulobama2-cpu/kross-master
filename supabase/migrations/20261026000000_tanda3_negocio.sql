-- =====================================================================
-- Tanda 3 · Organizador y negocio
--   21 Mapa de asientos numerados
--   22 Mejor sitio disponible (butacas juntas, centradas y delante)
--   23 Extras: parking, merchandising, paquetes VIP
--   24 Invitaciones gratuitas con cupo
--   25 Estadísticas por canal (y exportación CSV desde la API)
--   26 Venta en taquilla
--   27 Aplazamientos con plazo de reembolso
--   28 Fases de venta automáticas
--   29 Centro de ayuda y consultas de soporte
-- (30 idiomas es solo de la app)
-- =====================================================================

-- ---------- Columnas nuevas ----------
alter table public.tramos
  add column if not exists numerado         boolean not null default false,
  add column if not exists fase_anterior_id uuid references public.tramos(id) on delete set null;

alter table public.pedidos
  add column if not exists canal          text not null default 'app' check (canal in ('app', 'taquilla', 'invitacion', 'reventa')),
  add column if not exists extras_centimos integer not null default 0 check (extras_centimos >= 0),
  add column if not exists metodo_pago    text check (metodo_pago in ('tarjeta', 'efectivo', 'bizum', 'gratis')),
  add column if not exists vendido_por    uuid references public.usuarios(id);

alter table public.entradas
  add column if not exists titular_nombre text;

alter table public.eventos
  add column if not exists cupo_invitaciones            integer not null default 0 check (cupo_invitaciones >= 0),
  add column if not exists fecha_original               timestamptz,
  add column if not exists reembolso_aplazamiento_hasta timestamptz;

update public.pedidos set canal = 'reventa' where es_reventa and canal = 'app';

-- ---------- Asientos ----------
create table if not exists public.asientos (
  id         uuid primary key default gen_random_uuid(),
  evento_id  uuid not null references public.eventos(id) on delete cascade,
  tramo_id   uuid not null references public.tramos(id) on delete cascade,
  seccion    text not null default '',
  fila       text not null,
  orden_fila integer not null,
  numero     integer not null,
  estado     text not null default 'libre' check (estado in ('libre', 'reservado', 'vendido', 'bloqueado')),
  pedido_id  uuid references public.pedidos(id),
  entrada_id uuid references public.entradas(id),
  unique (tramo_id, seccion, fila, numero)
);
create index if not exists asientos_tramo_estado_idx on public.asientos(tramo_id, estado);
create index if not exists asientos_pedido_idx on public.asientos(pedido_id);
create index if not exists asientos_entrada_idx on public.asientos(entrada_id);

alter table public.entradas add column if not exists asiento_id uuid references public.asientos(id);

-- ---------- Extras ----------
create table if not exists public.extras (
  id              uuid primary key default gen_random_uuid(),
  evento_id       uuid not null references public.eventos(id) on delete cascade,
  nombre          text not null check (char_length(nombre) between 2 and 60),
  descripcion     text check (char_length(descripcion) <= 200),
  tipo            text not null default 'otro' check (tipo in ('parking', 'merch', 'vip', 'comida', 'otro')),
  precio_centimos integer not null check (precio_centimos >= 0),
  stock_total     integer not null check (stock_total > 0),
  stock_vendido   integer not null default 0 check (stock_vendido >= 0),
  stock_reservado integer not null default 0 check (stock_reservado >= 0),
  max_por_pedido  integer not null default 4 check (max_por_pedido between 1 and 20),
  activo          boolean not null default true,
  creado_en       timestamptz not null default now(),
  check (stock_vendido + stock_reservado <= stock_total)
);
create index if not exists extras_evento_idx on public.extras(evento_id);

create table if not exists public.pedido_extras (
  pedido_id                uuid not null references public.pedidos(id) on delete cascade,
  extra_id                 uuid not null references public.extras(id),
  cantidad                 integer not null check (cantidad > 0),
  precio_unitario_centimos integer not null check (precio_unitario_centimos >= 0),
  codigo                   text not null default public.generar_codigo_entrada(),
  canjeado_en              timestamptz,
  primary key (pedido_id, extra_id)
);

-- ---------- Ayuda ----------
create table if not exists public.faqs (
  id        uuid primary key default gen_random_uuid(),
  categoria text not null default 'General',
  pregunta  text not null check (char_length(pregunta) between 5 and 200),
  respuesta text not null check (char_length(respuesta) between 5 and 3000),
  orden     integer not null default 0,
  activo    boolean not null default true,
  creado_en timestamptz not null default now()
);

create table if not exists public.consultas_soporte (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid references public.usuarios(id) on delete set null,
  email       text not null,
  asunto      text not null check (char_length(asunto) between 3 and 120),
  mensaje     text not null check (char_length(mensaje) between 10 and 3000),
  pedido_id   uuid references public.pedidos(id),
  estado      text not null default 'abierta' check (estado in ('abierta', 'respondida', 'cerrada')),
  respuesta   text,
  creado_en   timestamptz not null default now(),
  respondida_en timestamptz
);
create index if not exists consultas_estado_idx on public.consultas_soporte(estado, creado_en desc);

alter table public.asientos          enable row level security;
alter table public.extras            enable row level security;
alter table public.pedido_extras     enable row level security;
alter table public.faqs              enable row level security;
alter table public.consultas_soporte enable row level security;

drop policy if exists "faqs visibles" on public.faqs;
create policy "faqs visibles" on public.faqs for select using (activo);

-- ---------- Generar plano de asientos ----------
-- Filas A, B, C… con N asientos cada una. Solo si el tramo no tiene ventas.
create or replace function public.generar_asientos(p_tramo_id uuid, p_filas integer, p_por_fila integer, p_seccion text default '')
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  tr public.tramos;
  f  integer;
  n  integer;
  letras constant text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
begin
  if p_filas not between 1 and 60 or p_por_fila not between 1 and 100 then
    raise exception 'PLANO_INVALIDO';
  end if;
  select * into tr from public.tramos where id = p_tramo_id for update;
  if not found or tr.cantidad_vendida + tr.cantidad_reservada > 0 then
    raise exception 'PLANO_CON_VENTAS';
  end if;

  delete from public.asientos where tramo_id = p_tramo_id;
  for f in 1..p_filas loop
    for n in 1..p_por_fila loop
      insert into public.asientos (evento_id, tramo_id, seccion, fila, orden_fila, numero)
      values (tr.evento_id, p_tramo_id, coalesce(p_seccion, ''),
              case when f <= 26 then substr(letras, f, 1) else substr(letras, (f - 1) / 26, 1) || substr(letras, ((f - 1) % 26) + 1, 1) end,
              f, n);
    end loop;
  end loop;

  update public.tramos set numerado = true, cantidad_total = p_filas * p_por_fila where id = p_tramo_id;
  return p_filas * p_por_fila;
end;
$$;

-- ---------- Mejor sitio disponible ----------
-- N butacas juntas en la fila más cercana al escenario, lo más centradas posible.
-- Si no hay N juntas, las N mejores sueltas.
create or replace function public.mejores_asientos(p_tramo_id uuid, p_n integer)
returns uuid[]
language sql
stable
security definer
set search_path = public
as $$
  with libres as (
    select id, seccion, fila, orden_fila, numero,
           numero - row_number() over (partition by seccion, fila order by numero) as grupo
      from public.asientos where tramo_id = p_tramo_id and estado = 'libre'
  ), centro as (
    select seccion, fila, (max(numero) + min(numero)) / 2.0 as c from public.asientos where tramo_id = p_tramo_id group by seccion, fila
  ), tramos_libres as (
    select seccion, fila, orden_fila, min(numero) as ini, max(numero) as fin
      from libres group by seccion, fila, orden_fila, grupo having count(*) >= p_n
  ), candidatos as (
    select t.seccion, t.fila, t.orden_fila, s.inicio, abs(s.inicio + (p_n - 1) / 2.0 - c.c) as dist
      from tramos_libres t
      join centro c on c.seccion = t.seccion and c.fila = t.fila
      cross join lateral generate_series(t.ini, t.fin - p_n + 1) as s(inicio)
  ), mejor as (
    select * from candidatos order by orden_fila, dist limit 1
  ), juntos as (
    select array_agg(a.id order by a.numero) as ids
      from public.asientos a join mejor m on a.seccion = m.seccion and a.fila = m.fila
     where a.tramo_id = p_tramo_id and a.numero between m.inicio and m.inicio + p_n - 1
  ), sueltos as (
    select array_agg(id) as ids from (
      select l.id from libres l join centro c on c.seccion = l.seccion and c.fila = l.fila
       order by l.orden_fila, abs(l.numero - c.c) limit p_n
    ) x
  )
  select coalesce((select ids from juntos), case when (select count(*) from libres) >= p_n then (select ids from sueltos) end);
$$;

-- ---------- Reserva completa ----------
drop function if exists public.reservar_pedido(uuid, uuid, jsonb, text, text, boolean);

-- p_items: [{"tramo_id", "cantidad", "asientos": [uuid…] (opcional)}]
-- p_extras: [{"extra_id", "cantidad"}]
-- p_canal: 'app' | 'taquilla' | 'invitacion'
-- Errores nuevos: ASIENTO_OCUPADO, FASE_NO_ABIERTA, EXTRA_NO_DISPONIBLE, CUPO_INVITACIONES.
create or replace function public.reservar_pedido(
  p_usuario_id    uuid,
  p_evento_id     uuid,
  p_items         jsonb,
  p_codigo        text default null,
  p_codigo_acceso text default null,
  p_seguro        boolean default false,
  p_extras        jsonb default '[]'::jsonb,
  p_canal         text default 'app',
  p_vendido_por   uuid default null
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
  ant         public.tramos;
  ex          public.extras;
  promo       public.codigos_promocionales;
  cant        integer;
  ids         uuid[];
  k           integer;
  precio_u    integer;
  subtotal    integer := 0;
  aplicable   integer := 0;
  descuento   integer := 0;
  extras_tot  integer := 0;
  n_entradas  integer := 0;
  ya_tiene    integer := 0;
  gastos      integer := 0;
  seguro      integer := 0;
  base        integer;
  fan_ok      boolean;
  app         boolean := p_canal = 'app';
  pedido      public.pedidos;
begin
  if p_canal not in ('app', 'taquilla', 'invitacion') then
    raise exception 'CANAL_INVALIDO';
  end if;
  select * into cfg from public.configuracion where id = 1;

  select * into ev from public.eventos where id = p_evento_id;
  -- La taquilla puede vender hasta que acaba el evento; online, hasta que empieza.
  if not found or ev.estado <> 'publicado'
     or (app and ev.inicia_en < now())
     or (not app and coalesce(ev.termina_en, ev.inicia_en + interval '12 hours') < now()) then
    raise exception 'EVENTO_NO_DISPONIBLE';
  end if;

  if app and ev.cola_activa and not exists (
    select 1 from public.cola_turnos
     where evento_id = p_evento_id and usuario_id = p_usuario_id and admitido_en is not null and expira_en > now()
  ) then
    raise exception 'COLA_TURNO';
  end if;

  if jsonb_typeof(p_items) <> 'array' or (jsonb_array_length(p_items) = 0 and jsonb_array_length(coalesce(p_extras, '[]')) = 0) then
    raise exception 'TRAMO_INVALIDO';
  end if;

  fan_ok := exists (select 1 from public.registros_fan where evento_id = p_evento_id and usuario_id = p_usuario_id and estado = 'seleccionado');

  if app and p_codigo is not null and btrim(p_codigo) <> '' then
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

  insert into public.pedidos (usuario_id, evento_id, subtotal_centimos, gastos_centimos, total_centimos, moneda, expira_en, canal, vendido_por)
  values (p_usuario_id, p_evento_id, 0, 0, 0, cfg.moneda, now() + make_interval(mins => cfg.minutos_reserva), p_canal, p_vendido_por)
  returning * into pedido;

  for item in select * from jsonb_array_elements(p_items) loop
    cant := (item ->> 'cantidad')::integer;
    if cant is null or cant <= 0 then
      raise exception 'TRAMO_INVALIDO';
    end if;

    select * into tr from public.tramos where id = (item ->> 'tramo_id')::uuid and evento_id = p_evento_id;
    if not found or not tr.activo then
      raise exception 'TRAMO_INVALIDO';
    end if;
    if app and tr.codigo_acceso is not null and not fan_ok
       and upper(btrim(coalesce(p_codigo_acceso, ''))) <> tr.codigo_acceso then
      raise exception 'PREVENTA_CODIGO';
    end if;
    -- Fases: este tramo abre cuando se agota el anterior.
    if tr.fase_anterior_id is not null then
      select * into ant from public.tramos where id = tr.fase_anterior_id;
      if found and ant.activo and ant.cantidad_total - ant.cantidad_vendida - ant.cantidad_reservada > 0 then
        raise exception 'FASE_NO_ABIERTA';
      end if;
    end if;

    update public.tramos t
       set cantidad_reservada = t.cantidad_reservada + cant
     where t.id = tr.id
       and (not app or (
             (t.venta_inicia_en is null or t.venta_inicia_en <= now())
         and (t.venta_termina_en is null or t.venta_termina_en > now())
         and cant <= t.max_por_pedido))
       and t.cantidad_total - t.cantidad_vendida - t.cantidad_reservada >= cant
    returning * into tr;

    if not found then
      select * into tr from public.tramos where id = (item ->> 'tramo_id')::uuid;
      if app and cant > tr.max_por_pedido then
        raise exception 'LIMITE_POR_PEDIDO';
      end if;
      raise exception 'SIN_STOCK';
    end if;

    -- Asientos numerados: los elegidos o, si no, los mejores disponibles.
    if tr.numerado then
      if jsonb_typeof(item -> 'asientos') = 'array' and jsonb_array_length(item -> 'asientos') > 0 then
        select array_agg(value::uuid) into ids from jsonb_array_elements_text(item -> 'asientos');
      else
        ids := public.mejores_asientos(tr.id, cant);
      end if;
      if coalesce(array_length(ids, 1), 0) <> cant then
        raise exception 'ASIENTO_OCUPADO';
      end if;
      update public.asientos set estado = 'reservado', pedido_id = pedido.id
       where id = any (ids) and tramo_id = tr.id and estado = 'libre';
      get diagnostics k = row_count;
      if k <> cant then
        raise exception 'ASIENTO_OCUPADO';
      end if;
    end if;

    precio_u := case when p_canal = 'invitacion' then 0 else tr.precio_centimos end;
    insert into public.pedido_items (pedido_id, tramo_id, cantidad, precio_unitario_centimos)
    values (pedido.id, tr.id, cant, precio_u);

    subtotal := subtotal + precio_u * cant;
    n_entradas := n_entradas + cant;
    if promo.id is not null and (promo.tramo_ids is null or tr.id = any (promo.tramo_ids)) then
      aplicable := aplicable + precio_u * cant;
    end if;
  end loop;

  -- Extras (parking, merchandising…), con stock atómico.
  for item in select * from jsonb_array_elements(coalesce(p_extras, '[]'::jsonb)) loop
    cant := (item ->> 'cantidad')::integer;
    if cant is null or cant <= 0 then
      raise exception 'EXTRA_NO_DISPONIBLE';
    end if;
    update public.extras x
       set stock_reservado = x.stock_reservado + cant
     where x.id = (item ->> 'extra_id')::uuid and x.evento_id = p_evento_id and x.activo
       and cant <= x.max_por_pedido
       and x.stock_total - x.stock_vendido - x.stock_reservado >= cant
    returning * into ex;
    if not found then
      raise exception 'EXTRA_NO_DISPONIBLE';
    end if;
    insert into public.pedido_extras (pedido_id, extra_id, cantidad, precio_unitario_centimos)
    values (pedido.id, ex.id, cant, case when p_canal = 'invitacion' then 0 else ex.precio_centimos end);
    extras_tot := extras_tot + (case when p_canal = 'invitacion' then 0 else ex.precio_centimos end) * cant;
  end loop;

  if app and ev.max_por_usuario is not null and n_entradas > 0 then
    select count(*) into ya_tiene from public.entradas
     where evento_id = p_evento_id and usuario_id = p_usuario_id and estado in ('valida', 'usada', 'en_venta') and not es_acompanante;
    select ya_tiene + coalesce(sum(i.cantidad), 0) into ya_tiene
      from public.pedidos p join public.pedido_items i on i.pedido_id = p.id
     where p.evento_id = p_evento_id and p.usuario_id = p_usuario_id and p.estado = 'pendiente' and p.id <> pedido.id;
    if ya_tiene + n_entradas > ev.max_por_usuario then
      raise exception 'LIMITE_POR_USUARIO';
    end if;
  end if;

  if p_canal = 'invitacion' then
    select count(*) into ya_tiene from public.entradas en join public.pedidos p on p.id = en.pedido_id
     where p.evento_id = p_evento_id and p.canal = 'invitacion' and en.estado in ('valida', 'usada') and not en.es_acompanante;
    if ya_tiene + n_entradas > ev.cupo_invitaciones then
      raise exception 'CUPO_INVITACIONES';
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

  -- Gastos y protección se calculan sobre las entradas; en taquilla no hay gastos.
  base := subtotal - descuento;
  if app and base > 0 then
    gastos := round(base * cfg.gastos_gestion_porcentaje / 100.0)::integer + cfg.gastos_gestion_fijo_centimos * n_entradas;
    if p_seguro then
      seguro := round(base * cfg.seguro_porcentaje / 100.0)::integer;
    end if;
  end if;

  update public.pedidos
     set subtotal_centimos     = subtotal,
         descuento_centimos    = descuento,
         codigo_promocional_id = promo.id,
         extras_centimos       = extras_tot,
         gastos_centimos       = gastos,
         seguro_centimos       = seguro,
         total_centimos        = base + extras_tot + gastos + seguro
   where id = pedido.id
  returning * into pedido;

  return pedido;
end;
$$;

-- La reventa marca su canal.
create or replace function public.marcar_canal_reventa() returns trigger language plpgsql as $$
begin
  if new.es_reventa then new.canal := 'reventa'; end if;
  return new;
end;
$$;
drop trigger if exists pedidos_canal_reventa on public.pedidos;
create trigger pedidos_canal_reventa before insert on public.pedidos for each row execute function public.marcar_canal_reventa();

-- ---------- Confirmar: asientos y extras ----------
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
  ped    public.pedidos;
  it     public.pedido_items;
  tr     public.tramos;
  rv     public.reventas;
  pe     public.pedido_extras;
  nueva  uuid;
  asiento uuid;
  i      integer;
  k      integer;
  total  integer := 0;
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
    select count(*) into i from public.reventas where pedido_id = ped.id and estado = 'reservada';
    if i <> (select coalesce(sum(cantidad), 0) from public.pedido_items where pedido_id = ped.id) then
      raise exception 'SIN_STOCK';
    end if;
    for rv in select * from public.reventas where pedido_id = ped.id and estado = 'reservada' for update loop
      update public.entradas set estado = 'revendida' where id = rv.entrada_id;
      insert into public.entradas (pedido_id, evento_id, tramo_id, usuario_id, codigo, qr_semilla,
                                   asiento_id)
      values (ped.id, ped.evento_id, rv.tramo_id, ped.usuario_id, public.generar_codigo_entrada(), encode(gen_random_bytes(32), 'hex'),
              (select asiento_id from public.entradas where id = rv.entrada_id))
      returning id into nueva;
      -- La butaca pasa a la entrada nueva.
      update public.asientos set entrada_id = nueva, pedido_id = ped.id where entrada_id = rv.entrada_id;
      update public.reventas set estado = 'vendida', vendida_en = now() where id = rv.id;
      total := total + 1;
    end loop;
  else
    for it in select * from public.pedido_items where pedido_id = ped.id loop
      select * into tr from public.tramos where id = it.tramo_id;
      if ped.estado = 'pendiente' then
        update public.tramos
           set cantidad_reservada = cantidad_reservada - it.cantidad,
               cantidad_vendida   = cantidad_vendida + it.cantidad
         where id = it.tramo_id;
      else
        -- Pago tardío: las butacas elegidas ya se liberaron, así que se reembolsa.
        if tr.numerado then
          raise exception 'SIN_STOCK';
        end if;
        update public.tramos
           set cantidad_vendida = cantidad_vendida + it.cantidad
         where id = it.tramo_id
           and cantidad_total - cantidad_vendida - cantidad_reservada >= it.cantidad;
        if not found then
          raise exception 'SIN_STOCK';
        end if;
      end if;

      for i in 1..it.cantidad loop
        asiento := null;
        if tr.numerado then
          select id into asiento from public.asientos
           where pedido_id = ped.id and tramo_id = it.tramo_id and estado = 'reservado'
           order by orden_fila, numero limit 1 for update;
          if asiento is null then
            raise exception 'SIN_STOCK';
          end if;
        end if;
        insert into public.entradas (pedido_id, evento_id, tramo_id, usuario_id, codigo, qr_semilla, asiento_id)
        values (ped.id, ped.evento_id, it.tramo_id, ped.usuario_id, public.generar_codigo_entrada(), encode(gen_random_bytes(32), 'hex'), asiento)
        returning id into nueva;
        if asiento is not null then
          update public.asientos set estado = 'vendido', entrada_id = nueva where id = asiento;
        end if;
        total := total + 1;
        if tr.incluye_acompanante then
          insert into public.entradas (pedido_id, evento_id, tramo_id, usuario_id, codigo, qr_semilla, es_acompanante)
          values (ped.id, ped.evento_id, it.tramo_id, ped.usuario_id, public.generar_codigo_entrada(), encode(gen_random_bytes(32), 'hex'), true);
          total := total + 1;
        end if;
      end loop;
    end loop;

    for pe in select * from public.pedido_extras where pedido_id = ped.id loop
      if ped.estado = 'pendiente' then
        update public.extras set stock_reservado = stock_reservado - pe.cantidad, stock_vendido = stock_vendido + pe.cantidad where id = pe.extra_id;
      else
        update public.extras set stock_vendido = stock_vendido + pe.cantidad
         where id = pe.extra_id and stock_total - stock_vendido - stock_reservado >= pe.cantidad;
        if not found then
          raise exception 'SIN_STOCK';
        end if;
      end if;
    end loop;
  end if;

  update public.pedidos
     set estado = 'pagado', pagado_en = now(),
         stripe_payment_intent_id = coalesce(p_payment_intent_id, stripe_payment_intent_id)
   where id = ped.id;
  return total;
end;
$$;

-- ---------- Liberar: asientos y extras ----------
create or replace function public.liberar_pedido(p_pedido_id uuid, p_estado text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  ped public.pedidos;
  it  public.pedido_items;
  pe  public.pedido_extras;
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
    update public.asientos set estado = 'libre', pedido_id = null where pedido_id = ped.id and estado = 'reservado';
    for pe in select * from public.pedido_extras where pedido_id = ped.id loop
      update public.extras set stock_reservado = greatest(stock_reservado - pe.cantidad, 0) where id = pe.extra_id;
    end loop;
  end if;

  if ped.codigo_promocional_id is not null then
    update public.codigos_promocionales set usos = greatest(usos - 1, 0) where id = ped.codigo_promocional_id;
  end if;
  update public.pedidos set estado = p_estado where id = ped.id;
  return true;
end;
$$;

-- ---------- Reembolso: libera butacas y extras ----------
create or replace function public.reembolsar_pedido(p_pedido_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  ped public.pedidos;
  pe  public.pedido_extras;
  n   integer;
begin
  select * into ped from public.pedidos where id = p_pedido_id for update;
  if not found or ped.estado <> 'pagado' then
    raise exception 'PEDIDO_NO_REEMBOLSABLE';
  end if;

  update public.reventas set estado = 'cancelada'
   where estado = 'activa' and entrada_id in (select id from public.entradas where pedido_id = ped.id);

  -- Las butacas de entradas que siguen siendo de este pedido vuelven a estar libres.
  update public.asientos set estado = 'libre', pedido_id = null, entrada_id = null
   where entrada_id in (select id from public.entradas where pedido_id = ped.id and estado in ('valida', 'en_venta'));

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

  for pe in select * from public.pedido_extras where pedido_id = ped.id and canjeado_en is null loop
    update public.extras set stock_vendido = greatest(stock_vendido - pe.cantidad, 0) where id = pe.extra_id;
  end loop;

  update public.pedidos set estado = 'reembolsado' where id = ped.id;
  return n;
end;
$$;

-- ---------- Estadísticas: añade canales y extras ----------
create or replace function public.estadisticas_evento(p_evento_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'vendidas',   (select count(*) from public.entradas where evento_id = p_evento_id and estado in ('valida', 'usada', 'en_venta')),
    'validadas',  (select count(*) from public.entradas where evento_id = p_evento_id and estado = 'usada'),
    'aforo',      (select coalesce(sum(cantidad_total), 0) from public.tramos where evento_id = p_evento_id and activo),
    'ingresos_centimos', (select coalesce(sum(subtotal_centimos - descuento_centimos + extras_centimos), 0) from public.pedidos where evento_id = p_evento_id and estado = 'pagado' and not es_reventa),
    'extras_centimos',   (select coalesce(sum(extras_centimos), 0) from public.pedidos where evento_id = p_evento_id and estado = 'pagado'),
    'pedidos',    (select count(*) from public.pedidos where evento_id = p_evento_id and estado = 'pagado'),
    'por_canal',  (select coalesce(jsonb_object_agg(canal, n), '{}'::jsonb) from (
                     select p.canal, count(e.id)::integer as n
                       from public.pedidos p join public.entradas e on e.pedido_id = p.id
                      where p.evento_id = p_evento_id and p.estado = 'pagado' and e.estado in ('valida', 'usada', 'en_venta')
                      group by p.canal) c),
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
                      where p.evento_id = p_evento_id and p.estado = 'pagado' and not p.es_reventa
                      group by 1
                   ) s)
  );
$$;

revoke all on function public.reservar_pedido(uuid, uuid, jsonb, text, text, boolean, jsonb, text, uuid) from public, anon, authenticated;
revoke all on function public.confirmar_pedido(uuid, text)         from public, anon, authenticated;
revoke all on function public.liberar_pedido(uuid, text)           from public, anon, authenticated;
revoke all on function public.reembolsar_pedido(uuid)              from public, anon, authenticated;
revoke all on function public.generar_asientos(uuid, integer, integer, text) from public, anon, authenticated;
revoke all on function public.mejores_asientos(uuid, integer)      from public, anon, authenticated;
revoke all on function public.estadisticas_evento(uuid)            from public, anon, authenticated;
revoke all on function public.marcar_canal_reventa()               from public, anon, authenticated;
