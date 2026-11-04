/**
 * Integration test: real AppModule, real Prisma client, real PostgreSQL, real HTTP.
 * Requires DATABASE_URL (migrated database) and JWT_SECRET. Uses only throwaway accounts.
 *
 * The unit suite mocks Prisma, so it cannot detect a schema/migration mismatch, a missing
 * ownership check in a controller or a broken upload pipeline. This suite does.
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { AddressInfo } from 'net';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

// Node 20 provides fetch/FormData/Blob globally; avoid depending on DOM typings.
const g: any = globalThis;
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

describe('plant journal API (real database, two accounts)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let base: string;

  const run = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const accounts = {
    A: { email: `int-a-${run}@example.test`, password: 'test-only-password-A', id: '', token: '' },
    B: { email: `int-b-${run}@example.test`, password: 'test-only-password-B', id: '', token: '' },
  };
  let plantA = '';
  let photoA = '';

  async function http(method: string, path: string, token?: string, body?: unknown) {
    const res = await g.fetch(base + path, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let data: any = text;
    try { data = JSON.parse(text); } catch { /* not JSON */ }
    return { status: res.status as number, data, headers: res.headers };
  }

  async function upload(path: string, token: string, bytes: Buffer, filename: string, type: string) {
    const form = new g.FormData();
    form.append('photo', new g.Blob([bytes], { type }), filename);
    const res = await g.fetch(base + path, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const text = await res.text();
    let data: any = text;
    try { data = JSON.parse(text); } catch { /* not JSON */ }
    return { status: res.status as number, data };
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    // Same global pipe as src/main.ts
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    await app.listen(0, '127.0.0.1');
    base = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
    prisma = app.get(PrismaService);

    for (const key of ['A', 'B'] as const) {
      const acc = accounts[key];
      const res = await http('POST', '/auth/register', undefined, {
        email: acc.email, password: acc.password, name: `Test account ${key}`,
      });
      expect(res.status).toBe(201);
      acc.token = res.data.token;
      acc.id = res.data.user.id;
    }
  });

  afterAll(async () => {
    if (prisma) {
      const emails = [accounts.A.email, accounts.B.email];
      await prisma.plant.deleteMany({ where: { user: { email: { in: emails } } } });
      await prisma.user.deleteMany({ where: { email: { in: emails } } });
    }
    await app?.close();
  });

  describe('authentication', () => {
    it('rejects requests without a token', async () => {
      expect((await http('GET', '/plants')).status).toBe(401);
      expect((await http('POST', '/plants', undefined, { name: 'x' })).status).toBe(401);
    });

    it('rejects a token signed with the old hardcoded fallback secret', async () => {
      const forged = new JwtService({ secret: 'fallback-secret' }).sign({ sub: accounts.A.id, email: accounts.A.email });
      expect((await http('GET', '/plants', forged)).status).toBe(401);
    });

    it('logs in with the registered credentials', async () => {
      const res = await http('POST', '/auth/login', undefined, {
        email: accounts.A.email, password: accounts.A.password,
      });
      expect(res.status).toBe(200);
      expect(typeof res.data.token).toBe('string');
    });
  });

  describe('account A: plant, journal entries and photos persist', () => {
    it('creates a COCO plant with a free-text variety', async () => {
      const res = await http('POST', '/plants', accounts.A.token, {
        name: 'Plant A1', customStrain: 'Fictional variety', growType: 'INDOOR', growMethod: 'COCO',
      });
      expect(res.status).toBe(201);
      expect(res.data.userId).toBe(accounts.A.id);
      plantA = res.data.id;
      const row = await prisma.plant.findUnique({ where: { id: plantA } });
      expect(row?.growMethod).toBe('COCO');
    });

    it('stores a journal entry with measurements and returns it', async () => {
      const created = await http('POST', `/plants/${plantA}/logs`, accounts.A.token, {
        notes: 'First leaves', ph: 6.1, ec: 1.4, temperature: 23.5, humidity: 55,
      });
      expect(created.status).toBe(201);
      const list = await http('GET', `/plants/${plantA}/logs`, accounts.A.token);
      expect(list.status).toBe(200);
      expect(list.data).toHaveLength(1);
      expect(list.data[0]).toMatchObject({ notes: 'First leaves', ph: 6.1, ec: 1.4, temperature: 23.5, humidity: 55 });
    });

    it('rejects invalid measurements and unknown fields', async () => {
      const bad = [
        { ph: 15 }, { ph: -1 }, { humidity: 101 }, { ec: -0.1 },
        { photoUrl: 'http://insecure.example.test/a.png' },
        { notes: 'x', plantId: 'other-plant' },
      ];
      for (const body of bad) {
        const res = await http('POST', `/plants/${plantA}/logs`, accounts.A.token, body);
        expect(res.status).toBe(400);
      }
      const list = await http('GET', `/plants/${plantA}/logs`, accounts.A.token);
      expect(list.data).toHaveLength(1);
    });

    it('stores a PNG photo and serves the same bytes back privately', async () => {
      const res = await upload(`/plants/${plantA}/photos`, accounts.A.token, PNG_1X1, 'leaf.png', 'image/png');
      expect(res.status).toBe(201);
      photoA = res.data.id;
      const list = await http('GET', `/plants/${plantA}/photos`, accounts.A.token);
      expect(list.data).toHaveLength(1);
      const file = await g.fetch(`${base}/plants/${plantA}/photos/${photoA}`, {
        headers: { Authorization: `Bearer ${accounts.A.token}` },
      });
      expect(file.status).toBe(200);
      expect(file.headers.get('content-type')).toBe('image/png');
      expect(file.headers.get('cache-control')).toContain('no-store');
      expect(Buffer.from(await file.arrayBuffer()).equals(PNG_1X1)).toBe(true);
    });

    it('rejects non-images, disguised files and oversized files, and stores nothing', async () => {
      const disguised = await upload(`/plants/${plantA}/photos`, accounts.A.token, Buffer.from('not an image'), 'x.png', 'image/png');
      expect(disguised.status).toBe(400);
      const svg = await upload(`/plants/${plantA}/photos`, accounts.A.token,
        Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'), 'x.svg', 'image/svg+xml');
      expect(svg.status).toBe(400);
      const big = Buffer.concat([PNG_1X1, Buffer.alloc(6 * 1024 * 1024)]);
      const oversized = await upload(`/plants/${plantA}/photos`, accounts.A.token, big, 'big.png', 'image/png');
      expect([400, 413]).toContain(oversized.status);
      expect(await prisma.plantPhoto.count({ where: { plantId: plantA } })).toBe(1);
    });
  });

  describe('account B cannot read or modify account A data', () => {
    it('sees none of the plants of A', async () => {
      const res = await http('GET', '/plants', accounts.B.token);
      expect(res.status).toBe(200);
      expect(res.data).toEqual([]);
    });

    it('cannot read the plant, its entries or its photos', async () => {
      expect((await http('GET', `/plants/${plantA}`, accounts.B.token)).status).toBe(404);
      expect((await http('GET', `/plants/${plantA}/logs`, accounts.B.token)).status).toBe(404);
      expect((await http('GET', `/plants/${plantA}/photos`, accounts.B.token)).status).toBe(404);
      const photo = await g.fetch(`${base}/plants/${plantA}/photos/${photoA}`, {
        headers: { Authorization: `Bearer ${accounts.B.token}` },
      });
      expect(photo.status).toBe(404);
    });

    it('cannot add an entry or a photo to the plant of A', async () => {
      const log = await http('POST', `/plants/${plantA}/logs`, accounts.B.token, { notes: 'intrusion' });
      expect(log.status).toBe(404);
      const photo = await upload(`/plants/${plantA}/photos`, accounts.B.token, PNG_1X1, 'intrusion.png', 'image/png');
      expect(photo.status).toBe(404);
      expect(await prisma.plantLog.count({ where: { plantId: plantA } })).toBe(1);
      expect(await prisma.plantPhoto.count({ where: { plantId: plantA } })).toBe(1);
    });

    it('cannot change or delete the plant of A through any other verb', async () => {
      for (const method of ['PATCH', 'PUT', 'DELETE']) {
        for (const path of [`/plants/${plantA}`, `/plants/${plantA}/logs`, `/plants/${plantA}/photos/${photoA}`]) {
          const res = await http(method, path, accounts.B.token, method === 'DELETE' ? undefined : { name: 'hijacked' });
          expect([403, 404]).toContain(res.status);
        }
      }
      const row = await prisma.plant.findUnique({ where: { id: plantA } });
      expect(row?.name).toBe('Plant A1');
      expect(row?.userId).toBe(accounts.A.id);
    });

    it('cannot reach a photo of A by pairing it with one of its own plants', async () => {
      const own = await http('POST', '/plants', accounts.B.token, {
        name: 'Plant B1', customStrain: 'Fictional variety', growType: 'OUTDOOR', growMethod: 'SOIL',
      });
      expect(own.status).toBe(201);
      const res = await g.fetch(`${base}/plants/${own.data.id}/photos/${photoA}`, {
        headers: { Authorization: `Bearer ${accounts.B.token}` },
      });
      expect(res.status).not.toBe(200);
      expect([400, 404]).toContain(res.status);
    });

    it('cannot create a plant on behalf of another account', async () => {
      const res = await http('POST', '/plants', accounts.B.token, {
        name: 'Stolen', customStrain: 'x', growType: 'INDOOR', growMethod: 'SOIL', userId: accounts.A.id,
      });
      expect(res.status).toBe(400);
    });
  });

  it('account A still sees exactly its own data afterwards', async () => {
    const plants = await http('GET', '/plants', accounts.A.token);
    expect(plants.data.map((p: any) => p.id)).toEqual([plantA]);
    expect((await http('GET', `/plants/${plantA}/logs`, accounts.A.token)).data).toHaveLength(1);
    expect((await http('GET', `/plants/${plantA}/photos`, accounts.A.token)).data).toHaveLength(1);
  });
});
