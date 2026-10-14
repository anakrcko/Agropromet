import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Početna strana se prerenderuje tokom builda (SEO), sa proizvodima i akcijama iz API-ja.
  { path: '', renderMode: RenderMode.Prerender },
  // Admin se izvršava samo u browseru (token je u localStorage).
  { path: 'admin/**', renderMode: RenderMode.Client },
  { path: 'admin', renderMode: RenderMode.Client },
  { path: '**', renderMode: RenderMode.Client },
];
