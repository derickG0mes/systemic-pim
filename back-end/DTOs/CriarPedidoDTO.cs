using System.Text.Json.Serialization;

namespace PIM3.API.DTOs;

/// <summary>
/// DTO para criar um pedido completo com itens
/// </summary>
public class CriarPedidoDTO
{
    [JsonPropertyName("idMesa")]
    public int IdMesa { get; set; }

    [JsonPropertyName("idCliente")]
    public int IdCliente { get; set; }

    [JsonPropertyName("itens")]
    public List<ItemPedidoDTO> Itens { get; set; } = new();
}

/// <summary>
/// DTO para representar um item no pedido
/// </summary>
public class ItemPedidoDTO
{
    [JsonPropertyName("idProduto")]
    public int IdProduto { get; set; }

    [JsonPropertyName("qtdProduto")]
    public int QtdProduto { get; set; }

    [JsonPropertyName("precoUnitarioPago")]
    public decimal PrecoUnitarioPago { get; set; }
}
