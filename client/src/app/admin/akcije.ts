import { Component, inject, signal } from '@angular/core';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ApiService, porukaGreske } from '../core/api.service';
import { AKCIJA_OZNAKE, Akcija, AkcijaOznaka, AkcijaUpsert } from '../core/models';

/** Današnji datum u Beogradu kao yyyy-MM-dd (isto pravilo koristi API). */
function danas() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Belgrade' }).format(new Date());
}

function datumiURedu(g: AbstractControl): ValidationErrors | null {
  const { vaziOd, vaziDo } = g.value as { vaziOd: string; vaziDo: string };
  return vaziOd && vaziDo && vaziDo < vaziOd ? { datumi: true } : null;
}

const prikazDatuma = (iso: string) => iso.split('-').reverse().join('.') + '.';

@Component({
  selector: 'app-akcije-admin',
  imports: [ReactiveFormsModule],
  template: `
    <div class="adm-traka">
      <h1>Akcije i novo u ponudi</h1>
      @if (!formaOtvorena()) {
        <button type="button" class="adm-dugme" (click)="otvori(null)">+ Nova akcija</button>
      }
    </div>
    <p class="adm-pomoc" style="margin-bottom: 20px">
      Na sajtu se prikazuju samo aktivne akcije kojima je današnji datum u periodu važenja. Prazan datum znači „bez
      ograničenja“. Ako nema nijedne, zeleni blok se ne prikazuje.
    </p>

    @if (formaOtvorena()) {
      <form class="adm-forma adm-kartica" style="margin-bottom: 28px" [formGroup]="forma" (ngSubmit)="sacuvaj()" novalidate>
        <h2>{{ izmena() ? 'Izmena akcije' : 'Nova akcija' }}</h2>
        <div class="adm-red">
          <div class="adm-polje">
            <label for="oznaka">Oznaka *</label>
            <select id="oznaka" formControlName="oznaka">
              @for (o of oznake; track o) {
                <option [value]="o">{{ o }}</option>
              }
            </select>
          </div>
          <div class="adm-polje">
            <label for="vaziOd">Važi od</label>
            <input id="vaziOd" type="date" formControlName="vaziOd" />
          </div>
          <div class="adm-polje">
            <label for="vaziDo">Važi do</label>
            <input id="vaziDo" type="date" formControlName="vaziDo" />
            @if (forma.hasError('datumi')) {
              <span class="adm-greska-polja">Datum „važi do“ ne sme biti pre datuma „važi od“.</span>
            }
          </div>
        </div>
        <div class="adm-polje">
          <label for="naslov">Naslov *</label>
          <input id="naslov" type="text" formControlName="naslov" maxlength="150" />
          @if (forma.controls.naslov.touched && forma.controls.naslov.invalid) {
            <span class="adm-greska-polja">Naslov je obavezan.</span>
          }
        </div>
        <div class="adm-polje">
          <label for="tekst">Tekst</label>
          <textarea id="tekst" formControlName="tekst" maxlength="1000"></textarea>
        </div>
        <label class="adm-polje--cek"><input type="checkbox" formControlName="aktivna" /> Aktivna</label>

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
            <th class="uske">Oznaka</th>
            <th>Naslov</th>
            <th class="uske">Važi</th>
            <th class="uske">Status</th>
            <th class="uske"><span class="sr-only">Akcije</span></th>
          </tr>
        </thead>
        <tbody>
          @for (a of akcije(); track a.id) {
            <tr [class.neaktivan]="!naSajtu(a)">
              <td><span class="adm-oznaka">{{ a.oznaka }}</span></td>
              <td>
                <strong>{{ a.naslov }}</strong>
                <div class="adm-pomoc">{{ a.tekst }}</div>
              </td>
              <td class="uske">{{ period(a) }}</td>
              <td class="uske">
                <span class="adm-oznaka" [class.adm-oznaka--zelena]="naSajtu(a)">{{ status(a) }}</span>
              </td>
              <td class="uske">
                <div class="adm-akcije-forme" style="gap: 8px; flex-wrap: nowrap">
                  <button type="button" class="adm-dugme adm-dugme--sekundarno adm-dugme--malo" (click)="otvori(a)">Izmeni</button>
                  <button type="button" class="adm-dugme adm-dugme--opasno adm-dugme--malo" (click)="obrisi(a)">Obriši</button>
                </div>
              </td>
            </tr>
          } @empty {
            <tr>
              <td colspan="5" class="adm-pomoc">{{ ucitava() ? 'Učitavanje…' : 'Nema akcija.' }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class AkcijeAdmin {
  private api = inject(ApiService);

  readonly oznake = AKCIJA_OZNAKE;
  readonly akcije = signal<Akcija[]>([]);
  readonly ucitava = signal(true);
  readonly greska = signal<string | null>(null);
  readonly greskaForme = signal<string | null>(null);
  readonly radi = signal(false);
  readonly formaOtvorena = signal(false);
  readonly izmena = signal<Akcija | null>(null);

  readonly forma = inject(NonNullableFormBuilder).group(
    {
      oznaka: ['Akcija' as AkcijaOznaka, Validators.required],
      naslov: ['', [Validators.required, Validators.maxLength(150)]],
      tekst: ['', Validators.maxLength(1000)],
      vaziOd: [''],
      vaziDo: [''],
      aktivna: [true],
    },
    { validators: datumiURedu },
  );

  constructor() {
    this.ucitaj();
  }

  naSajtu(a: Akcija) {
    const d = danas();
    return a.aktivna && (!a.vaziOd || a.vaziOd <= d) && (!a.vaziDo || a.vaziDo >= d);
  }

  status(a: Akcija) {
    const d = danas();
    if (!a.aktivna) return 'Isključena';
    if (a.vaziOd && a.vaziOd > d) return 'Počinje kasnije';
    if (a.vaziDo && a.vaziDo < d) return 'Istekla';
    return 'Na sajtu';
  }

  period(a: Akcija) {
    if (!a.vaziOd && !a.vaziDo) return 'bez ograničenja';
    return `${a.vaziOd ? prikazDatuma(a.vaziOd) : '…'} – ${a.vaziDo ? prikazDatuma(a.vaziDo) : '…'}`;
  }

  otvori(a: Akcija | null) {
    this.izmena.set(a);
    this.greskaForme.set(null);
    this.forma.reset({
      oznaka: a?.oznaka ?? 'Akcija',
      naslov: a?.naslov ?? '',
      tekst: a?.tekst ?? '',
      vaziOd: a?.vaziOd ?? '',
      vaziDo: a?.vaziDo ?? '',
      aktivna: a?.aktivna ?? true,
    });
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
    const dto: AkcijaUpsert = { ...v, vaziOd: v.vaziOd || null, vaziDo: v.vaziDo || null };
    const a = this.izmena();
    this.radi.set(true);
    this.greskaForme.set(null);
    (a ? this.api.izmeniAkciju(a.id, dto) : this.api.napraviAkciju(dto)).subscribe({
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

  obrisi(a: Akcija) {
    if (!confirm(`Obrisati akciju „${a.naslov}“?\n\nAko je samo privremeno skidate sa sajta, dovoljno je isključiti „Aktivna“.`)) return;
    this.api.obrisiAkciju(a.id).subscribe({
      next: () => this.ucitaj(),
      error: (e) => this.greska.set(porukaGreske(e)),
    });
  }

  private ucitaj() {
    this.greska.set(null);
    this.api.sveAkcije().subscribe({
      next: (a) => {
        this.akcije.set(a);
        this.ucitava.set(false);
      },
      error: (e) => {
        this.greska.set(porukaGreske(e));
        this.ucitava.set(false);
      },
    });
  }
}
