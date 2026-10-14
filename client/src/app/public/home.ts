import { NgOptimizedImage } from '@angular/common';
import { Component, DOCUMENT, DestroyRef, afterNextRender, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiService } from '../core/api.service';
import { Akcija, Kategorija, Proizvod } from '../core/models';
import { RADNJA, otvorenoSada } from '../core/site';

const OPIS =
  'Poljoprivredna apoteka Agropromet u Ribaru: semena, zaštita bilja, đubriva, sadni materijal, ' +
  'hrana za životinje, alat i oprema. Cara Dušana 150, tel. 035 273 010.';

@Component({
  selector: 'app-home',
  imports: [NgOptimizedImage],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  host: { '(click)': 'naSidro($event)' },
})
export class Home {
  private api = inject(ApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private dokument = inject(DOCUMENT);

  readonly radnja = RADNJA;
  readonly godina = new Date().getFullYear();

  readonly kategorije = signal<Kategorija[]>([]);
  readonly proizvodi = signal<Proizvod[]>([]);
  readonly akcije = signal<Akcija[]>([]);

  /**
   * Filter iz URL-a se primenjuje tek posle hidracije, da bi prvi render u browseru bio isti
   * kao prerenderovan HTML (koji uvek prikazuje sve proizvode).
   */
  private readonly hidrirano = signal(false);
  private readonly slugIzUrl = toSignal(this.route.queryParamMap.pipe(map((q) => q.get('kategorija'))), {
    initialValue: null,
  });

  readonly izabrana = computed<Kategorija | null>(() => {
    if (!this.hidrirano()) return null;
    const slug = this.slugIzUrl();
    return this.kategorije().find((k) => k.slug === slug) ?? null;
  });

  readonly vidljivi = computed(() => {
    const k = this.izabrana();
    const svi = this.proizvodi();
    return k ? svi.filter((p) => p.kategorijaId === k.id) : svi;
  });

  readonly opisRezultata = computed(() => {
    const k = this.izabrana();
    return k
      ? `${this.vidljivi().length} u kategoriji „${k.naziv}“`
      : `${this.proizvodi().length} grupa proizvoda — izaberite kategoriju`;
  });

  /** null dok se ne izračuna u browseru (prerender ne zna trenutno vreme posetioca). */
  readonly otvoreno = signal<boolean | null>(null);

  constructor() {
    const title = inject(Title);
    const meta = inject(Meta);
    title.setTitle('Agropromet — poljoprivredna apoteka, Ribare');
    meta.updateTag({ name: 'description', content: OPIS });
    meta.updateTag({ property: 'og:type', content: 'website' });
    meta.updateTag({ property: 'og:locale', content: 'sr_RS' });
    meta.updateTag({ property: 'og:title', content: 'Agropromet — poljoprivredna apoteka, Ribare' });
    meta.updateTag({ property: 'og:description', content: OPIS });
    meta.updateTag({ property: 'og:image', content: `${environment.siteUrl}/images/hero-radnja.jpg` });
    if (environment.siteUrl) meta.updateTag({ property: 'og:url', content: `${environment.siteUrl}/` });
    meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    meta.removeTag("name='robots'"); // admin postavlja noindex

    this.ucitaj(false);

    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      this.hidrirano.set(true);
      // Ako prerender nije imao pristup API-ju, podaci se dovlače ponovo u browseru.
      if (!this.proizvodi().length || !this.kategorije().length) this.ucitaj(true);

      this.otvoreno.set(otvorenoSada());
      const interval = setInterval(() => this.otvoreno.set(otvorenoSada()), 60_000);
      destroyRef.onDestroy(() => clearInterval(interval));
    });
  }

  izaberi(slug: string | null) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { kategorija: slug },
      replaceUrl: true,
    });
  }

  /**
   * Linkovi "#sekcija": zbog <base href="/"> bi se na adresi sa ?kategorija=… razrešili u "/#sekcija"
   * i ponovo učitali stranu. Ovde se samo skroluje do sekcije, a filter ostaje u URL-u.
   */
  naSidro(e: MouseEvent) {
    if (e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    const link = (e.target as Element | null)?.closest?.('a');
    const href = link?.getAttribute('href');
    if (!href?.startsWith('#') || href.length < 2) return;
    const cilj = this.dokument.getElementById(href.slice(1));
    if (!cilj) return;
    e.preventDefault();
    cilj.scrollIntoView({ block: 'start' });
    if (!cilj.hasAttribute('tabindex')) cilj.setAttribute('tabindex', '-1');
    cilj.focus({ preventScroll: true });
    history.replaceState(history.state, '', `${location.pathname}${location.search}${href}`);
  }

  slika(p: Proizvod) {
    return this.api.slikaUrl(p.slikaUrl);
  }

  private ucitaj(osvezi: boolean) {
    const tihoPrazno = <T>(o: Observable<T[]>) => o.pipe(catchError(() => of([] as T[])));
    tihoPrazno(this.api.kategorije(osvezi)).subscribe((k) => this.kategorije.set(k));
    tihoPrazno(this.api.proizvodi(undefined, osvezi)).subscribe((p) => this.proizvodi.set(p));
    tihoPrazno(this.api.akcije(osvezi)).subscribe((a) => this.akcije.set(a));
  }
}
