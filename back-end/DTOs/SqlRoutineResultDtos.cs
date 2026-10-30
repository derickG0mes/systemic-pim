namespace PIM3.API.DTOs;

public sealed class ComandaAbertaSqlResultDto
{
    public int IdComanda { get; set; }
    public int NumeroMesa { get; set; }
    public decimal ValorTotal { get; set; }
}

public sealed class RelatorioFaturamentoSqlResultDto
{
    public decimal Receita { get; set; }
    public decimal Despesas { get; set; }
    public decimal Lucro { get; set; }
}

public sealed class AjusteEstoqueSqlResultDto
{
    public int QuantidadeAnterior { get; set; }
    public int QuantidadeNova { get; set; }
}
