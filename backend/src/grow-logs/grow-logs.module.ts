import { Module } from '@nestjs/common';
import { GrowLogsService } from './grow-logs.service';
import { GrowLogsController } from './grow-logs.controller';

@Module({
  controllers: [GrowLogsController],
  providers: [GrowLogsService],
})
export class GrowLogsModule {}
