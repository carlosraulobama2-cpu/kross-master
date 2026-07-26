# Kroos Master - Configuración Supabase

## Pasos para configurar Supabase

### 1. Crear proyecto en Supabase

1. Ve a https://supabase.com
2. Crea una cuenta o inicia sesión
3. Crea un nuevo proyecto
4. Anota la URL del proyecto y la clave anónima (anon key)

### 2. Ejecutar el schema

1. Ve a tu proyecto en Supabase
2. Abre el **SQL Editor**
3. Copia y ejecuta el contenido del archivo `supabase/schema.sql`

### 3. Configurar variables de entorno

En `frontend/.env`, reemplaza:

```
EXPO_PUBLIC_SUPABASE_URL=TU_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY=TU_SUPABASE_ANON_KEY
```

Con los valores de tu proyecto Supabase.

### 4. Verificar autenticación

Supabase usa `auth.users` para autenticación. Al registrar un usuario, se crea automáticamente en `auth.users` y nosotros insertamos los datos extra en `public.usuarios`.

### 5. Row Level Security (RLS)

Las políticas ya están incluidas en el schema.sql:
- Los usuarios solo ven sus propias entradas
- Los eventos son visibles para todos
- Solo admins pueden crear eventos (ajustar según necesidades)

### 6. Funciones útiles

- `build_qr_payload`: genera el JSON del QR con firma simulada
- Se puede reemplazar por una firma HMAC real en producción

### 7. Endpoints que usa el frontend

El frontend usa directamente el cliente de Supabase:

```javascript
import { supabase } from '../config/supabase';

// Auth
await supabase.auth.signUp({ email, password })
await supabase.auth.signInWithPassword({ email, password })
await supabase.auth.signOut()

// Eventos
const { data } = await supabase.from('eventos').select('*')

// Entradas
const { data } = await supabase.from('entradas').select('*').eq('usuario_id', userId)
await supabase.from('entradas').insert([...])
```

### 8. Datos de prueba

Para insertar eventos de prueba, ejecuta en el SQL Editor:

```sql
INSERT INTO public.eventos (titulo, descripcion, lugar, categoria, fecha_evento, precio, aforo_total, entradas_disponibles, imagen_url)
VALUES 
  ('Urban Beat Fest 2026', 'Festival de música urbana', 'Auditorio Municipal', 'Conciertos', '2026-08-15T21:00:00', 25.00, 500, 500, 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=600&auto=format&fit=crop'),
  ('Trap & Drill Night', 'Noche de trap y drill', 'Club Industrial', 'Festivales', '2026-08-28T23:30:00', 18.50, 300, 300, 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=600&auto=format&fit=crop'),
  ('Match Day: Liga Final', 'Final de la liga', 'Estadio Central', 'Deportes', '2026-09-02T19:00:00', 40.00, 1000, 1000, 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=600&auto=format&fit=crop');
```

## Notas

- El frontend está configurado para usar Supabase directamente
- El QR se genera con la misma lógica que definiste: `ticket_id`, `event_id`, `seat` + firma
- No necesitas el backend Express anterior si usas Supabase
- Para producción, reemplaza la firma simulada por HMAC real
