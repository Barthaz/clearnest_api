export type ContractType = 'etat' | 'zlecenie';

export interface PayrollInput {
  brutto: number;
  ulgaMlodych: boolean;
  student: boolean;
  innyTytul: boolean;
  dobrowolneChorobowe: boolean;
  fpExempt: boolean;
  kupPodwyzszone: boolean;
  pit2: boolean;
}

export interface PayrollResult {
  brutto: number;
  emerytalnaE: number;
  rentowaE: number;
  chorobowaE: number;
  sumaSpoleczneE: number;
  zdrowotna: number;
  emerytalnaP: number;
  rentowaP: number;
  wypadkowaP: number;
  fp: number;
  fgsp: number;
  zwolnioneUlga: number;
  kup: number;
  podstawaPIT: number;
  zaliczkaPIT: number;
  netto: number;
  kosztCalkowity: number;
}
