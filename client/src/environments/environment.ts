// Produkcija. Prerender početne strane poziva API tokom `ng build`, pa API mora biti dostupan
// na ovoj adresi i za vreme builda (inače se strana prerenderuje bez proizvoda i podaci se učitaju u browseru).
export const environment = {
  production: true,
  // Javna adresa API-ja (bez kose crte na kraju). Besplatni App Service (F1) ne podržava sopstveni domen,
  // pa API ostaje na Azure adresi.
  // TODO: upisati tačnu adresu iz Azure portala (App Service → Overview → Default domain).
  apiBase: 'https://AGROPROMET-API.azurewebsites.net',
  // Javna adresa sajta (Open Graph, kanonski link). www.agropromet.rs se preusmerava ovde.
  siteUrl: 'https://agropromet.rs',
};
