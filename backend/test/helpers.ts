import { INestApplication } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { AddressInfo } from 'net';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

// Node 20 provides fetch/FormData/Blob globally; avoid depending on DOM typings.
export const g: any = globalThis;

export interface TestServer {
  app: INestApplication;
  base: string;
}

/** Boots the real AppModule with the same configuration as src/main.ts (configureApp). */
export async function startServer(env: NodeJS.ProcessEnv = process.env): Promise<TestServer> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>();
  configureApp(app, env);
  await app.init();
  await app.listen(0, '127.0.0.1');
  return { app, base: `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}` };
}

export async function http(base: string, method: string, path: string, token?: string, body?: unknown,
  extraHeaders: Record<string, string> = {}) {
  const res = await g.fetch(base + path, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...extraHeaders,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: any = text;
  try { data = JSON.parse(text); } catch { /* not JSON */ }
  return { status: res.status as number, data, headers: res.headers };
}

export async function upload(base: string, path: string, token: string, bytes: Buffer, filename: string, type: string) {
  const form = new g.FormData();
  form.append('photo', new g.Blob([bytes], { type }), filename);
  const res = await g.fetch(base + path, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
  const text = await res.text();
  let data: any = text;
  try { data = JSON.parse(text); } catch { /* not JSON */ }
  return { status: res.status as number, data };
}

export async function download(base: string, path: string, token: string) {
  const res = await g.fetch(base + path, { headers: { Authorization: `Bearer ${token}` } });
  return { status: res.status as number, bytes: Buffer.from(await res.arrayBuffer()), headers: res.headers };
}

export interface Account { email: string; password: string; id: string; token: string }

export async function registerAccount(base: string, tag: string, run: string): Promise<Account> {
  const acc: Account = { email: `int-${tag}-${run}@example.test`, password: `test-only-password-${tag}`, id: '', token: '' };
  const res = await http(base, 'POST', '/auth/register', undefined, { email: acc.email, password: acc.password, name: `Test ${tag}` });
  if (res.status !== 201) throw new Error(`register ${tag} failed: ${res.status} ${JSON.stringify(res.data)}`);
  acc.token = res.data.token;
  acc.id = res.data.user.id;
  return acc;
}

export const uniqueRun = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
