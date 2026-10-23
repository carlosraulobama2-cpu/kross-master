import { createElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { color, espacio, radio } from '../theme';
import { T } from './base';

const aLocal = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);

/** En web se usa el selector nativo del navegador (input datetime-local). */
export function SelectorFecha({ etiqueta, valor, onCambio, minimo }: { etiqueta: string; valor: Date | null; onCambio: (d: Date) => void; minimo?: Date }) {
  return (
    <View style={{ gap: 6 }}>
      <T v="nota" c="texto2">
        {etiqueta}
      </T>
      <View style={s.caja}>
        {createElement('input', {
          type: 'datetime-local',
          'aria-label': etiqueta,
          value: valor ? aLocal(valor) : '',
          min: minimo ? aLocal(minimo) : undefined,
          onChange: (e: { target: { value: string } }) => e.target.value && onCambio(new Date(e.target.value)),
          style: { flex: 1, background: 'transparent', border: 'none', outline: 'none', color: color.texto, fontSize: 15, colorScheme: 'dark', fontFamily: 'inherit' },
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  caja: { flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: 14, borderRadius: radio.m, borderWidth: 1.5, borderColor: color.borde, backgroundColor: color.superficie, gap: espacio.s },
});
