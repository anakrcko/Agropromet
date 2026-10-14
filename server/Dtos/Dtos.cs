using System.ComponentModel.DataAnnotations;
using Agropromet.Api.Models;

namespace Agropromet.Api.Dtos;

public record KategorijaDto(int Id, string Naziv, string Slug, int Redosled);

public record ProizvodDto(
    int Id,
    int KategorijaId,
    string Kategorija,
    string KategorijaSlug,
    string Naziv,
    string Slug,
    string Opis,
    string? SlikaUrl,
    bool Istaknut,
    bool Aktivan,
    int Redosled);

public record AkcijaDto(int Id, string Oznaka, string Naslov, string Tekst, DateOnly? VaziOd, DateOnly? VaziDo, bool Aktivna);

public class KategorijaUpsert
{
    [Required(ErrorMessage = "Naziv je obavezan."), StringLength(100)]
    public string Naziv { get; set; } = "";

    /// <summary>Ako je prazno, pravi se iz naziva.</summary>
    [StringLength(100), RegularExpression("^[a-z0-9]+(-[a-z0-9]+)*$", ErrorMessage = "Slug sme da sadrži samo mala slova, brojeve i crtice.")]
    public string? Slug { get; set; }

    [Range(0, 10000)]
    public int Redosled { get; set; }
}

public class ProizvodUpsert
{
    [Range(1, int.MaxValue, ErrorMessage = "Izaberite kategoriju.")]
    public int KategorijaId { get; set; }

    [Required(ErrorMessage = "Naziv je obavezan."), StringLength(150)]
    public string Naziv { get; set; } = "";

    [StringLength(150), RegularExpression("^[a-z0-9]+(-[a-z0-9]+)*$", ErrorMessage = "Slug sme da sadrži samo mala slova, brojeve i crtice.")]
    public string? Slug { get; set; }

    [StringLength(500)]
    public string Opis { get; set; } = "";

    public bool Istaknut { get; set; }
    public bool Aktivan { get; set; } = true;

    [Range(0, 100000)]
    public int Redosled { get; set; }
}

public class AkcijaUpsert : IValidatableObject
{
    [Required(ErrorMessage = "Oznaka je obavezna.")]
    public string Oznaka { get; set; } = "";

    [Required(ErrorMessage = "Naslov je obavezan."), StringLength(150)]
    public string Naslov { get; set; } = "";

    [StringLength(1000)]
    public string Tekst { get; set; } = "";

    public DateOnly? VaziOd { get; set; }
    public DateOnly? VaziDo { get; set; }
    public bool Aktivna { get; set; } = true;

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (!AkcijaOznake.Dozvoljene.Contains(Oznaka))
            yield return new ValidationResult("Oznaka mora biti: Akcija, Novo ili Uskoro.", [nameof(Oznaka)]);
        if (VaziOd is not null && VaziDo is not null && VaziDo < VaziOd)
            yield return new ValidationResult("Datum „važi do“ ne sme biti pre datuma „važi od“.", [nameof(VaziDo)]);
    }
}

public class LoginRequest
{
    [Required] public string KorisnickoIme { get; set; } = "";
    [Required] public string Lozinka { get; set; } = "";
}

public record LoginResponse(string Token, DateTime IstekUtc);

public static class Mapping
{
    public static KategorijaDto ToDto(this Kategorija k) => new(k.Id, k.Naziv, k.Slug, k.Redosled);

    public static ProizvodDto ToDto(this Proizvod p) => new(
        p.Id, p.KategorijaId, p.Kategorija?.Naziv ?? "", p.Kategorija?.Slug ?? "",
        p.Naziv, p.Slug, p.Opis, p.SlikaUrl, p.Istaknut, p.Aktivan, p.Redosled);

    public static AkcijaDto ToDto(this Akcija a) => new(a.Id, a.Oznaka, a.Naslov, a.Tekst, a.VaziOd, a.VaziDo, a.Aktivna);
}
