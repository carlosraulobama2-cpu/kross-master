-- Kroos Master - Schema para Supabase
-- Ejecutar en el SQL Editor de Supabase

-- Tabla de usuarios (perfil extendido de auth.users)
CREATE TABLE IF NOT EXISTS public.usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'fan',
  nombre_artistico TEXT,
  bio TEXT,
  telefono TEXT,
  sitio_web TEXT,
  foto_perfil TEXT,
  imagen_url TEXT,
  razon_social TEXT,
  dni_cif TEXT,
  datos_bancarios JSONB,
  stripe_connect_account_id TEXT,
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
  artista_id UUID REFERENCES public.usuarios(id),
  politica_devolucion TEXT DEFAULT 'Si el evento se cancela, se reembolsa en 5-10 días hábiles.',
  terminos_condiciones_url TEXT,
  creado_en TIMESTAMPTZ DEFAULT now()
);

-- Tabla de tramos de entradas
CREATE TABLE IF NOT EXISTS public.tramos_entrada (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id UUID NOT NULL REFERENCES public.eventos(id),
  nombre TEXT NOT NULL,
  precio REAL NOT NULL,
  aforo_total INTEGER NOT NULL,
  entradas_disponibles INTEGER NOT NULL,
  orden INTEGER NOT NULL DEFAULT 0,
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMPTZ DEFAULT now()
);

-- Tabla de entradas
CREATE TABLE IF NOT EXISTS public.entradas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id UUID NOT NULL REFERENCES public.eventos(id),
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id),
  tramo_id UUID REFERENCES public.tramos_entrada(id),
  codigo_qr TEXT UNIQUE NOT NULL,
  asiento TEXT,
  precio_pagado REAL NOT NULL,
  estado TEXT NOT NULL DEFAULT 'VALIDO',
  fecha_compra TIMESTAMPTZ DEFAULT now(),
  fecha_escaneo TIMESTAMPTZ,
  creado_en TIMESTAMPTZ DEFAULT now(),
  payment_intent_id TEXT,
  stripe_status TEXT,
  factura_url TEXT,
  transferida BOOLEAN NOT NULL DEFAULT false
);

-- Tabla de reservas temporales (hold system)
CREATE TABLE IF NOT EXISTS public.reservas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id UUID NOT NULL REFERENCES public.eventos(id),
  tramo_id UUID REFERENCES public.tramos_entrada(id),
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id),
  codigo_reserva TEXT UNIQUE NOT NULL,
  asiento TEXT,
  cantidad INTEGER NOT NULL DEFAULT 1,
  precio_total REAL NOT NULL,
  estado TEXT NOT NULL DEFAULT 'activa',
  expira_en TIMESTAMPTZ NOT NULL,
  creado_en TIMESTAMPTZ DEFAULT now()
);

-- Tabla de transferencias de entradas
CREATE TABLE IF NOT EXISTS public.transferencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entrada_id UUID NOT NULL REFERENCES public.entradas(id),
  usuario_origen_id UUID NOT NULL REFERENCES public.usuarios(id),
  usuario_destino_id UUID NOT NULL REFERENCES public.usuarios(id),
  codigo_transferencia TEXT UNIQUE NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente',
  creado_en TIMESTAMPTZ DEFAULT now()
);

-- Tabla de facturas/recibos
CREATE TABLE IF NOT EXISTS public.facturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entrada_id UUID NOT NULL REFERENCES public.entradas(id),
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id),
  numero_factura TEXT UNIQUE NOT NULL,
  concepto TEXT NOT NULL,
  subtotal REAL NOT NULL,
  gastos_gestion REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL,
  datos_fiscales JSONB,
  pdf_url TEXT,
  creado_en TIMESTAMPTZ DEFAULT now()
);

-- Tabla de escaneos/accesos (analítica)
CREATE TABLE IF NOT EXISTS public.accesos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entrada_id UUID NOT NULL REFERENCES public.entradas(id),
  evento_id UUID NOT NULL REFERENCES public.eventos(id),
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id),
  tipo_acceso TEXT NOT NULL DEFAULT 'entrada',
  metodo_verificacion TEXT NOT NULL DEFAULT 'qr',
  dispositivo_info JSONB,
  creado_en TIMESTAMPTZ DEFAULT now()
);

-- Tabla de términos y condiciones aceptados
CREATE TABLE IF NOT EXISTS public.terminos_aceptados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id),
  version TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'terminos',
  ip_address TEXT,
  user_agent TEXT,
  creado_en TIMESTAMPTZ DEFAULT now()
);

-- Tabla de favoritos
CREATE TABLE IF NOT EXISTS public.favoritos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id),
  evento_id UUID NOT NULL REFERENCES public.eventos(id),
  creado_en TIMESTAMPTZ DEFAULT now(),
  UNIQUE(usuario_id, evento_id)
);

-- Tabla de reseñas
CREATE TABLE IF NOT EXISTS public.resenas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id),
  evento_id UUID NOT NULL REFERENCES public.eventos(id),
  calificacion INTEGER NOT NULL CHECK (calificacion >= 1 AND calificacion <= 5),
  comentario TEXT,
  creado_en TIMESTAMPTZ DEFAULT now()
);

-- Tabla de notificaciones
CREATE TABLE IF NOT EXISTS public.notificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id),
  titulo TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'info',
  leida BOOLEAN NOT NULL DEFAULT false,
  creado_en TIMESTAMPTZ DEFAULT now()
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_eventos_artista_id ON public.eventos(artista_id);
CREATE INDEX IF NOT EXISTS idx_eventos_titulo ON public.eventos(titulo);
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON public.usuarios(rol);
CREATE INDEX IF NOT EXISTS idx_entradas_evento_id ON public.entradas(evento_id);
CREATE INDEX IF NOT EXISTS idx_entradas_usuario_id ON public.entradas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_entradas_codigo_qr ON public.entradas(codigo_qr);
CREATE INDEX IF NOT EXISTS idx_entradas_estado ON public.entradas(estado);
CREATE INDEX IF NOT EXISTS idx_tramos_evento_id ON public.tramos_entrada(evento_id);
CREATE INDEX IF NOT EXISTS idx_reservas_codigo ON public.reservas(codigo_reserva);
CREATE INDEX IF NOT EXISTS idx_reservas_usuario_id ON public.reservas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_reservas_expira_en ON public.reservas(expira_en);
CREATE INDEX IF NOT EXISTS idx_transferencias_entrada_id ON public.transferencias(entrada_id);
CREATE INDEX IF NOT EXISTS idx_accesos_evento_id ON public.accesos(evento_id);
CREATE INDEX IF NOT EXISTS idx_accesos_creado_en ON public.accesos(creado_en);
CREATE INDEX IF NOT EXISTS idx_favoritos_usuario_id ON public.favoritos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_resenas_evento_id ON public.resenas(evento_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario_id ON public.notificaciones(usuario_id);

-- Row Level Security (RLS)
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entradas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tramos_entrada ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transferencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accesos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terminos_aceptados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favoritos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resenas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Artistas pueden actualizar sus propios eventos" ON public.eventos
  FOR UPDATE USING (auth.uid() = artista_id);

-- Políticas para tramos de entrada
CREATE POLICY "Tramos visibles para todos" ON public.tramos_entrada
  FOR SELECT USING (true);

CREATE POLICY "Artistas pueden gestionar tramos de sus eventos" ON public.tramos_entrada
  FOR ALL USING (auth.uid() = (SELECT artista_id FROM public.eventos WHERE id = evento_id));

-- Políticas para entradas
CREATE POLICY "Usuarios ven sus propias entradas" ON public.entradas
  FOR SELECT USING (auth.uid() = usuario_id);

CREATE POLICY "Usuarios pueden crear sus entradas" ON public.entradas
  FOR INSERT WITH CHECK (auth.uid() = usuario_id);

-- Políticas para reservas
CREATE POLICY "Usuarios ven sus reservas" ON public.reservas
  FOR SELECT USING (auth.uid() = usuario_id);

CREATE POLICY "Usuarios pueden crear reservas" ON public.reservas
  FOR INSERT WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuarios pueden cancelar sus reservas" ON public.reservas
  FOR DELETE USING (auth.uid() = usuario_id);

-- Políticas para transferencias
CREATE POLICY "Usuarios ven transferencias relacionadas" ON public.transferencias
  FOR SELECT USING (auth.uid() = usuario_origen_id OR auth.uid() = usuario_destino_id);

CREATE POLICY "Usuarios pueden crear transferencias" ON public.transferencias
  FOR INSERT WITH CHECK (auth.uid() = usuario_origen_id);

-- Políticas para facturas
CREATE POLICY "Usuarios ven sus facturas" ON public.facturas
  FOR SELECT USING (auth.uid() = usuario_id);

-- Políticas para accesos
CREATE POLICY "Artistas ven accesos de sus eventos" ON public.accesos
  FOR SELECT USING (auth.uid() = (SELECT artista_id FROM public.eventos WHERE id = evento_id));

-- Políticas para términos
CREATE POLICY "Usuarios ven sus términos aceptados" ON public.terminos_aceptados
  FOR SELECT USING (auth.uid() = usuario_id);

CREATE POLICY "Usuarios pueden aceptar términos" ON public.terminos_aceptados
  FOR INSERT WITH CHECK (auth.uid() = usuario_id);

-- Políticas para favoritos
CREATE POLICY "Usuarios ven sus favoritos" ON public.favoritos
  FOR SELECT USING (auth.uid() = usuario_id);

CREATE POLICY "Usuarios pueden agregar favoritos" ON public.favoritos
  FOR INSERT WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuarios pueden eliminar sus favoritos" ON public.favoritos
  FOR DELETE USING (auth.uid() = usuario_id);

-- Políticas para reseñas
CREATE POLICY "Reseñas visibles para todos" ON public.resenas
  FOR SELECT USING (true);

CREATE POLICY "Usuarios pueden crear reseñas" ON public.resenas
  FOR INSERT WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuarios pueden actualizar sus reseñas" ON public.resenas
  FOR UPDATE USING (auth.uid() = usuario_id);

-- Políticas para notificaciones
CREATE POLICY "Usuarios ven sus notificaciones" ON public.notificaciones
  FOR SELECT USING (auth.uid() = usuario_id);

CREATE POLICY "Usuarios pueden actualizar sus notificaciones" ON public.notificaciones
  FOR UPDATE USING (auth.uid() = usuario_id);

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

-- Función para limpiar reservas expiradas
CREATE OR REPLACE FUNCTION public.limpiar_reservas_expiradas()
RETURNS void AS $$
BEGIN
  UPDATE public.reservas
  SET estado = 'expirada'
  WHERE estado = 'activa' AND expira_en < now();
END;
$$ LANGUAGE plpgsql;
