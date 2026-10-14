using Agropromet.Api.Data;
using Agropromet.Api.Dtos;
using Agropromet.Api.Models;
using Agropromet.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Agropromet.Api.Controllers;

[ApiController]
[Route("api/proizvodi")]
public class ProizvodiController(AppDbContext db, ImageService slike) : ControllerBase
{
    /// <summary>Javno: samo aktivni proizvodi, opciono filtrirani po slugu kategorije.</summary>
    [HttpGet]
    public async Task<IEnumerable<ProizvodDto>> GetPublic([FromQuery] string? kategorija, CancellationToken ct) =>
        await Upit(kategorija, null, samoAktivni: true).ToListAsync(ct);

    /// <summary>Admin: svi proizvodi (i neaktivni), pretraga po nazivu.</summary>
    [Authorize, HttpGet("svi")]
    public async Task<IEnumerable<ProizvodDto>> GetAll([FromQuery] string? kategorija, [FromQuery] string? q, CancellationToken ct) =>
        await Upit(kategorija, q, samoAktivni: false).ToListAsync(ct);

    [Authorize, HttpGet("{id:int}")]
    public async Task<ActionResult<ProizvodDto>> GetById(int id, CancellationToken ct)
    {
        var p = await db.Proizvodi.AsNoTracking().Include(x => x.Kategorija).FirstOrDefaultAsync(x => x.Id == id, ct);
        return p is null ? NotFound() : p.ToDto();
    }

    [Authorize, HttpPost]
    public async Task<ActionResult<ProizvodDto>> Create(ProizvodUpsert dto, CancellationToken ct)
    {
        var p = new Proizvod();
        if (await Primeni(p, dto, ct) is { } greska) return greska;
        db.Proizvodi.Add(p);
        await db.SaveChangesAsync(ct);
        await db.Entry(p).Reference(x => x.Kategorija).LoadAsync(ct);
        return CreatedAtAction(nameof(GetById), new { id = p.Id }, p.ToDto());
    }

    [Authorize, HttpPut("{id:int}")]
    public async Task<ActionResult<ProizvodDto>> Update(int id, ProizvodUpsert dto, CancellationToken ct)
    {
        var p = await db.Proizvodi.Include(x => x.Kategorija).FirstOrDefaultAsync(x => x.Id == id, ct);
        if (p is null) return NotFound();
        if (await Primeni(p, dto, ct) is { } greska) return greska;
        await db.SaveChangesAsync(ct);
        await db.Entry(p).Reference(x => x.Kategorija).LoadAsync(ct);
        return p.ToDto();
    }

    /// <summary>Uključi/isključi proizvod bez brisanja.</summary>
    [Authorize, HttpPatch("{id:int}/aktivan")]
    public async Task<ActionResult<ProizvodDto>> SetAktivan(int id, [FromBody] bool aktivan, CancellationToken ct)
    {
        var p = await db.Proizvodi.Include(x => x.Kategorija).FirstOrDefaultAsync(x => x.Id == id, ct);
        if (p is null) return NotFound();
        p.Aktivan = aktivan;
        await db.SaveChangesAsync(ct);
        return p.ToDto();
    }

    [Authorize, HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var p = await db.Proizvodi.FindAsync([id], ct);
        if (p is null) return NotFound();
        slike.Obrisi(p.SlikaUrl);
        db.Proizvodi.Remove(p);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [Authorize, HttpPost("{id:int}/slika")]
    [RequestSizeLimit(ImageService.MaxVelicinaBajtova)]
    public async Task<ActionResult<ProizvodDto>> UploadSlika(int id, IFormFile slika, CancellationToken ct)
    {
        var p = await db.Proizvodi.Include(x => x.Kategorija).FirstOrDefaultAsync(x => x.Id == id, ct);
        if (p is null) return NotFound();
        if (slika is null || slika.Length == 0)
            return BadRequest(new ProblemDetails { Title = "Fajl nije poslat." });
        if (!slika.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new ProblemDetails { Title = "Dozvoljene su samo slike (JPG, PNG, WebP…)." });

        string url;
        try
        {
            await using var stream = slika.OpenReadStream();
            url = await slike.SacuvajAsync(stream, p.Slug, ct);
        }
        catch (NeispravnaSlikaException e)
        {
            return BadRequest(new ProblemDetails { Title = e.Message });
        }

        slike.Obrisi(p.SlikaUrl);
        p.SlikaUrl = url;
        await db.SaveChangesAsync(ct);
        return p.ToDto();
    }

    [Authorize, HttpDelete("{id:int}/slika")]
    public async Task<ActionResult<ProizvodDto>> DeleteSlika(int id, CancellationToken ct)
    {
        var p = await db.Proizvodi.Include(x => x.Kategorija).FirstOrDefaultAsync(x => x.Id == id, ct);
        if (p is null) return NotFound();
        slike.Obrisi(p.SlikaUrl);
        p.SlikaUrl = null;
        await db.SaveChangesAsync(ct);
        return p.ToDto();
    }

    private IQueryable<ProizvodDto> Upit(string? kategorija, string? q, bool samoAktivni)
    {
        var upit = db.Proizvodi.AsNoTracking().AsQueryable();
        if (samoAktivni) upit = upit.Where(p => p.Aktivan);
        if (!string.IsNullOrWhiteSpace(kategorija)) upit = upit.Where(p => p.Kategorija!.Slug == kategorija);
        if (!string.IsNullOrWhiteSpace(q)) upit = upit.Where(p => p.Naziv.Contains(q) || p.Opis.Contains(q));
        return upit
            .OrderBy(p => p.Kategorija!.Redosled).ThenBy(p => p.Redosled).ThenBy(p => p.Naziv)
            .Select(p => new ProizvodDto(p.Id, p.KategorijaId, p.Kategorija!.Naziv, p.Kategorija.Slug,
                p.Naziv, p.Slug, p.Opis, p.SlikaUrl, p.Istaknut, p.Aktivan, p.Redosled));
    }

    private async Task<ActionResult?> Primeni(Proizvod p, ProizvodUpsert dto, CancellationToken ct)
    {
        if (!await db.Kategorije.AnyAsync(k => k.Id == dto.KategorijaId, ct))
            return ValidationProblem(new ValidationProblemDetails(new Dictionary<string, string[]> { ["kategorijaId"] = ["Kategorija ne postoji."] }));
        var slug = string.IsNullOrWhiteSpace(dto.Slug) ? SlugHelper.Napravi(dto.Naziv) : dto.Slug;
        if (string.IsNullOrEmpty(slug))
            return ValidationProblem(new ValidationProblemDetails(new Dictionary<string, string[]> { ["slug"] = ["Slug ne može biti prazan."] }));
        if (await db.Proizvodi.AnyAsync(x => x.Slug == slug && x.Id != p.Id, ct))
            return Conflict(new ProblemDetails { Title = $"Proizvod sa slugom „{slug}“ već postoji." });

        p.KategorijaId = dto.KategorijaId;
        p.Naziv = dto.Naziv.Trim();
        p.Slug = slug;
        p.Opis = dto.Opis.Trim();
        p.Istaknut = dto.Istaknut;
        p.Aktivan = dto.Aktivan;
        p.Redosled = dto.Redosled;
        return null;
    }
}
