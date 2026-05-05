namespace PIM3.API.Models;

public class Produto
{
    public int IdProduto { get; set; }
    public string NomeProduto { get; set; } = string.Empty;
    public string? DescricaoProduto { get; set; }
    public int QtdEstoque { get; set; }
    public string StatusProduto { get; set; } = "DISPONIVEL";
}
