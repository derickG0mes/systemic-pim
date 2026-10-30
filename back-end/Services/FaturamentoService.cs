using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PIM3.API.Data;
using PIM3.API.DTOs;
using PIM3.API.Models;

namespace PIM3.API.Services;

public sealed class FaturamentoService : IFaturamentoService
{
    private readonly AppDbContext _context;

    public FaturamentoService(AppDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// GET api/faturamento — chamado por api.ts getFaturamento()
    /// </summary>
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

        return ApiServiceResults.Ok(new RespostaPadraoDTO
        {
            Sucesso = true,
            Dados = new { dataInicio = inicio, dataFim = fim, receita, despesas, lucro = receita - despesas }
        });
    }

    /// <summary>
    /// Retorna o faturamento total entre duas datas
    /// Calcula: Receita (vendas) - Despesas = Lucro
    /// </summary>
    public async Task<IActionResult> GetRelatorio(DateTime dataInicio, DateTime dataFim, CancellationToken cancellationToken)
    {
        if (dataFim < dataInicio)
            return ApiServiceResults.BadRequest(new RespostaPadraoDTO { Sucesso = false, Mensagem = "Intervalo de datas inválido." });

        var resultados = await DatabaseRoutineQueries.RelatorioFaturamentoAsync(
            _context,
            dataInicio,
            dataFim,
            cancellationToken);
        var resultado = resultados.Single();

        return ApiServiceResults.Ok(new
        {
            dataInicio,
            dataFim,
            receita = resultado.Receita,
            despesas = resultado.Despesas,
            lucro = resultado.Lucro
        });
    }

    public async Task<IActionResult> GetProdutosMaisVendidos(CancellationToken cancellationToken)
    {
        var produtos = await _context.Database
            .SqlQueryRaw<ProdutoMaisVendidoSqlResultDto>(
                "SELECT IdProduto, NomeProduto, QuantidadeVendida FROM dbo.vw_produtos_mais_vendidos")
            .OrderByDescending(produto => produto.QuantidadeVendida)
            .ToListAsync(cancellationToken);

        return ApiServiceResults.Ok(produtos);
    }

    /// <summary>
    /// Retorna receita por forma de pagamento
    /// </summary>
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

        return ApiServiceResults.Ok(receitaPorForma);
    }

    /// <summary>
    /// Retorna despesas por categoria
    /// </summary>
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

        return ApiServiceResults.Ok(despesaPorCategoria);
    }

    /// <summary>
    /// Adiciona uma despesa
    /// </summary>
    public async Task<IActionResult> AddDespesa(Despesa despesa)
    {
        if (string.IsNullOrEmpty(despesa.DescricaoDespesa) || despesa.ValorDespesa <= 0)
            return ApiServiceResults.BadRequest(new { message = "Descrição e valor são obrigatórios" });

        despesa.DataDespesa = DateTime.UtcNow;
        _context.Despesas.Add(despesa);
        await _context.SaveChangesAsync();

        return ApiServiceResults.CreatedAtAction(nameof(GetRelatorio), new { idDespesa = despesa.IdDespesa }, despesa);
    }

    /// <summary>
    /// Retorna as despesas entre duas datas
    /// </summary>
    public IActionResult GetDespesas(DateTime dataInicio, DateTime dataFim)
    {
        var despesas = _context.Despesas
            .Include(d => d.FormaPagamento)
            .Where(d => d.DataDespesa >= dataInicio && d.DataDespesa <= dataFim)
            .ToList();

        return ApiServiceResults.Ok(despesas);
    }
}
