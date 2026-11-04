import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { buildCorsOptions, CorsEnv } from './config/cors';
import { parseTrustProxyHops, SecurityEnv } from './config/security';

/**
 * HTTP configuration shared by the real server (main.ts) and the integration tests,
 * so the tests exercise exactly what runs in production.
 */
export function configureApp(app: NestExpressApplication, env: CorsEnv & SecurityEnv = process.env): void {
  app.disable('x-powered-by');
  const hops = parseTrustProxyHops(env.TRUST_PROXY_HOPS);
  // Needed for per-client rate limiting behind a reverse proxy; 0 means the socket address is used.
  if (hops > 0) app.set('trust proxy', hops);
  app.enableCors(buildCorsOptions(env));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
}
