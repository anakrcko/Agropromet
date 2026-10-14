using Agropromet.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Agropromet.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Kategorija> Kategorije => Set<Kategorija>();
    public DbSet<Proizvod> Proizvodi => Set<Proizvod>();
    public DbSet<Akcija> Akcije => Set<Akcija>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Kategorija>(e =>
        {
            e.ToTable("Kategorije");
            e.Property(x => x.Naziv).HasMaxLength(100).IsRequired();
            e.Property(x => x.Slug).HasMaxLength(100).IsRequired();
            e.HasIndex(x => x.Slug).IsUnique();
            e.HasData(SeedData.Kategorije);
        });

        b.Entity<Proizvod>(e =>
        {
            e.ToTable("Proizvodi");
            e.Property(x => x.Naziv).HasMaxLength(150).IsRequired();
            e.Property(x => x.Slug).HasMaxLength(150).IsRequired();
            e.Property(x => x.Opis).HasMaxLength(500);
            e.Property(x => x.SlikaUrl).HasMaxLength(300);
            e.HasIndex(x => x.Slug).IsUnique();
            e.HasOne(x => x.Kategorija)
                .WithMany(k => k.Proizvodi)
                .HasForeignKey(x => x.KategorijaId)
                .OnDelete(DeleteBehavior.Restrict);
            e.HasData(SeedData.Proizvodi);
        });

        b.Entity<Akcija>(e =>
        {
            e.ToTable("Akcije");
            e.Property(x => x.Oznaka).HasMaxLength(20).IsRequired();
            e.Property(x => x.Naslov).HasMaxLength(150).IsRequired();
            e.Property(x => x.Tekst).HasMaxLength(1000);
            e.HasData(SeedData.Akcije);
        });
    }
}
