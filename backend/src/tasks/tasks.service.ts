import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async updateTask(taskId: string, dto: UpdateTaskDto, userId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { growProject: true },
    });

    if (!task) {
      throw new NotFoundException(`Task "${taskId}" not found`);
    }

    if (task.growProject.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.task.update({
      where: { id: taskId },
      data: {
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.dueDate !== undefined && { dueDate: new Date(dto.dueDate) }),
      },
    });
  }
}
