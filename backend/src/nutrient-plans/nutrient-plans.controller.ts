import {
  Controller,
  Get,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { NutrientPlansService } from './nutrient-plans.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface AuthRequest {
  user: { id: string };
}

@UseGuards(JwtAuthGuard)
@Controller('grow-projects/:projectId/nutrients')
export class NutrientPlansController {
  constructor(private readonly nutrientPlansService: NutrientPlansService) {}

  @Get()
  findAll(
    @Param('projectId') projectId: string,
    @Request() req: AuthRequest,
  ) {
    return this.nutrientPlansService.findAllByProject(projectId, req.user.id);
  }
}
