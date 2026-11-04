/**
 * Integration test: isolation of the legacy routes (grow projects, tasks, project logs, nutrient plans).
 * Real AppModule, real PostgreSQL, two throwaway accounts. Account B must never read or alter account A's data.
 */
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { Account, http, registerAccount, startServer, uniqueRun } from './helpers';

describe('legacy API isolation (real database, two accounts)', () => {
  let app: INestApplication;
  let base: string;
  let prisma: PrismaService;
  const run = uniqueRun();
  let A: Account;
  let B: Account;
  let strainId = '';
  let projectA = '';
  let taskA = '';
  let logA = '';

  const denied = (status: number) => [403, 404].includes(status);

  beforeAll(async () => {
    ({ app, base } = await startServer());
    prisma = app.get(PrismaService);
    A = await registerAccount(base, 'la', run);
    B = await registerAccount(base, 'lb', run);
    const strain = await prisma.strain.create({
      data: {
        name: `int-strain-${run}`, genetics: 'HYBRID', floweringWeeks: 8,
        yieldEstimate: 'n/a', difficulty: 'EASY', climateSuitability: 'n/a',
      },
    });
    strainId = strain.id;

    const created = await http(base, 'POST', '/grow-projects', A.token, {
      name: `Projet A ${run}`, growType: 'INDOOR', growMethod: 'COCO', startDate: '2026-11-01T00:00:00.000Z', strainId,
    });
    expect(created.status).toBe(201);
    projectA = created.data.id;
    const tasks = await http(base, 'GET', `/grow-projects/${projectA}/tasks`, A.token);
    expect(tasks.status).toBe(200);
    expect(tasks.data.length).toBeGreaterThan(0);
    taskA = tasks.data[0].id;
    const log = await http(base, 'POST', `/grow-projects/${projectA}/logs`, A.token, { notes: 'note privée A', ph: 6.1 });
    expect(log.status).toBe(201);
    logA = log.data.id;
  });

  afterAll(async () => {
    if (prisma) {
      const emails = [A?.email, B?.email].filter(Boolean) as string[];
      const projects = await prisma.growProject.findMany({ where: { user: { email: { in: emails } } }, select: { id: true } });
      const ids = projects.map((p) => p.id);
      await prisma.task.deleteMany({ where: { growProjectId: { in: ids } } });
      await prisma.growLog.deleteMany({ where: { growProjectId: { in: ids } } });
      await prisma.nutrientPlan.deleteMany({ where: { growProjectId: { in: ids } } });
      await prisma.growProject.deleteMany({ where: { id: { in: ids } } });
      await prisma.user.deleteMany({ where: { email: { in: emails } } });
      if (strainId) await prisma.strain.deleteMany({ where: { id: strainId } });
    }
    await app?.close();
  });

  it('requires authentication on every protected legacy route', async () => {
    const routes: Array<[string, string, unknown?]> = [
      ['GET', '/grow-projects'],
      ['POST', '/grow-projects', {}],
      ['GET', `/grow-projects/${projectA}`],
      ['DELETE', `/grow-projects/${projectA}`],
      ['GET', `/grow-projects/${projectA}/tasks`],
      ['GET', `/grow-projects/${projectA}/logs`],
      ['POST', `/grow-projects/${projectA}/logs`, { notes: 'x' }],
      ['GET', `/grow-projects/${projectA}/nutrients`],
      ['PATCH', `/tasks/${taskA}`, { status: 'DONE' }],
      ['GET', '/users/me'],
      ['POST', '/strains', {}],
    ];
    for (const [method, path, body] of routes) {
      const res = await http(base, method, path, undefined, body);
      expect({ method, path, status: res.status }).toEqual({ method, path, status: 401 });
    }
  });

  it('lets account A read its own legacy data', async () => {
    expect((await http(base, 'GET', '/grow-projects', A.token)).data.map((p: any) => p.id)).toContain(projectA);
    expect((await http(base, 'GET', `/grow-projects/${projectA}`, A.token)).status).toBe(200);
    expect((await http(base, 'GET', `/grow-projects/${projectA}/logs`, A.token)).data.map((l: any) => l.id)).toContain(logA);
    expect((await http(base, 'GET', `/grow-projects/${projectA}/nutrients`, A.token)).status).toBe(200);
  });

  it('shows account B an empty project list', async () => {
    const res = await http(base, 'GET', '/grow-projects', B.token);
    expect(res.status).toBe(200);
    expect(res.data).toEqual([]);
  });

  it("denies account B every read of A's project", async () => {
    for (const path of [
      `/grow-projects/${projectA}`,
      `/grow-projects/${projectA}/tasks`,
      `/grow-projects/${projectA}/logs`,
      `/grow-projects/${projectA}/nutrients`,
    ]) {
      const res = await http(base, 'GET', path, B.token);
      expect({ path, denied: denied(res.status) }).toEqual({ path, denied: true });
      expect(JSON.stringify(res.data)).not.toContain('note privée A');
    }
  });

  it("denies account B any write on A's project, and nothing changes", async () => {
    const before = {
      logs: await prisma.growLog.count({ where: { growProjectId: projectA } }),
      task: await prisma.task.findUnique({ where: { id: taskA } }),
    };

    expect(denied((await http(base, 'POST', `/grow-projects/${projectA}/logs`, B.token, { notes: 'intrusion' })).status)).toBe(true);
    expect(denied((await http(base, 'PATCH', `/tasks/${taskA}`, B.token, { status: 'DONE', title: 'piraté' })).status)).toBe(true);
    expect(denied((await http(base, 'DELETE', `/grow-projects/${projectA}`, B.token)).status)).toBe(true);

    expect(await prisma.growLog.count({ where: { growProjectId: projectA } })).toBe(before.logs);
    expect(await prisma.task.findUnique({ where: { id: taskA } })).toEqual(before.task);
    expect(await prisma.growProject.findUnique({ where: { id: projectA } })).not.toBeNull();
  });

  it('does not let B create a project that belongs to A, and ignores a forged userId', async () => {
    const res = await http(base, 'POST', '/grow-projects', B.token, {
      name: 'forgé', growType: 'INDOOR', growMethod: 'SOIL', startDate: '2026-11-01T00:00:00.000Z', strainId, userId: A.id,
    });
    expect(res.status).toBe(400); // forbidNonWhitelisted rejects the unknown field
    expect(await prisma.growProject.count({ where: { userId: A.id } })).toBe(1);
  });

  it('keeps A able to read its data afterwards, and lets A modify its own task', async () => {
    expect((await http(base, 'GET', `/grow-projects/${projectA}`, A.token)).status).toBe(200);
    const patched = await http(base, 'PATCH', `/tasks/${taskA}`, A.token, { status: 'DONE' });
    expect(patched.status).toBe(200);
    expect(patched.data.status).toBe('DONE');
  });

  it('does not leak the password hash through /users/me', async () => {
    const res = await http(base, 'GET', '/users/me', A.token);
    expect(res.status).toBe(200);
    expect(res.data.email).toBe(A.email);
    expect(JSON.stringify(res.data).toLowerCase()).not.toContain('password');
  });

  it('lets account B delete only its own project', async () => {
    const own = await http(base, 'POST', '/grow-projects', B.token, {
      name: `Projet B ${run}`, growType: 'OUTDOOR', growMethod: 'SOIL', startDate: '2026-11-01T00:00:00.000Z', strainId,
    });
    expect(own.status).toBe(201);
    expect((await http(base, 'DELETE', `/grow-projects/${own.data.id}`, B.token)).status).toBe(200);
    expect((await http(base, 'GET', `/grow-projects/${projectA}`, A.token)).status).toBe(200);
  });
});
