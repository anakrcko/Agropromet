import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiService } from './api.service';

const KLJUC = 'agropromet.admin.token';

interface Sesija {
  token: string;
  istek: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private browser = isPlatformBrowser(inject(PLATFORM_ID));
  private api = inject(ApiService);
  private router = inject(Router);
  private sesija = signal<Sesija | null>(this.ucitaj());

  readonly prijavljen = computed(() => {
    const s = this.sesija();
    return !!s && s.istek > Date.now();
  });

  token(): string | null {
    return this.prijavljen() ? this.sesija()!.token : null;
  }

  prijava(korisnickoIme: string, lozinka: string) {
    return this.api.login(korisnickoIme, lozinka).pipe(
      tap((r) => {
        const s = { token: r.token, istek: Date.parse(r.istekUtc) };
        this.sesija.set(s);
        if (this.browser) localStorage.setItem(KLJUC, JSON.stringify(s));
      }),
    );
  }

  odjava() {
    this.sesija.set(null);
    if (this.browser) localStorage.removeItem(KLJUC);
    this.router.navigateByUrl('/admin/prijava');
  }

  private ucitaj(): Sesija | null {
    if (!this.browser) return null;
    try {
      return JSON.parse(localStorage.getItem(KLJUC) ?? 'null');
    } catch {
      return null;
    }
  }
}

/** Dodaje JWT na zahteve ka API-ju; na 401 odjavljuje korisnika. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token();
  const kaApiju = req.url.startsWith(environment.apiBase);
  const zahtev = token && kaApiju ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
  return next(zahtev).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && token && kaApiju) auth.odjava();
      return throwError(() => err);
    }),
  );
};

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.prijavljen() ? true : inject(Router).parseUrl('/admin/prijava');
};
