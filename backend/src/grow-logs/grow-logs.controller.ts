import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { GrowLogsService } from './grow-logs.service';
import { CreateGrowLogDto } from './dto/create-grow-log.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface AuthRequest {
  user: { id: string };
}

@UseGuards(JwtAuthGuard)
@Controller('grow-projects/:projectId/logs')
export class GrowLogsController {
  constructor(private readonly growLogsService: GrowLogsService) {}

  @Get()
  findAll(
    @Param('projectId') projectId: string,
    @Request() req: AuthRequest,
  ) {
    return this.growLogsService.findAllByProject(projectId, req.user.id);
  }

  @Post()
  create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateGrowLogDto,
    @Request() req: AuthRequest,
  ) {
    return this.growLogsService.create(projectId, dto, req.user.id);
  }
}
