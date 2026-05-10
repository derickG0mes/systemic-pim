namespace PIM3.API.DTOs;

/// <summary>
/// DTO para criar um pedido completo com itens
/// </summary>
public class CriarPedidoDTO
{
    public int IdMesa { get; set; }
    public int IdCliente { get; set; }
    public List<ItemPedidoDTO> Itens { get; set; } = new();
}

/// <summary>
/// DTO para representar um item no pedido
/// </summary>
public class ItemPedidoDTO
{
    public int IdProduto { get; set; }
    public int QtdProduto { get; set; }
    public decimal PrecoUnitarioPago { get; set; }
}
