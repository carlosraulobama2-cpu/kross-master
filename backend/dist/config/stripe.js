"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripeSecretKey = exports.stripe = void 0;
const stripe_1 = __importDefault(require("stripe"));
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
exports.stripeSecretKey = stripeSecretKey;
if (!stripeSecretKey) {
    console.warn('STRIPE_SECRET_KEY no está configurado en el backend');
}
const stripe = new stripe_1.default(stripeSecretKey, {
    apiVersion: '2025-02-24.acacia',
});
exports.stripe = stripe;
