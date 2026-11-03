using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PIM3.API.Models;

[Table("DESPESAS")]
public class Despesa
{
    [Column("ID_DESPESA")]
    public int IdDespesa { get; set; }

    [Column("DESCRICAO_DESPESA")]
    [StringLength(100, ErrorMessage = "Descrição da despesa deve ter no máximo 100 caracteres.")]
    public string DescricaoDespesa { get; set; } = string.Empty;

    [Column("VALOR_DESPESA")]
    public decimal ValorDespesa { get; set; }

    [Column("CATEGORIA_DESPESA")]
    [StringLength(50, ErrorMessage = "Categoria da despesa deve ter no máximo 50 caracteres.")]
    public string CategoriaDespesa { get; set; } = string.Empty;

    [Column("DATA_DESPESA")]
    public DateTime DataDespesa { get; set; }

    [Column("ID_FORMA_PAGAMENTO")]
    public int IdFormaPagamento { get; set; }

    // Relacionamento
    public FormaPagamento? FormaPagamento { get; set; }
}
