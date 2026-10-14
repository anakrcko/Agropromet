using Agropromet.Api.Models;

namespace Agropromet.Api.Data;

/// <summary>
/// Početni podaci preneti doslovno iz dizajna "Agropromet - sajt.html".
/// Slike nisu bile deo dizajna, pa je SlikaUrl prazan — dodaju se kroz admin.
/// </summary>
public static class SeedData
{
    public static readonly Kategorija[] Kategorije =
    [
        new() { Id = 1, Naziv = "Semena", Slug = "semena", Redosled = 1 },
        new() { Id = 2, Naziv = "Zaštita bilja", Slug = "zastita-bilja", Redosled = 2 },
        new() { Id = 3, Naziv = "Đubriva", Slug = "djubriva", Redosled = 3 },
        new() { Id = 4, Naziv = "Sadni materijal", Slug = "sadni-materijal", Redosled = 4 },
        new() { Id = 5, Naziv = "Hrana za životinje", Slug = "hrana-za-zivotinje", Redosled = 5 },
        new() { Id = 6, Naziv = "Alat i oprema", Slug = "alat-i-oprema", Redosled = 6 },
        new() { Id = 7, Naziv = "Navodnjavanje", Slug = "navodnjavanje", Redosled = 7 },
        new() { Id = 8, Naziv = "Folije i ambalaža", Slug = "folije-i-ambalaza", Redosled = 8 },
    ];

    public static readonly Proizvod[] Proizvodi =
    [
        P(1, 1, "Seme kukuruza", "seme-kukuruza", "Hibridi različitih grupa zrenja."),
        P(2, 1, "Seme pšenice", "seme-psenice", "Sortno seme, deklarisano."),
        P(3, 1, "Baštensko seme", "bastensko-seme", "Paradajz, paprika, kupusnjače, salate."),
        P(4, 1, "Seme trave i lucerke", "seme-trave-i-lucerke", "Za livade i pašnjake."),
        P(5, 2, "Herbicidi", "herbicidi", "Za strna žita, kukuruz i suncokret."),
        P(6, 2, "Fungicidi", "fungicidi", "Zaštita voća, vinograda i povrća."),
        P(7, 2, "Insekticidi", "insekticidi", "Za njivu, baštu i skladište."),
        P(8, 2, "Sredstva za glodare", "sredstva-za-glodare", "Mamci za njivu i objekte."),
        P(9, 3, "Mineralna đubriva", "mineralna-djubriva", "NPK, KAN, UREA — u vrećama."),
        P(10, 3, "Folijarna đubriva", "folijarna-djubriva", "Za prihranu preko lista."),
        P(11, 3, "Stajnjak i organska đubriva", "stajnjak-i-organska-djubriva", "Peletirano i pakovano."),
        P(12, 4, "Sadnice voća", "sadnice-voca", "Jabuka, šljiva, kruška, višnja."),
        P(13, 4, "Rasad povrća", "rasad-povrca", "Sezonski, iz proverene proizvodnje."),
        P(14, 4, "Lukovice i krtole", "lukovice-i-krtole", "Beli i crni luk, krompir."),
        P(15, 5, "Koncentrat i smeše", "koncentrat-i-smese", "Za živinu, svinje i goveda."),
        P(16, 5, "Premiksi i vitamini", "premiksi-i-vitamini", "Dodaci ishrani."),
        P(17, 5, "Hrana za pse i mačke", "hrana-za-pse-i-macke", "Suva hrana, veća pakovanja."),
        P(18, 6, "Leđne prskalice", "ledjne-prskalice", "Ručne i baterijske."),
        P(19, 6, "Baštenski alat", "bastenski-alat", "Ašovi, motike, makaze, testere."),
        P(20, 6, "Zaštitna oprema", "zastitna-oprema", "Maske, rukavice, kombinezoni."),
        P(21, 7, "Sistem kap po kap", "sistem-kap-po-kap", "Trake, creva, spojnice."),
        P(22, 7, "Rasprskivači i pumpe", "rasprskivaci-i-pumpe", "Za baštu i plastenik."),
        P(23, 8, "Folije za plastenike", "folije-za-plastenike", "UV stabilizovane, po metru."),
        P(24, 8, "Vreće i džakovi", "vrece-i-dzakovi", "Za žito, krompir i luk."),
    ];

    // TODO: datumi važenja akcija nisu navedeni u dizajnu — vlasnik ih postavlja kroz admin.
    public static readonly Akcija[] Akcije =
    [
        new() { Id = 1, Oznaka = "Akcija", Naslov = "Jesenja setva", Aktivna = true,
            Tekst = "Popust na seme pšenice i ječma uz veće količine. Pitajte za cenu na licu mesta." },
        new() { Id = 2, Oznaka = "Novo", Naslov = "Baterijske prskalice", Aktivna = true,
            Tekst = "Nova serija leđnih prskalica sa punjivom baterijom, sa garancijom." },
        new() { Id = 3, Oznaka = "Uskoro", Naslov = "Sadnice voća", Aktivna = true,
            Tekst = "Prijem porudžbina za jesenju sadnju je počeo. Ograničene količine po sorti." },
    ];

    private static Proizvod P(int id, int kategorijaId, string naziv, string slug, string opis) => new()
    {
        Id = id,
        KategorijaId = kategorijaId,
        Naziv = naziv,
        Slug = slug,
        Opis = opis,
        Aktivan = true,
        Istaknut = false,
        Redosled = id,
    };
}
