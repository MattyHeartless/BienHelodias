using LiquorSaaS.Application.Common;
using Microsoft.EntityFrameworkCore;

namespace LiquorSaaS.Infrastructure.Extensions;

internal static class QueryableExtensions
{
    public static async Task<PagedResult<T>> ToPagedResultAsync<T>(
        this IQueryable<T> query,
        PaginationRequest request,
        CancellationToken cancellationToken)
    {
        var page = request.NormalizedPage;
        var pageSize = request.NormalizedPageSize;
        var total = await query.CountAsync(cancellationToken);
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(cancellationToken);

        return new PagedResult<T>
        {
            Page = page,
            PageSize = pageSize,
            Total = total,
            Items = items
        };
    }
}
