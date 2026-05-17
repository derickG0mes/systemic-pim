using System.ComponentModel.DataAnnotations.Schema;

namespace PIM3.API.Models;

[Table("FORMA_PAGAMENTO")]
public class FormaPagamento
{
    [Column("ID_FORMA_PAGAMENTO")]
    public int IdFormaPagamento { get; set; }

    [Column("NOME_FORMA_PAGAMENTO")]
    public string NomeFormaPagamento { get; set; } = string.Empty;
}
