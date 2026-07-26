import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';

config({ path: path.resolve(__dirname, '../.env') });

const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'STRIPE_SECRET_KEY'];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(`Faltan variables requeridas en backend/.env: ${missing.join(', ')}`);
  process.exit(1);
}

console.log('Variables de entorno del backend OK');
