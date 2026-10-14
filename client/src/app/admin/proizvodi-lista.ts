import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService, porukaGreske } from '../core/api.service';
import { Kategorija, Proizvod } from '../core/models';

/** Uklanja dijakritike radi pretrage ("djubrivo" nalazi "đubrivo"). */
function normalizuj(s: string) {
  return s
    .toLowerCase()
    .replace(/đ/g, 'dj')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

@Component({
  selector: 'app-proizvodi-lista',
  imports: [RouterLink],
  template: `
    <div class="adm-traka">
      <h1>Proizvodi</h1>
      <a class="adm-dugme" routerLink="novi">+ Novi proizvod</a>
    </div>

    <div class="adm-filteri">
      <input
        type="search"
        placeholder="Pretraga po nazivu ili opisu…"
        aria-label="Pretraga proizvoda"
        [value]="pretraga()"
        (input)="pretraga.set($any($event.target).value)"
      />
      <select aria-label="Filter po kategoriji" [value]="kategorijaId()" (change)="kategorijaId.set($any($event.target).value)">
        <option value="">Sve kategorije</option>
        @for (k of kategorije(); track k.id) {
          <option [value]="k.id">{{ k.naziv }}</option>
        }
      </select>
    </div>

    @if (greska()) {
      <p class="adm-poruka adm-poruka--greska" role="alert">{{ greska() }}</p>
    }

    <p class="adm-pomoc" style="margin-bottom: 10px" aria-live="polite">
      @if (ucitava()) {
        Učitavanje…
      } @else {
        Prikazano {{ filtrirani().length }} od {{ proizvodi().length }} · aktivnih {{ brojAktivnih() }}
      }
    </p>

    <div class="adm-tabela-omot">
      <table class="adm-tabela">
        <thead>
          <tr>
            <th class="uske"><span class="sr-only">Slika</span></th>
            <th>Naziv</th>
            <th>Kategorija</th>
            <th class="uske">Aktivan</th>
            <th class="uske"><span class="sr-only">Akcije</span></th>
          </tr>
        </thead>
        <tbody>
          @for (p of filtrirani(); track p.id) {
            <tr [class.neaktivan]="!p.aktivan">
              <td>
                @if (api.slikaUrl(p.slikaUrl); as src) {
                  <img class="adm-slicica" [src]="src" alt="" loading="lazy" width="64" height="48" />
                } @else {
                  <div class="adm-slicica" aria-hidden="true"></div>
                }
              </td>
              <td>
                <a [routerLink]="[p.id]">{{ p.naziv }}</a>
                @if (p.istaknut) {
                  <span class="adm-oznaka adm-oznaka--zelena" style="margin-left: 8px">Istaknut</span>
                }
              </td>
              <td>{{ p.kategorija }}</td>
              <td>
                <button
                  type="button"
                  role="switch"
                  class="adm-prekidac"
                  [attr.aria-checked]="p.aktivan"
                  [attr.aria-label]="(p.aktivan ? 'Sakrij sa sajta: ' : 'Prikaži na sajtu: ') + p.naziv"
                  [disabled]="menja().has(p.id)"
                  (click)="prebaci(p)"
                ></button>
              </td>
              <td>
                <a class="adm-dugme adm-dugme--sekundarno adm-dugme--malo" [routerLink]="[p.id]">Izmeni</a>
              </td>
            </tr>
          } @empty {
            @if (!ucitava()) {
              <tr>
                <td colspan="5" class="adm-pomoc">Nema proizvoda za zadate uslove.</td>
              </tr>
            }
          }
        </tbody>
      </table>
    </div>
  `,
})
export class ProizvodiLista {
  readonly api = inject(ApiService);

  readonly proizvodi = signal<Proizvod[]>([]);
  readonly kategorije = signal<Kategorija[]>([]);
  readonly pretraga = signal('');
  readonly kategorijaId = signal('');
  readonly ucitava = signal(true);
  readonly greska = signal<string | null>(null);
  readonly menja = signal(new Set<number>());

  readonly brojAktivnih = computed(() => this.proizvodi().filter((p) => p.aktivan).length);

  readonly filtrirani = computed(() => {
    const q = normalizuj(this.pretraga().trim());
    const kat = Number(this.kategorijaId()) || null;
    return this.proizvodi().filter(
      (p) =>
        (!kat || p.kategorijaId === kat) && (!q || normalizuj(`${p.naziv} ${p.opis ?? ''}`).includes(q)),
    );
  });

  constructor() {
    this.api.kategorije(true).subscribe({ next: (k) => this.kategorije.set(k) });
    this.api.sviProizvodi().subscribe({
      next: (p) => {
        this.proizvodi.set(p);
        this.ucitava.set(false);
      },
      error: (e) => {
        this.greska.set(porukaGreske(e));
        this.ucitava.set(false);
      },
    });
  }

  prebaci(p: Proizvod) {
    this.greska.set(null);
    this.menja.update((s) => new Set(s).add(p.id));
    const gotovo = () =>
      this.menja.update((s) => {
        const n = new Set(s);
        n.delete(p.id);
        return n;
      });
    this.api.postaviAktivan(p.id, !p.aktivan).subscribe({
      next: (novi) => {
        this.proizvodi.update((lista) => lista.map((x) => (x.id === novi.id ? novi : x)));
        gotovo();
      },
      error: (e) => {
        this.greska.set(porukaGreske(e));
        gotovo();
      },
    });
  }
}
