using System.Globalization;
using System.Text;
using SkiaSharp;

namespace Agropromet.Api.Services;

public static class SlugHelper
{
    /// <summary>"Leđne prskalice" → "ledjne-prskalice"</summary>
    public static string Napravi(string tekst)
    {
        var s = tekst.Trim().ToLowerInvariant()
            .Replace("đ", "dj").Replace("č", "c").Replace("ć", "c").Replace("š", "s").Replace("ž", "z");
        s = s.Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder();
        var crtica = false;
        foreach (var c in s)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) == UnicodeCategory.NonSpacingMark) continue;
            if (c is >= 'a' and <= 'z' or >= '0' and <= '9') { sb.Append(c); crtica = false; }
            else if (!crtica && sb.Length > 0) { sb.Append('-'); crtica = true; }
        }
        return sb.ToString().Trim('-');
    }
}

public static class Vreme
{
    /// <summary>Današnji datum po beogradskom vremenu (radi i na Windows i na Linux hostu).</summary>
    public static DateOnly DanasUBeogradu()
    {
        var tz = TimeZoneInfo.FindSystemTimeZoneById("Europe/Belgrade");
        return DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tz));
    }
}

/// <summary>Fajl nije slika ili format nije podržan.</summary>
public class NeispravnaSlikaException(string poruka) : Exception(poruka);

/// <summary>Obrada slika preko SkiaSharp-a (MIT licenca, besplatno i za komercijalnu upotrebu).</summary>
public class ImageService(IWebHostEnvironment env)
{
    public const int MaxDimenzija = 1200;
    public const long MaxVelicinaBajtova = 15 * 1024 * 1024;
    private const string Folder = "images/products";

    /// <summary>
    /// Ispravlja orijentaciju sa telefona, smanjuje sliku na najviše 1200 px, čuva kao WebP (EXIF se ne prenosi)
    /// i vraća relativnu URL putanju.
    /// </summary>
    public async Task<string> SacuvajAsync(Stream ulaz, string slug, CancellationToken ct)
    {
        using var memorija = new MemoryStream();
        await ulaz.CopyToAsync(memorija, ct);
        memorija.Position = 0;

        using var codec = SKCodec.Create(memorija)
            ?? throw new NeispravnaSlikaException("Format slike nije podržan.");
        using var original = SKBitmap.Decode(codec)
            ?? throw new NeispravnaSlikaException("Fajl nije ispravna slika.");

        var faktor = Math.Min(1.0, (double)MaxDimenzija / Math.Max(original.Width, original.Height));
        var w = Math.Max(1, (int)Math.Round(original.Width * faktor));
        var h = Math.Max(1, (int)Math.Round(original.Height * faktor));
        using var umanjena = faktor < 1
            ? original.Resize(new SKImageInfo(w, h), new SKSamplingOptions(SKCubicResampler.Mitchell))
            : original.Copy();

        using var slika = Orijentisi(umanjena, codec.EncodedOrigin);
        using var podaci = slika.Encode(SKEncodedImageFormat.Webp, 80)
            ?? throw new NeispravnaSlikaException("Slika ne može da se sačuva.");

        var webRoot = env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot");
        var dir = Path.Combine(webRoot, Folder);
        Directory.CreateDirectory(dir);

        // Verzija u imenu fajla da bi keš u browseru odmah video novu sliku.
        var ime = $"{slug}-{DateTime.UtcNow:yyyyMMddHHmmss}.webp";
        await using var izlaz = File.Create(Path.Combine(dir, ime));
        podaci.SaveTo(izlaz);
        return $"/{Folder}/{ime}";
    }

    public void Obrisi(string? slikaUrl)
    {
        if (string.IsNullOrEmpty(slikaUrl) || !slikaUrl.StartsWith($"/{Folder}/")) return;
        var webRoot = env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot");
        var putanja = Path.Combine(webRoot, slikaUrl.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
        if (File.Exists(putanja)) File.Delete(putanja);
    }

    /// <summary>Primenjuje EXIF orijentaciju (fotografije sa telefona su često "na boku").</summary>
    private static SKBitmap Orijentisi(SKBitmap izvor, SKEncodedOrigin origin)
    {
        if (origin == SKEncodedOrigin.TopLeft) return izvor.Copy();

        var rotira = origin is SKEncodedOrigin.LeftTop or SKEncodedOrigin.RightTop
            or SKEncodedOrigin.RightBottom or SKEncodedOrigin.LeftBottom;
        var w = rotira ? izvor.Height : izvor.Width;
        var h = rotira ? izvor.Width : izvor.Height;

        var rezultat = new SKBitmap(new SKImageInfo(w, h, izvor.ColorType, izvor.AlphaType));
        using var platno = new SKCanvas(rezultat);
        switch (origin)
        {
            case SKEncodedOrigin.TopRight: platno.Scale(-1, 1, w / 2f, 0); break;
            case SKEncodedOrigin.BottomRight: platno.RotateDegrees(180, w / 2f, h / 2f); break;
            case SKEncodedOrigin.BottomLeft: platno.Scale(1, -1, 0, h / 2f); break;
            case SKEncodedOrigin.LeftTop: platno.Translate(w, 0); platno.RotateDegrees(90); platno.Scale(1, -1, 0, izvor.Height / 2f); break;
            case SKEncodedOrigin.RightTop: platno.Translate(w, 0); platno.RotateDegrees(90); break;
            case SKEncodedOrigin.RightBottom: platno.Translate(0, h); platno.RotateDegrees(-90); platno.Scale(1, -1, 0, izvor.Height / 2f); break;
            case SKEncodedOrigin.LeftBottom: platno.Translate(0, h); platno.RotateDegrees(-90); break;
        }
        using var slikaIzvora = SKImage.FromBitmap(izvor);
        platno.DrawImage(slikaIzvora, 0, 0, new SKSamplingOptions(SKFilterMode.Linear));
        return rezultat;
    }
}
