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
  kategorije: Kategorija[];
  proizvodi: Proizvod[];
  akcije: Akcija[];
}
