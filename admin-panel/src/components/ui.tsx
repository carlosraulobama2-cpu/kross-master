import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';
import { IconoAlerta, IconoBuscar, IconoFlechaDer, IconoFlechaIzq, IconoOk } from './iconos';

// ---------- Botón ----------

type Variante = 'primario' | 'peligro' | 'fantasma' | 'normal';

export function Boton({
  variante = 'normal',
  pequeno,
  cargando,
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; pequeno?: boolean; cargando?: boolean }) {
  const clases = ['boton', variante !== 'normal' && variante, pequeno && 'pequeno', className].filter(Boolean).join(' ');
  return (
    <button type="button" className={clases} disabled={props.disabled || cargando} aria-busy={cargando} {...props}>
      {cargando && <span className="giro" aria-hidden="true" />}
      {children}
    </button>
  );
}

// ---------- Insignia y progreso ----------

export type Tono = 'exito' | 'info' | 'aviso' | 'peligro' | 'neutro';

export const Insignia = ({ tono = 'neutro', children }: { tono?: Tono; children: ReactNode }) => (
  <span className={`insignia ${tono}`}>{children}</span>
);

export function Progreso({ valor, total }: { valor: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((valor / total) * 100)) : 0;
  return (
    <div className="progreso" title={`${pct}%`}>
      <div className="progreso-barra" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <span style={{ width: `${pct}%` }} />
      </div>
      <small>
        {valor.toLocaleString('es-ES')} / {total.toLocaleString('es-ES')}
      </small>
    </div>
  );
}

// ---------- Estados de carga ----------

export const Esqueleto = ({ ancho = '100%', alto = 14 }: { ancho?: number | string; alto?: number }) => (
  <div className="esqueleto" style={{ width: ancho, height: alto }} />
);

export function FilasEsqueleto({ columnas, filas = 6 }: { columnas: number; filas?: number }) {
  return (
    <>
      {Array.from({ length: filas }, (_, i) => (
        <tr key={i}>
          {Array.from({ length: columnas }, (_, j) => (
            <td key={j}>
              <Esqueleto ancho={j === 0 ? '70%' : '50%'} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function Vacio({ icono, titulo, texto, accion }: { icono: ReactNode; titulo: string; texto?: string; accion?: ReactNode }) {
  return (
    <div className="vacio">
      <div className="vacio-icono">{icono}</div>
      <strong>{titulo}</strong>
      {texto && <span>{texto}</span>}
      {accion}
    </div>
  );
}

export function ErrorCarga({ error, reintentar }: { error: unknown; reintentar: () => void }) {
  return (
    <Vacio
      icono={<IconoAlerta />}
      titulo="No se pudieron cargar los datos"
      texto={error instanceof Error ? error.message : undefined}
      accion={<Boton onClick={reintentar}>Reintentar</Boton>}
    />
  );
}

// ---------- Controles ----------

export function Buscador({ valor, onCambio, placeholder }: { valor: string; onCambio: (v: string) => void; placeholder: string }) {
  const [local, setLocal] = useState(valor);
  // Espera 300 ms tras dejar de escribir antes de buscar.
  useEffect(() => {
    const t = setTimeout(() => local !== valor && onCambio(local), 300);
    return () => clearTimeout(t);
  }, [local, valor, onCambio]);
  return (
    <div className="buscador">
      <IconoBuscar tam={16} />
      <input className="entrada" type="search" value={local} onChange={(e) => setLocal(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
    </div>
  );
}

export function Segmentos<T extends string>({ opciones, valor, onCambio }: { opciones: { valor: T; etiqueta: string }[]; valor: T; onCambio: (v: T) => void }) {
  return (
    <div className="segmentos" role="group">
      {opciones.map((o) => (
        <button key={o.valor} type="button" aria-pressed={o.valor === valor} onClick={() => onCambio(o.valor)}>
          {o.etiqueta}
        </button>
      ))}
    </div>
  );
}

export const Interruptor = ({ activo, onCambio, etiqueta, deshabilitado }: { activo: boolean; onCambio: (v: boolean) => void; etiqueta: string; deshabilitado?: boolean }) => (
  <button type="button" role="switch" className="interruptor" aria-checked={activo} aria-label={etiqueta} disabled={deshabilitado} onClick={() => onCambio(!activo)} />
);

export function Paginacion({ pagina, porPagina, total, onCambio }: { pagina: number; porPagina: number; total: number; onCambio: (p: number) => void }) {
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  if (total === 0) return null;
  const desde = (pagina - 1) * porPagina + 1;
  const hasta = Math.min(pagina * porPagina, total);
  return (
    <div className="paginacion">
      <span>
        {desde}–{hasta} de {total.toLocaleString('es-ES')}
      </span>
      <div className="acciones">
        <Boton pequeno variante="fantasma" disabled={pagina <= 1} onClick={() => onCambio(pagina - 1)} aria-label="Página anterior">
          <IconoFlechaIzq tam={16} />
        </Boton>
        <Boton pequeno variante="fantasma" disabled={pagina >= paginas} onClick={() => onCambio(pagina + 1)} aria-label="Página siguiente">
          <IconoFlechaDer tam={16} />
        </Boton>
      </div>
    </div>
  );
}

// ---------- Modal ----------

export function Modal({ abierto, onCerrar, children, pie }: { abierto: boolean; onCerrar: () => void; children: ReactNode; pie: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (abierto && !d.open) d.showModal();
    if (!abierto && d.open) d.close();
  }, [abierto]);
  return (
    <dialog ref={ref} className="modal" onClose={onCerrar} onClick={(e) => e.target === ref.current && onCerrar()}>
      <div className="modal-cuerpo">{children}</div>
      <div className="modal-pie">{pie}</div>
    </dialog>
  );
}

// ---------- Avisos ----------

interface Toast {
  id: number;
  tipo: 'exito' | 'error';
  texto: string;
}

const ToastContext = createContext<(tipo: Toast['tipo'], texto: string) => void>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const avisar = useCallback((tipo: Toast['tipo'], texto: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, tipo, texto }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);
  return (
    <ToastContext.Provider value={avisar}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.tipo}`}>
            {t.tipo === 'exito' ? <IconoOk /> : <IconoAlerta />}
            {t.texto}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
