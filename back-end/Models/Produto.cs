using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PIM3.API.Models;

[Table("PRODUTO")]
public class Produto
{
    [Column("ID_PRODUTO")]
    public int IdProduto { get; set; }

    [Column("NOME_PRODUTO")]
    [Required(ErrorMessage = "Nome do produto é obrigatório")]
    public string NomeProduto { get; set; } = string.Empty;

    [Column("DESCRICAO_PRODUTO")]
    public string? DescricaoProduto { get; set; }

    [Column("PRECO_CUSTO")]
    public decimal? PrecoCusto { get; set; }

    [Column("PRECO_VENDA")]
    public decimal? PrecoVenda { get; set; }

    [Column("QTD_ESTOQUE")]
    [Range(0, int.MaxValue, ErrorMessage = "Quantidade em estoque deve ser >= 0")]
    public int QtdEstoque { get; set; }

    [Column("PRECO_PRODUTO")]
    [Range(typeof(decimal), "0.01", "79228162514264337593543950335", ErrorMessage = "Preço deve ser maior que 0")]
    public decimal PrecoProduto { get; set; }

    [Column("ESTOQUE_MINIMO")]
    [Range(0, int.MaxValue, ErrorMessage = "Estoque mínimo deve ser >= 0")]
    public int EstoqueMinimo { get; set; } = 5;

    [Column("STATUS_PRODUTO")]
    public string StatusProduto { get; set; } = "DISPONIVEL"; // DISPONIVEL, INDISPONIVEL

    [Column("CATEGORIA_PRODUTO")]
    public string CategoriaProduto { get; set; } = "PRINCIPAL";
}
