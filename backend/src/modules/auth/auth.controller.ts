import { Request, Response } from 'express';
import { supabase } from '../../config/supabase';

async function registrar(req: Request, res: Response) {
  try {
    const { email, password, nombre, rol } = req.body;
    // Solo se puede elegir fan o artista: antes cualquiera podía registrarse como super_admin.
    const rolSeguro = rol === 'artista' ? 'artista' : 'fan';
    if (!email || !password || !nombre) {
      return res.status(400).json({ mensaje: 'email, password y nombre son requeridos' });
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      return res.status(400).json({ mensaje: error.message });
    }

    if (data.user) {
      const { error: insertError } = await supabase
        .from('usuarios')
        .insert([{
          id: data.user.id,
          email,
          nombre,
          rol: rolSeguro,
        }]);

      if (insertError) {
        return res.status(400).json({ mensaje: insertError.message });
      }
    }

    // El token es la sesión de Supabase (la que valida authMiddleware). Puede ser null si hay que confirmar el correo.
    res.status(201).json({ usuario: { id: data.user!.id, email, nombre, rol: rolSeguro }, token: data.session?.access_token ?? null });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error en registro', error: (error as Error).message });
  }
}

async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ mensaje: 'email y password son requeridos' });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({ mensaje: 'Credenciales inválidas' });
    }

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('id, email, nombre, rol, imagen_url, creado_en')
      .eq('id', data.user!.id)
      .single();

    const token = data.session?.access_token;
    res.json({ usuario, token });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error en login', error: (error as Error).message });
  }
}

async function perfil(req: Request, res: Response) {
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, email, nombre, rol, imagen_url, creado_en')
      .eq('id', (req as any).usuario.id)
      .single();

    if (error || !data) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    res.json({ usuario: data });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener perfil', error: (error as Error).message });
  }
}

export { registrar, login, perfil };
