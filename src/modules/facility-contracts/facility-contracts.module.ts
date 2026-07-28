import { Module } from '@nestjs/common';
import { FacilityContractsController } from './facility-contracts.controller';
import { FacilityContractsService } from './facility-contracts.service';

@Module({
  controllers: [FacilityContractsController],
  providers: [FacilityContractsService],
  exports: [FacilityContractsService],
})
export class FacilityContractsModule {}
