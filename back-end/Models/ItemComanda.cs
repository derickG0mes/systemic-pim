using System.ComponentModel.DataAnnotations;

namespace PIM3.API.Models;

public class ItemComanda
{
    public int IdItemComanda { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "Quantidade deve ser maior que 0")]
    public int QtdProduto { get; set; }

    [Range(0.01, decimal.MaxValue, ErrorMessage = "Preço deve ser maior que 0")]
    public decimal PrecoUnitarioPago { get; set; }

    public int IdProduto { get; set; }
    public int IdComanda { get; set; }

    // Relacionamentos
    public Produto? Produto { get; set; }
    public Comanda? Comanda { get; set; }
}
