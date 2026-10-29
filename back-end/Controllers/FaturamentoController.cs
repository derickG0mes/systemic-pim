using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PIM3.API.Data;
using PIM3.API.DTOs;
using PIM3.API.Models;

namespace PIM3.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "admin,owner")]
public class FaturamentoController : ControllerBase
{
    private readonly AppDbContext _context;

    public FaturamentoController(AppDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// GET api/faturamento — chamado por api.ts getFaturamento()
    /// </summary>
    [HttpGet]
    public IActionResult GetResumo()
    {
        var inicio = DateTime.UtcNow.Date;
        var fim = inicio.AddDays(1).AddTicks(-1);

        var receita = _context.ItensComanda
            .Where(item => item.Comanda != null &&
                           item.Comanda.StatusComanda == "FECHADA" &&
                           item.Comanda.DataFechada >= inicio &&
                           item.Comanda.DataFechada <= fim)
            .Sum(item => (decimal?)(item.QtdProduto * item.PrecoUnitarioPago)) ?? 0m;

        var despesas = _context.Despesas
            .Where(d => d.DataDespesa >= inicio && d.DataDespesa <= fim)
            .Sum(d => (decimal?)d.ValorDespesa) ?? 0m;

        return Ok(new RespostaPadraoDTO
        {
            Sucesso = true,
            Dados = new { dataInicio = inicio, dataFim = fim, receita, despesas, lucro = receita - despesas }
        });
    }

    /// <summary>
    /// Retorna o faturamento total entre duas datas
    /// Calcula: Receita (vendas) - Despesas = Lucro
    /// </summary>
    [HttpGet("relatorio")]
    public async Task<IActionResult> GetRelatorio(DateTime dataInicio, DateTime dataFim, CancellationToken cancellationToken)
    {
        if (dataFim < dataInicio)
            return BadRequest(new RespostaPadraoDTO { Sucesso = false, Mensagem = "Intervalo de datas inválido." });

        var receita = await _context.ItensComanda
            .Where(item => item.Comanda != null &&
                           item.Comanda.StatusComanda == "FECHADA" &&
                           item.Comanda.DataFechada >= dataInicio &&
                           item.Comanda.DataFechada <= dataFim)
            .SumAsync(item => (decimal?)(item.QtdProduto * item.PrecoUnitarioPago), cancellationToken) ?? 0m;

        var despesas = await _context.Despesas
            .Where(despesa => despesa.DataDespesa >= dataInicio && despesa.DataDespesa <= dataFim)
            .SumAsync(despesa => (decimal?)despesa.ValorDespesa, cancellationToken) ?? 0m;

        return Ok(new
        {
            dataInicio,
            dataFim,
            receita,
            despesas,
            lucro = receita - despesas
        });
    }

    [HttpGet("produtos-mais-vendidos")]
    public async Task<IActionResult> GetProdutosMaisVendidos(CancellationToken cancellationToken)
    {
        var produtos = await _context.Database
            .SqlQueryRaw<ProdutoMaisVendidoSqlResultDto>(
                "SELECT IdProduto, NomeProduto, QuantidadeVendida FROM dbo.vw_produtos_mais_vendidos")
            .OrderByDescending(produto => produto.QuantidadeVendida)
            .ToListAsync(cancellationToken);

        return Ok(produtos);
    }

    /// <summary>
    /// Retorna receita por forma de pagamento
    /// </summary>
    [HttpGet("receita-por-forma")]
    public IActionResult GetReceitaPorForma(DateTime dataInicio, DateTime dataFim)
    {
        var receitaPorForma = _context.DetalhesPagamento
            .Include(dp => dp.FormaPagamento)
            .Where(dp => dp.DataPagamento >= dataInicio && dp.DataPagamento <= dataFim && dp.StatusPagamento == "PAGO")
            .GroupBy(dp => dp.FormaPagamento!.NomeFormaPagamento)
            .Select(group => new
            {
                formaPagemento = group.Key,
                total = group.Sum(dp => dp.ValorPago)
            })
            .ToList();

        return Ok(receitaPorForma);
    }

    /// <summary>
    /// Retorna despesas por categoria
    /// </summary>
    [HttpGet("despesa-por-categoria")]
    public IActionResult GetDespesaPorCategoria(DateTime dataInicio, DateTime dataFim)
    {
        var despesaPorCategoria = _context.Despesas
            .Where(d => d.DataDespesa >= dataInicio && d.DataDespesa <= dataFim)
            .GroupBy(d => d.CategoriaDespesa)
            .Select(group => new
            {
                categoria = group.Key,
                total = group.Sum(d => d.ValorDespesa)
            })
            .ToList();

        return Ok(despesaPorCategoria);
    }

    /// <summary>
    /// Adiciona uma despesa
    /// </summary>
    [HttpPost("despesa")]
    public async Task<IActionResult> AddDespesa([FromBody] Despesa despesa)
    {
        if (string.IsNullOrEmpty(despesa.DescricaoDespesa) || despesa.ValorDespesa <= 0)
            return BadRequest(new { message = "Descrição e valor são obrigatórios" });

        despesa.DataDespesa = DateTime.UtcNow;
        _context.Despesas.Add(despesa);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetRelatorio), new { idDespesa = despesa.IdDespesa }, despesa);
    }

    /// <summary>
    /// Retorna as despesas entre duas datas
    /// </summary>
    [HttpGet("despesas")]
    public IActionResult GetDespesas(DateTime dataInicio, DateTime dataFim)
    {
        var despesas = _context.Despesas
            .Include(d => d.FormaPagamento)
            .Where(d => d.DataDespesa >= dataInicio && d.DataDespesa <= dataFim)
            .ToList();

        return Ok(despesas);
    }
}
