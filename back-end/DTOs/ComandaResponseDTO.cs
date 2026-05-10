namespace PIM3.API.DTOs;

public class ComandaResponseDTO
{
    public int idComanda { get; set; }
    public DateTime dataAberta { get; set; }
    public DateTime? dataFechada { get; set; }
    public string statusComanda { get; set; } = "ABERTA";
    public int idMesa { get; set; }
    public int idCliente { get; set; }
    public decimal valorTotal { get; set; } = 0m;
    public List<ItemComandaResponseDTO> itensComanda { get; set; } = new();

    public static ComandaResponseDTO FromComanda(Models.Comanda comanda)
    {
        return new ComandaResponseDTO
        {
            idComanda = comanda.IdComanda,
            dataAberta = comanda.DataAberta,
            dataFechada = comanda.DataFechada,
            statusComanda = comanda.StatusComanda,
            idMesa = comanda.IdMesa,
            idCliente = comanda.IdCliente,
            valorTotal = comanda.ValorTotal,
            itensComanda = comanda.ItensComanda?
                .Select(i => ItemComandaResponseDTO.FromItemComanda(i))
                .ToList() ?? new()
        };
    }
}

public class ItemComandaResponseDTO
{
    public int idItemComanda { get; set; }
    public int idProduto { get; set; }
    public int qtdProduto { get; set; }
    public decimal precoUnitarioPago { get; set; }

    public static ItemComandaResponseDTO FromItemComanda(Models.ItemComanda item)
    {
        return new ItemComandaResponseDTO
        {
            idItemComanda = item.IdItemComanda,
            idProduto = item.IdProduto,
            qtdProduto = item.QtdProduto,
            precoUnitarioPago = item.PrecoUnitarioPago
        };
    }
}