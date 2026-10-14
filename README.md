# Agropromet — sajt poljoprivredne apoteke (Ribare)

Prezentacioni sajt sa ponudom proizvoda (bez cena i korpe). Potpuno besplatan za održavanje: nema servera ni baze.

```
vlasnik ──► Pages CMS (app.pagescms.org) ──► GitHub repo (/content) ──► Cloudflare Pages build ──► agropromet.rs
             forma: proizvodi, slike, akcije    JSON fajlovi + slike         ~1–2 min                  statičan sajt
```

| Deo | Tehnologija | Gde |
|---|---|---|
| Sajt | Angular 21 (standalone, signals, SCSS), prerender početne strane | `client/` |
| Sadržaj | JSON fajlovi i slike | `content/` |
| Admin | Pages CMS (besplatan, prijava preko GitHub naloga) | `.pages.yml` |
| Hosting | Cloudflare Pages (Free) | — |

> Prethodna verzija sa .NET API-jem, SQL Serverom i Angular adminom sačuvana je u git grani `dotnet-verzija`.

---

## 1. Lokalno pokretanje

Potrebno: Node.js 22.12+.

```bash
cd client
npm install
npm start          # http://localhost:4300
npm run build      # produkcioni build u client/dist/client/browser
```

Pre svakog `start`/`build` automatski se pokreće `scripts/pripremi-sadrzaj.mjs`, koja:
- čita `content/` i proverava sadržaj (greške ispisuje kao `UPOZORENJE`, ali ne prekida build),
- smanjuje slike na najviše 1200 px i pretvara ih u WebP (`sharp`), sa hešom u imenu fajla,
- pravi `client/src/generated/sadrzaj.json` koji se ugrađuje u stranu (prerender — Google vidi sve proizvode).

Posle izmene u `content/` lokalno, ponovo pokrenuti `npm start`.

---

## 2. Sadržaj (`content/`)

| Fajl | Šta je u njemu |
|---|---|
| `content/proizvodi/*.json` | jedan fajl po proizvodu: `naziv`, `kategorija` (slug), `opis`, `slika`, `aktivan`, `istaknut`, `redosled` |
| `content/kategorije.json` | kategorije (filteri) — redosled u fajlu je redosled na sajtu |
| `content/akcije.json` | natpis sezone i lista akcija (`oznaka` Akcija/Novo/Uskoro, `naslov`, `tekst`, `vaziOd`, `vaziDo`, `aktivna`) |
| `content/slike/` | originalne slike koje vlasnik otpremi (na sajt idu optimizovane kopije) |

- Proizvod sa `aktivan: false` se ne prikazuje (ne treba ga brisati kad ga privremeno nema).
- Akcija se prikazuje samo ako je aktivna i današnji datum (Beograd) je u periodu važenja; prazan datum = bez ograničenja.
  Datum se proverava i u browseru, pa istekla akcija nestaje istog dana bez novog builda.
- **Nova kategorija:** dodati je u `content/kategorije.json` **i** u listu `kategorija` u `.pages.yml` (ista `name`/`slug` vrednost).
  Ovo radi neko ko održava sajt, ne kroz admin.

---

## 3. Uputstvo za vlasnika — dodavanje proizvoda

1. Otvoriti **https://app.pagescms.org** i prijaviti se GitHub nalogom (**Sign in with GitHub**).
2. Izabrati repo sajta. Levo su **Proizvodi** i **Akcije i novo u ponudi**.
3. **Proizvodi →** dugme za novi unos:
   - **Naziv**, **Kategorija**, **Kratak opis**,
   - **Slika** — otpremiti fotografiju sa telefona ili računara (bilo koje veličine; sajt je sam smanjuje),
   - **Prikazuj na sajtu** — uključeno.
4. **Save.** Posle 1–2 minuta proizvod je na sajtu (osvežiti stranu).
5. Kada proizvoda privremeno nema — otvoriti ga i isključiti **Prikazuj na sajtu**, pa **Save**.

**Akcije:** **Akcije i novo u ponudi** → dodati stavku u listu, popuniti oznaku, naslov, tekst i datume → **Save**.
Kada nijedna akcija ne važi, zeleni blok na sajtu se ne prikazuje.

---

## 4. Objavljivanje (jednom)

### 4.1 GitHub
1. Napraviti **privatni** repo (npr. `agropromet-sajt`) i poslati granu `main`:
   ```bash
   git remote add origin https://github.com/<nalog>/agropromet-sajt.git
   git push -u origin main
   ```
2. Vlasniku (ako ima svoj GitHub nalog) dati pristup: repo → **Settings → Collaborators → Add people**.

### 4.2 Cloudflare Pages
1. Nalog na **cloudflare.com** (besplatan, bez kartice).
2. **Workers & Pages → Create → Pages → Connect to Git** → povezati GitHub i izabrati repo.
3. Podešavanja builda:

   | Polje | Vrednost |
   |---|---|
   | Production branch | `main` |
   | Framework preset | `None` |
   | Build command | `npm run build` |
   | Build output directory | `dist/client/browser` |
   | Root directory (Advanced) | `client` |
   | Environment variable | `NODE_VERSION` = `22` |

4. **Save and Deploy.** Sajt je na `https://<ime-projekta>.pages.dev`.
   Svaki commit na `main` (i svaka izmena iz Pages CMS-a) automatski pravi novi build.

### 4.3 Pages CMS
1. **https://app.pagescms.org → Sign in with GitHub**, pa odobriti pristup repou (instalira se GitHub aplikacija „Pages CMS“; izabrati samo ovaj repo).
2. Otvoriti repo i proveriti da se vide **Proizvodi** i **Akcije**.

### 4.4 Domen agropromet.rs (registrovan kod Loopia)
1. U Cloudflare: **Add a domain** → `agropromet.rs` → plan **Free**. Cloudflare preuzme postojeće DNS zapise i prikaže **dva nameservera**.
2. Kod Loopie (Customer Zone → domen → nameserveri) zameniti Loopia nameservere tim dvema vrednostima. Aktivacija: od nekoliko minuta do 24 h.
   - Ako na domenu postoji mejl ili drugi servisi, pre promene proveriti da su njihovi zapisi (MX, TXT…) preneti u Cloudflare DNS.
3. Kad je domen aktivan: **Workers & Pages → projekat → Custom domains → Set up a custom domain** → `agropromet.rs`, pa isto za `www.agropromet.rs`.
   Cloudflare sam dodaje DNS zapise i HTTPS sertifikat.
4. Preusmerenje `www` → bez `www`: **Rules → Redirect Rules → Create rule → šablon „Redirect from WWW to root“**.

### 4.5 Posle objave
- **Google Search Console**: dodati `agropromet.rs` (Domain property, verifikacija TXT zapisom u Cloudflare) i poslati `https://agropromet.rs/sitemap.xml`.
- **Google Business profil** radnje: upisati sajt `https://agropromet.rs`.

---

## 5. Napomene

- **Kontrast (WCAG AA).** Neke boje iz dizajna su malo potamnjene samo tamo gde tekst nije imao kontrast 4.5:1:
  terakota za tekst i dugmad `#A5502F` (umesto `#B85C38`), prigušeni tekst na bež pozadini `#6E675A`, oznaka kategorije `#6F6346`, oznaka akcije `#EBBE9A`.
  Sve boje su na jednom mestu: `client/src/styles.scss`.
- **Telefon link** je `tel:+38135273010` (u dizajnu je bilo `+381035…`, što nije ispravan međunarodni format).
- **Podaci o radnji** (adresa, telefon, radno vreme) su u `client/src/app/core/site.ts` i u JSON-LD bloku u `client/src/index.html`.

### Šta još fali (TODO)
- Fotografija za sekciju „O nama“ — u dizajnu je samo prazno mesto (`client/src/app/public/home.html`).
- Tačni datumi sezone kada se radi do 17h — indikator „Sada otvoreno“ koristi redovno radno vreme (`client/src/app/core/site.ts`).
- Datumi važenja početnih akcija (sada su bez ograničenja) — vlasnik ih postavlja kroz admin.
- Slike proizvoda — vlasnik ih dodaje kroz admin.
