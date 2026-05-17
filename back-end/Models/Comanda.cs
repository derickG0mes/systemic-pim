using System.ComponentModel.DataAnnotations.Schema;

namespace PIM3.API.Models;

[Table("COMANDA")]
public class Comanda
{
    [Column("ID_COMANDA")]
    public int IdComanda { get; set; }

    [Column("DATA_ABERTA")]
    public DateTime DataAberta { get; set; }

    [Column("DATA_FECHADA")]
    public DateTime? DataFechada { get; set; }

    [Column("STATUS_COMANDA")]
    public string StatusComanda { get; set; } = "ABERTA";

    [Column("ID_MESA")]
    public int IdMesa { get; set; }

    [Column("ID_CLIENTE")]
    public int IdCliente { get; set; }

    [Column("VALOR_TOTAL")]
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
