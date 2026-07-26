-- Kroos Master - Schema para Supabase
-- Ejecutar en el SQL Editor de Supabase

-- Tabla de usuarios (se puede usar auth.users de Supabase, pero dejamos esta por si queremos datos extra)
CREATE TABLE IF NOT EXISTS public.usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'fan',
  imagen_url TEXT,
  creado_en TIMESTAMPTZ DEFAULT now(),
  actualizado_en TIMESTAMPTZ DEFAULT now()
);

-- Tabla de eventos
CREATE TABLE IF NOT EXISTS public.eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descripcion TEXT,
  lugar TEXT,
  categoria TEXT,
  fecha_evento TEXT NOT NULL,
  precio REAL NOT NULL,
  aforo_total INTEGER NOT NULL,
  entradas_disponibles INTEGER NOT NULL,
  imagen_url TEXT,
  creado_en TIMESTAMPTZ DEFAULT now()
);

-- Tabla de entradas
CREATE TABLE IF NOT EXISTS public.entradas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id UUID NOT NULL REFERENCES public.eventos(id),
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id),
  codigo_qr TEXT UNIQUE NOT NULL,
  asiento TEXT,
  precio_pagado REAL NOT NULL,
  estado TEXT NOT NULL DEFAULT 'VALIDO',
  fecha_compra TIMESTAMPTZ DEFAULT now(),
  fecha_escaneo TIMESTAMPTZ,
  creado_en TIMESTAMPTZ DEFAULT now(),
  payment_intent_id TEXT,
  stripe_status TEXT
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_entradas_evento_id ON public.entradas(evento_id);
CREATE INDEX IF NOT EXISTS idx_entradas_usuario_id ON public.entradas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_entradas_codigo_qr ON public.entradas(codigo_qr);
CREATE INDEX IF NOT EXISTS idx_entradas_estado ON public.entradas(estado);

-- Row Level Security (RLS)
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entradas ENABLE ROW LEVEL SECURITY;

-- Políticas para usuarios
CREATE POLICY "Usuarios pueden ver su propio perfil" ON public.usuarios
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Usuarios pueden actualizar su propio perfil" ON public.usuarios
  FOR UPDATE USING (auth.uid() = id);

-- Políticas para eventos (lectura pública, escritura para usuarios autenticados)
CREATE POLICY "Eventos son visibles para todos" ON public.eventos
  FOR SELECT USING (true);

CREATE POLICY "Usuarios autenticados pueden crear eventos" ON public.eventos
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Políticas para entradas
CREATE POLICY "Usuarios ven sus propias entradas" ON public.entradas
  FOR SELECT USING (auth.uid() = usuario_id);

CREATE POLICY "Usuarios pueden crear sus entradas" ON public.entradas
  FOR INSERT WITH CHECK (auth.uid() = usuario_id);

-- Función para generar QR payload
CREATE OR REPLACE FUNCTION public.build_qr_payload(ticket_id TEXT, event_id TEXT, seat TEXT)
RETURNS TEXT AS $$
DECLARE
  payload JSONB;
  firma TEXT;
BEGIN
  payload := jsonb_build_object('ticket_id', ticket_id, 'event_id', event_id, 'seat', seat);
  
  -- Firma simulada simple (en producción usar HMAC real)
  firma := 'SIG-' || upper(to_hex(md5(payload::TEXT)));
  
  RETURN jsonb_build_object('ticket_id', ticket_id, 'event_id', event_id, 'seat', seat, 'firma', firma)::TEXT;
END;
$$ LANGUAGE plpgsql;
