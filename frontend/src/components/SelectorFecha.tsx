import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { fechaLarga, hora } from '../lib/formato';
import { color, espacio, radio } from '../theme';
import { Icono, Pulsable, T } from './base';

/** Selector de fecha y hora nativo (iOS en una vista, Android en dos pasos). */
export function SelectorFecha({ etiqueta, valor, onCambio, minimo }: { etiqueta: string; valor: Date | null; onCambio: (d: Date) => void; minimo?: Date }) {
  const [paso, setPaso] = useState<'cerrado' | 'fecha' | 'hora'>('cerrado');
  const actual = valor ?? new Date(Date.now() + 7 * 86_400_000);

  return (
    <View style={{ gap: 6 }}>
      <T v="nota" c="texto2">
        {etiqueta}
      </T>
      <Pulsable onPress={() => setPaso(paso === 'cerrado' ? 'fecha' : 'cerrado')} style={s.caja} escala={0.99} accessibilityLabel={etiqueta}>
        <Icono n="calendar-outline" tam={18} c={valor ? color.acento : color.texto3} />
        <T c={valor ? 'texto' : 'texto3'} style={{ flex: 1 }}>
          {valor ? `${fechaLarga(valor.toISOString())} · ${hora(valor.toISOString())}` : 'Elegir fecha y hora'}
        </T>
        <Icono n={paso === 'cerrado' ? 'chevron-down' : 'chevron-up'} tam={18} c={color.texto3} />
      </Pulsable>
      {paso !== 'cerrado' &&
        (Platform.OS === 'ios' ? (
          <DateTimePicker value={actual} mode="datetime" display="inline" minimumDate={minimo} themeVariant="dark" accentColor={color.acento} onChange={(_, d) => d && onCambio(d)} />
        ) : (
          <DateTimePicker
            value={actual}
            mode={paso === 'fecha' ? 'date' : 'time'}
            minimumDate={minimo}
            onChange={(e, d) => {
              if (e.type === 'dismissed' || !d) return setPaso('cerrado');
              onCambio(d);
              setPaso(paso === 'fecha' ? 'hora' : 'cerrado');
            }}
          />
        ))}
    </View>
  );
}

const s = StyleSheet.create({
  caja: { flexDirection: 'row', alignItems: 'center', gap: espacio.s, minHeight: 52, paddingHorizontal: 14, borderRadius: radio.m, borderWidth: 1.5, borderColor: color.borde, backgroundColor: color.superficie },
});
