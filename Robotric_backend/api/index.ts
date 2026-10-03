import { bootstrap } from '../src/bootstrap';

/**
 * Vercel serverless entry. The app (and its database pool) is built once per
 * function instance and reused across invocations.
 */
const { app } = bootstrap();

export default app;
