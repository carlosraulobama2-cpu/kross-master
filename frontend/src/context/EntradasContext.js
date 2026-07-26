import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';

const ONBOARDING_KEY = '@kroos_onboarding_completed';

const EntradasContext = createContext();

export function EntradasProvider({ children }) {
  const [entradas, setEntradas] = useState([]);
  const [usuario, setUsuario] = useState(null);
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
        setUsuario(sesion.user);
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

  async function cargarEntradas(usuarioId) {
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

  async function registrar(email, password, nombre) {
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
          rol: 'fan',
        }]);

      if (insertError) throw insertError;
      setUsuario(data.user);
    }

    return data;
  }

  async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    setUsuario(data.user);
    await cargarEntradas(data.user.id);
    return data;
  }

  async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUsuario(null);
    setEntradas([]);
  }

  async function comprarEntrada(evento, seat) {
    if (!usuario) throw new Error('Usuario no autenticado');

    const ticketId = `TK-${Math.floor(Math.random() * 9000) + 1000}`;
    const eventId = `EV-2026-${evento.id}`;
    const { buildQrPayload } = await import('../utils/qrSigner');
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
    }}>
      {children}
    </EntradasContext.Provider>
  );
}

export function useEntradas() {
  return useContext(EntradasContext);
}
