import {
  IsString,
  IsEnum,
  IsDateString,
  IsNotEmpty,
} from 'class-validator';
import { GrowType, GrowMethod } from '@prisma/client';

export class CreateGrowProjectDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(GrowType)
  growType: GrowType;

  @IsEnum(GrowMethod)
  growMethod: GrowMethod;

  @IsDateString()
  startDate: string;

  @IsString()
  @IsNotEmpty()
  strainId: string;
}
