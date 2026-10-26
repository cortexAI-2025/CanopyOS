import { Module } from '@nestjs/common';
import { PlantPhotosController } from './plants.photos.controller';
import { PlantsController } from './plants.controller';
import { PlantsService } from './plants.service';

@Module({ controllers: [PlantsController, PlantPhotosController], providers: [PlantsService] })
export class PlantsModule {}
