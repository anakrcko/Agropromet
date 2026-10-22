import { NgOptimizedImage } from '@angular/common';
import { Component, DOCUMENT, DestroyRef, afterNextRender, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { environment } from '../../environments/environment';
import sadrzajJson from '../../generated/sadrzaj.json';
import { Kategorija, Sadrzaj } from '../core/models';
import { danasUBeogradu, otvorenoSada, saTelefonom } from '../core/site';

/** Sadržaj iz /content, ugrađen u sajt tokom builda (scripts/pripremi-sadrzaj.mjs). */
const SADRZAJ = sadrzajJson as Sadrzaj;

const SAJT = SADRZAJ.sajt;
const INTERVALI = SAJT.radnoVreme.termini.flatMap((t) => t.intervali);
const DANI_SCHEMA = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const vreme = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

@Component({
  selector: 'app-home',
  imports: [NgOptimizedImage],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  host: { '(click)': 'naSidro($event)' },
})
export class Home {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private dokument = inject(DOCUMENT);

  readonly sajt = SAJT;
  readonly napomenaPonude = saTelefonom(SAJT.ponuda.napomena, SAJT.kontakt.telefon);
  readonly godina = new Date().getFullYear();
  readonly sezona = SADRZAJ.sezona;
  readonly kategorije = SADRZAJ.kategorije;
  readonly proizvodi = SADRZAJ.proizvodi;

  /**
   * Filter iz URL-a i današnji datum primenjuju se tek posle hidracije, da bi prvi render u browseru bio isti
   * kao prerenderovan HTML (svi proizvodi, akcije važeće na dan builda).
   */
  private readonly hidrirano = signal(false);
  private readonly danas = signal(SADRZAJ.generisano);
  private readonly slugIzUrl = toSignal(this.route.queryParamMap.pipe(map((q) => q.get('kategorija'))), {
    initialValue: null,
  });

  readonly izabrana = computed<Kategorija | null>(() => {
    if (!this.hidrirano()) return null;
    const slug = this.slugIzUrl();
    return this.kategorije.find((k) => k.slug === slug) ?? null;
  });

  readonly vidljivi = computed(() => {
    const k = this.izabrana();
    return k ? this.proizvodi.filter((p) => p.kategorija === k.slug) : this.proizvodi;
  });

  readonly opisRezultata = computed(() => {
    const k = this.izabrana();
    return k
      ? `${this.vidljivi().length} u kategoriji „${k.naziv}“`
      : `${this.proizvodi.length} grupa proizvoda — izaberite kategoriju`;
  });

  /** Akcije koje važe danas (prazan datum = bez ograničenja). */
  readonly akcije = computed(() => {
    const d = this.danas();
    return SADRZAJ.akcije.filter((a) => (!a.vaziOd || a.vaziOd <= d) && (!a.vaziDo || a.vaziDo >= d));
  });

  /** null dok se ne izračuna u browseru (prerender ne zna trenutno vreme posetioca). */
  readonly otvoreno = signal<boolean | null>(null);

  constructor() {
    const title = inject(Title);
    const meta = inject(Meta);
    const { naslov, opis } = SAJT.seo;
    if (naslov) title.setTitle(naslov);
    meta.updateTag({ name: 'description', content: opis });
    meta.updateTag({ property: 'og:type', content: 'website' });
    meta.updateTag({ property: 'og:locale', content: 'sr_RS' });
    meta.updateTag({ property: 'og:title', content: naslov });
    meta.updateTag({ property: 'og:description', content: opis });
    if (SAJT.pocetak.slika) meta.updateTag({ property: 'og:image', content: `${environment.siteUrl}${SAJT.pocetak.slika.url}` });
    meta.updateTag({ property: 'og:url', content: `${environment.siteUrl}/` });
    meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.dodajSchemaOrg();

    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      this.hidrirano.set(true);
      const osvezi = () => {
        this.danas.set(danasUBeogradu());
        this.otvoreno.set(INTERVALI.length ? otvorenoSada(INTERVALI) : null);
      };
      osvezi();
      const interval = setInterval(osvezi, 60_000);
      destroyRef.onDestroy(() => clearInterval(interval));
    });
  }

  /** Schema.org Store (JSON-LD) iz istih podataka koje vidi posetilac; upisuje se u prerenderovan HTML. */
  private dodajSchemaOrg() {
    const id = 'schema-org-store';
    if (this.dokument.getElementById(id)) return; // već postoji iz prerendera
    const k = SAJT.kontakt;
    const podaci = {
      '@context': 'https://schema.org',
      '@type': 'Store',
      name: 'Agropromet',
      description: SAJT.seo.opis,
      url: `${environment.siteUrl}/`,
      image: SAJT.pocetak.slika ? `${environment.siteUrl}${SAJT.pocetak.slika.url}` : undefined,
      logo: `${environment.siteUrl}/logo.svg`,
      telephone: k.telefonLink.replace('tel:', '') || undefined,
      email: k.email || undefined,
      foundingDate: '2005-12-21',
      address: {
        '@type': 'PostalAddress',
        streetAddress: k.ulica,
        postalCode: k.postanskiBroj,
        addressLocality: k.mesto,
        addressCountry: 'RS',
      },
      openingHoursSpecification: INTERVALI.map((i) => ({
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: DANI_SCHEMA[i.dan],
        opens: vreme(i.od),
        closes: vreme(i.do),
      })),
    };
    const skripta = this.dokument.createElement('script');
    skripta.id = id;
    skripta.type = 'application/ld+json';
    skripta.textContent = JSON.stringify(podaci).replace(/</g, '\\u003c');
    this.dokument.head.appendChild(skripta);
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
}
