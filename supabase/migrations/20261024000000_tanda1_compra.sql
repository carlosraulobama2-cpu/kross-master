-- =====================================================================
-- Tanda 1 · Comprar más y mejor
--   1  Precio total con gastos visible desde el catálogo
--   2  Lista de espera de eventos agotados
--   3  Seguir artistas y recintos
--   4  Páginas de artista y de recinto
--   5  Códigos promocionales
--   6  Preventa con código de acceso
--   7  Límite de entradas por cuenta y evento
--   9  Información práctica del recinto y apertura de puertas
-- (8 calendario y 10 recibos no necesitan cambios de esquema)
-- =====================================================================

-- ---------- Artistas y recintos ----------
create table if not exists public.artistas (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null check (char_length(nombre) between 2 and 80),
  imagen_url  text,
  bio         text check (char_length(bio) <= 2000),
  generos     text[] not null default '{}',
  creado_por  uuid references public.usuarios(id),
  creado_en   timestamptz not null default now()
);
create unique index if not exists artistas_nombre_unico on public.artistas (lower(nombre));

create table if not exists public.recintos (
  id                 uuid primary key default gen_random_uuid(),
  nombre             text not null check (char_length(nombre) between 2 and 120),
  direccion          text,
  ciudad             text not null,
  imagen_url         text,
  aforo              integer check (aforo > 0),
  como_llegar        text check (char_length(como_llegar) <= 1000),
  parking            text check (char_length(parking) <= 1000),
  accesibilidad      text check (char_length(accesibilidad) <= 1000),
  objetos_prohibidos text check (char_length(objetos_prohibidos) <= 1000),
  creado_por         uuid references public.usuarios(id),
  creado_en          timestamptz not null default now()
);
create unique index if not exists recintos_nombre_ciudad_unico on public.recintos (lower(nombre), lower(ciudad));

alter table public.eventos
  add column if not exists recinto_id       uuid references public.recintos(id),
  add column if not exists puertas_abren_en timestamptz,
  add column if not exists max_por_usuario  integer check (max_por_usuario between 1 and 100);

create table if not exists public.evento_artistas (
  evento_id  uuid not null references public.eventos(id) on delete cascade,
  artista_id uuid not null references public.artistas(id) on delete cascade,
  orden      integer not null default 0,
  primary key (evento_id, artista_id)
);
create index if not exists evento_artistas_artista_idx on public.evento_artistas(artista_id);

-- ---------- Seguir artistas y recintos ----------
create table if not exists public.seguimientos (
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  artista_id uuid references public.artistas(id) on delete cascade,
  recinto_id uuid references public.recintos(id) on delete cascade,
  creado_en  timestamptz not null default now(),
  check ((artista_id is null) <> (recinto_id is null))
);
create unique index if not exists seguimientos_artista_unico on public.seguimientos(usuario_id, artista_id) where artista_id is not null;
create unique index if not exists seguimientos_recinto_unico on public.seguimientos(usuario_id, recinto_id) where recinto_id is not null;
create index if not exists seguimientos_artista_idx on public.seguimientos(artista_id);
create index if not exists seguimientos_recinto_idx on public.seguimientos(recinto_id);

-- ---------- Lista de espera ----------
create table if not exists public.lista_espera (
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  evento_id  uuid not null references public.eventos(id) on delete cascade,
  creado_en  timestamptz not null default now(),
  avisado_en timestamptz,
  primary key (usuario_id, evento_id)
);
create index if not exists lista_espera_pendientes_idx on public.lista_espera(evento_id) where avisado_en is null;

-- ---------- Códigos promocionales ----------
create table if not exists public.codigos_promocionales (
  id           uuid primary key default gen_random_uuid(),
  evento_id    uuid not null references public.eventos(id) on delete cascade,
  codigo       text not null check (codigo ~ '^[A-Z0-9_-]{3,30}$'),
  descripcion  text,
  tipo         text not null check (tipo in ('porcentaje', 'fijo')),
  -- porcentaje: 1..100 ; fijo: céntimos de descuento por pedido
  valor        integer not null check (valor > 0),
  usos_max     integer check (usos_max > 0),
  usos         integer not null default 0 check (usos >= 0),
  tramo_ids    uuid[],
  valido_desde timestamptz,
  valido_hasta timestamptz,
  activo       boolean not null default true,
  creado_en    timestamptz not null default now(),
  check (tipo <> 'porcentaje' or valor <= 100),
  check (usos_max is null or usos <= usos_max)
);
create unique index if not exists codigos_evento_codigo_unico on public.codigos_promocionales(evento_id, codigo);

alter table public.pedidos
  add column if not exists descuento_centimos    integer not null default 0 check (descuento_centimos >= 0),
  add column if not exists codigo_promocional_id uuid references public.codigos_promocionales(id);

-- ---------- Preventa con código ----------
-- Un tipo de entrada con código solo se ve y se compra si se introduce el código.
alter table public.tramos add column if not exists codigo_acceso text check (codigo_acceso ~ '^[A-Z0-9_-]{3,30}$');

-- ---------- Gastos de gestión de una entrada (para mostrar precio total) ----------
create or replace function public.gastos_unitarios(p_precio integer)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select case when p_precio <= 0 then 0
              else round(p_precio * c.gastos_gestion_porcentaje / 100.0)::integer + c.gastos_gestion_fijo_centimos end
    from public.configuracion c where c.id = 1;
$$;
grant execute on function public.gastos_unitarios(integer) to anon, authenticated;

-- ---------- Catálogo con precio total, recinto y artistas ----------
drop view if exists public.catalogo_eventos;
create view public.catalogo_eventos as
select
  e.id, e.organizador_id, e.titulo, e.descripcion, e.categoria,
  coalesce(r.nombre, e.recinto)       as recinto,
  coalesce(r.direccion, e.direccion)  as direccion,
  coalesce(r.ciudad, e.ciudad)        as ciudad,
  e.recinto_id, e.imagen_url, e.inicia_en, e.termina_en, e.puertas_abren_en,
  e.edad_minima, e.politica_devolucion, e.destacado, e.max_por_usuario, e.creado_en,
  coalesce(nullif(u.nombre_artistico, ''), u.nombre)                                           as organizador_nombre,
  coalesce(min(t.precio_centimos) filter (where t.activo and t.codigo_acceso is null), 0)      as precio_desde_centimos,
  public.gastos_unitarios(coalesce(min(t.precio_centimos) filter (where t.activo and t.codigo_acceso is null), 0))
    + coalesce(min(t.precio_centimos) filter (where t.activo and t.codigo_acceso is null), 0) as precio_desde_total_centimos,
  coalesce(sum(t.cantidad_total - t.cantidad_vendida - t.cantidad_reservada)
           filter (where t.activo and t.codigo_acceso is null), 0)::integer                    as disponibles,
  coalesce(sum(t.cantidad_total) filter (where t.activo and t.codigo_acceso is null), 0)::integer as aforo,
  bool_or(t.activo and t.codigo_acceso is not null)                                            as tiene_preventa,
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

-- Artistas y recintos son públicos (solo lectura).
alter table public.artistas              enable row level security;
alter table public.recintos              enable row level security;
alter table public.evento_artistas       enable row level security;
alter table public.seguimientos          enable row level security;
alter table public.lista_espera          enable row level security;
alter table public.codigos_promocionales enable row level security;

drop policy if exists "artistas visibles" on public.artistas;
create policy "artistas visibles" on public.artistas for select using (true);
drop policy if exists "recintos visibles" on public.recintos;
create policy "recintos visibles" on public.recintos for select using (true);
drop policy if exists "artistas de eventos visibles" on public.evento_artistas;
create policy "artistas de eventos visibles" on public.evento_artistas for select using (true);

-- Los tramos de preventa no se exponen por la API pública de Supabase.
drop policy if exists "tramos de eventos publicados visibles" on public.tramos;
create policy "tramos de eventos publicados visibles" on public.tramos
  for select using (
    activo and codigo_acceso is null
    and exists (select 1 from public.eventos e where e.id = evento_id and e.estado = 'publicado')
  );

-- ---------- Reserva con código promocional, preventa y límite por cuenta ----------
drop function if exists public.reservar_pedido(uuid, uuid, jsonb);

-- Errores nuevos: CODIGO_INVALIDO, PREVENTA_CODIGO, LIMITE_POR_USUARIO.
create or replace function public.reservar_pedido(
  p_usuario_id    uuid,
  p_evento_id     uuid,
  p_items         jsonb,
  p_codigo        text default null,
  p_codigo_acceso text default null
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
  base        integer;
  pedido      public.pedidos;
begin
  select * into cfg from public.configuracion where id = 1;

  select * into ev from public.eventos where id = p_evento_id;
  if not found or ev.estado <> 'publicado' or ev.inicia_en < now() then
    raise exception 'EVENTO_NO_DISPONIBLE';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'TRAMO_INVALIDO';
  end if;

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

    -- Preventa: el tramo con código solo se puede comprar con ese código.
    select * into tr from public.tramos where id = (item ->> 'tramo_id')::uuid and evento_id = p_evento_id;
    if found and tr.codigo_acceso is not null and upper(btrim(coalesce(p_codigo_acceso, ''))) <> tr.codigo_acceso then
      raise exception 'PREVENTA_CODIGO';
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
    if promo.id is not null and (promo.tramo_ids is null or tr.id = any (promo.tramo_ids)) then
      aplicable := aplicable + tr.precio_centimos * cant;
    end if;
  end loop;

  -- Límite por cuenta: entradas ya compradas + pedidos abiertos + este.
  if ev.max_por_usuario is not null then
    select count(*) into ya_tiene from public.entradas
     where evento_id = p_evento_id and usuario_id = p_usuario_id and estado in ('valida', 'usada');
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

  -- Los gastos se calculan sobre lo que realmente se paga. Gratis = sin gastos.
  base := subtotal - descuento;
  if base > 0 then
    gastos := round(base * cfg.gastos_gestion_porcentaje / 100.0)::integer
              + cfg.gastos_gestion_fijo_centimos * n_entradas;
  end if;

  update public.pedidos
     set subtotal_centimos     = subtotal,
         descuento_centimos    = descuento,
         codigo_promocional_id = promo.id,
         gastos_centimos       = gastos,
         total_centimos        = base + gastos
   where id = pedido.id
  returning * into pedido;

  return pedido;
end;
$$;

-- Al liberar un pedido también se devuelve el uso del código.
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

  if ped.codigo_promocional_id is not null then
    update public.codigos_promocionales set usos = greatest(usos - 1, 0) where id = ped.codigo_promocional_id;
  end if;

  update public.pedidos set estado = p_estado where id = ped.id;
  return true;
end;
$$;

-- ---------- Lista de espera: a quién avisar ----------
-- Devuelve (y marca como avisados) a quienes esperan en eventos que vuelven a tener entradas.
create or replace function public.avisos_lista_espera()
returns table (usuario_id uuid, evento_id uuid, titulo text)
language sql
security definer
set search_path = public
as $$
  with con_stock as (
    select c.id, c.titulo from public.catalogo_eventos c
     where c.disponibles > 0 and c.inicia_en > now()
  ), avisados as (
    update public.lista_espera l
       set avisado_en = now()
      from con_stock s
     where l.evento_id = s.id and l.avisado_en is null
    returning l.usuario_id, l.evento_id
  )
  select a.usuario_id, a.evento_id, s.titulo from avisados a join con_stock s on s.id = a.evento_id;
$$;

revoke all on function public.reservar_pedido(uuid, uuid, jsonb, text, text) from public, anon, authenticated;
revoke all on function public.liberar_pedido(uuid, text)                     from public, anon, authenticated;
revoke all on function public.avisos_lista_espera()                         from public, anon, authenticated;
