import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { porukaGreske } from '../core/api.service';
import { AuthService } from '../core/auth';

@Component({
  selector: 'app-prijava',
  imports: [ReactiveFormsModule],
  template: `
    <div class="adm-prijava adm-kartica">
      <h1>Prijava</h1>
      <p class="adm-pomoc" style="margin: 6px 0 20px">Administracija sajta Agropromet.</p>
      <form class="adm-forma" [formGroup]="forma" (ngSubmit)="posalji()">
        <div class="adm-polje">
          <label for="korisnik">Korisničko ime</label>
          <input id="korisnik" type="text" formControlName="korisnickoIme" autocomplete="username" />
        </div>
        <div class="adm-polje">
          <label for="lozinka">Lozinka</label>
          <input id="lozinka" type="password" formControlName="lozinka" autocomplete="current-password" />
        </div>
        @if (greska()) {
          <p class="adm-poruka adm-poruka--greska" role="alert">{{ greska() }}</p>
        }
        <button class="adm-dugme adm-dugme--zeleno" type="submit" [disabled]="forma.invalid || salje()">
          {{ salje() ? 'Prijavljivanje…' : 'Prijavi se' }}
        </button>
      </form>
    </div>
  `,
})
export class Prijava {
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly forma = inject(NonNullableFormBuilder).group({
    korisnickoIme: ['', Validators.required],
    lozinka: ['', Validators.required],
  });
  readonly salje = signal(false);
  readonly greska = signal<string | null>(null);

  constructor() {
    if (this.auth.prijavljen()) this.router.navigateByUrl('/admin/proizvodi');
  }

  posalji() {
    if (this.forma.invalid) return;
    this.salje.set(true);
    this.greska.set(null);
    const { korisnickoIme, lozinka } = this.forma.getRawValue();
    this.auth.prijava(korisnickoIme, lozinka).subscribe({
      next: () => this.router.navigateByUrl('/admin/proizvodi'),
      error: (e) => {
        this.salje.set(false);
        this.greska.set(e?.status === 401 ? 'Pogrešno korisničko ime ili lozinka.' : porukaGreske(e));
      },
    });
  }
}
