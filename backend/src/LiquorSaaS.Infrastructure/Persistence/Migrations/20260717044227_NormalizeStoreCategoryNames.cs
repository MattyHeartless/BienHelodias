using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LiquorSaaS.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class NormalizeStoreCategoryNames : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            if (ActiveProvider.Contains("SqlServer"))
            {
                migrationBuilder.Sql(@"
                ;WITH RankedCategories AS (
                    SELECT
                        Id,
                        StoreId,
                        UPPER(Name) AS NameKey,
                        ROW_NUMBER() OVER (
                            PARTITION BY StoreId, UPPER(Name)
                            ORDER BY SortOrder, CreatedAtUtc, Id
                        ) AS CategoryRank
                    FROM StoreCategories
                ), DuplicateCategories AS (
                    SELECT duplicateCategory.Id AS DuplicateId, canonicalCategory.Id AS CanonicalId
                    FROM RankedCategories AS duplicateCategory
                    INNER JOIN RankedCategories AS canonicalCategory
                        ON canonicalCategory.StoreId = duplicateCategory.StoreId
                        AND canonicalCategory.NameKey = duplicateCategory.NameKey
                        AND canonicalCategory.CategoryRank = 1
                    WHERE duplicateCategory.CategoryRank > 1
                )
                UPDATE products
                SET StoreCategoryId = duplicates.CanonicalId
                FROM Products AS products
                INNER JOIN DuplicateCategories AS duplicates ON duplicates.DuplicateId = products.StoreCategoryId;

                ;WITH RankedCategories AS (
                    SELECT
                        Id,
                        StoreId,
                        ROW_NUMBER() OVER (
                            PARTITION BY StoreId, UPPER(Name)
                            ORDER BY SortOrder, CreatedAtUtc, Id
                        ) AS CategoryRank
                    FROM StoreCategories
                )
                DELETE categories
                FROM StoreCategories AS categories
                INNER JOIN RankedCategories AS ranked ON ranked.Id = categories.Id
                WHERE ranked.CategoryRank > 1;

                UPDATE products
                SET Category = categories.Name
                FROM Products AS products
                INNER JOIN StoreCategories AS categories ON categories.Id = products.StoreCategoryId;
                ");
            }
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
