import { useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { useAviso } from './aviso';
import { Boton } from './base';
import { api, mensajeDe } from '../lib/api';
import { useAuth } from '../lib/auth';
import { haptica } from '../lib/haptica';

/** Botón Seguir / Siguiendo para artistas y recintos. */
export function BotonSeguir({ tipo, id, siguiendo }: { tipo: 'artistas' | 'recintos'; id: string; siguiendo: boolean }) {
  const { usuario } = useAuth();
  const nav = useNavigation();
  const qc = useQueryClient();
  const avisar = useAviso();
  const [ocupado, setOcupado] = useState(false);

  async function alternar() {
    if (!usuario) return nav.navigate('Acceso');
    setOcupado(true);
    try {
      await api(`/${tipo}/${id}/seguir`, { method: siguiendo ? 'DELETE' : 'PUT' });
      haptica.impacto();
      if (!siguiendo) avisar('Te avisaremos de sus nuevas fechas', 'exito');
      await Promise.all([
        qc.invalidateQueries({ queryKey: [tipo === 'artistas' ? 'artista' : 'recinto', id] }),
        qc.invalidateQueries({ predicate: (q) => q.queryKey.includes('siguiendo') }),
      ]);
    } catch (e) {
      avisar(mensajeDe(e), 'error');
    } finally {
      setOcupado(false);
    }
  }

  return (
    <Boton v={siguiendo ? 'secundario' : 'primario'} icono={siguiendo ? 'checkmark' : 'add'} bloque={false} pequeno cargando={ocupado} onPress={() => void alternar()}>
      {siguiendo ? 'Siguiendo' : 'Seguir'}
    </Boton>
  );
}
