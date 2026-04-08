namespace LiquorSaaS.Application.Common;

public sealed class PaginationRequest
{
    private const int MaxPageSize = 100;

    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 20;

    public int NormalizedPage => Page <= 0 ? 1 : Page;
    public int NormalizedPageSize => PageSize <= 0 ? 20 : Math.Min(PageSize, MaxPageSize);
}
