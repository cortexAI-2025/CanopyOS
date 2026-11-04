import { Module } from '@nestjs/common';
import { PlantPhotosController } from './plants.photos.controller';
import { PlantsController } from './plants.controller';
import { PlantsService } from './plants.service';
import { PhotoStorageService } from './photo-storage';

@Module({ controllers: [PlantsController, PlantPhotosController], providers: [PlantsService, PhotoStorageService] })
export class PlantsModule {}
