export interface SecurityEnv {
  NODE_ENV?: string;
  TRUST_PROXY_HOPS?: string;
}

const PLACEHOLDER = /change|example|your[-_ ]?secret|secret[-_ ]?key|fallback|password|test-only/i;

/**
 * In production the JWT signing secret must be long and must not be a documented placeholder.
 * Outside production any non-empty secret is accepted (local development and CI use test secrets).
 */
export function assertJwtSecretIsAcceptable(secret: string, env: SecurityEnv): void {
  if (env.NODE_ENV !== 'production') return;
  if (secret.length < 32 || PLACEHOLDER.test(secret)) {
    throw new Error(
      'JWT_SECRET is too weak for production: use at least 32 random characters ' +
        '(for example `openssl rand -hex 32`) and never a documented placeholder.',
    );
  }
}

/** Number of reverse-proxy hops to trust for X-Forwarded-For (0 = trust none). */
export function parseTrustProxyHops(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === '') return 0;
  const hops = Number(raw);
  if (!Number.isInteger(hops) || hops < 0 || hops > 5) {
    throw new Error('TRUST_PROXY_HOPS must be an integer between 0 and 5.');
  }
  return hops;
}
