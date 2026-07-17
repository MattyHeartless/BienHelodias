using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LiquorSaaS.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddStoreCategories : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "StoreCategoryId",
                table: "Products",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "StoreCategories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    StoreId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StoreCategories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StoreCategories_Stores_StoreId",
                        column: x => x.StoreId,
                        principalTable: "Stores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            if (ActiveProvider.Contains("SqlServer"))
            {
                migrationBuilder.Sql(@"
                INSERT INTO StoreCategories (Id, StoreId, Name, IsActive, SortOrder, CreatedAtUtc, UpdatedAtUtc)
                SELECT NEWID(), stores.Id, defaults.Name, CAST(1 AS bit), defaults.SortOrder, SYSUTCDATETIME(), SYSUTCDATETIME()
                FROM Stores AS stores
                CROSS APPLY (VALUES
                    (N'Cerveza', 0), (N'Tequila', 1), (N'Mezcal', 2), (N'Whisky', 3), (N'Vodka', 4),
                    (N'Ron', 5), (N'Gin', 6), (N'Brandy', 7), (N'Coñac', 8), (N'Licor', 9),
                    (N'Vino tinto', 10), (N'Vino blanco', 11), (N'Vino rosado', 12), (N'Espumosos', 13),
                    (N'Bebidas preparadas', 14), (N'Refrescos', 15), (N'Agua', 16), (N'Jugos', 17),
                    (N'Energéticas', 18), (N'Mixers', 19), (N'Hielo', 20), (N'Botanas', 21), (N'Otros', 22)
                ) AS defaults(Name, SortOrder)
                WHERE NOT EXISTS (SELECT 1 FROM StoreCategories AS categories WHERE categories.StoreId = stores.Id AND categories.Name = defaults.Name);

                INSERT INTO StoreCategories (Id, StoreId, Name, IsActive, SortOrder, CreatedAtUtc, UpdatedAtUtc)
                SELECT NEWID(), products.StoreId, products.Category, CAST(1 AS bit), 100, SYSUTCDATETIME(), SYSUTCDATETIME()
                FROM Products AS products
                WHERE NOT EXISTS (SELECT 1 FROM StoreCategories AS categories WHERE categories.StoreId = products.StoreId AND categories.Name = products.Category)
                GROUP BY products.StoreId, products.Category;

                UPDATE products
                SET StoreCategoryId = categories.Id
                FROM Products AS products
                INNER JOIN StoreCategories AS categories ON categories.StoreId = products.StoreId AND categories.Name = products.Category;
                    ");
            }

            migrationBuilder.CreateIndex(
                name: "IX_Products_StoreCategoryId",
                table: "Products",
                column: "StoreCategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_StoreCategories_StoreId",
                table: "StoreCategories",
                column: "StoreId");

            migrationBuilder.CreateIndex(
                name: "IX_StoreCategories_StoreId_Name",
                table: "StoreCategories",
                columns: new[] { "StoreId", "Name" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Products_StoreCategories_StoreCategoryId",
                table: "Products",
                column: "StoreCategoryId",
                principalTable: "StoreCategories",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Products_StoreCategories_StoreCategoryId",
                table: "Products");

            migrationBuilder.DropTable(
                name: "StoreCategories");

            migrationBuilder.DropIndex(
                name: "IX_Products_StoreCategoryId",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "StoreCategoryId",
                table: "Products");
        }
    }
}
