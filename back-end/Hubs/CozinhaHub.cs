using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace PIM3.API.Hubs;

/// <summary>
/// Hub SignalR para notificações em tempo real da cozinha.
/// Os clientes apenas recebem eventos (PedidoNovo, PedidoEmPreparo, PedidoPronto
/// e ComandaAtualizada); o servidor os publica por IHubContext a partir dos
/// serviços de comanda e pedido. O hub não expõe métodos invocáveis pelo
/// cliente, para que um usuário autenticado não possa forjar eventos de cozinha.
/// </summary>
[Authorize]
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
}
