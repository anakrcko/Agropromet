namespace Agropromet.Api.Models;

public class Kategorija
{
    public int Id { get; set; }
    public string Naziv { get; set; } = "";
    public string Slug { get; set; } = "";
    public int Redosled { get; set; }

    public List<Proizvod> Proizvodi { get; set; } = [];
}

public class Proizvod
{
    public int Id { get; set; }
    public int KategorijaId { get; set; }
    public Kategorija? Kategorija { get; set; }
    public string Naziv { get; set; } = "";
    public string Slug { get; set; } = "";
    public string Opis { get; set; } = "";
    /// <summary>Relativna putanja, npr. "/images/products/seme-kukuruza.webp". Null = nema slike.</summary>
    public string? SlikaUrl { get; set; }
    public bool Istaknut { get; set; }
    public bool Aktivan { get; set; } = true;
    public int Redosled { get; set; }
}

public class Akcija
{
    public int Id { get; set; }
    /// <summary>"Akcija" | "Novo" | "Uskoro"</summary>
    public string Oznaka { get; set; } = "";
    public string Naslov { get; set; } = "";
    public string Tekst { get; set; } = "";
    /// <summary>Null = važi od uvek.</summary>
    public DateOnly? VaziOd { get; set; }
    /// <summary>Null = važi do daljnjeg.</summary>
    public DateOnly? VaziDo { get; set; }
    public bool Aktivna { get; set; } = true;
}

public static class AkcijaOznake
{
    public static readonly string[] Dozvoljene = ["Akcija", "Novo", "Uskoro"];
}
