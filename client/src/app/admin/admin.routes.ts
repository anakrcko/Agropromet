import { Routes } from '@angular/router';
import { adminGuard } from '../core/auth';
import { AdminLayout } from './admin-layout';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminLayout,
    children: [
      {
        path: 'prijava',
        title: 'Prijava — Agropromet admin',
        loadComponent: () => import('./prijava').then((m) => m.Prijava),
      },
      {
        path: '',
        canActivateChild: [adminGuard],
        canActivate: [adminGuard],
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'proizvodi' },
          {
            path: 'proizvodi',
            title: 'Proizvodi — Agropromet admin',
            loadComponent: () => import('./proizvodi-lista').then((m) => m.ProizvodiLista),
          },
          {
            path: 'proizvodi/novi',
            title: 'Novi proizvod — Agropromet admin',
            loadComponent: () => import('./proizvod-forma').then((m) => m.ProizvodForma),
          },
          {
            path: 'proizvodi/:id',
            title: 'Izmena proizvoda — Agropromet admin',
            loadComponent: () => import('./proizvod-forma').then((m) => m.ProizvodForma),
          },
          {
            path: 'akcije',
            title: 'Akcije — Agropromet admin',
            loadComponent: () => import('./akcije').then((m) => m.AkcijeAdmin),
          },
          {
            path: 'kategorije',
            title: 'Kategorije — Agropromet admin',
            loadComponent: () => import('./kategorije').then((m) => m.KategorijeAdmin),
          },
        ],
      },
    ],
  },
];
