import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlantsService } from './plants.service';
import { CreatePlantDto } from './dto/create-plant.dto';
import { CreatePlantLogDto } from './dto/create-plant-log.dto';

interface AuthRequest { user: { id: string } }

@UseGuards(JwtAuthGuard)
@Controller('plants')
export class PlantsController {
  constructor(private readonly plants: PlantsService) {}

  @Get() list(@Request() req: AuthRequest) { return this.plants.list(req.user.id); }
  @Post() create(@Request() req: AuthRequest, @Body() dto: CreatePlantDto) {
    return this.plants.create(req.user.id, dto);
  }
  @Get(':id') get(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.plants.get(id, req.user.id);
  }
  @Get(':id/logs') logs(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.plants.logs(id, req.user.id);
  }
  @Post(':id/logs') addLog(@Param('id') id: string, @Request() req: AuthRequest, @Body() dto: CreatePlantLogDto) {
    return this.plants.addLog(id, req.user.id, dto);
  }
}
