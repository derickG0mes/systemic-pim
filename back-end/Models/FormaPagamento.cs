using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PIM3.API.Models;

[Table("FORMA_PAGAMENTO")]
public class FormaPagamento
{
    [Column("ID_FORMA_PAGAMENTO")]
    public int IdFormaPagamento { get; set; }

    [Column("NOME_FORMA_PAGAMENTO")]
    [StringLength(20, ErrorMessage = "Nome da forma de pagamento deve ter no máximo 20 caracteres.")]
    public string NomeFormaPagamento { get; set; } = string.Empty;
}
