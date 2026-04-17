using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LiquorSaaS.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCourierPushSubscriptions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CourierPushSubscriptions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DeliveryUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    StoreId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Endpoint = table.Column<string>(type: "nvarchar(2048)", maxLength: 2048, nullable: false),
                    P256DH = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: false),
                    Auth = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    UserAgent = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: false),
                    LastNotificationSentAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CourierPushSubscriptions", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CourierPushSubscriptions_DeliveryUserId",
                table: "CourierPushSubscriptions",
                column: "DeliveryUserId");

            migrationBuilder.CreateIndex(
                name: "IX_CourierPushSubscriptions_Endpoint",
                table: "CourierPushSubscriptions",
                column: "Endpoint",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CourierPushSubscriptions_StoreId_IsActive",
                table: "CourierPushSubscriptions",
                columns: new[] { "StoreId", "IsActive" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CourierPushSubscriptions");
        }
    }
}
