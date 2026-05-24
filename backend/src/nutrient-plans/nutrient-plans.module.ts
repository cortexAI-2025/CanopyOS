import { Module } from '@nestjs/common';
import { NutrientPlansService } from './nutrient-plans.service';
import { NutrientPlansController } from './nutrient-plans.controller';

@Module({
  controllers: [NutrientPlansController],
  providers: [NutrientPlansService],
})
export class NutrientPlansModule {}
