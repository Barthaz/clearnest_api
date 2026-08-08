import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class OfferFrequencyItemDto {
  @ApiProperty({ example: 'Mycie okien' })
  @IsString()
  name!: string;

  @ApiProperty({ example: '3–4 razy w roku' })
  @IsString()
  frequency!: string;
}

export class GenerateOfferPdfDto {
  @ApiProperty({
    example: 'Przedszkole Samorządowe Nr 12 w Poznaniu',
    description: 'Nazwa podmiotu / placówki, dla którego przygotowano ofertę',
  })
  @IsString()
  recipientName!: string;

  @ApiPropertyOptional({
    example: 'ul. Przykładowa 10, 60-001 Poznań · osoba kontaktowa: Anna Kowalska',
    description: 'Opcjonalne dopiski: adres, osoba kontaktowa itp.',
  })
  @IsOptional()
  @IsString()
  recipientDetails?: string;

  @ApiProperty({
    example:
      'Niniejsza oferta obejmuje kompleksowe utrzymanie czystości we wszystkich placówkach edukacyjnych wskazanych przez Zamawiającego. Usługi realizowane są przez wykwalifikowany personel z zachowaniem obowiązujących standardów higieny i bezpieczeństwa.',
  })
  @IsString()
  description!: string;

  @ApiProperty({
    type: [String],
    example: [
      'Codzienne sprzątanie pomieszczeń',
      'Dezynfekcja powierzchni dotykowych',
      'Mycie okien',
      'Pranie dywanów i wykładzin',
      'Uzupełnianie środków higienicznych',
    ],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  scopeOfWork!: string[];

  @ApiPropertyOptional({
    example: 'Częstotliwość szczególnych prac',
    description: 'Tytuł sekcji tabeli częstotliwości',
  })
  @IsOptional()
  @IsString()
  frequenciesSectionTitle?: string;

  @ApiProperty({ type: [OfferFrequencyItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OfferFrequencyItemDto)
  frequencies!: OfferFrequencyItemDto[];

  @ApiProperty({ example: '40.000 zł brutto' })
  @IsString()
  monthlyPrice!: string;

  @ApiProperty({
    example:
      'Cena obejmuje kompleksowe dbanie o czystość we wszystkich placówkach.',
  })
  @IsString()
  priceNote!: string;
}
