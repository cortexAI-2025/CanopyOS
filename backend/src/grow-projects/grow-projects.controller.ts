import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { GrowProjectsService } from './grow-projects.service';
import { CreateGrowProjectDto } from './dto/create-grow-project.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface AuthRequest {
  user: { id: string };
}

@UseGuards(JwtAuthGuard)
@Controller('grow-projects')
export class GrowProjectsController {
  constructor(private readonly growProjectsService: GrowProjectsService) {}

  @Get()
  findAll(@Request() req: AuthRequest) {
    return this.growProjectsService.findAllByUser(req.user.id);
  }

  @Post()
  create(@Body() dto: CreateGrowProjectDto, @Request() req: AuthRequest) {
    return this.growProjectsService.create(dto, req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.growProjectsService.findOne(id, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.growProjectsService.remove(id, req.user.id);
  }

  @Get(':id/tasks')
  getTasks(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.growProjectsService.getTasksForProject(id, req.user.id);
  }
}
