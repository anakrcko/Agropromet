using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Agropromet.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class Initial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Akcije",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Oznaka = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Naslov = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Tekst = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    VaziOd = table.Column<DateOnly>(type: "date", nullable: true),
                    VaziDo = table.Column<DateOnly>(type: "date", nullable: true),
                    Aktivna = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Akcije", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Kategorije",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Naziv = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Slug = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Redosled = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Kategorije", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Proizvodi",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    KategorijaId = table.Column<int>(type: "int", nullable: false),
                    Naziv = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Slug = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Opis = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    SlikaUrl = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    Istaknut = table.Column<bool>(type: "bit", nullable: false),
                    Aktivan = table.Column<bool>(type: "bit", nullable: false),
                    Redosled = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Proizvodi", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Proizvodi_Kategorije_KategorijaId",
                        column: x => x.KategorijaId,
                        principalTable: "Kategorije",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.InsertData(
                table: "Akcije",
                columns: new[] { "Id", "Aktivna", "Naslov", "Oznaka", "Tekst", "VaziDo", "VaziOd" },
                values: new object[,]
                {
                    { 1, true, "Jesenja setva", "Akcija", "Popust na seme pšenice i ječma uz veće količine. Pitajte za cenu na licu mesta.", null, null },
                    { 2, true, "Baterijske prskalice", "Novo", "Nova serija leđnih prskalica sa punjivom baterijom, sa garancijom.", null, null },
                    { 3, true, "Sadnice voća", "Uskoro", "Prijem porudžbina za jesenju sadnju je počeo. Ograničene količine po sorti.", null, null }
                });

            migrationBuilder.InsertData(
                table: "Kategorije",
                columns: new[] { "Id", "Naziv", "Redosled", "Slug" },
                values: new object[,]
                {
                    { 1, "Semena", 1, "semena" },
                    { 2, "Zaštita bilja", 2, "zastita-bilja" },
                    { 3, "Đubriva", 3, "djubriva" },
                    { 4, "Sadni materijal", 4, "sadni-materijal" },
                    { 5, "Hrana za životinje", 5, "hrana-za-zivotinje" },
                    { 6, "Alat i oprema", 6, "alat-i-oprema" },
                    { 7, "Navodnjavanje", 7, "navodnjavanje" },
                    { 8, "Folije i ambalaža", 8, "folije-i-ambalaza" }
                });

            migrationBuilder.InsertData(
                table: "Proizvodi",
                columns: new[] { "Id", "Aktivan", "Istaknut", "KategorijaId", "Naziv", "Opis", "Redosled", "SlikaUrl", "Slug" },
                values: new object[,]
                {
                    { 1, true, false, 1, "Seme kukuruza", "Hibridi različitih grupa zrenja.", 1, null, "seme-kukuruza" },
                    { 2, true, false, 1, "Seme pšenice", "Sortno seme, deklarisano.", 2, null, "seme-psenice" },
                    { 3, true, false, 1, "Baštensko seme", "Paradajz, paprika, kupusnjače, salate.", 3, null, "bastensko-seme" },
                    { 4, true, false, 1, "Seme trave i lucerke", "Za livade i pašnjake.", 4, null, "seme-trave-i-lucerke" },
                    { 5, true, false, 2, "Herbicidi", "Za strna žita, kukuruz i suncokret.", 5, null, "herbicidi" },
                    { 6, true, false, 2, "Fungicidi", "Zaštita voća, vinograda i povrća.", 6, null, "fungicidi" },
                    { 7, true, false, 2, "Insekticidi", "Za njivu, baštu i skladište.", 7, null, "insekticidi" },
                    { 8, true, false, 2, "Sredstva za glodare", "Mamci za njivu i objekte.", 8, null, "sredstva-za-glodare" },
                    { 9, true, false, 3, "Mineralna đubriva", "NPK, KAN, UREA — u vrećama.", 9, null, "mineralna-djubriva" },
                    { 10, true, false, 3, "Folijarna đubriva", "Za prihranu preko lista.", 10, null, "folijarna-djubriva" },
                    { 11, true, false, 3, "Stajnjak i organska đubriva", "Peletirano i pakovano.", 11, null, "stajnjak-i-organska-djubriva" },
                    { 12, true, false, 4, "Sadnice voća", "Jabuka, šljiva, kruška, višnja.", 12, null, "sadnice-voca" },
                    { 13, true, false, 4, "Rasad povrća", "Sezonski, iz proverene proizvodnje.", 13, null, "rasad-povrca" },
                    { 14, true, false, 4, "Lukovice i krtole", "Beli i crni luk, krompir.", 14, null, "lukovice-i-krtole" },
                    { 15, true, false, 5, "Koncentrat i smeše", "Za živinu, svinje i goveda.", 15, null, "koncentrat-i-smese" },
                    { 16, true, false, 5, "Premiksi i vitamini", "Dodaci ishrani.", 16, null, "premiksi-i-vitamini" },
                    { 17, true, false, 5, "Hrana za pse i mačke", "Suva hrana, veća pakovanja.", 17, null, "hrana-za-pse-i-macke" },
                    { 18, true, false, 6, "Leđne prskalice", "Ručne i baterijske.", 18, null, "ledjne-prskalice" },
                    { 19, true, false, 6, "Baštenski alat", "Ašovi, motike, makaze, testere.", 19, null, "bastenski-alat" },
                    { 20, true, false, 6, "Zaštitna oprema", "Maske, rukavice, kombinezoni.", 20, null, "zastitna-oprema" },
                    { 21, true, false, 7, "Sistem kap po kap", "Trake, creva, spojnice.", 21, null, "sistem-kap-po-kap" },
                    { 22, true, false, 7, "Rasprskivači i pumpe", "Za baštu i plastenik.", 22, null, "rasprskivaci-i-pumpe" },
                    { 23, true, false, 8, "Folije za plastenike", "UV stabilizovane, po metru.", 23, null, "folije-za-plastenike" },
                    { 24, true, false, 8, "Vreće i džakovi", "Za žito, krompir i luk.", 24, null, "vrece-i-dzakovi" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_Kategorije_Slug",
                table: "Kategorije",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Proizvodi_KategorijaId",
                table: "Proizvodi",
                column: "KategorijaId");

            migrationBuilder.CreateIndex(
                name: "IX_Proizvodi_Slug",
                table: "Proizvodi",
                column: "Slug",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Akcije");

            migrationBuilder.DropTable(
                name: "Proizvodi");

            migrationBuilder.DropTable(
                name: "Kategorije");
        }
    }
}
