import { env } from './config/env';
import { createApp } from './app';

const server = createApp().listen(env.port, () => {
  console.log(`Kroos Master API escuchando en el puerto ${env.port}`);
});

// Cierre ordenado (Render y Docker mandan SIGTERM al desplegar).
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
