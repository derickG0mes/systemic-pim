using System.Data;
using System.Data.Common;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using PIM3.API.Data;
using PIM3.API.Services;

namespace back_end.Tests;

public class DatabaseRoutineQueriesTests
{
    [Fact]
    public void GetComandasAbertas_reads_the_open_orders_view()
    {
        var interceptor = new RoutineResultInterceptor(new DataTable()
        {
            Columns =
            {
                { "IdComanda", typeof(int) },
                { "NumeroMesa", typeof(int) },
                { "ValorTotal", typeof(decimal) }
            }
        });

        using var context = CreateContext(interceptor);
        var result = DatabaseRoutineQueries.GetComandasAbertas(context);

        Assert.Empty(result);
        Assert.Contains("dbo.vw_comandas_abertas", interceptor.CommandText);
    }

    [Fact]
    public async Task RelatorioFaturamentoAsync_executes_the_revenue_report_procedure()
    {
        var results = new DataTable();
        results.Columns.Add("Receita", typeof(decimal));
        results.Columns.Add("Despesas", typeof(decimal));
        results.Columns.Add("Lucro", typeof(decimal));
        results.Rows.Add(100m, 25m, 75m);
        var interceptor = new RoutineResultInterceptor(results);
        var inicio = new DateTime(2026, 1, 1);
        var fim = new DateTime(2026, 1, 31);

        using var context = CreateContext(interceptor);
        var result = await DatabaseRoutineQueries.RelatorioFaturamentoAsync(
            context, inicio, fim, CancellationToken.None);

        Assert.Equal(75m, Assert.Single(result).Lucro);
        Assert.Contains("dbo.sp_relatorio_faturamento", interceptor.CommandText);
        Assert.Equal(inicio, interceptor.ParameterValue("@DataInicio"));
        Assert.Equal(fim, interceptor.ParameterValue("@DataFim"));
    }

    [Fact]
    public async Task AjustarEstoqueAsync_executes_the_stock_adjustment_procedure()
    {
        var results = new DataTable();
        results.Columns.Add("QuantidadeAnterior", typeof(int));
        results.Columns.Add("QuantidadeNova", typeof(int));
        results.Rows.Add(4, 6);
        var interceptor = new RoutineResultInterceptor(results);

        using var context = CreateContext(interceptor);
        var result = await DatabaseRoutineQueries.AjustarEstoqueAsync(
            context, 9, "ADICIONAR", 2, "Reposição", "operador");

        Assert.Equal(6, Assert.Single(result).QuantidadeNova);
        Assert.Contains("dbo.sp_ajustar_estoque", interceptor.CommandText);
        Assert.Equal(9, interceptor.ParameterValue("@IdProduto"));
        Assert.Equal("ADICIONAR", interceptor.ParameterValue("@Tipo"));
        Assert.Equal(2, interceptor.ParameterValue("@Quantidade"));
        Assert.Equal("Reposição", interceptor.ParameterValue("@Motivo"));
        Assert.Equal("operador", interceptor.ParameterValue("@Usuario"));
    }

    private static AppDbContext CreateContext(RoutineResultInterceptor interceptor)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlServer("Server=localhost;Database=not-used;TrustServerCertificate=True")
            .AddInterceptors(interceptor, new SuppressConnectionOpenInterceptor())
            .Options;
        return new AppDbContext(options);
    }

    private sealed class SuppressConnectionOpenInterceptor : DbConnectionInterceptor
    {
        public override InterceptionResult ConnectionOpening(
            DbConnection connection,
            ConnectionEventData eventData,
            InterceptionResult result) =>
            InterceptionResult.Suppress();

        public override ValueTask<InterceptionResult> ConnectionOpeningAsync(
            DbConnection connection,
            ConnectionEventData eventData,
            InterceptionResult result,
            CancellationToken cancellationToken = default) =>
            ValueTask.FromResult(InterceptionResult.Suppress());
    }

    private sealed class RoutineResultInterceptor(DataTable result) : DbCommandInterceptor
    {
        private readonly Dictionary<string, object?> _parameters = new(StringComparer.OrdinalIgnoreCase);
        private string _commandText = string.Empty;

        public string CommandText => _commandText;

        public object? ParameterValue(string parameterName) => _parameters.GetValueOrDefault(parameterName);

        public override InterceptionResult<DbDataReader> ReaderExecuting(
            DbCommand command,
            CommandEventData eventData,
            InterceptionResult<DbDataReader> result) =>
            Suppress(command);

        public override ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(
            DbCommand command,
            CommandEventData eventData,
            InterceptionResult<DbDataReader> result,
            CancellationToken cancellationToken = default) =>
            ValueTask.FromResult(Suppress(command));

        private InterceptionResult<DbDataReader> Suppress(DbCommand command)
        {
            _commandText = command.CommandText;
            foreach (DbParameter parameter in command.Parameters)
                _parameters[parameter.ParameterName] = parameter.Value;
            return InterceptionResult<DbDataReader>.SuppressWithResult(result.CreateDataReader());
        }
    }
}
