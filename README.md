# Agropromet — sajt poljoprivredne apoteke (Ribare)

Prezentacioni sajt sa ponudom proizvoda (bez cena i korpe) i admin delom za vlasnika.

| Deo | Tehnologija | Folder |
|---|---|---|
| Javni sajt + admin | Angular 21 (standalone, signals, SCSS, prerender) | `client/` |
| API | ASP.NET Core Web API (.NET 10), EF Core, SQL Server | `server/` |
| Baza za razvoj | LocalDB ili Docker (`docker-compose.yml`) | — |

---

## 1. Lokalno pokretanje

### Potrebno
- .NET SDK 10
- Node.js 22.12+ (Angular 21). Za Angular 22 potreban je Node 22.22+.
- SQL Server: **LocalDB** (dolazi uz Visual Studio) **ili** Docker Desktop.

### 1.1 Baza

**Varijanta A — LocalDB (podrazumevano).** Ništa se ne podešava; konekcija je već u `server/appsettings.Development.json`:
```
Server=(localdb)\MSSQLLocalDB;Database=Agropromet;...
```

**Varijanta B — Docker.**
```bash
cp .env.example .env          # pa promeniti lozinku u .env
docker compose up -d
```
Zatim u `server/` postaviti konekciju (preko user-secrets, da lozinka ne bi bila u repou):
```bash
cd server
dotnet user-secrets set "ConnectionStrings:Agropromet" "Server=localhost,1433;Database=Agropromet;User Id=sa;Password=<lozinka iz .env>;TrustServerCertificate=True"
```

### 1.2 Migracije
```bash
cd server
dotnet tool restore
dotnet ef database update
```
Migracija pravi tabele `Kategorije`, `Proizvodi`, `Akcije` i ubacuje početne podatke iz dizajna (8 kategorija, 24 proizvoda, 3 akcije).
U razvoju se migracije primenjuju i same pri pokretanju API-ja (`Baza:PrimeniMigracijePriPokretanju`).

### 1.3 Nalog vlasnika (admin)
Postoji jedan korisnik. Lozinka se nigde ne čuva u čistom obliku — u konfiguraciju ide samo heš:
```bash
cd server
dotnet run -- hash-lozinku "OvdeIzaberiteJakuLozinku"
# ispisuje heš, npr. AQAAAAIAAYag...

dotnet user-secrets set "Admin:KorisnickoIme" "vlasnik"
dotnet user-secrets set "Admin:LozinkaHash" "<heš iz prethodne komande>"
```
Dok ovo nije podešeno, prijava vraća 503.

### 1.4 API
```bash
cd server
dotnet run
```
API radi na **http://localhost:5155** (npr. http://localhost:5155/api/proizvodi). U razvoju je dostupan i OpenAPI opis na `/openapi/v1.json`.

### 1.5 Angular
```bash
cd client
npm install
npm start
```
Sajt: **http://localhost:4200**, admin: **http://localhost:4200/admin**.

> Ako `npm`/`npx` prijavi čudne greške (stari globalni npm), pozvati npm koji dolazi uz Node:
> `node "C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js" install`

Produkcioni build (`npm run build`) **prerenderuje početnu stranu** sa podacima iz API-ja, pa API mora da radi tokom builda.
Ako API nije dostupan, build prolazi, a podaci se učitavaju u browseru.

---

## 2. Javni API

| Metod | Putanja | Opis |
|---|---|---|
| GET | `/api/kategorije` | sve kategorije, po redosledu |
| GET | `/api/proizvodi?kategorija={slug}` | aktivni proizvodi (opciono po kategoriji) |
| GET | `/api/akcije` | samo aktivne akcije koje važe danas (po beogradskom vremenu) |

Admin rute (potreban JWT): `POST /api/auth/login`, CRUD za `/api/proizvodi`, `/api/kategorije`, `/api/akcije`,
`PATCH /api/proizvodi/{id}/aktivan`, `POST /api/proizvodi/{id}/slika` (polje `slika`, do 15 MB; čuva se kao WebP 1200 px u `wwwroot/images/products/`).

---

## 3. Dodavanje proizvoda kroz admin

1. Otvoriti `/admin` i prijaviti se korisničkim imenom i lozinkom vlasnika.
2. **Proizvodi → + Novi proizvod.**
3. Upisati **naziv**, izabrati **kategoriju**, upisati kratak **opis** (prikazuje se na kartici).
4. Po želji izabrati **sliku** (JPG/PNG/WebP). Pregled se vidi odmah; slika se automatski smanjuje i pretvara u WebP.
   Proizvod bez slike na sajtu dobija bež polje sa nazivom.
5. **Sačuvaj.** Proizvod se odmah vidi na API-ju; na sajtu posle osvežavanja strane.
6. Proizvod koji privremeno nema na stanju **ne treba brisati** — dovoljno je na listi isključiti prekidač **Aktivan**.

Akcije (Akcija / Novo / Uskoro) se dodaju u **Akcije**, sa datumima „važi od / do“. Kada nijedna akcija ne važi, zeleni blok na sajtu se ne prikazuje.

> Javna strana je prerenderovana u trenutku builda. Sajt se automatski ponovo objavljuje **svake noći** (GitHub Actions),
> pa se novi proizvodi i promene akcija vide na sajtu najkasnije sledećeg jutra.
> Za odmah: GitHub → **Actions → Objava sajta → Run workflow** (oko 3 minuta).

---

## 4. Objavljivanje — besplatna varijanta

| Šta | Usluga (besplatni plan) | Adresa |
|---|---|---|
| Javni sajt + admin | Azure Static Web Apps — Free | `https://agropromet.rs` (i `www.agropromet.rs`) |
| API + slike proizvoda | Azure App Service — F1 (Free) | `https://<ime>.azurewebsites.net` |
| Baza | Azure SQL Database — besplatna ponuda | — |
| DNS | Cloudflare — Free | — |
| Build i objava sajta | GitHub (privatni repo) + GitHub Actions | — |

**Ograničenja besplatnih planova** (za radnju ove veličine dovoljno je, ali treba ih znati):
- F1 API „zaspi“ posle ~20 min bez poseta; prvi zahtev posle toga traje 10–30 s (prvo otvaranje admina, prve slike).
- F1: 60 min procesorskog vremena dnevno i ograničen saobraćaj (oko 165 MB dnevno) — slike se keširaju u browseru, ali ako sajt postane jako posećen, prelazi se na plan B1 (~13 €/mesečno).
- F1 ne podržava sopstveni domen, pa API ostaje na `*.azurewebsites.net` adresi (posetioci to ne vide).
- Besplatna baza ima 100.000 vCore-sekundi mesečno; gasi se kada miruje i budi se pri prvom upitu (API ponavlja upit dok se ne probudi).
  Sajt bazu koristi samo pri noćnom buildu i radu u adminu, pa limit nije problem.
- Azure nalog traži platnu karticu radi provere identiteta; uz izbore ispod ništa se ne naplaćuje.

### 4.1 Azure nalog
1. Napraviti nalog na https://azure.microsoft.com/free.
2. U portalu (portal.azure.com) napraviti **Resource group** `agropromet`, region **West Europe**. Sve ispod ide u nju.

### 4.2 Baza (Azure SQL, besplatno)
1. **Create → Azure SQL → SQL databases → Single database.**
2. Na vrhu forme kliknuti **Apply offer** (Free Azure SQL Database offer).
3. Server: **Create new** → ime npr. `agropromet-sql`, autentifikacija **SQL authentication**, upisati admin korisnika i jaku lozinku (sačuvati ih).
4. Baza: ime `Agropromet`. **Behavior when free limit reached: Auto-pause the database until next month** — ovo garantuje da nema naplate.
5. **Networking:** *Public endpoint*, **Allow Azure services and resources to access this server: Yes**.
6. Posle kreiranja: baza → **Connection strings → ADO.NET (SQL authentication)** — kopirati i u njoj zameniti `{your_password}`.

### 4.3 API (App Service F1, besplatno)
1. **Create → Web App.** Ime npr. `agropromet-api`, *Publish: Code*, *Runtime: .NET 10*, *OS: Windows*, region West Europe.
   **Pricing plan → Free F1.**
2. Posle kreiranja, na **Overview** prepisati **Default domain** (npr. `agropromet-api-xxxx.westeurope-01.azurewebsites.net`).
3. Lokalno napraviti tajne:
   ```bash
   cd server
   dotnet run -- hash-lozinku "LozinkaVlasnika"   # heš lozinke za admin
   openssl rand -base64 48                        # JWT ključ (Git Bash)
   ```
4. Web App → **Settings → Environment variables** → dodati (pa **Apply**):
   ```
   ConnectionStrings__Agropromet        = <konekcija iz 4.2, sa lozinkom>
   Jwt__Kljuc                           = <izlaz openssl komande>
   Admin__KorisnickoIme                 = vlasnik
   Admin__LozinkaHash                   = <heš iz hash-lozinku>
   Baza__PrimeniMigracijePriPokretanju  = true
   ```
   Domeni sajta za CORS su već u `appsettings.json`. Za probu pre podešavanja domena dodati i
   `Cors__DozvoljeniDomeni__2 = https://<ime>.azurestaticapps.net` (adresa iz 4.4).
5. Objava iz VS Code-a: ekstenzija **Azure App Service** → desni klik na folder `server` → **Deploy to Web App…** → izabrati `agropromet-api`.
6. Provera: `https://<default domain>/api/proizvodi` vraća listu proizvoda (prvi put može da traje do minut — baza se pravi i puni).
7. U `client/src/environments/environment.ts` upisati tu adresu u `apiBase` (bez `/` na kraju).

API se ponovo objavljuje samo kada se menja kod u `server/` — proizvodi, slike i akcije se menjaju kroz admin.

### 4.4 Sajt (Static Web Apps, besplatno)
1. Kod staviti na GitHub u **privatni** repo, grana `main`.
2. Azure: **Create → Static Web App.** Ime `agropromet-sajt`, *Plan: Free*, **Deployment source: Other**.
3. Static Web App → **Overview → Manage deployment token** → kopirati.
4. GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**:
   ime `AZURE_STATIC_WEB_APPS_API_TOKEN`, vrednost = token.
5. GitHub → **Actions → Objava sajta → Run workflow.** Workflow (`.github/workflows/sajt.yml`) budi API, pravi build i objavljuje sajt.
   Posle toga se pokreće sam: na svaku izmenu u `client/` i svake noći.
6. Provera na adresi `https://<ime>.azurestaticapps.net`.

### 4.5 Domen agropromet.rs (Cloudflare DNS, besplatno)
Glavni domen bez `www` traži „CNAME na vrhu domena“, što Cloudflare podržava besplatno (a većina .rs registara ne).
1. Nalog na cloudflare.com → **Add a domain** → `agropromet.rs` → plan **Free**.
2. Cloudflare prikaže dva nameservera. Kod registra kod kog je kupljen domen, u podešavanjima domena, zameniti nameservere tim vrednostima.
   Aktivacija traje od nekoliko minuta do 24 h; Cloudflare javlja mejlom.
3. Azure → Static Web App → **Custom domains → Add → Custom domain on other DNS**:
   - `agropromet.rs` — tip validacije **TXT**; Azure prikaže vrednost → u Cloudflare dodati **TXT** zapis `@` sa tom vrednošću.
     Zatim u Cloudflare: **CNAME** `@` → `<ime>.azurestaticapps.net`.
   - `www.agropromet.rs` — u Cloudflare: **CNAME** `www` → `<ime>.azurestaticapps.net`, pa dodati domen u Azure.
   - Kod oba CNAME zapisa u Cloudflare isključiti proxy (**siva oblačić ikonica — DNS only**), da bi Azure mogao da izda HTTPS sertifikat.
4. Posle validacije Azure sam izdaje besplatan HTTPS sertifikat (do sat vremena).
5. Opciono: u Static Web App → Custom domains postaviti `agropromet.rs` kao **default**.

### 4.6 Posle objave
- **Google Search Console** (search.google.com/search-console): dodati domen `agropromet.rs` (verifikacija TXT zapisom u Cloudflare) i poslati `https://agropromet.rs/sitemap.xml`.
- **Google Business profil** radnje: upisati sajt `https://agropromet.rs`.
- Prijaviti se na `https://agropromet.rs/admin` i proveriti dodavanje proizvoda sa slikom.

### 4.7 Alternativa: sopstveni Windows server (IIS)
- **API:** instalirati *ASP.NET Core Hosting Bundle* (.NET 10), `dotnet publish -c Release -o C:\inetpub\agropromet-api`, App Pool *No Managed Code*,
  podešavanja iz 4.3 kao promenljive okruženja; nalogu App Pool-a dati pravo pisanja na `wwwroot\images\products`.
- **Sajt:** sadržaj `client/dist/client/browser` u folder sajta; potreban modul **URL Rewrite** (`web.config` je već u buildu).

---

## 5. Napomene

- **Obrada slika** koristi SkiaSharp (MIT licenca — besplatno i za komercijalnu upotrebu, bez licencnog ključa).
  Sva obrada je u `server/Services/Services.cs` (`ImageService`).
- **Kontrast (WCAG AA).** Neke boje iz dizajna su malo potamnjene samo tamo gde tekst nije imao kontrast 4.5:1:
  terakota za tekst i dugmad `#A5502F` (umesto `#B85C38`), prigušeni tekst na bež pozadini `#6E675A`, oznaka kategorije `#6F6346`, oznaka akcije `#EBBE9A`.
  Sve boje su na jednom mestu: `client/src/styles.scss`.
- **Telefon link** je `tel:+38135273010` (u dizajnu je bilo `+381035…`, što nije ispravan međunarodni format).
- **Bezbednost:** prijava je ograničena na 10 pokušaja u minuti; JWT važi 12 h; CORS dozvoljava samo domene iz `Cors:DozvoljeniDomeni`.

### Šta još fali (TODO)
- Fotografija za sekciju „O nama“ — u dizajnu je samo prazno mesto (`client/src/app/public/home.html`).
- Tačni datumi sezone kada se radi do 17h — indikator „Sada otvoreno“ koristi redovno radno vreme (`client/src/app/core/site.ts`).
- Datumi važenja početnih akcija (u bazi su bez ograničenja) i tekst „Sezona: jesen 2026.“ (`site.ts`).
- Slike proizvoda — dodaju se kroz admin.
- `docker-compose.yml` nije testiran na ovoj mašini (Docker nije instaliran).
