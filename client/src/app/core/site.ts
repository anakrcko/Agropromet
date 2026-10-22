import { Interval } from './models';

const DANI: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** Da li je radnja trenutno otvorena (Europe/Belgrade), nezavisno od vremenske zone posetioca. */
export function otvorenoSada(intervali: Interval[], sada = new Date()): boolean {
  const delovi = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Belgrade',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(sada);
  const get = (t: string) => delovi.find((p) => p.type === t)?.value ?? '';
  const dan = DANI[get('weekday')];
  const minuti = Number(get('hour')) * 60 + Number(get('minute'));
  return intervali.some((i) => i.dan === dan && minuti >= i.od && minuti < i.do);
}

/** Današnji datum u Beogradu kao yyyy-MM-dd (za važenje akcija). */
export function danasUBeogradu(sada = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Belgrade' }).format(sada);
}

/** Deli tekst tako da se broj telefona prikaže kao link (npr. u napomeni ispod ponude). */
export function saTelefonom(tekst: string, telefon: string): { tekst: string; telefon: boolean }[] {
  if (!telefon || !tekst.includes(telefon)) return [{ tekst, telefon: false }];
  return tekst
    .split(telefon)
    .flatMap((deo, i) => (i === 0 ? [{ tekst: deo, telefon: false }] : [{ tekst: telefon, telefon: true }, { tekst: deo, telefon: false }]))
    .filter((d) => d.tekst);
}
