import { IsNumber, IsOptional, IsString, IsUrl, Max, MaxLength, Min } from 'class-validator';

export class CreatePlantLogDto {
  @IsOptional() @IsString() @MaxLength(5000) notes?: string;
  @IsOptional() @IsUrl({ require_protocol: true, protocols: ['https'] }) photoUrl?: string;
  @IsOptional() @IsNumber() @Min(0) @Max(14) ph?: number;
  @IsOptional() @IsNumber() @Min(0) ec?: number;
  @IsOptional() @IsNumber() temperature?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(100) humidity?: number;
}
