import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

export interface CorsEnv {
  NODE_ENV?: string;
  CORS_ORIGINS?: string;
}

/** Origin used in local development when CORS_ORIGINS is not set. Never used in production. */
export const DEFAULT_DEV_ORIGIN = 'http://localhost:3000';

/**
 * Parses CORS_ORIGINS: a comma-separated list of exact browser origins
 * (scheme + host [+ port], no path, no trailing slash, no wildcard).
 */
export function parseCorsOrigins(raw: string | undefined): string[] {
  if (!raw || !raw.trim()) return [];
  const origins: string[] = [];
  for (const entry of raw.split(',').map((item) => item.trim()).filter(Boolean)) {
    if (entry.includes('*')) {
      throw new Error(`Invalid CORS_ORIGINS entry "${entry}": wildcards are not allowed, list exact origins.`);
    }
    let origin: string;
    try {
      const url = new URL(entry);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('scheme');
      origin = url.origin;
    } catch {
      throw new Error(`Invalid CORS_ORIGINS entry "${entry}": expected an origin such as https://app.example.com.`);
    }
    if (origin !== entry) {
      throw new Error(
        `Invalid CORS_ORIGINS entry "${entry}": use the bare origin "${origin}" (no path, query or trailing slash).`,
      );
    }
    if (!origins.includes(origin)) origins.push(origin);
  }
  return origins;
}

/**
 * Allowed browser origins for the current environment.
 * - production: CORS_ORIGINS is mandatory (the server refuses to start without it);
 * - otherwise: CORS_ORIGINS if set, else http://localhost:3000.
 */
export function resolveAllowedOrigins(env: CorsEnv): string[] {
  const configured = parseCorsOrigins(env.CORS_ORIGINS);
  if (configured.length > 0) return configured;
  if (env.NODE_ENV === 'production') {
    throw new Error('CORS_ORIGINS must be set in production (comma-separated list of exact frontend origins).');
  }
  return [DEFAULT_DEV_ORIGIN];
}

export function buildCorsOptions(env: CorsEnv): CorsOptions {
  const allowed = resolveAllowedOrigins(env);
  return {
    // Requests without an Origin header (curl, server-to-server, same-origin) are not subject to CORS.
    // A listed origin is reflected; any other origin gets no CORS headers, so the browser blocks it.
    origin: (origin, callback) => callback(null, !origin || allowed.includes(origin)),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
  };
}
