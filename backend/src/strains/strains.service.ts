import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStrainDto } from './dto/create-strain.dto';

@Injectable()
export class StrainsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.strain.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    const strain = await this.prisma.strain.findUnique({ where: { id } });
    if (!strain) {
      throw new NotFoundException(`Strain with id "${id}" not found`);
    }
    return strain;
  }

  async create(dto: CreateStrainDto) {
    const existing = await this.prisma.strain.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException(`Strain "${dto.name}" already exists`);
    }
    return this.prisma.strain.create({ data: dto });
  }
}
