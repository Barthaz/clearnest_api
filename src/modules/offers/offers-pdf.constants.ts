/** Stałe oferty PDF — poza body requestu (nagłówek, tytuł, kontakt). */
export const OFFER_PDF_TITLE = 'OFERTA WSPÓŁPRACY';

export const OFFER_PDF_SUBTITLE =
  'Kompleksowe utrzymanie czystości placówek edukacyjnych';

/** Kolory z design systemu clearnest.pl */
export const OFFER_PDF_COLORS = {
  navy: '#0F2B4A',
  blueLight: '#5BAEE0',
  blue: '#3D8CC4',
  bluePale: '#E8F4FC',
  blueBorder: '#B8D9F0',
  accentMuted: '#8EC8E8',
  text: '#0F2B4A',
  textMuted: '#4A6278',
  textSoft: '#6B8299',
  white: '#FFFFFF',
  rowAlt: '#F6FAFD',
  line: '#B8D9F0',
} as const;

export const OFFER_PDF_DEFAULT_FREQUENCIES_TITLE =
  'Częstotliwość szczególnych prac';

export const OFFER_PDF_LOGO_PATH = 'public/logo.png';

/** Dane kontaktowe ClearNest (jak na clearnest.pl) + podpis oferty */
export const OFFER_PDF_CONTACT = {
  preparedBy: 'Paulina Kuligowska',
  phoneDisplay: '512 - 844 - 227',
  email: 'kontakt@clearnest.pl',
} as const;
