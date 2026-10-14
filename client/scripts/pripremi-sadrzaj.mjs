// Priprema sadržaja sajta pre svakog builda (pokreće se automatski uz `npm start` i `npm run build`).
//
// Čita fajlove koje vlasnik uređuje kroz Pages CMS (folder /content u korenu repoa):
//   content/kategorije.json, content/proizvodi/*.json, content/akcije.json, content/slike/*
// i pravi:
//   src/generated/sadrzaj.json   — podaci koje sajt ugrađuje u stranu
//   .generated/slike/*.webp      — slike smanjene na najviše 1200 px, u WebP formatu
//
// Greške u sadržaju (npr. nepostojeća kategorija ili slika) ne obaraju build: proizvod se preskače ili prikazuje bez
// slike, a upozorenje se vidi u logu builda na Cloudflare Pages.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const KLIJENT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SADRZAJ = resolve(KLIJENT, '../content');
const IZLAZ_PODACI = join(KLIJENT, 'src/generated/sadrzaj.json');
const IZLAZ_SLIKE = join(KLIJENT, '.generated/slike');
const URL_SLIKA = '/images/proizvodi';
const MAX_DIMENZIJA = 1200;
const OZNAKE = ['Akcija', 'Novo', 'Uskoro'];

const upozorenja = [];
const upozori = (poruka) => upozorenja.push(poruka);

function citajJson(putanja) {
  try {
    return JSON.parse(readFileSync(putanja, 'utf8'));
  } catch (e) {
    upozori(`${putanja}: fajl nije ispravan JSON (${e.message}) — preskočen.`);
    return null;
  }
}

const tekst = (v) => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim());
const datum = (v) => (/^\d{4}-\d{2}-\d{2}/.test(tekst(v)) ? tekst(v).slice(0, 10) : null);

/** "Leđne prskalice" → "ledjne-prskalice" */
function slug(s) {
  return tekst(s)
    .toLowerCase()
    .replace(/đ/g, 'dj')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Pages CMS čuva putanju slike npr. kao "/slike/foto.jpg" — pretvara je u putanju fajla u content/slike. */
function izvorSlike(vrednost) {
  const rel = decodeURIComponent(tekst(vrednost))
    .replace(/^\/+/, '')
    .replace(/^content\//, '')
    .replace(/^slike\//, '');
  return rel ? join(SADRZAJ, 'slike', rel) : null;
}

async function obradiSliku(vrednost, ime) {
  const izvor = izvorSlike(vrednost);
  if (!izvor) return null;
  if (!existsSync(izvor)) {
    upozori(`Slika „${tekst(vrednost)}“ (${ime}) ne postoji — proizvod se prikazuje bez slike.`);
    return null;
  }
  const bajtovi = readFileSync(izvor);
  const hes = createHash('sha1').update(bajtovi).digest('hex').slice(0, 8);
  const fajl = `${slug(ime) || 'slika'}-${hes}.webp`;
  try {
    const { width, height } = await sharp(bajtovi)
      .rotate() // orijentacija sa telefona (EXIF)
      .resize(MAX_DIMENZIJA, MAX_DIMENZIJA, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 }) // EXIF i ostali metapodaci se ne prenose
      .toFile(join(IZLAZ_SLIKE, fajl));
    return { url: `${URL_SLIKA}/${fajl}`, sirina: width, visina: height };
  } catch (e) {
    upozori(`Slika „${tekst(vrednost)}“ (${ime}) nije mogla da se obradi (${e.message}) — prikazuje se bez slike.`);
    return null;
  }
}

async function main() {
  rmSync(IZLAZ_SLIKE, { recursive: true, force: true });
  mkdirSync(IZLAZ_SLIKE, { recursive: true });
  mkdirSync(dirname(IZLAZ_PODACI), { recursive: true });

  // Kategorije — redosled u fajlu je redosled na sajtu.
  const kategorije = (citajJson(join(SADRZAJ, 'kategorije.json'))?.kategorije ?? [])
    .map((k) => ({ naziv: tekst(k.naziv), slug: tekst(k.slug) || slug(k.naziv) }))
    .filter((k) => k.naziv);
  const poSlugu = new Map(kategorije.map((k, i) => [k.slug, { ...k, i }]));

  // Proizvodi — jedan fajl po proizvodu.
  const folder = join(SADRZAJ, 'proizvodi');
  const fajlovi = existsSync(folder) ? readdirSync(folder).filter((f) => extname(f) === '.json').sort() : [];
  const proizvodi = [];
  for (const f of fajlovi) {
    const p = citajJson(join(folder, f));
    if (!p) continue;
    const naziv = tekst(p.naziv);
    if (!naziv) {
      upozori(`${f}: nema naziv — preskočen.`);
      continue;
    }
    if (p.aktivan === false || p.aktivan === 'false') continue;
    const kat = poSlugu.get(tekst(p.kategorija));
    if (!kat) {
      upozori(`${f}: kategorija „${tekst(p.kategorija)}“ ne postoji u content/kategorije.json — preskočen.`);
      continue;
    }
    proizvodi.push({
      slug: basename(f, '.json'),
      naziv,
      kategorija: kat.slug,
      kategorijaNaziv: kat.naziv,
      opis: tekst(p.opis),
      slika: await obradiSliku(p.slika, naziv),
      istaknut: p.istaknut === true || p.istaknut === 'true',
      redosled: Number.isFinite(Number(p.redosled)) && tekst(p.redosled) !== '' ? Number(p.redosled) : 100000,
      _kat: kat.i,
    });
  }
  // Po kategorijama (kao filteri), pa istaknuti, pa redosled, pa naziv.
  proizvodi.sort(
    (a, b) =>
      a._kat - b._kat ||
      Number(b.istaknut) - Number(a.istaknut) ||
      a.redosled - b.redosled ||
      a.naziv.localeCompare(b.naziv, 'sr'),
  );
  proizvodi.forEach((p) => delete p._kat);

  // Akcije — na sajtu se dodatno filtriraju po današnjem datumu (u browseru).
  const akcijeFajl = citajJson(join(SADRZAJ, 'akcije.json')) ?? {};
  const akcije = (akcijeFajl.akcije ?? [])
    .filter((a) => a && a.aktivna !== false && a.aktivna !== 'false' && tekst(a.naslov))
    .map((a) => {
      const oznaka = OZNAKE.includes(tekst(a.oznaka)) ? tekst(a.oznaka) : 'Akcija';
      if (oznaka !== tekst(a.oznaka)) upozori(`Akcija „${tekst(a.naslov)}“: nepoznata oznaka „${tekst(a.oznaka)}“, koristi se „Akcija“.`);
      return { oznaka, naslov: tekst(a.naslov), tekst: tekst(a.tekst), vaziOd: datum(a.vaziOd), vaziDo: datum(a.vaziDo) };
    });

  const generisano = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Belgrade' }).format(new Date());
  const podaci = { generisano, sezona: tekst(akcijeFajl.sezona), kategorije, proizvodi, akcije };
  writeFileSync(IZLAZ_PODACI, JSON.stringify(podaci, null, 2) + '\n');

  const saSlikom = proizvodi.filter((p) => p.slika).length;
  console.log(
    `Sadržaj: ${kategorije.length} kategorija, ${proizvodi.length} proizvoda (${saSlikom} sa slikom), ${akcije.length} akcija.`,
  );
  for (const u of upozorenja) console.warn(`UPOZORENJE: ${u}`);
}

await main();
