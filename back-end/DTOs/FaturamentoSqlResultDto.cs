namespace PIM3.API.DTOs;

public sealed class ProdutoMaisVendidoSqlResultDto
{
    public int IdProduto { get; set; }
    public string NomeProduto { get; set; } = string.Empty;
    public int QuantidadeVendida { get; set; }
}
