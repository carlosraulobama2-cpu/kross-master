-- Integridad y seguridad de la emisión de entradas.
--  1. Una entrada por pago: payment_intent_id único (el webhook de Stripe puede repetirse).
--  2. Emisión atómica (`emitir_entrada`): bloquea el evento, comprueba aforo, inserta la entrada y descuenta stock
--     en una sola transacción, y es idempotente por payment_intent_id.
--  3. Las entradas SOLO las emite el backend con la clave de servicio: se elimina la política que dejaba a cualquier
--     usuario insertarse entradas gratis desde la app.
--  4. Columnas que el backend ya usa y no estaban en el esquema.

ALTER TABLE public.eventos ADD COLUMN IF NOT EXISTS entradas_vendidas INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.entradas ADD COLUMN IF NOT EXISTS escaneado_por UUID REFERENCES public.usuarios(id);

CREATE UNIQUE INDEX IF NOT EXISTS ux_entradas_payment_intent
  ON public.entradas (payment_intent_id) WHERE payment_intent_id IS NOT NULL;

DROP POLICY IF EXISTS "Usuarios pueden crear sus entradas" ON public.entradas;

CREATE OR REPLACE FUNCTION public.emitir_entrada(
  p_id UUID,
  p_evento_id UUID,
  p_usuario_id UUID,
  p_codigo_qr TEXT,
  p_asiento TEXT,
  p_precio REAL,
  p_payment_intent_id TEXT
) RETURNS public.entradas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entrada public.entradas;
  v_disponibles INTEGER;
BEGIN
  -- Idempotente: el mismo pago devuelve la misma entrada.
  SELECT * INTO v_entrada FROM public.entradas WHERE payment_intent_id = p_payment_intent_id;
  IF FOUND THEN
    RETURN v_entrada;
  END IF;

  -- Bloquea el evento: dos compras a la vez no pueden vender la última entrada dos veces.
  SELECT entradas_disponibles INTO v_disponibles FROM public.eventos WHERE id = p_evento_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'evento_no_encontrado' USING ERRCODE = 'P0002';
  END IF;
  IF v_disponibles <= 0 THEN
    RAISE EXCEPTION 'sin_entradas' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.entradas (id, evento_id, usuario_id, codigo_qr, asiento, precio_pagado, estado, payment_intent_id, stripe_status)
  VALUES (p_id, p_evento_id, p_usuario_id, p_codigo_qr, p_asiento, p_precio, 'VALIDO', p_payment_intent_id, 'succeeded')
  RETURNING * INTO v_entrada;

  UPDATE public.eventos
     SET entradas_disponibles = entradas_disponibles - 1,
         entradas_vendidas = entradas_vendidas + 1
   WHERE id = p_evento_id;

  RETURN v_entrada;
END;
$$;

-- Solo el backend (service_role) puede emitir entradas.
REVOKE ALL ON FUNCTION public.emitir_entrada(UUID, UUID, UUID, TEXT, TEXT, REAL, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.emitir_entrada(UUID, UUID, UUID, TEXT, TEXT, REAL, TEXT) TO service_role;
