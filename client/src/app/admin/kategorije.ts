import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService, porukaGreske } from '../core/api.service';
import { Kategorija, KategorijaUpsert } from '../core/models';

@Component({
  selector: 'app-kategorije-admin',
  imports: [ReactiveFormsModule],
  template: `
    <div class="adm-traka">
      <h1>Kategorije</h1>
      @if (!formaOtvorena()) {
        <button type="button" class="adm-dugme" (click)="otvori(null)">+ Nova kategorija</button>
      }
    </div>
    <p class="adm-pomoc" style="margin-bottom: 20px">
      Kategorije su filteri u sekciji „Naša ponuda“. Slug se vidi u adresi (npr. ?kategorija=semena) — menjajte ga
      samo ako je neophodno, jer stari linkovi prestaju da rade.
    </p>

    @if (formaOtvorena()) {
      <form class="adm-forma adm-kartica" style="margin-bottom: 28px" [formGroup]="forma" (ngSubmit)="sacuvaj()" novalidate>
        <h2>{{ izmena() ? 'Izmena kategorije' : 'Nova kategorija' }}</h2>
        <div class="adm-red">
          <div class="adm-polje">
            <label for="naziv">Naziv *</label>
            <input id="naziv" type="text" formControlName="naziv" maxlength="100" />
            @if (forma.controls.naziv.touched && forma.controls.naziv.invalid) {
              <span class="adm-greska-polja">Naziv je obavezan.</span>
            }
          </div>
          <div class="adm-polje">
            <label for="slug">Slug</label>
            <input id="slug" type="text" formControlName="slug" maxlength="100" placeholder="pravi se automatski od naziva" />
            @if (forma.controls.slug.invalid) {
              <span class="adm-greska-polja">Samo mala slova bez kvačica, brojevi i crtice.</span>
            }
          </div>
          <div class="adm-polje">
            <label for="redosled">Redosled</label>
            <input id="redosled" type="number" formControlName="redosled" min="0" />
          </div>
        </div>
        @if (greskaForme()) {
          <p class="adm-poruka adm-poruka--greska" role="alert">{{ greskaForme() }}</p>
        }
        <div class="adm-akcije-forme">
          <button type="submit" class="adm-dugme adm-dugme--zeleno" [disabled]="radi()">
            {{ radi() ? 'Čuvanje…' : 'Sačuvaj' }}
          </button>
          <button type="button" class="adm-dugme adm-dugme--sekundarno" (click)="zatvori()">Otkaži</button>
        </div>
      </form>
    }

    @if (greska()) {
      <p class="adm-poruka adm-poruka--greska" role="alert" style="margin-bottom: 16px">{{ greska() }}</p>
    }

    <div class="adm-tabela-omot">
      <table class="adm-tabela">
        <thead>
          <tr>
            <th class="uske">Redosled</th>
            <th>Naziv</th>
            <th>Slug</th>
            <th class="uske"><span class="sr-only">Akcije</span></th>
          </tr>
        </thead>
        <tbody>
          @for (k of kategorije(); track k.id) {
            <tr>
              <td class="uske">{{ k.redosled }}</td>
              <td><strong>{{ k.naziv }}</strong></td>
              <td><code>{{ k.slug }}</code></td>
              <td class="uske">
                <div class="adm-akcije-forme" style="gap: 8px; flex-wrap: nowrap">
                  <button type="button" class="adm-dugme adm-dugme--sekundarno adm-dugme--malo" (click)="otvori(k)">Izmeni</button>
                  <button type="button" class="adm-dugme adm-dugme--opasno adm-dugme--malo" (click)="obrisi(k)">Obriši</button>
                </div>
              </td>
            </tr>
          } @empty {
            <tr>
              <td colspan="4" class="adm-pomoc">{{ ucitava() ? 'Učitavanje…' : 'Nema kategorija.' }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class KategorijeAdmin {
  private api = inject(ApiService);

  readonly kategorije = signal<Kategorija[]>([]);
  readonly ucitava = signal(true);
  readonly greska = signal<string | null>(null);
  readonly greskaForme = signal<string | null>(null);
  readonly radi = signal(false);
  readonly formaOtvorena = signal(false);
  readonly izmena = signal<Kategorija | null>(null);

  readonly forma = inject(NonNullableFormBuilder).group({
    naziv: ['', [Validators.required, Validators.maxLength(100)]],
    slug: ['', Validators.pattern(/^[a-z0-9]+(-[a-z0-9]+)*$/)],
    redosled: [0, Validators.min(0)],
  });

  constructor() {
    this.ucitaj();
  }

  otvori(k: Kategorija | null) {
    this.izmena.set(k);
    this.greskaForme.set(null);
    const sledeci = Math.max(0, ...this.kategorije().map((x) => x.redosled)) + 1;
    this.forma.reset({ naziv: k?.naziv ?? '', slug: k?.slug ?? '', redosled: k?.redosled ?? sledeci });
    this.formaOtvorena.set(true);
  }

  zatvori() {
    this.formaOtvorena.set(false);
    this.izmena.set(null);
  }

  sacuvaj() {
    this.forma.markAllAsTouched();
    if (this.forma.invalid) {
      this.greskaForme.set('Proverite označena polja.');
      return;
    }
    const v = this.forma.getRawValue();
    const dto: KategorijaUpsert = { naziv: v.naziv, slug: v.slug.trim() || null, redosled: Number(v.redosled) || 0 };
    const k = this.izmena();
    this.radi.set(true);
    this.greskaForme.set(null);
    (k ? this.api.izmeniKategoriju(k.id, dto) : this.api.napraviKategoriju(dto)).subscribe({
      next: () => {
        this.radi.set(false);
        this.zatvori();
        this.ucitaj();
      },
      error: (e) => {
        this.radi.set(false);
        this.greskaForme.set(porukaGreske(e));
      },
    });
  }

  obrisi(k: Kategorija) {
    if (!confirm(`Obrisati kategoriju „${k.naziv}“?`)) return;
    this.greska.set(null);
    this.api.obrisiKategoriju(k.id).subscribe({
      next: () => this.ucitaj(),
      error: (e) => this.greska.set(porukaGreske(e)),
    });
  }

  private ucitaj() {
    this.api.kategorije(true).subscribe({
      next: (k) => {
        this.kategorije.set(k);
        this.ucitava.set(false);
      },
      error: (e) => {
        this.greska.set(porukaGreske(e));
        this.ucitava.set(false);
      },
    });
  }
}
