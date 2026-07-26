"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
router.get('/terminos', (_req, res) => {
    res.json({
        version: '1.0',
        fechaActualizacion: '2026-07-26',
        titulo: 'Términos y Condiciones de Uso y Contratación de Kroos Master',
        contenido: `TÉRMINOS Y CONDICIONES DE USO Y CONTRATACIÓN DE KROOS MASTER
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

Jurisdicción y Ley Aplicable: Estos Términos se rigen por la legislación española. Para la resolución de cualquier controversia, las partes se someten a los Juzgados y Tribunales de la ciudad de Jaén (España), salvo que la ley de consumidores disponga un fuero distinto.`
    });
});
router.get('/privacidad', (_req, res) => {
    res.json({
        version: '1.0',
        titulo: 'Política de Privacidad de Kroos Master',
        contenido: `POLÍTICA DE PRIVACIDAD DE KROOS MASTER
Última actualización: 26 de julio de 2026

1. Responsable del Tratamiento
Kroos Master, con domicilio en Jaén (España), es responsable del tratamiento de los datos personales facilitados a través de la aplicación.

2. Datos Recogidos
- Datos de registro: nombre, email, teléfono, rol.
- Datos de uso: eventos consultados, entradas compradas, escaneos.
- Datos de pago: gestionados por Stripe, no almacenados por Kroos Master.
- Datos de dispositivo: modelo, sistema operativo, idioma.

3. Finalidad del Tratamiento
- Gestionar el registro y acceso a la plataforma.
- Procesar compras y emitir entradas digitales.
- Validar accesos a eventos.
- Enviar notificaciones relacionadas con el servicio.
- Cumplir obligaciones legales y fiscales.

4. Base Legal
- Ejecución contractual: procesamiento de entradas y acceso a eventos.
- Consentimiento: envío de comunicaciones comerciales.
- Obligación legal: facturación, retención de datos fiscales.
- Interés legítimo: prevención de fraudes y seguridad.

5. Conservación de Datos
- Datos de cuenta: mientras la cuenta esté activa.
- Datos de transacciones: 5 años por obligación fiscal.
- Datos de accesos y escaneos: 2 años para auditoría.
- Cookies y datos de sesión: según política de cookies.

6. Derechos del Usuario
- Acceso, rectificación y supresión.
- Limitación y oposición al tratamiento.
- Portabilidad de datos.
- Retirada del consentimiento.
- Reclamación ante la Agencia Española de Protección de Datos (AEPD).

7. Seguridad
Kroos Master implementa medidas técnicas y organizativas para proteger los datos personales, incluyendo cifrado en tránsito (HTTPS/TLS), control de acceso basado en roles y auditorías periódicas.

8. Contacto
Para ejercer tus derechos o consultas sobre protección de datos: soporte@kroosmaster.com`
    });
});
exports.default = router;
