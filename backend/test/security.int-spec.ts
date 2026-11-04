/**
 * Integration test: CORS, authentication rate limiting and the photo pipeline hardening.
 * Real AppModule, real PostgreSQL, throwaway accounts and a throwaway upload directory.
 */
import { INestApplication } from '@nestjs/common';
import { join } from 'path';
import { rm } from 'fs/promises';
import { PrismaService } from '../src/prisma/prisma.service';
import { Account, download, http, registerAccount, startServer, upload, uniqueRun } from './helpers';

const ORIGIN_OK = 'https://app.example.test';
const ORIGIN_BAD = 'https://evil.example.test';
const GPS = Buffer.from('GPSLATITUDE-48.8566N');

/** Structurally valid JPEG: SOI, EXIF (orientation 6 + GPS-like bytes), comment, scan, EOI. */
function jpegWithMetadata(): Buffer {
  const seg = (marker: number, payload: Buffer) => {
    const head = Buffer.alloc(4);
    head.writeUInt16BE(0xff00 | marker, 0);
    head.writeUInt16BE(payload.length + 2, 2);
    return Buffer.concat([head, payload]);
  };
  const tiff = Buffer.alloc(26);
  tiff.write('MM', 0);
  tiff.writeUInt16BE(42, 2);
  tiff.writeUInt32BE(8, 4);
  tiff.writeUInt16BE(1, 8);
  tiff.writeUInt16BE(0x0112, 10);
  tiff.writeUInt16BE(3, 12);
  tiff.writeUInt32BE(1, 14);
  tiff.writeUInt16BE(6, 18);
  return Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    seg(0xe1, Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), tiff, GPS])),
    seg(0xfe, Buffer.from('commentaire secret')),
    seg(0xda, Buffer.from([1, 1, 0, 0, 63, 0])),
    Buffer.from([1, 2, 3, 4]),
    Buffer.from([0xff, 0xd9]),
  ]);
}

describe('CORS (allow-list per environment)', () => {
  let app: INestApplication;
  let base: string;

  beforeAll(async () => {
    ({ app, base } = await startServer({ ...process.env, NODE_ENV: 'test', CORS_ORIGINS: `${ORIGIN_OK},https://beta.example.test` }));
  });
  afterAll(async () => { await app?.close(); });

  it('answers the preflight of a listed origin and reflects exactly that origin', async () => {
    const res = await http(base, 'OPTIONS', '/plants', undefined, undefined, {
      Origin: ORIGIN_OK, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'authorization,content-type',
    });
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe(ORIGIN_OK);
    expect(res.headers.get('access-control-allow-credentials')).toBe('true');
    expect(res.headers.get('access-control-allow-origin')).not.toBe('*');
  });

  it('gives no CORS header to an unlisted origin (preflight and simple request)', async () => {
    const pre = await http(base, 'OPTIONS', '/plants', undefined, undefined, {
      Origin: ORIGIN_BAD, 'Access-Control-Request-Method': 'GET',
    });
    expect(pre.headers.get('access-control-allow-origin')).toBeNull();
    const get = await http(base, 'GET', '/plants', undefined, undefined, { Origin: ORIGIN_BAD });
    expect(get.headers.get('access-control-allow-origin')).toBeNull();
    expect(get.status).toBe(401);
  });

  it('still serves requests without an Origin header (mobile apps, curl, health checks)', async () => {
    expect((await http(base, 'GET', '/plants')).status).toBe(401);
  });

  it('does not advertise the framework', async () => {
    const res = await http(base, 'GET', '/plants');
    expect(res.headers.get('x-powered-by')).toBeNull();
  });
});

describe('authentication rate limiting', () => {
  let app: INestApplication;
  let base: string;
  const saved = { limit: process.env.AUTH_RATE_LIMIT, window: process.env.AUTH_RATE_WINDOW_SEC };
  const run = uniqueRun();

  beforeAll(async () => {
    process.env.AUTH_RATE_LIMIT = '5';
    process.env.AUTH_RATE_WINDOW_SEC = '60';
    ({ app, base } = await startServer());
  });
  afterAll(async () => {
    await app?.close();
    for (const [key, value] of [['AUTH_RATE_LIMIT', saved.limit], ['AUTH_RATE_WINDOW_SEC', saved.window]] as const) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  });

  it('answers 401 to the first wrong passwords, then 429 once the limit is exceeded', async () => {
    const attempt = () => http(base, 'POST', '/auth/login', undefined, { email: `nobody-${run}@example.test`, password: 'wrong-password-1' });
    const statuses: number[] = [];
    for (let i = 0; i < 7; i++) statuses.push((await attempt()).status);
    expect(statuses.slice(0, 5)).toEqual([401, 401, 401, 401, 401]);
    expect(statuses.slice(5)).toEqual([429, 429]);
  });

  it('keeps counters per route: registration is not blocked by exhausted login attempts', async () => {
    const res = await http(base, 'POST', '/auth/register', undefined, {
      email: `int-rl-${run}@example.test`, password: 'test-only-password-rl', name: 'Rate limit',
    });
    expect(res.status).toBe(201);
    const prisma = app.get(PrismaService);
    await prisma.user.deleteMany({ where: { email: `int-rl-${run}@example.test` } });
  });

  it('does not rate limit the journal API', async () => {
    for (let i = 0; i < 8; i++) expect((await http(base, 'GET', '/plants')).status).toBe(401);
  });
});

describe('photo storage hardening', () => {
  let app: INestApplication;
  let base: string;
  let prisma: PrismaService;
  let A: Account;
  let plant = '';
  const run = uniqueRun();
  const savedCap = process.env.PHOTOS_MAX_PER_PLANT;

  beforeAll(async () => {
    ({ app, base } = await startServer());
    prisma = app.get(PrismaService);
    A = await registerAccount(base, 'ph', run);
    const created = await http(base, 'POST', '/plants', A.token, { name: 'Photo plant', customStrain: 'Fictional variety', growType: 'INDOOR', growMethod: 'COCO' });
    expect(created.status).toBe(201);
    plant = created.data.id;
  });
  afterAll(async () => {
    if (savedCap === undefined) delete process.env.PHOTOS_MAX_PER_PLANT; else process.env.PHOTOS_MAX_PER_PLANT = savedCap;
    if (prisma) {
      await prisma.plant.deleteMany({ where: { user: { email: A?.email } } });
      await prisma.user.deleteMany({ where: { email: A?.email } });
    }
    await app?.close();
  });

  it('removes GPS and comments from an uploaded JPEG but keeps the orientation', async () => {
    const original = jpegWithMetadata();
    expect(original.includes(GPS)).toBe(true);
    const up = await upload(base, `/plants/${plant}/photos`, A.token, original, 'leaf.jpg', 'image/jpeg');
    expect(up.status).toBe(201);
    const stored = await download(base, `/plants/${plant}/photos/${up.data.id}`, A.token);
    expect(stored.status).toBe(200);
    expect(stored.headers.get('content-type')).toBe('image/jpeg');
    expect(stored.bytes.includes(GPS)).toBe(false);
    expect(stored.bytes.includes(Buffer.from('commentaire secret'))).toBe(false);
    expect(stored.bytes.includes(Buffer.from([1, 2, 3, 4]))).toBe(true); // image data untouched
    expect(stored.bytes.includes(Buffer.from('Exif\0\0', 'latin1'))).toBe(true); // minimal EXIF with orientation only
    expect(stored.bytes.length).toBeLessThan(original.length);
  });

  it('rejects a file with a JPEG signature but corrupt content, and stores nothing', async () => {
    const before = await prisma.plantPhoto.count({ where: { plantId: plant } });
    const res = await upload(base, `/plants/${plant}/photos`, A.token, Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x01, 0x02]), 'bad.jpg', 'image/jpeg');
    expect(res.status).toBe(400);
    expect(await prisma.plantPhoto.count({ where: { plantId: plant } })).toBe(before);
  });

  it('answers 404 (not 500) when the file has disappeared from the storage volume', async () => {
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
    const up = await upload(base, `/plants/${plant}/photos`, A.token, png, 'gone.png', 'image/png');
    expect(up.status).toBe(201);
    const row = await prisma.plantPhoto.findUniqueOrThrow({ where: { id: up.data.id } });
    await rm(join(process.env.CANOPYOS_UPLOAD_DIR as string, row.fileName));
    const res = await download(base, `/plants/${plant}/photos/${up.data.id}`, A.token);
    expect(res.status).toBe(404);
  });

  it('answers 404 for an unknown photo id', async () => {
    const res = await download(base, `/plants/${plant}/photos/does-not-exist`, A.token);
    expect(res.status).toBe(404);
  });

  it('enforces the per-plant photo cap', async () => {
    const existing = await prisma.plantPhoto.count({ where: { plantId: plant } });
    process.env.PHOTOS_MAX_PER_PLANT = String(existing + 1);
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
    expect((await upload(base, `/plants/${plant}/photos`, A.token, png, 'ok.png', 'image/png')).status).toBe(201);
    const over = await upload(base, `/plants/${plant}/photos`, A.token, png, 'over.png', 'image/png');
    expect(over.status).toBe(400);
    expect(JSON.stringify(over.data)).toMatch(/limit/i);
    expect(await prisma.plantPhoto.count({ where: { plantId: plant } })).toBe(existing + 1);
  });
});
