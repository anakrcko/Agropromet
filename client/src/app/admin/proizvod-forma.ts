import { Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Location } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Observable, of, switchMap } from 'rxjs';
import { ApiService, porukaGreske } from '../core/api.service';
import { Kategorija, Proizvod, ProizvodUpsert } from '../core/models';

const MAX_MB = 15;

@Component({
  selector: 'app-proizvod-forma',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="adm-traka">
      <h1>{{ novi() ? 'Novi proizvod' : 'Izmena proizvoda' }}</h1>
      <a class="adm-dugme adm-dugme--sekundarno" routerLink="/admin/proizvodi">← Nazad na listu</a>
    </div>

    <form class="adm-forma adm-kartica" [formGroup]="forma" (ngSubmit)="sacuvaj()" novalidate>
      <div class="adm-red">
        <div class="adm-polje">
          <label for="naziv">Naziv *</label>
          <input id="naziv" type="text" formControlName="naziv" maxlength="150" />
          @if (forma.controls.naziv.touched && forma.controls.naziv.invalid) {
            <span class="adm-greska-polja">Naziv je obavezan.</span>
          }
        </div>
        <div class="adm-polje">
          <label for="kategorija">Kategorija *</label>
          <select id="kategorija" formControlName="kategorijaId">
            <option [ngValue]="0" disabled>— izaberite —</option>
            @for (k of kategorije(); track k.id) {
              <option [ngValue]="k.id">{{ k.naziv }}</option>
            }
          </select>
          @if (forma.controls.kategorijaId.touched && forma.controls.kategorijaId.invalid) {
            <span class="adm-greska-polja">Izaberite kategoriju.</span>
          }
        </div>
      </div>

      <div class="adm-polje">
        <label for="opis">Kratak opis</label>
        <textarea id="opis" formControlName="opis" maxlength="500"></textarea>
        <span class="adm-pomoc">{{ forma.controls.opis.value.length }}/500 — prikazuje se na kartici proizvoda.</span>
      </div>

      <div class="adm-red">
        <div class="adm-polje">
          <label for="slug">Slug (adresa)</label>
          <input id="slug" type="text" formControlName="slug" maxlength="150" placeholder="pravi se automatski od naziva" />
          @if (forma.controls.slug.invalid) {
            <span class="adm-greska-polja">Samo mala slova bez kvačica, brojevi i crtice.</span>
          }
        </div>
        <div class="adm-polje">
          <label for="redosled">Redosled</label>
          <input id="redosled" type="number" formControlName="redosled" min="0" />
          <span class="adm-pomoc">Manji broj = prikazuje se ranije.</span>
        </div>
      </div>

      <div class="adm-filteri">
        <label class="adm-polje--cek"><input type="checkbox" formControlName="aktivan" /> Aktivan (vidljiv na sajtu)</label>
        <label class="adm-polje--cek"><input type="checkbox" formControlName="istaknut" /> Istaknut</label>
      </div>

      <fieldset class="adm-polje" style="border: 0; padding: 0; margin: 0">
        <legend style="font-weight: 700; font-size: 14.5px; color: var(--tekst-sekundarni); margin-bottom: 6px">Slika</legend>
        <div class="adm-slika">
          <div class="adm-slika__pregled">
            @if (pregled(); as src) {
              <img [src]="src" alt="Pregled slike proizvoda" />
            } @else {
              <span>{{ forma.controls.naziv.value || 'Bez slike' }}</span>
            }
          </div>
          <div class="adm-forma" style="gap: 10px">
            <input
              #fajlPolje
              id="slika"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              (change)="izaberiFajl(fajlPolje.files?.[0] ?? null)"
            />
            <span class="adm-pomoc">
              JPG, PNG ili WebP do {{ maxMb }} MB. Slika se automatski smanjuje na 1200 px i čuva kao WebP.
              @if (novi()) {
                Biće otpremljena kada sačuvate proizvod.
              }
            </span>
            <div class="adm-akcije-forme">
              @if (fajl()) {
                <button type="button" class="adm-dugme adm-dugme--sekundarno adm-dugme--malo" (click)="izaberiFajl(null); fajlPolje.value = ''">
                  Poništi izbor
                </button>
              } @else if (proizvod()?.slikaUrl) {
                <button type="button" class="adm-dugme adm-dugme--opasno adm-dugme--malo" [disabled]="radi()" (click)="obrisiSliku()">
                  Ukloni sliku
                </button>
              }
            </div>
          </div>
        </div>
      </fieldset>

      @if (greska()) {
        <p class="adm-poruka adm-poruka--greska" role="alert">{{ greska() }}</p>
      }
      @if (uspeh()) {
        <p class="adm-poruka adm-poruka--uspeh" role="status">{{ uspeh() }}</p>
      }

      <div class="adm-akcije-forme" style="justify-content: space-between">
        <button type="submit" class="adm-dugme adm-dugme--zeleno" [disabled]="radi()">
          {{ radi() ? 'Čuvanje…' : 'Sačuvaj' }}
        </button>
        @if (!novi()) {
          <button type="button" class="adm-dugme adm-dugme--opasno" [disabled]="radi()" (click)="obrisi()">
            Obriši proizvod
          </button>
        }
      </div>
    </form>
  `,
})
export class ProizvodForma {
  private api = inject(ApiService);
  private router = inject(Router);
  private location = inject(Location);

  /** Parametar rute ":id" (prazno za novi proizvod). */
  readonly id = input<string>();
  readonly novi = computed(() => !this.id() && !this.proizvod());
  readonly maxMb = MAX_MB;

  readonly kategorije = signal<Kategorija[]>([]);
  readonly proizvod = signal<Proizvod | null>(null);
  readonly fajl = signal<File | null>(null);
  private readonly lokalniPregled = signal<string | null>(null);
  readonly pregled = computed(() => this.lokalniPregled() ?? this.api.slikaUrl(this.proizvod()?.slikaUrl ?? null));

  readonly radi = signal(false);
  readonly greska = signal<string | null>(null);
  readonly uspeh = signal<string | null>(null);

  readonly forma = inject(NonNullableFormBuilder).group({
    naziv: ['', [Validators.required, Validators.maxLength(150)]],
    kategorijaId: [0, [Validators.min(1)]],
    opis: ['', Validators.maxLength(500)],
    slug: ['', Validators.pattern(/^[a-z0-9]+(-[a-z0-9]+)*$/)],
    redosled: [0, [Validators.min(0)]],
    aktivan: [true],
    istaknut: [false],
  });

  constructor() {
    this.api.kategorije(true).subscribe((k) => this.kategorije.set(k));

    effect(() => {
      const id = Number(this.id());
      if (!id) return;
      this.api.proizvod(id).subscribe({
        next: (p) => this.postavi(p),
        error: (e) => this.greska.set(e?.status === 404 ? 'Proizvod ne postoji.' : porukaGreske(e)),
      });
    });

    inject(DestroyRef).onDestroy(() => this.oslobodiPregled());
  }

  izaberiFajl(f: File | null) {
    this.greska.set(null);
    if (f && f.size > MAX_MB * 1024 * 1024) {
      this.greska.set(`Slika je veća od ${MAX_MB} MB.`);
      return;
    }
    this.oslobodiPregled();
    this.fajl.set(f);
    this.lokalniPregled.set(f ? URL.createObjectURL(f) : null);
  }

  sacuvaj() {
    this.forma.markAllAsTouched();
    if (this.forma.invalid) {
      this.greska.set('Proverite označena polja.');
      return;
    }
    this.greska.set(null);
    this.uspeh.set(null);
    this.radi.set(true);

    const v = this.forma.getRawValue();
    const dto: ProizvodUpsert = { ...v, slug: v.slug.trim() || null, redosled: Number(v.redosled) || 0 };
    const postojeci = this.proizvod();
    const zahtev = postojeci ? this.api.izmeniProizvod(postojeci.id, dto) : this.api.napraviProizvod(dto);

    zahtev
      .pipe(
        switchMap((p): Observable<Proizvod> => {
          this.proizvod.set(p);
          const f = this.fajl();
          return f ? this.api.posaljiSliku(p.id, f) : of(p);
        }),
      )
      .subscribe({
        next: (p) => {
          this.postavi(p);
          this.izaberiFajl(null);
          this.radi.set(false);
          this.uspeh.set('Sačuvano.');
          if (!postojeci) this.location.replaceState(`/admin/proizvodi/${p.id}`);
        },
        error: (e) => {
          this.radi.set(false);
          // Proizvod je možda sačuvan, a slika odbijena — sledeće čuvanje je onda izmena, ne duplikat.
          const sacuvan = this.proizvod();
          if (!postojeci && sacuvan) {
            this.greska.set(`Proizvod je sačuvan, ali slika nije: ${porukaGreske(e)}`);
            this.location.replaceState(`/admin/proizvodi/${sacuvan.id}`);
          } else {
            this.greska.set(porukaGreske(e));
          }
        },
      });
  }

  obrisiSliku() {
    const p = this.proizvod();
    if (!p || !confirm('Ukloniti sliku ovog proizvoda?')) return;
    this.radi.set(true);
    this.api.obrisiSliku(p.id).subscribe({
      next: (n) => {
        this.proizvod.set(n);
        this.radi.set(false);
      },
      error: (e) => {
        this.greska.set(porukaGreske(e));
        this.radi.set(false);
      },
    });
  }

  obrisi() {
    const p = this.proizvod();
    if (!p) return;
    if (!confirm(`Trajno obrisati „${p.naziv}“?\n\nAko proizvod samo privremeno nema na stanju, bolje je isključiti „Aktivan“.`)) return;
    this.radi.set(true);
    this.api.obrisiProizvod(p.id).subscribe({
      next: () => this.router.navigateByUrl('/admin/proizvodi'),
      error: (e) => {
        this.greska.set(porukaGreske(e));
        this.radi.set(false);
      },
    });
  }

  private postavi(p: Proizvod) {
    this.proizvod.set(p);
    this.forma.reset({
      naziv: p.naziv,
      kategorijaId: p.kategorijaId,
      opis: p.opis ?? '',
      slug: p.slug,
      redosled: p.redosled,
      aktivan: p.aktivan,
      istaknut: p.istaknut,
    });
  }

  private oslobodiPregled() {
    const url = this.lokalniPregled();
    if (url) URL.revokeObjectURL(url);
  }
}
