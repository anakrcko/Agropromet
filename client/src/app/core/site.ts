/** Podaci o radnji preneti iz dizajna. Menjaju se na jednom mestu. */
export const RADNJA = {
  naziv: 'Agropromet',
  telefonPrikaz: '035 273 010',
  telefonLink: 'tel:+38135273010',
  email: 'agropromet@yahoo.com',
  ulica: 'Cara Dušana 150',
  postanskiBroj: '35220',
  mesto: 'Ribare',
  drzava: 'Srbija',
  mapaUrl: 'https://www.google.com/maps/search/?api=1&query=Cara+Du%C5%A1ana+150+Ribare+Srbija',
  osnovano: 2005,
};

/** Radno vreme: [danUNedelji (0 = nedelja), od, do] u satima, po beogradskom vremenu. */
export const RADNO_VREME: Record<number, [number, number] | null> = {
  0: [8, 11],
  1: [8, 16],
  2: [8, 16],
  3: [8, 16],
  4: [8, 16],
  5: [8, 16],
  6: [8, 14],
};
// TODO: "U toku sezone radnim danima radimo do 17h" — tačni datumi sezone nisu poznati,
// pa indikator "Sada otvoreno" koristi redovno radno vreme.

const DANI: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** Da li je radnja trenutno otvorena (Europe/Belgrade), nezavisno od vremenske zone korisnika. */
export function otvorenoSada(sada = new Date()): boolean {
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
  const vreme = RADNO_VREME[dan];
  return !!vreme && minuti >= vreme[0] * 60 && minuti < vreme[1] * 60;
}

/** Današnji datum u Beogradu kao yyyy-MM-dd (za važenje akcija). */
export function danasUBeogradu(sada = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Belgrade' }).format(sada);
}
