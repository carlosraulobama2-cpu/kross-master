import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PKPass } from 'passkit-generator';
import { env } from '../config/env';

/**
 * Pases para Apple Wallet y Google Wallet. Solo se activan si están las
 * credenciales en el entorno. El código del pase es el código manual de la
 * entrada (KM-XXXX-XXXX): Wallet no admite QR dinámico, así que es menos
 * seguro que el QR de la app (una captura del pase sí serviría).
 */
export interface DatosPase {
  entradaId: string;
  codigo: string;
  titular: string;
  tramo: string;
  evento: { id: string; titulo: string; inicia_en: string; recinto: string; ciudad: string };
}

export const walletDisponible = () => ({
  apple: Boolean(env.APPLE_PASS_TYPE_ID && env.APPLE_TEAM_ID && env.APPLE_PASS_CERT && env.APPLE_PASS_KEY && env.APPLE_WWDR_CERT),
  google: Boolean(env.GOOGLE_WALLET_ISSUER_ID && env.GOOGLE_WALLET_SA_EMAIL && env.GOOGLE_WALLET_SA_KEY),
});

const fecha = (iso: string) =>
  new Date(iso).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Madrid' });

// Las claves PEM suelen guardarse en una sola línea con \n literales.
const pem = (v: string) => v.replace(/\\n/g, '\n');

export async function generarPkpass(d: DatosPase): Promise<Buffer> {
  const carpeta = join(__dirname, '../../assets/wallet');
  const archivos = Object.fromEntries(['icon.png', 'icon@2x.png', 'logo.png', 'logo@2x.png'].map((n) => [n, readFileSync(join(carpeta, n))]));
  const pase = new PKPass(
    archivos,
    {
      wwdr: pem(env.APPLE_WWDR_CERT!),
      signerCert: pem(env.APPLE_PASS_CERT!),
      signerKey: pem(env.APPLE_PASS_KEY!),
      signerKeyPassphrase: env.APPLE_PASS_KEY_PASSPHRASE,
    },
    {
      formatVersion: 1,
      passTypeIdentifier: env.APPLE_PASS_TYPE_ID!,
      teamIdentifier: env.APPLE_TEAM_ID!,
      organizationName: 'Kroos Master',
      description: `Entrada para ${d.evento.titulo}`,
      serialNumber: d.entradaId,
      backgroundColor: 'rgb(11, 11, 16)',
      foregroundColor: 'rgb(245, 245, 248)',
      labelColor: 'rgb(0, 255, 135)',
      logoText: 'Kroos Master',
    },
  );
  pase.type = 'eventTicket';
  pase.setRelevantDate(new Date(d.evento.inicia_en));
  pase.primaryFields.push({ key: 'evento', label: 'EVENTO', value: d.evento.titulo });
  pase.secondaryFields.push({ key: 'fecha', label: 'FECHA', value: fecha(d.evento.inicia_en) }, { key: 'tipo', label: 'ENTRADA', value: d.tramo });
  pase.auxiliaryFields.push({ key: 'lugar', label: 'LUGAR', value: `${d.evento.recinto}, ${d.evento.ciudad}` }, { key: 'titular', label: 'TITULAR', value: d.titular });
  pase.backFields.push({ key: 'codigo', label: 'Código', value: d.codigo });
  pase.setBarcodes({ message: d.codigo, format: 'PKBarcodeFormatQR', messageEncoding: 'iso-8859-1', altText: d.codigo });
  return pase.getAsBuffer();
}

const b64url = (v: string | Buffer) => Buffer.from(v).toString('base64url');

export function urlGoogleWallet(d: DatosPase): string {
  const emisor = env.GOOGLE_WALLET_ISSUER_ID!;
  const claseId = `${emisor}.kroos_${d.evento.id.replace(/-/g, '')}`;
  const cuerpo = {
    iss: env.GOOGLE_WALLET_SA_EMAIL,
    aud: 'google',
    typ: 'savetowallet',
    iat: Math.floor(Date.now() / 1000),
    origins: [],
    payload: {
      eventTicketClasses: [
        {
          id: claseId,
          issuerName: 'Kroos Master',
          reviewStatus: 'UNDER_REVIEW',
          eventName: { defaultValue: { language: 'es', value: d.evento.titulo } },
          venue: {
            name: { defaultValue: { language: 'es', value: d.evento.recinto } },
            address: { defaultValue: { language: 'es', value: d.evento.ciudad } },
          },
          dateTime: { start: d.evento.inicia_en },
          hexBackgroundColor: '#0b0b10',
        },
      ],
      eventTicketObjects: [
        {
          id: `${emisor}.${d.entradaId.replace(/-/g, '')}`,
          classId: claseId,
          state: 'ACTIVE',
          ticketHolderName: d.titular,
          ticketNumber: d.codigo,
          ticketType: { defaultValue: { language: 'es', value: d.tramo } },
          barcode: { type: 'QR_CODE', value: d.codigo, alternateText: d.codigo },
        },
      ],
    },
  };
  const cabecera = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const datos = b64url(JSON.stringify(cuerpo));
  const firma = createSign('RSA-SHA256').update(`${cabecera}.${datos}`).sign(pem(env.GOOGLE_WALLET_SA_KEY!));
  return `https://pay.google.com/gp/v/save/${cabecera}.${datos}.${b64url(firma)}`;
}
