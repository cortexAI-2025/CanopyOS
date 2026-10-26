import { NotFoundException } from '@nestjs/common';
import { PlantsService } from './plants.service';

describe('PlantsService tenant isolation', () => {
  const owner = 'account-A';
  const other = 'account-B';
  const plant = { id: 'plant-1', userId: owner, name: 'Plant 1' };
  let prisma: any;
  let service: PlantsService;

  beforeEach(() => {
    prisma = {
      plant: {
        findFirst: jest.fn(async ({ where }: any) =>
          where.id === plant.id && where.userId === owner ? plant : null),
        findMany: jest.fn(async ({ where }: any) =>
          where.userId === owner ? [plant] : []),
        create: jest.fn(async ({ data }: any) => ({ id: 'new-plant', ...data })),
      },
      plantLog: {
        findMany: jest.fn(async () => []),
        create: jest.fn(async ({ data }: any) => ({ id: 'log-1', ...data })),
      },
      strain: { findUnique: jest.fn() },
    };
    service = new PlantsService(prisma);
  });

  it('returns only the plants belonging to the requesting account', async () => {
    expect(await service.list(owner)).toHaveLength(1);
    expect(await service.list(other)).toHaveLength(0);
    expect(prisma.plant.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: other } }),
    );
  });

  it('hides another account plant as not found', async () => {
    await expect(service.get(plant.id, other)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('blocks another account from reading plant observations', async () => {
    await expect(service.logs(plant.id, other)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.plantLog.findMany).not.toHaveBeenCalled();
  });

  it('blocks another account from writing plant observations', async () => {
    await expect(service.addLog(plant.id, other, { notes: 'not authorized' }))
      .rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.plantLog.create).not.toHaveBeenCalled();
  });

  it('creates an observation for the owner', async () => {
    const result = await service.addLog(plant.id, owner, { notes: 'New leaf' });
    expect(result).toEqual({ id: 'log-1', plantId: plant.id, notes: 'New leaf' });
  });

  it('creates a plant with a manually entered variety', async () => {
    const result = await service.create(owner, {
      name: 'Plant 2', customStrain: 'Test variety', growType: 'INDOOR',
      growMethod: 'COCO',
    });
    expect(result.userId).toBe(owner);
    expect(result.growMethod).toBe('COCO');
  });
});
