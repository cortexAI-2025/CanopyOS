import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlantDto } from './dto/create-plant.dto';
import { CreatePlantLogDto } from './dto/create-plant-log.dto';

@Injectable()
export class PlantsService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.plant.findMany({
      where: { userId },
      include: { strain: true, _count: { select: { plantLogs: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(id: string, userId: string) {
    const plant = await this.prisma.plant.findFirst({
      where: { id, userId }, include: { strain: true },
    });
    if (!plant) throw new NotFoundException('Plant not found');
    return plant;
  }

  async create(userId: string, dto: CreatePlantDto) {
    if (!dto.strainId && !dto.customStrain?.trim()) {
      throw new BadRequestException('Provide a catalog strain or a custom strain name');
    }
    if (dto.strainId) {
      const strain = await this.prisma.strain.findUnique({ where: { id: dto.strainId } });
      if (!strain) throw new BadRequestException('Unknown strain');
    }
    return this.prisma.plant.create({
      data: {
        userId, name: dto.name, growType: dto.growType, growMethod: dto.growMethod,
        strainId: dto.strainId, customStrain: dto.customStrain?.trim(),
        startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
      },
    });
  }

  async addLog(id: string, userId: string, dto: CreatePlantLogDto) {
    const plant = await this.get(id, userId);
    return this.prisma.plantLog.create({ data: { ...dto, plantId: plant.id } });
  }

  async logs(id: string, userId: string) {
    await this.get(id, userId);
    return this.prisma.plantLog.findMany({
      where: { plantId: id }, orderBy: { createdAt: 'desc' }, take: 100,
    });
  }
}
