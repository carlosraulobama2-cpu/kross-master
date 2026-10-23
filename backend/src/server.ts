import { env } from './config/env';
import { crearApp } from './app';
import { iniciarJobs } from './jobs';
import { logger } from './lib/logger';

const app = crearApp();
const server = app.listen(env.PORT, () => logger.info(`API de Kroos Master escuchando en :${env.PORT}`));
const pararJobs = iniciarJobs();

function apagar(senal: string) {
  logger.info(`${senal} recibido, cerrando…`);
  pararJobs();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => apagar('SIGTERM'));
process.on('SIGINT', () => apagar('SIGINT'));
