/** Oblik podataka koje pravi scripts/pripremi-sadrzaj.mjs (src/generated/sadrzaj.json). */

export interface Kategorija {
  naziv: string;
  slug: string;
}

export interface Slika {
  url: string;
  sirina: number;
  visina: number;
}

export interface Proizvod {
  slug: string;
  naziv: string;
  kategorija: string;
  kategorijaNaziv: string;
  opis: string;
  slika: Slika | null;
  istaknut: boolean;
  redosled: number;
}

export type AkcijaOznaka = 'Akcija' | 'Novo' | 'Uskoro';

export interface Akcija {
  oznaka: AkcijaOznaka;
  naslov: string;
  tekst: string;
  /** yyyy-MM-dd ili null (bez ograničenja) */
  vaziOd: string | null;
  vaziDo: string | null;
}

export interface Sadrzaj {
  /** Datum builda (yyyy-MM-dd, Beograd). */
  generisano: string;
  sezona: string;
  sajt: Sajt;
  kategorije: Kategorija[];
  proizvodi: Proizvod[];
  akcije: Akcija[];
}

export interface Interval {
  /** 0 = nedelja … 6 = subota */
  dan: number;
  /** minuti od ponoći */
  od: number;
  do: number;
}

export interface Sajt {
  seo: { naslov: string; opis: string };
  pocetak: { znacka: string; naslov: string; uvod: string; slika: Slika | null; opisSlike: string };
  ponuda: { naslov: string; napomena: string };
  akcije: { naslov: string };
  oNama: {
    naslov: string;
    pasusi: string[];
    statistike: { vrednost: string; opis: string }[];
    slika: Slika | null;
    opisSlike: string;
  };
  radnoVreme: { naslov: string; termini: { dani: string; vreme: string; intervali: Interval[] }[]; napomena: string };
  kontakt: {
    naslov: string;
    ulica: string;
    postanskiBroj: string;
    mesto: string;
    drzava: string;
    telefon: string;
    telefonLink: string;
    email: string;
  };
  kakoDoNas: { naslov: string; tekst: string; mapa: string; dugmeMapa: string };
  podnozje: { levo: string; desno: string };
}
