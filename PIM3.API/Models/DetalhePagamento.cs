namespace PIM3.API.Models;

public class DetalhePagamento
{
    public int IdDetalhePagamento { get; set; }
    public decimal ValorPago { get; set; }
    public decimal Troco { get; set; }
    public DateTime DataPagamento { get; set; }
    public string StatusPagamento { get; set; } = "FALTA PAGAR";
    public int IdComanda { get; set; }
    public int IdFormaPagamento { get; set; }
    public int IdFuncionario { get; set; }

    // Relacionamentos
    public Comanda? Comanda { get; set; }
    public FormaPagamento? FormaPagamento { get; set; }
    public Funcionario? Funcionario { get; set; }
}
