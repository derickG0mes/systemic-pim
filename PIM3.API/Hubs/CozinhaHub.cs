using Microsoft.AspNetCore.SignalR;

namespace PIM3.API.Hubs;

/// <summary>
/// Hub SignalR para notificações em tempo real da cozinha
/// Envia atualizações de status de pedidos para todos os clientes conectados
/// </summary>
public class CozinhaHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        await Clients.All.SendAsync("UsuarioConectado", $"Usuário conectado: {Context.ConnectionId}");
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        await Clients.All.SendAsync("UsuarioDesconectado", $"Usuário desconectado: {Context.ConnectionId}");
        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Notifica que um pedido foi adicionado à cozinha
    /// </summary>
    public async Task NotificarPedidoNovo(int idComanda, int idMesa, List<object> itens)
    {
        await Clients.All.SendAsync("PedidoNovo", new
        {
            idComanda,
            idMesa,
            itens,
            timestamp = DateTime.UtcNow
        });
    }

    /// <summary>
    /// Notifica que um pedido foi preparado
    /// </summary>
    public async Task NotificarPedidoPronto(int idComanda, int idMesa)
    {
        await Clients.All.SendAsync("PedidoPronto", new
        {
            idComanda,
            idMesa,
            timestamp = DateTime.UtcNow
        });
    }

    /// <summary>
    /// Notifica que um pedido está sendo preparado
    /// </summary>
    public async Task NotificarPedidoEmPreparo(int idComanda, int idMesa)
    {
        await Clients.All.SendAsync("PedidoEmPreparo", new
        {
            idComanda,
            idMesa,
            timestamp = DateTime.UtcNow
        });
    }

    /// <summary>
    /// Broadcast para todos os clientes sobre mudança de status
    /// </summary>
    public async Task AtualizarStatusComanda(int idComanda, string novoStatus)
    {
        await Clients.All.SendAsync("ComandaAtualizada", new
        {
            idComanda,
            novoStatus,
            timestamp = DateTime.UtcNow
        });
    }
}
