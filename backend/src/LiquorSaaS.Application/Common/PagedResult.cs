namespace LiquorSaaS.Application.Common;

public sealed class PagedResult<T>
{
    public int Page { get; init; }
    public int PageSize { get; init; }
    public int Total { get; init; }
    public IReadOnlyCollection<T> Items { get; init; } = Array.Empty<T>();
}
