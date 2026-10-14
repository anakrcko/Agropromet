using Agropromet.Api.Data;
using Agropromet.Api.Dtos;
using Agropromet.Api.Models;
using Agropromet.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Agropromet.Api.Controllers;

[ApiController]
[Route("api/akcije")]
public class AkcijeController(AppDbContext db) : ControllerBase
{
    /// <summary>Javno: samo aktivne akcije koje važe danas (po beogradskom vremenu).</summary>
    [HttpGet]
    public async Task<IEnumerable<AkcijaDto>> GetPublic(CancellationToken ct)
    {
        var danas = Vreme.DanasUBeogradu();
        return await db.Akcije.AsNoTracking()
            .Where(a => a.Aktivna
                && (a.VaziOd == null || a.VaziOd <= danas)
                && (a.VaziDo == null || a.VaziDo >= danas))
            .OrderBy(a => a.Id)
            .Select(a => new AkcijaDto(a.Id, a.Oznaka, a.Naslov, a.Tekst, a.VaziOd, a.VaziDo, a.Aktivna))
            .ToListAsync(ct);
    }

    [Authorize, HttpGet("sve")]
    public async Task<IEnumerable<AkcijaDto>> GetAll(CancellationToken ct) =>
        await db.Akcije.AsNoTracking().OrderByDescending(a => a.Id)
            .Select(a => new AkcijaDto(a.Id, a.Oznaka, a.Naslov, a.Tekst, a.VaziOd, a.VaziDo, a.Aktivna))
            .ToListAsync(ct);

    [Authorize, HttpPost]
    public async Task<ActionResult<AkcijaDto>> Create(AkcijaUpsert dto, CancellationToken ct)
    {
        var a = new Akcija();
        Primeni(a, dto);
        db.Akcije.Add(a);
        await db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(GetAll), a.ToDto());
    }

    [Authorize, HttpPut("{id:int}")]
    public async Task<ActionResult<AkcijaDto>> Update(int id, AkcijaUpsert dto, CancellationToken ct)
    {
        var a = await db.Akcije.FindAsync([id], ct);
        if (a is null) return NotFound();
        Primeni(a, dto);
        await db.SaveChangesAsync(ct);
        return a.ToDto();
    }

    [Authorize, HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var a = await db.Akcije.FindAsync([id], ct);
        if (a is null) return NotFound();
        db.Akcije.Remove(a);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    private static void Primeni(Akcija a, AkcijaUpsert dto)
    {
        a.Oznaka = dto.Oznaka;
        a.Naslov = dto.Naslov.Trim();
        a.Tekst = dto.Tekst.Trim();
        a.VaziOd = dto.VaziOd;
        a.VaziDo = dto.VaziDo;
        a.Aktivna = dto.Aktivna;
    }
}
