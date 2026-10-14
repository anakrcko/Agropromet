import { Component, ViewEncapsulation, inject } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth';

/** Okvir admin dela. Stilovi su globalni za admin (ograničeni klasom .adm) i dele ih sve admin strane. */
@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  encapsulation: ViewEncapsulation.None,
  styleUrl: './admin.scss',
  template: `
    <div class="adm">
      <header class="adm-zaglavlje">
        <div class="adm-kontejner adm-zaglavlje__red">
          <a class="adm-brend" routerLink="/">
            <img src="logo.svg" alt="" width="52" height="24" />
            <span>AGROPROMET <small>admin</small></span>
          </a>
          @if (auth.prijavljen()) {
            <nav class="adm-nav" aria-label="Admin navigacija">
              <a routerLink="proizvodi" routerLinkActive="aktivan">Proizvodi</a>
              <a routerLink="akcije" routerLinkActive="aktivan">Akcije</a>
              <a routerLink="kategorije" routerLinkActive="aktivan">Kategorije</a>
              <a routerLink="/" target="_blank" rel="noopener">Sajt ↗</a>
              <button type="button" class="adm-dugme adm-dugme--tiho" (click)="auth.odjava()">Odjava</button>
            </nav>
          }
        </div>
      </header>
      <main class="adm-kontejner adm-sadrzaj">
        <router-outlet />
      </main>
    </div>
  `,
})
export class AdminLayout {
  readonly auth = inject(AuthService);

  constructor() {
    inject(Meta).updateTag({ name: 'robots', content: 'noindex, nofollow' });
  }
}
