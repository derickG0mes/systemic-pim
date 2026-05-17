using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PIM3.API.Models;

[Table("ITEM_COMANDA")]
public class ItemComanda
{
    [Column("ID_ITEM_COMANDA")]
    public int IdItemComanda { get; set; }

    [Column("QTD_PRODUTO")]
    [Range(1, int.MaxValue, ErrorMessage = "Quantidade deve ser maior que 0")]
    public int QtdProduto { get; set; }

    [Column("PRECO_UNITARIO_PAGO")]
    [Range(typeof(decimal), "0.01", "79228162514264337593543950335", ErrorMessage = "Preço deve ser maior que 0")]
    public decimal PrecoUnitarioPago { get; set; }

    [Column("ID_PRODUTO")]
    public int IdProduto { get; set; }

    [Column("ID_COMANDA")]
    public int IdComanda { get; set; }

    [Column("STATUS_ITEM")]
    public string StatusItem { get; set; } = "PREPARAR";

    // Relacionamentos
    public Produto? Produto { get; set; }
    public Comanda? Comanda { get; set; }
}
