import { Body, Controller, Post, Res } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { GenerateOfferPdfDto } from './dto/generate-offer-pdf.dto';
import { OffersPdfService } from './offers-pdf.service';

@ApiTags('offers')
@ApiBearerAuth()
@Roles('ADMIN', 'MANAGER')
@Controller('offers')
export class OffersController {
  constructor(private readonly offersPdfService: OffersPdfService) {}

  @Post('pdf')
  @ApiOperation({
    summary: 'Generuje ofertę współpracy w formacie PDF (A4)',
  })
  @ApiProduces('application/pdf')
  @ApiOkResponse({
    description: 'Plik PDF oferty',
    content: {
      'application/pdf': {
        schema: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiBody({ type: GenerateOfferPdfDto })
  async generatePdf(
    @Body() dto: GenerateOfferPdfDto,
    @Res() res: Response,
  ): Promise<void> {
    const pdf = await this.offersPdfService.generatePdf(dto);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="oferta-wspolpracy.pdf"',
    );
    res.setHeader('Content-Length', String(pdf.length));
    res.setHeader(
      'Access-Control-Expose-Headers',
      'Content-Disposition, Content-Type, Content-Length',
    );
    res.send(pdf);
  }
}
