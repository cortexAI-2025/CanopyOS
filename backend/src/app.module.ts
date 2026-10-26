import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { StrainsModule } from './strains/strains.module';
import { GrowProjectsModule } from './grow-projects/grow-projects.module';
import { TasksModule } from './tasks/tasks.module';
import { GrowLogsModule } from './grow-logs/grow-logs.module';
import { NutrientPlansModule } from './nutrient-plans/nutrient-plans.module';
import { PlantsModule } from './plants/plants.module';
import { PlannerModule } from './planner/planner.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    StrainsModule,
    GrowProjectsModule,
    TasksModule,
    GrowLogsModule,
    NutrientPlansModule,
    PlannerModule,
    PlantsModule,
  ],
})
export class AppModule {}
