using Microsoft.AspNetCore.Mvc;
using PIM3.API.Models;

namespace PIM3.API.Services;

public interface IFaturamentoService
{
    IActionResult GetResumo();
    Task<IActionResult> GetRelatorio(DateTime dataInicio, DateTime dataFim, CancellationToken cancellationToken);
    Task<IActionResult> GetProdutosMaisVendidos(CancellationToken cancellationToken);
    IActionResult GetReceitaPorForma(DateTime dataInicio, DateTime dataFim);
    IActionResult GetDespesaPorCategoria(DateTime dataInicio, DateTime dataFim);
    Task<IActionResult> AddDespesa(Despesa despesa);
    IActionResult GetDespesas(DateTime dataInicio, DateTime dataFim);
}
