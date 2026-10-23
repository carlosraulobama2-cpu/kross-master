import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';
import { T } from '../../components/base';
import { ErrorEstado, Esqueleto } from '../../components/estados';
import { Cabecera, Pantalla } from '../../components/pantalla';
import { api } from '../../lib/api';
import type { PropsPantalla } from '../../navigation/tipos';
import { espacio } from '../../theme';

const TITULOS = { terminos: 'Términos', privacidad: 'Privacidad', organizador: 'Condiciones para organizadores' } as const;

export function LegalScreen({ route }: PropsPantalla<'Legal'>) {
  const { doc } = route.params;
  const { data, error, refetch } = useQuery({
    queryKey: ['legal', doc],
    queryFn: () => api<{ titulo: string; contenido: string; fechaActualizacion?: string }>(`/legal/${doc}`),
    staleTime: Infinity,
  });
  return (
    <Pantalla cabecera={<Cabecera titulo={TITULOS[doc]} />}>
      {error ? (
        <ErrorEstado error={error} reintentar={() => void refetch()} />
      ) : !data ? (
        <View style={{ gap: espacio.s }}>
          {Array.from({ length: 12 }, (_, i) => (
            <Esqueleto key={i} ancho={i % 4 === 3 ? '60%' : '100%'} alto={14} />
          ))}
        </View>
      ) : (
        <View style={{ gap: espacio.l }}>
          <T v="subtitulo">{data.titulo}</T>
          <T c="texto2" selectable>
            {data.contenido}
          </T>
        </View>
      )}
    </Pantalla>
  );
}
