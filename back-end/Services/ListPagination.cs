using System.Globalization;
using System.Linq.Expressions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace PIM3.API.Services;

internal readonly record struct ListPagination(int Page, int Size, bool IsRequested)
{
    private const int DefaultSize = 50;
    private const int MaximumSize = 200;

    public static bool TryCreate(int? page, int? size, out ListPagination pagination)
    {
        var isRequested = page.HasValue || size.HasValue;
        var currentPage = page ?? 1;
        var currentSize = size ?? DefaultSize;
        var offset = ((long)currentPage - 1) * currentSize;

        if (currentPage < 1 || currentSize < 1 || currentSize > MaximumSize || offset > int.MaxValue)
        {
            pagination = default;
            return false;
        }

        pagination = new ListPagination(currentPage, currentSize, isRequested);
        return true;
    }

    public IQueryable<T> Apply<T>(IQueryable<T> query, Expression<Func<T, int>> idSelector) =>
        query.OrderBy(idSelector)
            .Skip((Page - 1) * Size)
            .Take(Size);

    public void SetTotalCount(HttpResponse response, int totalCount)
    {
        if (IsRequested)
            response.Headers["X-Total-Count"] = totalCount.ToString(CultureInfo.InvariantCulture);
    }

    public static IActionResult InvalidRequest() =>
        ApiServiceResults.BadRequest(new
        {
            message = "pagina deve ser maior que 0 e tamanho deve estar entre 1 e 200."
        });
}
