using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PIM3.API.Data;
using PIM3.API.DTOs;
using PIM3.API.Models;

namespace PIM3.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
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
    public IActionResult GetRelatorio(DateTime dataInicio, DateTime dataFim)
    {
        // Receita: soma de todos os itens de comandas fechadas
        var receita = _context.ItensComanda
            .Where(item => item.Comanda != null && 
                          item.Comanda.DataFechada.HasValue &&
                          item.Comanda.DataFechada.Value >= dataInicio &&
                          item.Comanda.DataFechada.Value <= dataFim)
            .Sum(item => (decimal?)item.QtdProduto * item.PrecoUnitarioPago) ?? 0m;

        // Despesas
        var despesas = _context.Despesas
            .Where(d => d.DataDespesa >= dataInicio && d.DataDespesa <= dataFim)
            .Sum(d => d.ValorDespesa);

        var lucro = receita - despesas;

        return Ok(new
        {
            dataInicio,
            dataFim,
            receita = receita,
            despesas = despesas,
            lucro = lucro
        });
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
