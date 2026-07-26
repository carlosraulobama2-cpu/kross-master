import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { codigo_qr } = await req.json();

    if (!codigo_qr) {
      return new Response(
        JSON.stringify({ mensaje: 'codigo_qr es requerido' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ mensaje: 'Supabase no configurado en el servidor' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: entrada, error } = await supabase
      .from('entradas')
      .select('*')
      .eq('codigo_qr', codigo_qr)
      .maybeSingle();

    if (error) {
      return new Response(
        JSON.stringify({ mensaje: 'Error al consultar la entrada', error: error.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!entrada) {
      return new Response(
        JSON.stringify({ mensaje: 'Entrada no encontrada' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (entrada.estado === 'USADO') {
      return new Response(
        JSON.stringify({ mensaje: 'Esta entrada ya fue usada', entrada }),
        {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { error: updateError } = await supabase
      .from('entradas')
      .update({ estado: 'USADO', fecha_escaneo: new Date().toISOString() })
      .eq('id', entrada.id);

    if (updateError) {
      return new Response(
        JSON.stringify({ mensaje: 'Error al actualizar la entrada', error: updateError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ mensaje: 'Entrada válida y marcada como usada', entrada: { ...entrada, estado: 'USADO' } }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error en validar-qr:', error);
    return new Response(
      JSON.stringify({ mensaje: 'Error al validar QR', error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
