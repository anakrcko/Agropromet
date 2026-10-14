import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./public/home').then((m) => m.Home),
  },
  { path: '**', redirectTo: '' },
];
