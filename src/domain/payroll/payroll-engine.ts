import { CONFIG_2026 } from './config2026';
import type { ContractType, PayrollInput, PayrollResult } from './types';

const DEFAULT_WYPADKOWA_STOPA = 0.0167;

export function round2(x: number): number {
  return Math.round((x + Number.EPSILON) * 100) / 100;
}

export function roundPLN(x: number): number {
  return Math.round(x);
}

export function obliczZaliczkePIT(podstawaMiesieczna: number, pit2: boolean): number {
  const c = CONFIG_2026.pit;
  if (podstawaMiesieczna <= 0) return 0;
  let podatek = podstawaMiesieczna * c.rate1;
  if (pit2) podatek -= c.taxReducingMonthly;
  return Math.max(0, roundPLN(podatek));
}

export function ulgaMlodychZwolnienie(brutto: number, aktywna: boolean): number {
  if (!aktywna) return 0;
  return Math.min(brutto, CONFIG_2026.pit.ulgaMlodychLimit);
}

export function obliczUmowaOPrace(input: PayrollInput): PayrollResult {
  const cfg = CONFIG_2026.rates;
  const brutto = input.brutto;

  const emerytalnaE = round2(brutto * cfg.emerytalnaEmployee);
  const rentowaE = round2(brutto * cfg.rentowaEmployee);
  const chorobowaE = round2(brutto * cfg.chorobowa);
  const sumaSpoleczneE = round2(emerytalnaE + rentowaE + chorobowaE);

  const podstawaZdrowotna = round2(brutto - sumaSpoleczneE);
  const zdrowotna = round2(podstawaZdrowotna * cfg.zdrowotna);

  const emerytalnaP = round2(brutto * cfg.emerytalnaEmployer);
  const rentowaP = round2(brutto * cfg.rentowaEmployer);
  const wypadkowaP = round2(brutto * DEFAULT_WYPADKOWA_STOPA);
  const fp = input.fpExempt ? 0 : round2(brutto * cfg.funduszPracy);
  const fgsp = input.fpExempt ? 0 : round2(brutto * cfg.fgsp);

  const zwolnioneUlga = ulgaMlodychZwolnienie(brutto, input.ulgaMlodych);
  const przychodOpodatkowany = round2(brutto - zwolnioneUlga);

  const kup = input.kupPodwyzszone
    ? CONFIG_2026.pit.increasedKUPMonthly
    : CONFIG_2026.pit.standardKUPMonthly;

  let podstawaPIT = 0;
  let zaliczkaPIT = 0;
  if (przychodOpodatkowany > 0) {
    const udzialOpodatkowany = brutto > 0 ? Math.min(1, przychodOpodatkowany / brutto) : 0;
    const proporcjonalneSkladki = round2(sumaSpoleczneE * udzialOpodatkowany);
    podstawaPIT = Math.max(0, roundPLN(przychodOpodatkowany - proporcjonalneSkladki - kup));
    zaliczkaPIT = obliczZaliczkePIT(podstawaPIT, input.pit2);
  }

  const netto = round2(brutto - sumaSpoleczneE - zdrowotna - zaliczkaPIT);
  const kosztCalkowity = round2(brutto + emerytalnaP + rentowaP + wypadkowaP + fp + fgsp);

  return {
    brutto,
    emerytalnaE,
    rentowaE,
    chorobowaE,
    sumaSpoleczneE,
    zdrowotna,
    emerytalnaP,
    rentowaP,
    wypadkowaP,
    fp,
    fgsp,
    zwolnioneUlga,
    kup,
    podstawaPIT,
    zaliczkaPIT,
    netto,
    kosztCalkowity,
  };
}

export function obliczZlecenie(input: PayrollInput): PayrollResult {
  const cfg = CONFIG_2026.rates;
  const brutto = input.brutto;

  const pelnyZUSExempt = input.student;
  const spoleczneExempt = input.innyTytul;

  let emerytalnaE = 0;
  let rentowaE = 0;
  let chorobowaE = 0;
  let emerytalnaP = 0;
  let rentowaP = 0;
  let wypadkowaP = 0;
  let zdrowotna = 0;
  let fp = 0;
  let fgsp = 0;

  if (!pelnyZUSExempt) {
    if (!spoleczneExempt) {
      emerytalnaE = round2(brutto * cfg.emerytalnaEmployee);
      rentowaE = round2(brutto * cfg.rentowaEmployee);
      emerytalnaP = round2(brutto * cfg.emerytalnaEmployer);
      rentowaP = round2(brutto * cfg.rentowaEmployer);
      wypadkowaP = round2(brutto * DEFAULT_WYPADKOWA_STOPA);
      if (input.dobrowolneChorobowe) chorobowaE = round2(brutto * cfg.chorobowa);
      if (!input.fpExempt) {
        fp = round2(brutto * cfg.funduszPracy);
        fgsp = round2(brutto * cfg.fgsp);
      }
    }
    const sumaSpoleczneETmp = round2(emerytalnaE + rentowaE + chorobowaE);
    const podstawaZdrowotna = round2(brutto - sumaSpoleczneETmp);
    zdrowotna = round2(podstawaZdrowotna * cfg.zdrowotna);
  }

  const sumaSpoleczneE = round2(emerytalnaE + rentowaE + chorobowaE);

  const zwolnioneUlga = ulgaMlodychZwolnienie(brutto, input.ulgaMlodych);
  const przychodOpodatkowany = round2(brutto - zwolnioneUlga);

  const kupRate = CONFIG_2026.pit.zlecenieKUPRate;

  let podstawaPIT = 0;
  let zaliczkaPIT = 0;
  if (przychodOpodatkowany > 0) {
    const udzialOpodatkowany = brutto > 0 ? przychodOpodatkowany / brutto : 0;
    const proporcjonalneSkladki = round2(sumaSpoleczneE * udzialOpodatkowany);
    const podstawaKUP = round2((przychodOpodatkowany - proporcjonalneSkladki) * kupRate);
    podstawaPIT = Math.max(0, roundPLN(przychodOpodatkowany - proporcjonalneSkladki - podstawaKUP));
    zaliczkaPIT = obliczZaliczkePIT(podstawaPIT, input.pit2);
  }

  const netto = round2(brutto - sumaSpoleczneE - zdrowotna - zaliczkaPIT);
  const kosztCalkowity = round2(brutto + emerytalnaP + rentowaP + wypadkowaP + fp + fgsp);

  return {
    brutto,
    emerytalnaE,
    rentowaE,
    chorobowaE,
    sumaSpoleczneE,
    zdrowotna,
    emerytalnaP,
    rentowaP,
    wypadkowaP,
    fp,
    fgsp,
    zwolnioneUlga,
    kup: 0,
    podstawaPIT,
    zaliczkaPIT,
    netto,
    kosztCalkowity,
  };
}

export function calculatePayroll(contract: ContractType, input: PayrollInput): PayrollResult {
  if (contract === 'etat') return obliczUmowaOPrace(input);
  return obliczZlecenie(input);
}
