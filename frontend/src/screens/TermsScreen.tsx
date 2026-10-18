import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEntradas } from '../context/EntradasContext';
import { BACKEND_URL } from '../config/env';

interface TermsScreenProps {
  navigation: any;
}

const TERMS_VERSION = '1.0';

const TERMS_TEXT = `TÉRMINOS Y CONDICIONES DE USO Y CONTRATACIÓN DE KROOS MASTER
Última actualización: 26 de julio de 2026

I. Marco Legal y Definiciones Generales
Titularidad del Servicio: La plataforma Kroos Master es un servicio de software operado por [Tu Nombre / Razón Social], con DNI/NIF [Tu DNI/CIF], domicilio en Jaén (España) y correo electrónico de contacto [soporte@kroosmaster.com].

Objeto: Los presentes Términos regulan el acceso, navegación, registro y uso de la aplicación móvil y web Kroos Master, así como la compraventa de entradas digitales para eventos.

Naturaleza del Servicio: Kroos Master opera exclusivamente como una plataforma tecnológica e intermediaria de intermediación en la venta de entradas de eventos organizados por terceros.

Definición de Usuario: Se considera usuario a toda persona física o jurídica que acceda a la app, navegue por sus contenidos, cree una cuenta o adquiera entradas.

Definición de Organizador: Persona física o jurídica (artista, promotora, sala de conciertos) que utiliza la infraestructura de Kroos Master para publicar, gestionar y cobrar eventos.

Definición de Entrada / Ticket: Documento digital provisto de un código de verificación único (QR o hash) que acredita el derecho de acceso al evento especificado.

Aceptación Expresa: El uso de la aplicación o la compra de cualquier entrada implica la lectura, comprensión y aceptación plena de la totalidad de estas cláusulas.

Modificación de los Términos: Kroos Master se reserva el derecho de actualizar este documento en cualquier momento. Los cambios sustanciales serán notificados en la app o por email.

II. Registro, Cuentas y Seguridad
Edad Mínima: La app está destinada a usuarios mayores de 16 años. Los menores de esta edad requieren autorización expresa de sus padres o tutores legales.

Veracidad de la Información: El usuario garantiza que todos los datos facilitados durante el registro (nombre, email, teléfono) son veraces, exactos y completos.

Responsabilidad de la Cuenta: Las credenciales de acceso son personales e intransferibles. El usuario es el único responsable de la custodia y seguridad de su contraseña o accesos mediante login social (Google/Apple).

Cancelación y Suspensión de Cuentas: Kroos Master se reserva el derecho de suspender o eliminar cualquier cuenta que incurra en fraudes, uso indebido de la app o violaciones de estos términos.

III. Venta de Entradas y Condiciones de Pago
Precios e Impuestos: Todos los precios publicados en la plataforma están expresados en Euros (€) e incluyen los impuestos indirectos aplicables (IVA), salvo indicación contraria.

Gastos de Gestión (Service Fee): Kroos Master aplica una tarifa por servicios de intermediación y gestión tecnológica en cada entrada. Esta tarifa se desglosa claramente antes de finalizar el pago.

Procesamiento de Pagos: Las transacciones económicas se gestionan mediante la pasarela de pago segura Stripe. Kroos Master no almacena directamente datos bancarios o números de tarjeta.

Confirmación de Compra: Tras completar el pago, la entrada estará inmediatamente disponible en la sección "Mis Entradas" de la app y se enviará un justificante al correo registrado.

Límite de Compra por Usuario: El Organizador puede fijar un límite máximo de entradas adquiribles por un mismo usuario para evitar acaparamientos y reventas.

IV. Cambios, Devoluciones y Cancelaciones
Ausencia del Derecho de Desistimiento: En virtud del art. 103.l de la Ley General para la Defensa de los Consumidores y Usuarios, no existe derecho de desistimiento ni devolución por cambio de opinión una vez comprada la entrada.

Cancelación Definitiva del Evento: Si el evento es cancelado definitivamente por el Organizador, este será el responsable legal del reembolso del importe de las entradas.

Aplazamiento o Cambio de Recinto: Si el evento cambia de fecha, hora o ubicación, la entrada mantendrá su validez para la nueva fecha. Si el usuario no puede asistir, la política de reembolso dependerá del Organizador.

No Devolución por Causas Ajenas: No se realizarán devoluciones por causas no imputables a la app o al evento (pérdida del transporte, inclemencias meteorológicas menores, enfermedad personal, etc.).

V. Acceso, Control de Aforo y Seguridad Anti-Fraude
Validez del Código QR: La entrada es válida únicamente si el código QR es escaneado y verificado con éxito en la puerta por la app de control de accesos Kroos Master Scan.

Uso Único: Un código QR solo permite un (1) único acceso. Una vez escaneado y marcado como "USADO", la entrada queda invalidad permanentemente.

Prohibición estricta de Reventa: Queda prohibida la reventa lucrativa de entradas fuera de los canales oficiales. Las entradas detectadas en reventa ilegal podrán ser anuladas sin reembolso.

Responsabilidad por Duplicados: Si un usuario comparte o envía su código QR a terceros y este es escaneado antes por otra persona, el titular de la compra perderá el derecho de entrada sin reclamación posible a Kroos Master.

Transferencia Oficial entre Usuarios: Si la app incluye la opción de reasignación/regalo de entrada, la transferencia invalida el QR del emisor y genera uno totalmente nuevo para el receptor.

Derecho de Admisión: El Organizador y el personal de seguridad del local se reservan el derecho de admisión al evento de acuerdo con la normativa local vigente.

VI. Relación entre Artistas / Promotores y Kroos Master
Uso de Stripe Connect: Los Organizadores deben vincular y verificar una cuenta en Stripe Connect para recibir los cobros directamente en su cuenta bancaria.

Responsabilidad de Facturación al Asistente: El Organizador es el sujeto pasivo obligado a emitir factura al comprador por el importe de la entrada si este la solicita.

Gestión de Permisos a Staff: El Organizador es responsable de asignar correctamente los permisos de escaneo (vía email o PIN) al personal de puerta autorizado.

Cumplimiento de Aforos y Licencias: El Organizador garantiza contar con todas las licencias administrativas, permisos de SGAE/derechos de autor y autorizaciones de aforo para celebrar el evento.

VII. Propiedad Intelectual, Datos y Disponibilidad
Propiedad de la Plataforma: El diseño, código fuente, logotipos, marca "Kroos Master" y elementos gráficos son propiedad exclusiva de [Tu Nombre/Empresa].

Protección de Datos (RGPD): Los datos personales se tratan conforme al Reglamento General de Protección de Datos de la UE. Se utilizan exclusivamente para procesar entradas, validar accesos y enviar notificaciones relativas al servicio.

Comunicaciones y Notificaciones: El usuario acepta recibir notificaciones push y emails relacionados con el estado de sus entradas o alertas del evento adquirido.

Disponibilidad del Servicio: Kroos Master realiza esfuerzos para garantizar un funcionamiento 24/7, pero no garantiza la ausencia total de interrupciones técnicas temporales por mantenimiento o fallos de servidores ajenos.

VIII. Limitación de Responsabilidad y Ley Aplicable
Exención por Calidad del Evento: Kroos Master no responde por la calidad artística, duración, fallos de sonido o cambios de cartelera del concierto u organizador.

Casos de Fuerza Mayor: Ni Kroos Master ni el Organizador serán responsables por la cancelación o suspensión de eventos derivados de guerras, catástrofes naturales, alertas sanitarias o decisiones judiciales.

Nulidad Parcial: Si cualquier cláusula de este documento es declarada nula o inaplicable por un tribunal, las cláusulas restantes mantendrán su plena vigencia.

Resolución Extrajudicial de Conflictos: En cumplimiento del Art. 14.1 del Reglamento (UE) 524/2013, la Comisión Europea facilita una plataforma de resolución de litigios en línea accesible en: https://ec.europa.eu/consumers/odr.

Jurisdicción y Ley Aplicable: Estos Términos se rigen por la legislación española. Para la resolución de cualquier controversia, las partes se someten a los Juzgados y Tribunales de la ciudad de Jaén (España), salvo que la ley de consumidores disponga un fuero distinto.`;

export default function TermsScreen({ navigation }: TermsScreenProps) {
  const { verificarTerminos, aceptarTerminos } = useEntradas();
  const [version, setVersion] = useState(TERMS_VERSION);
  const [aceptado, setAceptado] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [termsText, setTermsText] = useState('');

  useEffect(() => {
    cargarTerminos();
    verificarAceptacion();
  }, []);

  async function cargarTerminos() {
    try {
      const backendUrl = BACKEND_URL;
      const response = await fetch(`${backendUrl}/api/legal/terminos`);
      const data = await response.json();
      if (data.contenido) {
        setTermsText(data.contenido);
      } else {
        setTermsText(TERMS_TEXT);
      }
    } catch (e) {
      console.error('Error cargando términos:', e);
      setTermsText(TERMS_TEXT);
    }
  }

  async function verificarAceptacion() {
    try {
      const result = await verificarTerminos(version);
      setAceptado(result.aceptado);
    } catch (e) {
      console.error('Error verificando términos:', e);
    } finally {
      setCargando(false);
    }
  }

  const handleAceptar = async (): Promise<void> => {
    try {
      setCargando(true);
      await aceptarTerminos(version);
      setAceptado(true);
      Alert.alert('Éxito', 'Términos aceptados correctamente');
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo aceptar');
    } finally {
      setCargando(false);
    }
  };

  if (cargando) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Cargando...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Términos y Condiciones</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.version}>Versión {version}</Text>
        <Text style={styles.date}>Última actualización: 26 de julio de 2026</Text>

        <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
          <Text style={styles.termsText}>{termsText}</Text>
        </ScrollView>

        <TouchableOpacity
          style={[styles.acceptButton, aceptado && styles.acceptButtonDisabled]}
          onPress={handleAceptar}
          disabled={aceptado || cargando}
        >
          <Text style={styles.acceptButtonText}>
            {aceptado ? 'Aceptado' : 'Aceptar términos'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D12',
  },
  loading: {
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  content: {
    padding: 20,
  },
  version: {
    color: '#8E8E93',
    fontSize: 12,
    marginBottom: 4,
    textAlign: 'center',
  },
  date: {
    color: '#8E8E93',
    fontSize: 11,
    marginBottom: 20,
    textAlign: 'center',
  },
  termsText: {
    color: '#A1A1A1',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 20,
  },
  acceptButton: {
    backgroundColor: '#00FF87',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  acceptButtonDisabled: {
    opacity: 0.6,
  },
  acceptButtonText: {
    color: '#0D0D12',
    fontWeight: '800',
    fontSize: 15,
  },
});
