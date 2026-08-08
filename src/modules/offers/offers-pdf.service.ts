import { Injectable } from '@nestjs/common';
import { existsSync } from 'fs';
import { join } from 'path';
import PDFDocument from 'pdfkit';
import type { GenerateOfferPdfDto } from './dto/generate-offer-pdf.dto';
import {
  OFFER_PDF_COLORS,
  OFFER_PDF_CONTACT,
  OFFER_PDF_DEFAULT_FREQUENCIES_TITLE,
  OFFER_PDF_LOGO_PATH,
  OFFER_PDF_SUBTITLE,
  OFFER_PDF_TITLE,
} from './offers-pdf.constants';

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const PAGE_MARGIN = 40;
const CONTENT_WIDTH = A4_WIDTH - PAGE_MARGIN * 2;
const TABLE_LINE_WIDTH = 1;
const LOGO_SIZE = 46;
const FOOTER_TOP = A4_HEIGHT - 78;

@Injectable()
export class OffersPdfService {
  async generatePdf(dto: GenerateOfferPdfDto): Promise<Buffer> {
    const fonts = this.resolveFonts();

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        bufferPages: true,
        margins: {
          top: PAGE_MARGIN,
          bottom: 82,
          left: PAGE_MARGIN,
          right: PAGE_MARGIN,
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.registerFont('OfferRegular', fonts.regular);
      doc.registerFont('OfferBold', fonts.bold);
      doc.registerFont('OfferExtraBold', fonts.extraBold);

      this.drawBrandHeader(doc);
      this.drawTitleBlock(doc);
      this.drawRecipient(doc, dto.recipientName, dto.recipientDetails);
      this.drawDescription(doc, dto.description);
      this.drawScopeOfWork(doc, dto.scopeOfWork);
      this.drawFrequenciesTable(
        doc,
        dto.frequenciesSectionTitle ?? OFFER_PDF_DEFAULT_FREQUENCIES_TITLE,
        dto.frequencies,
      );
      this.drawPriceSection(doc, dto.monthlyPrice, dto.priceNote);
      this.drawContactFooter(doc);

      doc.end();
    });
  }

  private resolveFonts() {
    const dejavu = join(
      process.cwd(),
      'node_modules',
      'dejavu-fonts-ttf',
      'ttf',
    );
    const bold = join(dejavu, 'DejaVuSans-Bold.ttf');
    return {
      regular: join(dejavu, 'DejaVuSans.ttf'),
      bold,
      extraBold: bold,
    };
  }

  private drawBrandHeader(doc: PDFKit.PDFDocument) {
    const logoPath = join(process.cwd(), OFFER_PDF_LOGO_PATH);
    const headerTop = PAGE_MARGIN;
    const brandGap = 12;

    if (existsSync(logoPath)) {
      doc.image(logoPath, PAGE_MARGIN, headerTop, {
        width: LOGO_SIZE,
        height: LOGO_SIZE,
      });
    }

    const textX = PAGE_MARGIN + LOGO_SIZE + brandGap;
    doc.font('OfferExtraBold').fontSize(22);
    const textY = headerTop + (LOGO_SIZE - 26) / 2;
    const clearWidth = doc.widthOfString('Clear');

    doc
      .fillColor(OFFER_PDF_COLORS.navy)
      .text('Clear', textX, textY, { lineBreak: false });
    doc
      .fillColor(OFFER_PDF_COLORS.blueLight)
      .text('Nest', textX + clearWidth, textY, { lineBreak: false });

    const lineY = headerTop + LOGO_SIZE + 10;
    doc
      .save()
      .moveTo(PAGE_MARGIN, lineY)
      .lineTo(PAGE_MARGIN + CONTENT_WIDTH, lineY)
      .strokeColor(OFFER_PDF_COLORS.blueBorder)
      .lineWidth(1)
      .stroke();
    doc.restore();

    doc.x = PAGE_MARGIN;
    doc.y = lineY + 10;
  }

  private drawTitleBlock(doc: PDFKit.PDFDocument) {
    doc
      .font('OfferExtraBold')
      .fontSize(12.5)
      .fillColor(OFFER_PDF_COLORS.navy)
      .text(OFFER_PDF_TITLE, PAGE_MARGIN, doc.y, {
        width: CONTENT_WIDTH,
        align: 'left',
      });

    doc.moveDown(0.1);

    doc
      .font('OfferRegular')
      .fontSize(9.5)
      .fillColor(OFFER_PDF_COLORS.textMuted)
      .text(OFFER_PDF_SUBTITLE, PAGE_MARGIN, doc.y, {
        width: CONTENT_WIDTH,
        align: 'left',
      });

    doc.moveDown(0.45);
  }

  private drawRecipient(
    doc: PDFKit.PDFDocument,
    recipientName: string,
    recipientDetails?: string,
  ) {
    doc.moveDown(0.35);

    doc
      .font('OfferRegular')
      .fontSize(8.5)
      .fillColor(OFFER_PDF_COLORS.textSoft)
      .text('Oferta przygotowana dla', PAGE_MARGIN, doc.y, {
        width: CONTENT_WIDTH,
      });

    doc.moveDown(0.35);

    doc
      .font('OfferBold')
      .fontSize(11)
      .fillColor(OFFER_PDF_COLORS.navy)
      .text(recipientName, PAGE_MARGIN, doc.y, {
        width: CONTENT_WIDTH,
      });

    if (recipientDetails?.trim()) {
      doc.moveDown(0.25);
      doc
        .font('OfferRegular')
        .fontSize(9)
        .fillColor(OFFER_PDF_COLORS.textMuted)
        .text(recipientDetails.trim(), PAGE_MARGIN, doc.y, {
          width: CONTENT_WIDTH,
        });
    }

    doc.moveDown(1.1);
  }

  private drawDescription(doc: PDFKit.PDFDocument, description: string) {
    doc
      .font('OfferRegular')
      .fontSize(9)
      .fillColor(OFFER_PDF_COLORS.textMuted)
      .text(description, PAGE_MARGIN, doc.y, {
        width: CONTENT_WIDTH,
        align: 'justify',
        lineGap: 1.2,
      });
    doc.moveDown(0.65);
  }

  private drawScopeOfWork(doc: PDFKit.PDFDocument, items: string[]) {
    doc
      .font('OfferBold')
      .fontSize(10.5)
      .fillColor(OFFER_PDF_COLORS.navy)
      .text('Zakres prac', PAGE_MARGIN, doc.y, { width: CONTENT_WIDTH });
    doc.moveDown(0.25);

    const bulletX = PAGE_MARGIN + 4;
    const textX = PAGE_MARGIN + 18;
    const textWidth = CONTENT_WIDTH - 18;

    for (const item of items) {
      const y = doc.y + 2.5;
      doc
        .save()
        .circle(bulletX + 2.5, y + 3.5, 1.8)
        .fill(OFFER_PDF_COLORS.blueLight);
      doc.restore();

      doc
        .font('OfferRegular')
        .fontSize(9)
        .fillColor(OFFER_PDF_COLORS.text)
        .text(item, textX, doc.y, {
          width: textWidth,
          lineGap: 0.8,
        });
      doc.moveDown(0.14);
    }
    doc.moveDown(0.55);
  }

  private drawFrequenciesTable(
    doc: PDFKit.PDFDocument,
    sectionTitle: string,
    rows: GenerateOfferPdfDto['frequencies'],
  ) {
    const col1Width = Math.round(CONTENT_WIDTH * 0.58 * 100) / 100;
    const col2Width = CONTENT_WIDTH - col1Width;
    const rowPaddingX = 8;
    const rowPaddingY = 4;
    const titleHeight = 20;
    const bodyFontSize = 8.5;
    const startX = PAGE_MARGIN;
    const titleY = doc.y;

    doc.save();
    doc
      .rect(startX, titleY, CONTENT_WIDTH, titleHeight)
      .fill(OFFER_PDF_COLORS.accentMuted);
    doc
      .lineWidth(TABLE_LINE_WIDTH)
      .strokeColor(OFFER_PDF_COLORS.blue)
      .rect(startX, titleY, CONTENT_WIDTH, titleHeight)
      .stroke();
    doc.restore();

    doc
      .font('OfferBold')
      .fontSize(9.5)
      .fillColor(OFFER_PDF_COLORS.navy)
      .text(sectionTitle, startX + rowPaddingX, titleY + 5.5, {
        width: CONTENT_WIDTH - rowPaddingX * 2,
        align: 'left',
      });

    let y = titleY + titleHeight;

    rows.forEach((row, index) => {
      doc.font('OfferRegular').fontSize(bodyFontSize);
      const nameHeight = doc.heightOfString(row.name, {
        width: col1Width - rowPaddingX * 2,
      });
      const freqHeight = doc.heightOfString(row.frequency, {
        width: col2Width - rowPaddingX * 2,
      });
      const rowHeight = Math.max(nameHeight, freqHeight) + rowPaddingY * 2;
      const bg =
        index % 2 === 1 ? OFFER_PDF_COLORS.rowAlt : OFFER_PDF_COLORS.white;

      doc.save();
      doc.rect(startX, y, CONTENT_WIDTH, rowHeight).fill(bg);
      doc
        .lineWidth(TABLE_LINE_WIDTH)
        .strokeColor(OFFER_PDF_COLORS.blue)
        .rect(startX, y, col1Width, rowHeight)
        .stroke()
        .rect(startX + col1Width, y, col2Width, rowHeight)
        .stroke();
      doc.restore();

      const textY = y + rowPaddingY;
      doc
        .font('OfferRegular')
        .fontSize(bodyFontSize)
        .fillColor(OFFER_PDF_COLORS.text)
        .text(row.name, startX + rowPaddingX, textY, {
          width: col1Width - rowPaddingX * 2,
        });

      doc
        .font('OfferRegular')
        .fontSize(bodyFontSize)
        .fillColor(OFFER_PDF_COLORS.textMuted)
        .text(row.frequency, startX + col1Width + rowPaddingX, textY, {
          width: col2Width - rowPaddingX * 2,
        });

      y += rowHeight;
      doc.y = y;
    });

    doc.moveDown(1.6);
  }

  private drawPriceSection(
    doc: PDFKit.PDFDocument,
    monthlyPrice: string,
    priceNote: string,
  ) {
    doc
      .font('OfferRegular')
      .fontSize(9.5)
      .fillColor(OFFER_PDF_COLORS.textMuted)
      .text('Miesięczna wartość usługi', PAGE_MARGIN, doc.y, {
        width: CONTENT_WIDTH,
      });

    doc.moveDown(0.12);

    doc
      .font('OfferExtraBold')
      .fontSize(16)
      .fillColor(OFFER_PDF_COLORS.blueLight)
      .text(monthlyPrice, PAGE_MARGIN, doc.y, {
        width: CONTENT_WIDTH,
      });

    doc.moveDown(0.22);

    doc
      .font('OfferRegular')
      .fontSize(8)
      .fillColor(OFFER_PDF_COLORS.textSoft)
      .text(priceNote, PAGE_MARGIN, doc.y, {
        width: CONTENT_WIDTH,
      });
  }

  private drawContactFooter(doc: PDFKit.PDFDocument) {
    const range = doc.bufferedPageRange();
    const { preparedBy, phoneDisplay, email } = OFFER_PDF_CONTACT;

    for (let i = range.start; i < range.start + range.count; i += 1) {
      doc.switchToPage(i);

      const previousBottom = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;

      const lineY = FOOTER_TOP;
      doc
        .save()
        .moveTo(PAGE_MARGIN, lineY)
        .lineTo(PAGE_MARGIN + CONTENT_WIDTH, lineY)
        .strokeColor(OFFER_PDF_COLORS.blueBorder)
        .lineWidth(1)
        .stroke();
      doc.restore();

      let y = lineY + 10;

      doc
        .font('OfferRegular')
        .fontSize(8.5)
        .fillColor(OFFER_PDF_COLORS.textMuted)
        .text(`Ofertę przygotowała ${preparedBy}.`, PAGE_MARGIN, y, {
          width: CONTENT_WIDTH,
        });

      y = doc.y + 3;

      doc
        .font('OfferRegular')
        .fontSize(8.5)
        .fillColor(OFFER_PDF_COLORS.textMuted)
        .text(
          `Aby uzyskać więcej informacji, skontaktuj się telefonicznie pod numerem ${phoneDisplay} lub napisz na adres ${email}.`,
          PAGE_MARGIN,
          y,
          { width: CONTENT_WIDTH, lineGap: 1 },
        );

      doc.page.margins.bottom = previousBottom;
    }
  }
}
