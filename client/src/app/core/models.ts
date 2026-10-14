export interface Kategorija {
  id: number;
  naziv: string;
  slug: string;
  redosled: number;
}

export interface Proizvod {
  id: number;
  kategorijaId: number;
  kategorija: string;
  kategorijaSlug: string;
  naziv: string;
  slug: string;
  opis: string;
  slikaUrl: string | null;
  istaknut: boolean;
  aktivan: boolean;
  redosled: number;
}

export type AkcijaOznaka = 'Akcija' | 'Novo' | 'Uskoro';
export const AKCIJA_OZNAKE: AkcijaOznaka[] = ['Akcija', 'Novo', 'Uskoro'];

export interface Akcija {
  id: number;
  oznaka: AkcijaOznaka;
  naslov: string;
  tekst: string;
  /** ISO datum yyyy-MM-dd ili null */
  vaziOd: string | null;
  vaziDo: string | null;
  aktivna: boolean;
}

export type KategorijaUpsert = Omit<Kategorija, 'id' | 'slug'> & { slug?: string | null };
export type ProizvodUpsert = Pick<Proizvod, 'kategorijaId' | 'naziv' | 'opis' | 'istaknut' | 'aktivan' | 'redosled'> & {
  slug?: string | null;
};
export type AkcijaUpsert = Omit<Akcija, 'id'>;

export interface LoginResponse {
  token: string;
  istekUtc: string;
}
