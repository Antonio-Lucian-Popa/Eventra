import { createApp } from './app.js';
import { config } from './config/env.js';
import { prisma } from './lib/prisma.js';

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`Eveniment API pornit pe http://localhost:${config.port}`);
});

async function shutdown() {
  console.log('Oprire server...');
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
