using System.ComponentModel.DataAnnotations.Schema;

namespace PIM3.API.Models;

[Table("DESPESAS")]
public class Despesa
{
    [Column("ID_DESPESA")]
    public int IdDespesa { get; set; }

    [Column("DESCRICAO_DESPESA")]
    public string DescricaoDespesa { get; set; } = string.Empty;

    [Column("VALOR_DESPESA")]
    public decimal ValorDespesa { get; set; }

    [Column("CATEGORIA_DESPESA")]
    public string CategoriaDespesa { get; set; } = string.Empty;

    [Column("DATA_DESPESA")]
    public DateTime DataDespesa { get; set; }

    [Column("ID_FORMA_PAGAMENTO")]
    public int IdFormaPagamento { get; set; }

    // Relacionamento
    public FormaPagamento? FormaPagamento { get; set; }
}
