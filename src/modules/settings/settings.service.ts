import { Injectable } from '@nestjs/common';
import { mapSettings } from '../../domain/mappers';
import { DEFAULT_SETTINGS } from '../../domain/types';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/settings.dto';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings() {
    const row = await this.prisma.systemSettings.findUnique({ where: { id: 1 } });
    if (!row) {
      return { ...DEFAULT_SETTINGS };
    }
    return mapSettings(row);
  }

  async updateSettings(dto: UpdateSettingsDto) {
    const row = await this.prisma.systemSettings.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        vatStatus: dto.vatStatus ?? 'exempt',
        vatRate: dto.vatRate ?? 0.23,
        zusMonthly: dto.zusMonthly ?? 1519.19,
        zusType: dto.zusType ?? 'standardowy',
        healthContributionMode: dto.healthContributionMode ?? 'auto',
        healthContributionManualMonthly: dto.healthContributionManualMonthly ?? 432.54,
        healthRateOverrideEnabled: dto.healthRateOverrideEnabled ?? false,
        healthRateOverride: dto.healthRateOverride ?? 0.09,
        taxForm: dto.taxForm ?? 'ryczalt',
        ryczaltRate: dto.ryczaltRate ?? 0.085,
        additionalCosts: dto.additionalCosts ?? 500,
        vatExemptionThreshold: dto.vatExemptionThreshold ?? 200000,
      },
      update: dto,
    });
    return mapSettings(row);
  }

  async resetAllData() {
    await this.prisma.$transaction([
      this.prisma.shift.deleteMany(),
      this.prisma.facilitySkipDay.deleteMany(),
      this.prisma.customHoliday.deleteMany(),
      this.prisma.employee.deleteMany(),
      this.prisma.facility.deleteMany(),
      this.prisma.systemSettings.upsert({
        where: { id: 1 },
        create: {
          id: 1,
          vatStatus: 'exempt',
          vatRate: 0.23,
          zusMonthly: 1519.19,
          zusType: 'standardowy',
          healthContributionMode: 'auto',
          healthContributionManualMonthly: 432.54,
          healthRateOverrideEnabled: false,
          healthRateOverride: 0.09,
          taxForm: 'ryczalt',
          ryczaltRate: 0.085,
          additionalCosts: 500,
          vatExemptionThreshold: 200000,
        },
        update: {
          vatStatus: 'exempt',
          vatRate: 0.23,
          zusMonthly: 1519.19,
          zusType: 'standardowy',
          healthContributionMode: 'auto',
          healthContributionManualMonthly: 432.54,
          healthRateOverrideEnabled: false,
          healthRateOverride: 0.09,
          taxForm: 'ryczalt',
          ryczaltRate: 0.085,
          additionalCosts: 500,
          vatExemptionThreshold: 200000,
        },
      }),
    ]);

    return this.getSettings();
  }
}
