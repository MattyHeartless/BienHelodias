using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LiquorSaaS.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddStoreOperationalFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "BucketPrice",
                table: "Stores",
                type: "decimal(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "CartonPrice",
                table: "Stores",
                type: "decimal(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<TimeOnly>(
                name: "ClosingTime",
                table: "Stores",
                type: "time",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "MinimumPurchase",
                table: "Stores",
                type: "decimal(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<TimeOnly>(
                name: "OpeningTime",
                table: "Stores",
                type: "time",
                nullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_OrderItems_Products_ProductId",
                table: "OrderItems",
                column: "ProductId",
                principalTable: "Products",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_OrderItems_Products_ProductId",
                table: "OrderItems");

            migrationBuilder.DropColumn(
                name: "BucketPrice",
                table: "Stores");

            migrationBuilder.DropColumn(
                name: "CartonPrice",
                table: "Stores");

            migrationBuilder.DropColumn(
                name: "ClosingTime",
                table: "Stores");

            migrationBuilder.DropColumn(
                name: "MinimumPurchase",
                table: "Stores");

            migrationBuilder.DropColumn(
                name: "OpeningTime",
                table: "Stores");
        }
    }
}
