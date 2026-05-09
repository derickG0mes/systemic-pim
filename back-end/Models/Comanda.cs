namespace PIM3.API.Models;

public class Comanda
{
    public int IdComanda { get; set; }
    public DateTime DataAberta { get; set; }
    public DateTime? DataFechada { get; set; }
    public string StatusComanda { get; set; } = "ABERTA";
    public int IdMesa { get; set; }
    public int IdCliente { get; set; }
    public decimal ValorTotal { get; set; } = 0m;

    // Relacionamentos
    public Mesa? Mesa { get; set; }
    public Cliente? Cliente { get; set; }
    public ICollection<ItemComanda> ItensComanda { get; set; } = new List<ItemComanda>();

    /// <summary>
    /// Recalcula o valor total da comanda baseado nos itens
    /// </summary>
    public void RecalcularTotal()
    {
        ValorTotal = ItensComanda.Sum(item => item.QtdProduto * item.PrecoUnitarioPago);
    }
}
