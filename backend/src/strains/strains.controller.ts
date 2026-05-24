import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { StrainsService } from './strains.service';
import { CreateStrainDto } from './dto/create-strain.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('strains')
export class StrainsController {
  constructor(private readonly strainsService: StrainsService) {}

  @Get()
  findAll() {
    return this.strainsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.strainsService.findById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateStrainDto) {
    return this.strainsService.create(dto);
  }
}
