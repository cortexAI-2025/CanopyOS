import { IsDateString, IsEnum, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';
import { GrowMethod, GrowType } from '@prisma/client';

export class CreatePlantDto {
  @IsString() @MaxLength(120) name: string;
  @IsEnum(GrowType) growType: GrowType;
  @IsEnum(GrowMethod) growMethod: GrowMethod;
  @IsOptional() @IsString() strainId?: string;
  @IsOptional() @IsString() @MaxLength(180) customStrain?: string;
  @IsOptional() @IsDateString() startDate?: string;
}
