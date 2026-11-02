using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using PIM3.API.Data;
using PIM3.API.DTOs;

namespace PIM3.API.Services;

internal static class DatabaseRoutineQueries
{
    public static List<ComandaAbertaSqlResultDto> GetComandasAbertas(AppDbContext context) =>
        context.Database
            .SqlQueryRaw<ComandaAbertaSqlResultDto>(
                "SELECT IdComanda, NumeroMesa, ValorTotal FROM dbo.vw_comandas_abertas")
            .ToList();

    public static Task<List<RelatorioFaturamentoSqlResultDto>> RelatorioFaturamentoAsync(
        AppDbContext context,
        DateTime dataInicio,
        DateTime dataFim,
        CancellationToken cancellationToken) =>
        context.Database
            .SqlQueryRaw<RelatorioFaturamentoSqlResultDto>(
                "EXEC dbo.sp_relatorio_faturamento @DataInicio, @DataFim",
                new SqlParameter("@DataInicio", dataInicio),
                new SqlParameter("@DataFim", dataFim))
            .ToListAsync(cancellationToken);

    public static Task<List<AjusteEstoqueSqlResultDto>> AjustarEstoqueAsync(
        AppDbContext context,
        int idProduto,
        string? tipo,
        int quantidade,
        string motivo,
        string usuario) =>
        context.Database
            .SqlQueryRaw<AjusteEstoqueSqlResultDto>(
                "EXEC dbo.sp_ajustar_estoque @IdProduto, @Tipo, @Quantidade, @Motivo, @Usuario",
                new SqlParameter("@IdProduto", idProduto),
                new SqlParameter("@Tipo", tipo ?? string.Empty),
                new SqlParameter("@Quantidade", quantidade),
                new SqlParameter("@Motivo", motivo),
                new SqlParameter("@Usuario", usuario))
            .ToListAsync();
}
