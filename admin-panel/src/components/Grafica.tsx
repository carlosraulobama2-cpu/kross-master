import { useMemo, useState } from 'react';

interface Punto {
  etiqueta: string;
  valor: number;
}

/** Gráfica de área ligera en SVG, sin dependencias. */
export function GraficaArea({ datos, formato, alto = 220 }: { datos: Punto[]; formato: (v: number) => string; alto?: number }) {
  const [activo, setActivo] = useState<number | null>(null);
  const ancho = 640;
  const margen = { arriba: 12, abajo: 26, izq: 4, der: 4 };
  const max = Math.max(1, ...datos.map((d) => d.valor));

  const puntos = useMemo(() => {
    const paso = datos.length > 1 ? (ancho - margen.izq - margen.der) / (datos.length - 1) : 0;
    return datos.map((d, i) => ({
      x: margen.izq + i * paso,
      y: margen.arriba + (1 - d.valor / max) * (alto - margen.arriba - margen.abajo),
    }));
  }, [datos, max, alto, margen.izq, margen.der, margen.arriba, margen.abajo]);

  if (datos.length === 0) return null;
  const linea = puntos.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const base = alto - margen.abajo;
  const area = `${linea} L${puntos.at(-1)!.x},${base} L${puntos[0]!.x},${base} Z`;
  const cadaN = Math.ceil(datos.length / 6);

  return (
    <div className="grafica" onMouseLeave={() => setActivo(null)}>
      <svg viewBox={`0 0 ${ancho} ${alto}`} preserveAspectRatio="none" style={{ height: alto }} role="img" aria-label="Evolución de ventas">
        <defs>
          <linearGradient id="relleno" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--acento)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--acento)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} className="rejilla" x1={0} x2={ancho} y1={margen.arriba + (1 - f) * (base - margen.arriba)} y2={margen.arriba + (1 - f) * (base - margen.arriba)} />
        ))}
        <path d={area} fill="url(#relleno)" />
        <path d={linea} fill="none" stroke="var(--acento)" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        {activo !== null && (
          <>
            <line x1={puntos[activo]!.x} x2={puntos[activo]!.x} y1={margen.arriba} y2={base} stroke="var(--borde-fuerte)" />
            <circle cx={puntos[activo]!.x} cy={puntos[activo]!.y} r={4} fill="var(--acento)" stroke="var(--superficie)" strokeWidth={2} />
          </>
        )}
        {puntos.map((p, i) => (
          <rect
            key={i}
            x={p.x - ancho / datos.length / 2}
            y={0}
            width={ancho / datos.length}
            height={alto}
            fill="transparent"
            onMouseEnter={() => setActivo(i)}
          />
        ))}
      </svg>
      {/* Etiquetas en HTML: el SVG se estira y deformaría el texto. */}
      <div className="grafica-ejes" aria-hidden="true">
        {datos.map((d, i) =>
          i % cadaN === Math.floor(cadaN / 2) ? (
            <span key={d.etiqueta} style={{ left: `${(puntos[i]!.x / ancho) * 100}%` }}>
              {d.etiqueta}
            </span>
          ) : null,
        )}
      </div>
      {activo !== null && (
        <div className="grafica-tooltip" style={{ left: `${(puntos[activo]!.x / ancho) * 100}%` }}>
          <strong>{formato(datos[activo]!.valor)}</strong>
          {datos[activo]!.etiqueta}
        </div>
      )}
    </div>
  );
}
