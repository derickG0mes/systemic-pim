namespace PIM3.API.Models;

public class Despesa
{
    public int IdDespesa { get; set; }
    public string DescricaoDespesa { get; set; } = string.Empty;
    public decimal ValorDespesa { get; set; }
    public string CategoriaDespesa { get; set; } = string.Empty;
    public DateTime DataDespesa { get; set; }
    public int IdFormaPagamento { get; set; }

    // Relacionamento
    public FormaPagamento? FormaPagamento { get; set; }
}
