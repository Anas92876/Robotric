import { createServer } from 'node:http';
import { env } from './config/env';
import { bootstrap } from './bootstrap';
import { logger } from './shared/logger';

/** Long-running server entry (local dev, Railway, any Node host). */
const { app, close } = bootstrap();
const server = createServer(app);

server.listen(env.PORT, () => {
  logger.info(`Server listening on port ${env.PORT}`);
});

function shutdown(signal: string): void {
  logger.info(`${signal} received, shutting down`);
  server.close(() => {
    close()
      .catch((err: unknown) => logger.error(err, 'Error closing database'))
      .finally(() => process.exit(0));
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => logger.error({ reason }, 'Unhandled promise rejection'));
