import {
  IsString,
  IsEnum,
  IsInt,
  IsOptional,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { GeneticType, Difficulty } from '@prisma/client';

export class CreateStrainDto {
  @IsString()
  name: string;

  @IsEnum(GeneticType)
  genetics: GeneticType;

  @IsInt()
  @Min(1)
  @Max(20)
  floweringWeeks: number;

  @IsString()
  yieldEstimate: string;

  @IsEnum(Difficulty)
  difficulty: Difficulty;

  @IsString()
  climateSuitability: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  thcContent?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  cbdContent?: number;
}
