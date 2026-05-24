import { Module } from '@nestjs/common';
import { StrainsService } from './strains.service';
import { StrainsController } from './strains.controller';

@Module({
  controllers: [StrainsController],
  providers: [StrainsService],
  exports: [StrainsService],
})
export class StrainsModule {}
