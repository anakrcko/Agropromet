using Agropromet.Api.Data;
using Agropromet.Api.Dtos;
using Agropromet.Api.Models;
using Agropromet.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Agropromet.Api.Controllers;

[ApiController]
[Route("api/kategorije")]
public class KategorijeController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IEnumerable<KategorijaDto>> GetAll(CancellationToken ct) =>
        await db.Kategorije.AsNoTracking()
            .OrderBy(k => k.Redosled).ThenBy(k => k.Naziv)
            .Select(k => new KategorijaDto(k.Id, k.Naziv, k.Slug, k.Redosled))
            .ToListAsync(ct);

    [Authorize, HttpPost]
    public async Task<ActionResult<KategorijaDto>> Create(KategorijaUpsert dto, CancellationToken ct)
    {
        var k = new Kategorija();
        if (await Primeni(k, dto, ct) is { } greska) return greska;
        db.Kategorije.Add(k);
        await db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(GetAll), k.ToDto());
    }

    [Authorize, HttpPut("{id:int}")]
    public async Task<ActionResult<KategorijaDto>> Update(int id, KategorijaUpsert dto, CancellationToken ct)
    {
        var k = await db.Kategorije.FindAsync([id], ct);
        if (k is null) return NotFound();
        if (await Primeni(k, dto, ct) is { } greska) return greska;
        await db.SaveChangesAsync(ct);
        return k.ToDto();
    }

    [Authorize, HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var k = await db.Kategorije.FindAsync([id], ct);
        if (k is null) return NotFound();
        if (await db.Proizvodi.AnyAsync(p => p.KategorijaId == id, ct))
            return Conflict(new ProblemDetails { Title = "Kategorija ima proizvode. Prvo ih premestite ili obrišite." });
        db.Kategorije.Remove(k);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    private async Task<ActionResult?> Primeni(Kategorija k, KategorijaUpsert dto, CancellationToken ct)
    {
        var slug = string.IsNullOrWhiteSpace(dto.Slug) ? SlugHelper.Napravi(dto.Naziv) : dto.Slug;
        if (string.IsNullOrEmpty(slug))
            return ValidationProblem(new ValidationProblemDetails(new Dictionary<string, string[]> { ["slug"] = ["Slug ne može biti prazan."] }));
        if (await db.Kategorije.AnyAsync(x => x.Slug == slug && x.Id != k.Id, ct))
            return Conflict(new ProblemDetails { Title = $"Kategorija sa slugom „{slug}“ već postoji." });
        k.Naziv = dto.Naziv.Trim();
        k.Slug = slug;
        k.Redosled = dto.Redosled;
        return null;
    }
}
