import { IsOptional, IsString, IsNumber, IsUrl, Min, Max } from 'class-validator';

export class CreateGrowLogDto {
  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsUrl()
  photoUrl?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(14)
  ph?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  ec?: number;

  @IsOptional()
  @IsNumber()
  temperature?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  humidity?: number;
}
