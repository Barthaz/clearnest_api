import { Module } from '@nestjs/common';
import { OffersController } from './offers.controller';
import { OffersPdfService } from './offers-pdf.service';

@Module({
  controllers: [OffersController],
  providers: [OffersPdfService],
})
export class OffersModule {}
