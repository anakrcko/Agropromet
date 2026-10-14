using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Agropromet.Api.Dtos;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.IdentityModel.Tokens;

namespace Agropromet.Api.Controllers;

/// <summary>
/// Prijava jedinog korisnika (vlasnika). Korisničko ime i heš lozinke dolaze iz konfiguracije
/// (Admin:KorisnickoIme, Admin:LozinkaHash). Heš se pravi komandom: dotnet run -- hash-lozinku "lozinka"
/// </summary>
[ApiController]
[Route("api/auth")]
public class AuthController(IConfiguration config) : ControllerBase
{
    [HttpPost("login")]
    [EnableRateLimiting("login")]
    public ActionResult<LoginResponse> Login(LoginRequest req)
    {
        var korisnik = config["Admin:KorisnickoIme"];
        var hash = config["Admin:LozinkaHash"];
        if (string.IsNullOrEmpty(korisnik) || string.IsNullOrEmpty(hash))
            return Problem("Admin nalog nije podešen na serveru (Admin:KorisnickoIme / Admin:LozinkaHash).", statusCode: 503);

        var hasher = new PasswordHasher<string>();
        var ok = string.Equals(req.KorisnickoIme, korisnik, StringComparison.Ordinal)
                 && hasher.VerifyHashedPassword(korisnik, hash, req.Lozinka) != PasswordVerificationResult.Failed;
        if (!ok) return Unauthorized(new ProblemDetails { Title = "Pogrešno korisničko ime ili lozinka." });

        var istek = DateTime.UtcNow.AddHours(config.GetValue("Jwt:TrajanjeSati", 12));
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Kljuc"]!));
        var token = new JwtSecurityToken(
            issuer: config["Jwt:Izdavac"],
            audience: config["Jwt:Publika"],
            claims: [new Claim(ClaimTypes.Name, korisnik), new Claim(ClaimTypes.Role, "Admin")],
            expires: istek,
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));

        return new LoginResponse(new JwtSecurityTokenHandler().WriteToken(token), istek);
    }
}
