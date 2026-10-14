using System.Text;
using System.Threading.RateLimiting;
using Agropromet.Api.Data;
using Agropromet.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

// Pomoćna komanda: dotnet run -- hash-lozinku "MojaLozinka"
if (args is ["hash-lozinku", var lozinka])
{
    Console.WriteLine(new PasswordHasher<string>().HashPassword("admin", lozinka));
    return;
}

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDbContext>(o =>
    o.UseSqlServer(builder.Configuration.GetConnectionString("Agropromet"),
        // Besplatna Azure SQL baza se gasi kad miruje; prvi upit posle pauze se ponavlja dok se baza ne probudi.
        sql => sql.EnableRetryOnFailure(maxRetryCount: 6, maxRetryDelay: TimeSpan.FromSeconds(15), errorNumbersToAdd: null)));

builder.Services.AddControllers();
builder.Services.AddProblemDetails();
builder.Services.AddOpenApi();
builder.Services.AddScoped<ImageService>();

var jwtKljuc = builder.Configuration["Jwt:Kljuc"];
if (string.IsNullOrEmpty(jwtKljuc) || jwtKljuc.Length < 32)
    throw new InvalidOperationException("Jwt:Kljuc mora biti podešen (najmanje 32 karaktera).");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o => o.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidIssuer = builder.Configuration["Jwt:Izdavac"],
        ValidateAudience = true,
        ValidAudience = builder.Configuration["Jwt:Publika"],
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKljuc)),
        ValidateLifetime = true,
        ClockSkew = TimeSpan.FromMinutes(1),
    });
builder.Services.AddAuthorization();

// CORS: samo domen(i) sajta iz konfiguracije (Cors:DozvoljeniDomeni).
var domeni = builder.Configuration.GetSection("Cors:DozvoljeniDomeni").Get<string[]>() ?? [];
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p
    .WithOrigins(domeni)
    .AllowAnyHeader()
    .WithMethods("GET", "POST", "PUT", "PATCH", "DELETE")));

// Zaštita prijave od pogađanja lozinke: 10 pokušaja u minuti po IP adresi.
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.AddPolicy("login", ctx => RateLimitPartition.GetFixedWindowLimiter(
        ctx.Connection.RemoteIpAddress?.ToString() ?? "nepoznato",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 10, Window = TimeSpan.FromMinutes(1) }));
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}
else
{
    app.UseExceptionHandler();
    app.UseHsts();
    app.UseHttpsRedirection();
}

// Slike proizvoda iz wwwroot/images/products, keširaju se dugo jer ime fajla sadrži verziju.
app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = ctx =>
    {
        ctx.Context.Response.Headers.CacheControl = "public,max-age=31536000,immutable";
        ctx.Context.Response.Headers.AccessControlAllowOrigin = "*";
    },
});

app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

if (app.Configuration.GetValue("Baza:PrimeniMigracijePriPokretanju", false))
{
    using var scope = app.Services.CreateScope();
    scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.Migrate();
}

app.Run();
