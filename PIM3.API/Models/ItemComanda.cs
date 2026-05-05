namespace PIM3.API.Models;

public class ItemComanda
{
    public int IdItemComanda { get; set; }
    public int QtdProduto { get; set; }
    public decimal PrecoUnitarioPago { get; set; }
    public int IdProduto { get; set; }
    public int IdComanda { get; set; }

    // Relacionamentos
    public Produto? Produto { get; set; }
    public Comanda? Comanda { get; set; }
}
