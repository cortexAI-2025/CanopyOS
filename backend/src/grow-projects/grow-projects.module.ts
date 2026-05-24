import { Module } from '@nestjs/common';
import { GrowProjectsService } from './grow-projects.service';
import { GrowProjectsController } from './grow-projects.controller';
import { PlannerModule } from '../planner/planner.module';
import { StrainsModule } from '../strains/strains.module';

@Module({
  imports: [PlannerModule, StrainsModule],
  controllers: [GrowProjectsController],
  providers: [GrowProjectsService],
})
export class GrowProjectsModule {}
