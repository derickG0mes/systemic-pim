using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PIM3.API.Models;
using PIM3.API.Services;

namespace PIM3.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "admin,owner")]
public class FaturamentoController : ControllerBase
{
    private readonly IFaturamentoService _service;

    public FaturamentoController(IFaturamentoService service) => _service = service;

    [HttpGet]
    public IActionResult GetResumo() => _service.GetResumo();

    [HttpGet("relatorio")]
    public Task<IActionResult> GetRelatorio(DateTime dataInicio, DateTime dataFim, CancellationToken cancellationToken) =>
        _service.GetRelatorio(dataInicio, dataFim, cancellationToken);

    [HttpGet("produtos-mais-vendidos")]
    public Task<IActionResult> GetProdutosMaisVendidos(CancellationToken cancellationToken) =>
        _service.GetProdutosMaisVendidos(cancellationToken);

    [HttpGet("receita-por-forma")]
    public IActionResult GetReceitaPorForma(DateTime dataInicio, DateTime dataFim) =>
        _service.GetReceitaPorForma(dataInicio, dataFim);

    [HttpGet("despesa-por-categoria")]
    public IActionResult GetDespesaPorCategoria(DateTime dataInicio, DateTime dataFim) =>
        _service.GetDespesaPorCategoria(dataInicio, dataFim);

    [HttpPost("despesa")]
    public Task<IActionResult> AddDespesa([FromBody] Despesa despesa) => _service.AddDespesa(despesa);

    [HttpGet("despesas")]
    public IActionResult GetDespesas(DateTime dataInicio, DateTime dataFim) =>
        _service.GetDespesas(dataInicio, dataFim);
}
