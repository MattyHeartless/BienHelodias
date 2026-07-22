using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LiquorSaaS.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddOrderDeliveryEstimate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "EstimateCalculatedAtUtc",
                table: "Orders",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "EstimatedDeliveryAtUtc",
                table: "Orders",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "EstimatedPreparationMinutes",
                table: "Orders",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "EstimatedTravelMinutes",
                table: "Orders",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeliveryEstimateFallback",
                table: "Orders",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EstimateCalculatedAtUtc",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "EstimatedDeliveryAtUtc",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "EstimatedPreparationMinutes",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "EstimatedTravelMinutes",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "IsDeliveryEstimateFallback",
                table: "Orders");
        }
    }
}
