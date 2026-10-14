import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import {
  Akcija,
  AkcijaUpsert,
  Kategorija,
  KategorijaUpsert,
  LoginResponse,
  Proizvod,
  ProizvodUpsert,
} from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiBase}/api`;

  /** Pretvara relativnu putanju slike sa API-ja u punu adresu. */
  slikaUrl(relativna: string | null): string | null {
    if (!relativna) return null;
    return relativna.startsWith('http') ? relativna : `${environment.apiBase}${relativna}`;
  }

  // Javno. `osvezi` zaobilazi keš prenet iz prerendera (drugačiji URL = drugi ključ keša).
  kategorije(osvezi = false) {
    return this.http.get<Kategorija[]>(`${this.base}/kategorije`, { params: this.svez(osvezi) });
  }
  proizvodi(kategorija?: string, osvezi = false) {
    let params = this.svez(osvezi);
    if (kategorija) params = params.set('kategorija', kategorija);
    return this.http.get<Proizvod[]>(`${this.base}/proizvodi`, { params });
  }
  akcije(osvezi = false) {
    return this.http.get<Akcija[]>(`${this.base}/akcije`, { params: this.svez(osvezi) });
  }

  private svez(osvezi: boolean) {
    return osvezi ? new HttpParams().set('v', Date.now()) : new HttpParams();
  }

  // Admin
  login(korisnickoIme: string, lozinka: string) {
    return this.http.post<LoginResponse>(`${this.base}/auth/login`, { korisnickoIme, lozinka });
  }

  sviProizvodi() {
    return this.http.get<Proizvod[]>(`${this.base}/proizvodi/svi`);
  }
  proizvod(id: number) {
    return this.http.get<Proizvod>(`${this.base}/proizvodi/${id}`);
  }
  napraviProizvod(dto: ProizvodUpsert) {
    return this.http.post<Proizvod>(`${this.base}/proizvodi`, dto);
  }
  izmeniProizvod(id: number, dto: ProizvodUpsert) {
    return this.http.put<Proizvod>(`${this.base}/proizvodi/${id}`, dto);
  }
  postaviAktivan(id: number, aktivan: boolean) {
    return this.http.patch<Proizvod>(`${this.base}/proizvodi/${id}/aktivan`, aktivan);
  }
  obrisiProizvod(id: number) {
    return this.http.delete<void>(`${this.base}/proizvodi/${id}`);
  }
  posaljiSliku(id: number, fajl: File) {
    const fd = new FormData();
    fd.append('slika', fajl);
    return this.http.post<Proizvod>(`${this.base}/proizvodi/${id}/slika`, fd);
  }
  obrisiSliku(id: number) {
    return this.http.delete<Proizvod>(`${this.base}/proizvodi/${id}/slika`);
  }

  napraviKategoriju(dto: KategorijaUpsert) {
    return this.http.post<Kategorija>(`${this.base}/kategorije`, dto);
  }
  izmeniKategoriju(id: number, dto: KategorijaUpsert) {
    return this.http.put<Kategorija>(`${this.base}/kategorije/${id}`, dto);
  }
  obrisiKategoriju(id: number) {
    return this.http.delete<void>(`${this.base}/kategorije/${id}`);
  }

  sveAkcije() {
    return this.http.get<Akcija[]>(`${this.base}/akcije/sve`);
  }
  napraviAkciju(dto: AkcijaUpsert) {
    return this.http.post<Akcija>(`${this.base}/akcije`, dto);
  }
  izmeniAkciju(id: number, dto: AkcijaUpsert) {
    return this.http.put<Akcija>(`${this.base}/akcije/${id}`, dto);
  }
  obrisiAkciju(id: number) {
    return this.http.delete<void>(`${this.base}/akcije/${id}`);
  }
}

/** Izvlači čitljivu poruku iz ProblemDetails odgovora API-ja. */
export function porukaGreske(err: unknown): string {
  const e = err as { status?: number; error?: { title?: string; errors?: Record<string, string[]> } };
  if (e?.status === 0) return 'Server nije dostupan. Proverite vezu.';
  const errors = e?.error?.errors;
  if (errors) return Object.values(errors).flat().join(' ');
  return e?.error?.title ?? 'Došlo je do greške. Pokušajte ponovo.';
}
