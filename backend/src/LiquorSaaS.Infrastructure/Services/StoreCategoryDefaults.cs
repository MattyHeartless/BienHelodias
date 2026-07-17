using LiquorSaaS.Domain.Entities;

namespace LiquorSaaS.Infrastructure.Services;

internal static class StoreCategoryDefaults
{
    private static readonly string[] Names =
    [
        "Cerveza", "Tequila", "Mezcal", "Whisky", "Vodka", "Ron", "Gin", "Brandy", "Coñac", "Licor",
        "Vino tinto", "Vino blanco", "Vino rosado", "Espumosos", "Bebidas preparadas", "Refrescos", "Agua", "Jugos", "Energéticas", "Mixers", "Hielo", "Botanas", "Otros"
    ];

    public static IEnumerable<StoreCategory> CreateForStore(Guid storeId) => Names.Select((name, index) => StoreCategory.Create(storeId, name, index));
}
