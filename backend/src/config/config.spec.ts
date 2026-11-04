import { buildCorsOptions, DEFAULT_DEV_ORIGIN, parseCorsOrigins, resolveAllowedOrigins } from './cors';
import { assertJwtSecretIsAcceptable, parseTrustProxyHops } from './security';

function allowed(env: Record<string, string | undefined>, origin: string | undefined): boolean {
  const options = buildCorsOptions(env) as { origin: (o: string | undefined, cb: (e: Error | null, ok?: boolean) => void) => void };
  let result = false;
  options.origin(origin, (_e, ok) => { result = !!ok; });
  return result;
}

describe('CORS configuration', () => {
  it('parses a comma separated list of exact origins and removes duplicates', () => {
    expect(parseCorsOrigins('https://a.example.test, https://b.example.test,https://a.example.test'))
      .toEqual(['https://a.example.test', 'https://b.example.test']);
  });

  it.each(['*', 'https://*.example.test', 'ftp://a.example.test', 'https://a.example.test/', 'https://a.example.test/app', 'app.example.test'])(
    'rejects %s', (bad) => { expect(() => parseCorsOrigins(bad)).toThrow(); },
  );

  it('uses the local frontend by default outside production', () => {
    expect(resolveAllowedOrigins({ NODE_ENV: 'development' })).toEqual([DEFAULT_DEV_ORIGIN]);
    expect(resolveAllowedOrigins({})).toEqual([DEFAULT_DEV_ORIGIN]);
  });

  it('refuses to start in production without CORS_ORIGINS', () => {
    expect(() => resolveAllowedOrigins({ NODE_ENV: 'production' })).toThrow(/CORS_ORIGINS/);
    expect(() => resolveAllowedOrigins({ NODE_ENV: 'production', CORS_ORIGINS: ' ' })).toThrow(/CORS_ORIGINS/);
  });

  it('allows only listed origins, plus requests without Origin', () => {
    const env = { NODE_ENV: 'production', CORS_ORIGINS: 'https://app.example.test' };
    expect(allowed(env, 'https://app.example.test')).toBe(true);
    expect(allowed(env, 'https://evil.example.test')).toBe(false);
    expect(allowed(env, 'https://app.example.test.evil.test')).toBe(false);
    expect(allowed(env, undefined)).toBe(true);
  });
});

describe('security configuration', () => {
  const strong = 'a3f9c2d41b7e4c0d8e5f6a7b9c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d';

  it('accepts any non-empty secret outside production', () => {
    expect(() => assertJwtSecretIsAcceptable('test-only-not-production', { NODE_ENV: 'test' })).not.toThrow();
  });

  it('accepts a long random secret in production', () => {
    expect(() => assertJwtSecretIsAcceptable(strong, { NODE_ENV: 'production' })).not.toThrow();
  });

  it.each(['short', 'your-secret-key-change-in-production-please-xxxxxxxx', 'fallback-secret-fallback-secret-fallback', 'x'.repeat(31)])(
    'rejects the weak production secret %s', (weak) => {
      expect(() => assertJwtSecretIsAcceptable(weak, { NODE_ENV: 'production' })).toThrow(/too weak/);
    },
  );

  it('parses the trusted proxy hop count', () => {
    expect(parseTrustProxyHops(undefined)).toBe(0);
    expect(parseTrustProxyHops('1')).toBe(1);
    expect(() => parseTrustProxyHops('-1')).toThrow();
    expect(() => parseTrustProxyHops('6')).toThrow();
    expect(() => parseTrustProxyHops('abc')).toThrow();
  });
});
