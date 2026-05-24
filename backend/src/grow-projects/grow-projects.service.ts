import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlannerService } from '../planner/planner.service';
import { StrainsService } from '../strains/strains.service';
import { CreateGrowProjectDto } from './dto/create-grow-project.dto';

@Injectable()
export class GrowProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly plannerService: PlannerService,
    private readonly strainsService: StrainsService,
  ) {}

  async findAllByUser(userId: string) {
    return this.prisma.growProject.findMany({
      where: { userId },
      include: {
        strain: true,
        _count: { select: { tasks: true, growLogs: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const project = await this.prisma.growProject.findUnique({
      where: { id },
      include: {
        strain: true,
        _count: { select: { tasks: true, growLogs: true } },
      },
    });

    if (!project) {
      throw new NotFoundException(`Grow project "${id}" not found`);
    }
    if (project.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return project;
  }

  async create(dto: CreateGrowProjectDto, userId: string) {
    // Validate strain exists
    const strain = await this.strainsService.findById(dto.strainId);

    const project = await this.prisma.growProject.create({
      data: {
        name: dto.name,
        growType: dto.growType,
        growMethod: dto.growMethod,
        startDate: new Date(dto.startDate),
        userId,
        strainId: dto.strainId,
      },
      include: { strain: true },
    });

    // Auto-generate tasks and nutrient plans
    await this.plannerService.generatePlan({
      id: project.id,
      growType: project.growType,
      growMethod: project.growMethod,
      startDate: project.startDate,
      strain: { floweringWeeks: strain.floweringWeeks },
    });

    return project;
  }

  async remove(id: string, userId: string) {
    const project = await this.findOne(id, userId);

    // Delete related records first (cascade alternative)
    await this.prisma.$transaction([
      this.prisma.task.deleteMany({ where: { growProjectId: project.id } }),
      this.prisma.growLog.deleteMany({ where: { growProjectId: project.id } }),
      this.prisma.nutrientPlan.deleteMany({ where: { growProjectId: project.id } }),
      this.prisma.growProject.delete({ where: { id: project.id } }),
    ]);

    return { message: `Grow project "${project.name}" deleted successfully` };
  }

  async getTasksForProject(projectId: string, userId: string) {
    await this.findOne(projectId, userId);
    return this.prisma.task.findMany({
      where: { growProjectId: projectId },
      orderBy: [{ weekNumber: 'asc' }, { createdAt: 'asc' }],
    });
  }
}
