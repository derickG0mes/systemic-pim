namespace PIM3.API.DTOs;

public sealed class FaturamentoSqlResultDto
{
    public decimal Receita { get; set; }
    public decimal Despesas { get; set; }
    public decimal Lucro { get; set; }
}

public sealed class ProdutoMaisVendidoSqlResultDto
{
    public int IdProduto { get; set; }
    public string NomeProduto { get; set; } = string.Empty;
    public int QuantidadeVendida { get; set; }
}
