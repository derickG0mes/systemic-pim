using System.ComponentModel.DataAnnotations.Schema;

namespace PIM3.API.Models;

[Table("DETALHE_PAGAMENTO")]
public class DetalhePagamento
{
    [Column("ID_DETALHE_PAGAMENTO")]
    public int IdDetalhePagamento { get; set; }

    [Column("VALOR_PAGO")]
    public decimal ValorPago { get; set; }

    [Column("TROCO")]
    public decimal Troco { get; set; }

    [Column("DATA_PAGAMENTO")]
    public DateTime DataPagamento { get; set; }

    [Column("STATUS_PAGAMENTO")]
    public string StatusPagamento { get; set; } = "FALTA PAGAR";

    [Column("ID_COMANDA")]
    public int IdComanda { get; set; }

    [Column("ID_FORMA_PAGAMENTO")]
    public int IdFormaPagamento { get; set; }

    [Column("ID_FUNCIONARIO")]
    public int IdFuncionario { get; set; }

    // Relacionamentos
    public Comanda? Comanda { get; set; }
    public FormaPagamento? FormaPagamento { get; set; }
    public Funcionario? Funcionario { get; set; }
}
