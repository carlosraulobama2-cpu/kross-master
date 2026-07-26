"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generarFirmaSimulada = generarFirmaSimulada;
exports.buildQrPayload = buildQrPayload;
exports.parsearQr = parsearQr;
exports.esQrExpirado = esQrExpirado;
exports.generarNonce = generarNonce;
function generarNonce() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
function generarFirmaSimulada(payload) {
    const base = JSON.stringify(payload);
    let hash = 0;
    for (let i = 0; i < base.length; i++) {
        hash = (hash << 5) - hash + base.charCodeAt(i);
        hash |= 0;
    }
    return `SIG-${Math.abs(hash).toString(16).toUpperCase().padStart(8, '0')}`;
}
function buildQrPayload({ ticketId, eventId, seat, ttlSeconds = 600 }) {
    const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
    const nonce = generarNonce();
    const payload = { ticket_id: ticketId, event_id: eventId, seat, exp, nonce };
    const firma = generarFirmaSimulada(payload);
    const fullPayload = { ...payload, firma };
    return JSON.stringify(fullPayload);
}
function parsearQr(codigoQr) {
    try {
        return JSON.parse(codigoQr);
    }
    catch (e) {
        return null;
    }
}
function esQrExpirado(payload) {
    return Date.now() / 1000 > payload.exp;
}
