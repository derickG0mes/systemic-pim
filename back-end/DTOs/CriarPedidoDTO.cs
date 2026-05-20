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

/// <summary>
/// DTO para atualizar status do pedido (api.ts envia { status })
/// </summary>
public class AtualizarStatusPedidoDTO
{
    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;
}

public class CriarReservaDTO
{
    [JsonPropertyName("nomeCliente")]
    public string NomeCliente { get; set; } = string.Empty;

    [JsonPropertyName("numeroMesa")]
    public int NumeroMesa { get; set; }

    [JsonPropertyName("dataReserva")]
    public DateTime DataReserva { get; set; }
}

public class PagarComandaDTO
{
    [JsonPropertyName("idFormaPagamento")]
    public int IdFormaPagamento { get; set; }

    [JsonPropertyName("idFuncionario")]
    public int IdFuncionario { get; set; } = 1;

    [JsonPropertyName("troco")]
    public decimal Troco { get; set; }
}
