using System.ComponentModel.DataAnnotations;

namespace PIM3.API.Models;

public class Produto
{
    public int IdProduto { get; set; }

    [Required(ErrorMessage = "Nome do produto é obrigatório")]
    public string NomeProduto { get; set; } = string.Empty;

    public string? DescricaoProduto { get; set; }

    [Range(0, int.MaxValue, ErrorMessage = "Quantidade em estoque deve ser >= 0")]
    public int QtdEstoque { get; set; }

    [Range(0.01, decimal.MaxValue, ErrorMessage = "Preço deve ser maior que 0")]
    public decimal PrecoProduto { get; set; }

    [Range(0, int.MaxValue, ErrorMessage = "Estoque mínimo deve ser >= 0")]
    public int EstoqueMinimo { get; set; } = 5;

    public string StatusProduto { get; set; } = "DISPONIVEL"; // DISPONIVEL, INDISPONIVEL
}
