namespace PIM3.API.Models;

public class Comanda
{
    public int IdComanda { get; set; }
    public DateTime DataAberta { get; set; }
    public DateTime? DataFechada { get; set; }
    public string StatusComanda { get; set; } = "ABERTA";
    public int IdMesa { get; set; }
    public int IdCliente { get; set; }

    // Relacionamentos
    public Mesa? Mesa { get; set; }
    public Cliente? Cliente { get; set; }
    public ICollection<ItemComanda> ItensComanda { get; set; } = new List<ItemComanda>();
}
