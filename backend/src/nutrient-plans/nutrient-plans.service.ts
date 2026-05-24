import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NutrientPlansService {
  constructor(private readonly prisma: PrismaService) {}

  private async verifyProjectOwnership(
    projectId: string,
    userId: string,
  ): Promise<void> {
    const project = await this.prisma.growProject.findUnique({
      where: { id: projectId },
      select: { userId: true },
    });

    if (!project) {
      throw new NotFoundException(`Grow project "${projectId}" not found`);
    }
    if (project.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }
  }

  async findAllByProject(projectId: string, userId: string) {
    await this.verifyProjectOwnership(projectId, userId);
    return this.prisma.nutrientPlan.findMany({
      where: { growProjectId: projectId },
      orderBy: { weekNumber: 'asc' },
    });
  }
}
