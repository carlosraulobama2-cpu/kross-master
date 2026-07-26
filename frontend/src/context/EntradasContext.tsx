import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';
import { buildQrPayload } from '../utils/qrSigner';

const ONBOARDING_KEY = '@kroos_onboarding_completed';

interface Entrada {
  id: string;
  evento_id: string;
  usuario_id: string;
  codigo_qr: string;
  asiento: string;
  precio_pagado: number;
  estado: string;
  creado_en?: string;
  eventos?: {
    titulo: string;
    lugar: string;
    fecha_evento: string;
    imagen_url: string;
  };
}

interface EntradasContextType {
  entradas: Entrada[];
  usuario: any;
  cargando: boolean;
  onboardingCompletado: boolean;
  marcarOnboardingCompletado: () => Promise<void>;
  registrar: (email: string, password: string, nombre: string, rol?: string) => Promise<any>;
  login: (email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  comprarEntrada: (evento: any, seat: string) => Promise<any>;
  actualizarPerfil: (datos: any) => Promise<any>;
  agregarFavorito: (eventoId: string) => Promise<any>;
  quitarFavorito: (eventoId: string) => Promise<any>;
  listarFavoritos: () => Promise<any>;
  crearResena: (eventoId: string, calificacion: number, comentario?: string) => Promise<any>;
  listarResenas: (eventoId: string) => Promise<any>;
  listarNotificaciones: () => Promise<any>;
  marcarNotificacionLeida: (id: string) => Promise<any>;
  crearTramo: (eventoId: string, datos: any) => Promise<any>;
  listarTramos: (eventoId: string) => Promise<any>;
  crearReserva: (eventoId: string, tramoId: string, asiento?: string, cantidad?: number) => Promise<any>;
  cancelarReserva: (reservaId: string) => Promise<any>;
  crearTransferencia: (entradaId: string, emailDestino: string) => Promise<any>;
  aceptarTransferencia: (codigoTransferencia: string) => Promise<any>;
  crearFactura: (entradaId: string) => Promise<any>;
  registrarAcceso: (entradaId: string, eventoId: string, tipo?: string) => Promise<any>;
  obtenerAnalyticsEvento: (eventoId: string) => Promise<any>;
  aceptarTerminos: (version: string, tipo?: string) => Promise<any>;
  verificarTerminos: (version: string, tipo?: string) => Promise<any>;
  conectarStripeConnect: () => Promise<any>;
  obtenerStripeConnectStatus: () => Promise<any>;
  generarCodigoAcceso: (eventoId: string, codigo: string, tipo?: string, usosMaximos?: number) => Promise<any>;
  listarCodigosAcceso: (eventoId: string) => Promise<any>;
  validarCodigoAcceso: (codigo: string, eventoId: string) => Promise<any>;
  asignarStaff: (eventoId: string, email: string, rolStaff?: string) => Promise<any>;
}

const EntradasContext = createContext<EntradasContextType | undefined>(undefined);

export function EntradasProvider({ children }: { children: React.ReactNode }) {
  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const [usuario, setUsuario] = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  const [onboardingCompletado, setOnboardingCompletado] = useState(false);

  useEffect(() => {
    inicializar();
  }, []);

  async function inicializar() {
    try {
      const [session, onboarding] = await Promise.all([
        supabase.auth.getSession(),
        AsyncStorage.getItem(ONBOARDING_KEY),
      ]);

      if (onboarding === 'true') {
        setOnboardingCompletado(true);
      }

      const { data: { session: sesion } } = session;
      if (sesion?.user) {
        const { data: perfil } = await supabase
          .from('usuarios')
          .select('id, email, nombre, rol, nombre_artistico, bio, telefono, sitio_web, foto_perfil, imagen_url, creado_en')
          .eq('id', sesion.user.id)
          .single();

        setUsuario(perfil || sesion.user);
        await cargarEntradas(sesion.user.id);
      }
    } catch (e) {
      console.error('Error inicializando:', e);
    } finally {
      setCargando(false);
    }
  }

  async function marcarOnboardingCompletado() {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      setOnboardingCompletado(true);
    } catch (e) {
      console.error('Error guardando onboarding:', e);
    }
  }

  async function cargarEntradas(usuarioId: string) {
    try {
      const { data, error } = await supabase
        .from('entradas')
        .select(`
          *,
          eventos:titulo, lugar, fecha_evento, imagen_url
        `)
        .eq('usuario_id', usuarioId)
        .order('creado_en', { ascending: false });

      if (error) throw error;
      setEntradas(data || []);
    } catch (e) {
      console.error('Error cargando entradas:', e);
    }
  }

  async function registrar(email: string, password: string, nombre: string, rol: string = 'fan') {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;

    if (data.user) {
      const { error: insertError } = await supabase
        .from('usuarios')
        .insert([{
          id: data.user.id,
          email,
          nombre,
          rol,
        }]);

      if (insertError) throw insertError;
    }

    return data;
  }

  async function login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    const { data: perfil } = await supabase
      .from('usuarios')
      .select('id, email, nombre, rol, nombre_artistico, bio, telefono, sitio_web, foto_perfil, imagen_url, creado_en')
      .eq('id', data.user.id)
      .single();

    setUsuario(perfil || data.user);
    await cargarEntradas(data.user.id);
    return data;
  }

  async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUsuario(null);
    setEntradas([]);
  }

  async function comprarEntrada(evento: any, seat: string) {
    if (!usuario) throw new Error('Usuario no autenticado');

    const ticketId = `TK-${Math.floor(Math.random() * 9000) + 1000}`;
    const eventId = `EV-2026-${evento.id}`;
    const codigoQr = buildQrPayload({ ticketId, eventId, seat });

    const { data, error } = await supabase
      .from('entradas')
      .insert([{
        evento_id: evento.id,
        usuario_id: usuario.id,
        codigo_qr: codigoQr,
        asiento: seat,
        precio_pagado: evento.precio,
        estado: 'VALIDO',
      }])
      .select()
      .single();

    if (error) throw error;

    await supabase
      .from('eventos')
      .update({ entradas_disponibles: (evento.entradas_disponibles || 0) - 1 })
      .eq('id', evento.id);

    await cargarEntradas(usuario.id);
    return data;
  }

  async function actualizarPerfil(datos: any) {
    if (!usuario) throw new Error('Usuario no autenticado');

    const token = (await supabase.auth.getSession()).data.session?.access_token;
    const backendUrl = (process.env as any).EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';

    const response = await fetch(`${backendUrl}/api/usuarios/perfil`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(datos),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.mensaje || 'Error al actualizar perfil');
    }

    if (result.usuario) {
      setUsuario(result.usuario);
    }

    return result;
  }

  async function agregarFavorito(eventoId: string) {
    if (!usuario) throw new Error('Usuario no autenticado');

    const token = (await supabase.auth.getSession()).data.session?.access_token;
    const backendUrl = (process.env as any).EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';

    const response = await fetch(`${backendUrl}/api/favoritos/agregar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ eventoId }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.mensaje || 'Error al agregar favorito');
    }

    return result;
  }

  async function quitarFavorito(eventoId: string) {
    if (!usuario) throw new Error('Usuario no autenticado');

    const token = (await supabase.auth.getSession()).data.session?.access_token;
    const backendUrl = (process.env as any).EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';

    const response = await fetch(`${backendUrl}/api/favoritos/quitar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ eventoId }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.mensaje || 'Error al quitar favorito');
    }

    return result;
  }

  async function listarFavoritos() {
    if (!usuario) throw new Error('Usuario no autenticado');

    const token = (await supabase.auth.getSession()).data.session?.access_token;
    const backendUrl = (process.env as any).EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';

    const response = await fetch(`${backendUrl}/api/favoritos/mis-favoritos`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.mensaje || 'Error al listar favoritos');
    }

    return result;
  }

  async function crearResena(eventoId: string, calificacion: number, comentario?: string) {
    if (!usuario) throw new Error('Usuario no autenticado');

    const token = (await supabase.auth.getSession()).data.session?.access_token;
    const backendUrl = (process.env as any).EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';

    const response = await fetch(`${backendUrl}/api/resenas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ eventoId, calificacion, comentario }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.mensaje || 'Error al crear reseña');
    }

    return result;
  }

  async function listarResenas(eventoId: string) {
    const backendUrl = (process.env as any).EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';

    const response = await fetch(`${backendUrl}/api/resenas/evento/${eventoId}`);

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.mensaje || 'Error al listar reseñas');
    }

    return result;
  }

  async function listarNotificaciones() {
    if (!usuario) throw new Error('Usuario no autenticado');

    const token = (await supabase.auth.getSession()).data.session?.access_token;
    const backendUrl = (process.env as any).EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';

    const response = await fetch(`${backendUrl}/api/notificaciones`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.mensaje || 'Error al listar notificaciones');
    }

    return result;
  }

  async function marcarNotificacionLeida(id: string) {
    if (!usuario) throw new Error('Usuario no autenticado');

    const token = (await supabase.auth.getSession()).data.session?.access_token;
    const backendUrl = (process.env as any).EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';

    const response = await fetch(`${backendUrl}/api/notificaciones/${id}/leer`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.mensaje || 'Error al marcar notificación');
    }

    return result;
  }

  async function crearTramo(eventoId: string, datos: any) {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    const backendUrl = (process.env as any).EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';

    const response = await fetch(`${backendUrl}/api/tramos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ eventoId, ...datos }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.mensaje || 'Error al crear tramo');
    }

    return result;
  }

  async function listarTramos(eventoId: string) {
    const backendUrl = (process.env as any).EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';

    const response = await fetch(`${backendUrl}/api/tramos/evento/${eventoId}`);

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.mensaje || 'Error al listar tramos');
    }

    return result;
  }

  async function crearReserva(eventoId: string, tramoId: string, asiento?: string, cantidad = 1) {
    if (!usuario) throw new Error('Usuario no autenticado');

    const token = (await supabase.auth.getSession()).data.session?.access_token;
    const backendUrl = (process.env as any).EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';

    const response = await fetch(`${backendUrl}/api/reservas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ eventoId, tramoId, asiento, cantidad }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.mensaje || 'Error al crear reserva');
    }

    return result;
  }

  async function cancelarReserva(reservaId: string) {
    if (!usuario) throw new Error('Usuario no autenticado');

    const token = (await supabase.auth.getSession()).data.session?.access_token;
    const backendUrl = (process.env as any).EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';

    const response = await fetch(`${backendUrl}/api/reservas/${reservaId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.mensaje || 'Error al cancelar reserva');
    }

    return result;
  }

  async function crearTransferencia(entradaId: string, emailDestino: string) {
    if (!usuario) throw new Error('Usuario no autenticado');

    const token = (await supabase.auth.getSession()).data.session?.access_token;
    const backendUrl = (process.env as any).EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';

    const response = await fetch(`${backendUrl}/api/transferencias`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ entradaId, emailDestino }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.mensaje || 'Error al crear transferencia');
    }

    return result;
  }

  async function aceptarTransferencia(codigoTransferencia: string) {
    if (!usuario) throw new Error('Usuario no autenticado');

    const token = (await supabase.auth.getSession()).data.session?.access_token;
    const backendUrl = (process.env as any).EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';

    const response = await fetch(`${backendUrl}/api/transferencias/aceptar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ codigoTransferencia }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.mensaje || 'Error al aceptar transferencia');
    }

    return result;
  }

  async function crearFactura(entradaId: string) {
    if (!usuario) throw new Error('Usuario no autenticado');

    const token = (await supabase.auth.getSession()).data.session?.access_token;
    const backendUrl = (process.env as any).EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';

    const response = await fetch(`${backendUrl}/api/facturas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ entradaId }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.mensaje || 'Error al crear factura');
    }

    return result;
  }

  async function registrarAcceso(entradaId: string, eventoId: string, tipo = 'entrada') {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    const backendUrl = (process.env as any).EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';

    const response = await fetch(`${backendUrl}/api/analytics/acceso`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ entradaId, eventoId, tipo_acceso: tipo }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.mensaje || 'Error al registrar acceso');
    }

    return result;
  }

  async function obtenerAnalyticsEvento(eventoId: string) {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    const backendUrl = (process.env as any).EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';

    const response = await fetch(`${backendUrl}/api/analytics/evento/${eventoId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.mensaje || 'Error al obtener analytics');
    }

    return result;
  }

  async function aceptarTerminos(version: string, tipo = 'terminos') {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    const backendUrl = (process.env as any).EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';

    const response = await fetch(`${backendUrl}/api/terminos/aceptar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ version, tipo }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.mensaje || 'Error al aceptar términos');
    }

    return result;
  }

  async function verificarTerminos(version: string, tipo = 'terminos') {
    const backendUrl = (process.env as any).EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';

    const response = await fetch(`${backendUrl}/api/terminos/verificar?version=${version}&tipo=${tipo}`);

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.mensaje || 'Error al verificar términos');
    }

    return result;
  }

  async function conectarStripeConnect() {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    const backendUrl = (process.env as any).EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';

    const response = await fetch(`${backendUrl}/api/artistas/stripe-connect/account`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        email: usuario?.email,
        nombre: usuario?.nombre_artistico || usuario?.nombre,
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.mensaje || 'Error al conectar Stripe Connect');
    }

    return result;
  }

  async function obtenerStripeConnectStatus() {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    const backendUrl = (process.env as any).EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';

    const response = await fetch(`${backendUrl}/api/artistas/stripe-connect/status`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.mensaje || 'Error al obtener estado Stripe');
    }

    return result;
  }

  async function generarCodigoAcceso(eventoId: string, codigo: string, tipo = 'staff', usosMaximos?: number) {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    const backendUrl = (process.env as any).EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';

    const response = await fetch(`${backendUrl}/api/staff/generar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ eventoId, codigo, tipo, usosMaximos }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.mensaje || 'Error al generar código');
    }

    return result;
  }

  async function listarCodigosAcceso(eventoId: string) {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    const backendUrl = (process.env as any).EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';

    const response = await fetch(`${backendUrl}/api/staff/evento/${eventoId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.mensaje || 'Error al listar códigos');
    }

    return result;
  }

  async function validarCodigoAcceso(codigo: string, eventoId: string) {
    const backendUrl = (process.env as any).EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';

    const response = await fetch(`${backendUrl}/api/staff/validar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ codigo, eventoId }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.mensaje || 'Código inválido');
    }

    return result;
  }

  async function asignarStaff(eventoId: string, email: string, rolStaff = 'validador') {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    const backendUrl = (process.env as any).EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';

    const response = await fetch(`${backendUrl}/api/staff/asignar-staff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ eventoId, email, rolStaff }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.mensaje || 'Error al asignar staff');
    }

    return result;
  }

  return (
    <EntradasContext.Provider value={{
      entradas,
      usuario,
      cargando,
      onboardingCompletado,
      marcarOnboardingCompletado,
      registrar,
      login,
      logout,
      comprarEntrada,
      actualizarPerfil,
      agregarFavorito,
      quitarFavorito,
      listarFavoritos,
      crearResena,
      listarResenas,
      listarNotificaciones,
      marcarNotificacionLeida,
      crearTramo,
      listarTramos,
      crearReserva,
      cancelarReserva,
      crearTransferencia,
      aceptarTransferencia,
      crearFactura,
      registrarAcceso,
      obtenerAnalyticsEvento,
      aceptarTerminos,
      verificarTerminos,
      conectarStripeConnect,
      obtenerStripeConnectStatus,
      generarCodigoAcceso,
      listarCodigosAcceso,
      validarCodigoAcceso,
      asignarStaff,
    }}>
      {children}
    </EntradasContext.Provider>
  );
}

export function useEntradas() {
  const context = useContext(EntradasContext);
  if (!context) {
    throw new Error('useEntradas debe usarse dentro de EntradasProvider');
  }
  return context;
}
