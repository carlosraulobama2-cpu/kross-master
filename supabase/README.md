# Supabase

La base de datos se define en `migrations/20261023000000_esquema_v2.sql`.

1. Crea un proyecto en https://supabase.com.
2. Aplica la migración: `supabase db push`, o pega el archivo en el **SQL Editor**.
3. En **Authentication → Providers → Email**, decide si exiges confirmar el email.
4. Copia en `backend/.env`: `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`.
5. Nombra al primer admin: `update public.usuarios set rol = 'admin' where email = '…';`

Reglas del esquema:

- Solo el backend escribe (service_role). RLS deja leer a los clientes únicamente
  el catálogo público (`catalogo_eventos`, tramos de eventos publicados y reseñas).
- Dinero en céntimos; fechas `timestamptz`.
- El stock se reserva, confirma y libera con funciones SQL atómicas
  (`reservar_pedido`, `confirmar_pedido`, `liberar_pedido`, `reembolsar_pedido`),
  que solo puede ejecutar el backend.
