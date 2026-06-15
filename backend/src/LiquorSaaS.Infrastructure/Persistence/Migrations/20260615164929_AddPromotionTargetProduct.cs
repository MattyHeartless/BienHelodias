using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LiquorSaaS.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPromotionTargetProduct : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "TargetProductId",
                table: "Promotions",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Promotions_TargetProductId",
                table: "Promotions",
                column: "TargetProductId");

            migrationBuilder.AddForeignKey(
                name: "FK_Promotions_Products_TargetProductId",
                table: "Promotions",
                column: "TargetProductId",
                principalTable: "Products",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Promotions_Products_TargetProductId",
                table: "Promotions");

            migrationBuilder.DropIndex(
                name: "IX_Promotions_TargetProductId",
                table: "Promotions");

            migrationBuilder.DropColumn(
                name: "TargetProductId",
                table: "Promotions");
        }
    }
}
