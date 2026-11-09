using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using PIM3.API.Data;
using PIM3.API.DTOs;
using PIM3.API.Hubs;
using PIM3.API.Models;

namespace PIM3.API.Services;

/// <summary>
/// Controller responsável pelo gerenciamento de pedidos/comandas
/// Aqui tratamos criação, atualização e listagem de pedidos
/// </summary>
public sealed class PedidoService : IPedidoService
{
    // Injeção de dependência do banco de dados
    private readonly AppDbContext _context;
    private readonly IHubContext<CozinhaHub> _cozinhaHub;
    private readonly INotificationService _notifications;

    public PedidoService(
        AppDbContext context,
        IHubContext<CozinhaHub> cozinhaHub,
        INotificationService notifications)
    {
        _context = context;
        _cozinhaHub = cozinhaHub;
        _notifications = notifications;
    }

    /// <summary>
    /// Lista todos os pedidos (comandas) do sistema
    /// GET: api/pedidos
    /// </summary>
    public async Task<IActionResult> ListarPedidos(int? pagina, int? tamanho, HttpResponse response)
    {
        if (!ListPagination.TryCreate(pagina, tamanho, out var pagination))
            return ListPagination.InvalidRequest();

        // Aqui buscamos todas as comandas com seus itens relacionados
        IQueryable<Comanda> query = _context.Comandas
            .Include(c => c.ItensComanda)
            .ThenInclude(i => i.Produto)
            .Include(c => c.Mesa)
            .Include(c => c.Cliente);

        if (pagination.IsRequested)
        {
            var totalCount = await query.CountAsync();
            pagination.SetTotalCount(response, totalCount);
            query = pagination.Apply(query, comanda => comanda.IdComanda);
        }

        var pedidos = await query.ToListAsync();

        return ApiServiceResults.Ok(new RespostaPadraoDTO
        {
            Sucesso = true,
            Mensagem = "Pedidos carregados com sucesso!",
            Dados = pedidos
        });
    }

    /// <summary>
    /// Obtém um pedido específico pelo ID
    /// GET: api/pedidos/{id}
    /// </summary>
    public async Task<IActionResult> ObterPedido(int id)
    {

        // Aqui começamos a buscar o pedido no banco
        var pedido = await _context.Comandas
            .Include(c => c.ItensComanda)
            .FirstOrDefaultAsync(c => c.IdComanda == id);

        if (pedido == null)
        {
            return ApiServiceResults.NotFound(new RespostaPadraoDTO
            {
                Sucesso = false,
                Mensagem = "Ops! Esse pedido não existe.",
                CodigoErro = "PEDIDO_NAO_ENCONTRADO"
            });
        }
        return ApiServiceResults.Ok(new RespostaPadraoDTO
        {
            Sucesso = true,
            Mensagem = "Pedido carregado com sucesso!",
            Dados = pedido
        });
    }

    /// <summary>
    /// Cria um novo pedido COM ITENS
    /// POST: api/pedidos
    /// </summary>
    public async Task<IActionResult> CriarPedido(CriarPedidoDTO pedidoDTO)
    {

        // Validação: IdMesa ou NumeroMesa (front envia tableNumber)
        var mesa = await _context.Mesas.FindAsync(pedidoDTO.IdMesa)
            ?? await _context.Mesas.FirstOrDefaultAsync(m => m.NumeroMesa == pedidoDTO.IdMesa);
        if (mesa == null)
        {
            return ApiServiceResults.BadRequest(new RespostaPadraoDTO
            {
                Sucesso = false,
                Mensagem = "Ops! Essa mesa não existe no sistema.",
                CodigoErro = "MESA_INVALIDA"
            });
        }

        // Validação: verificamos se a mesa já tem uma comanda aberta
        var comandaExistente = await _context.Comandas
            .Include(c => c.ItensComanda)
            .FirstOrDefaultAsync(c => c.IdMesa == mesa.IdMesa && c.StatusComanda == "ABERTA");

        if (comandaExistente != null)
        {
            var stockBefore = new Dictionary<int, (int Stock, int Minimum, string Name)>();

            // Adicionar itens à comanda existente
            foreach (var itemDTO in pedidoDTO.Itens)
            {
                if (itemDTO.QtdProduto <= 0)
                {
                    return ApiServiceResults.BadRequest(new RespostaPadraoDTO
                    {
                        Sucesso = false,
                        Mensagem = $"Quantidade deve ser maior que 0 para o produto {itemDTO.IdProduto}",
                        CodigoErro = "QUANTIDADE_INVALIDA"
                    });
                }

                var produto = await _context.Produtos.FindAsync(itemDTO.IdProduto);
                if (produto == null)
                {
                    return ApiServiceResults.BadRequest(new RespostaPadraoDTO
                    {
                        Sucesso = false,
                        Mensagem = $"Produto não encontrado: {itemDTO.IdProduto}",
                        CodigoErro = "PRODUTO_NAO_ENCONTRADO"
                    });
                }

                if (!string.Equals(produto.StatusProduto, "DISPONIVEL", StringComparison.OrdinalIgnoreCase))
                {
                    return ApiServiceResults.BadRequest(new RespostaPadraoDTO
                    {
                        Sucesso = false,
                        Mensagem = $"Produto indisponível: {produto.NomeProduto}",
                        CodigoErro = "PRODUTO_INDISPONIVEL"
                    });
                }

                // Validar estoque
                if (produto.QtdEstoque < itemDTO.QtdProduto)
                {
                    return ApiServiceResults.BadRequest(new RespostaPadraoDTO
                    {
                        Sucesso = false,
                        Mensagem = $"Estoque insuficiente para {produto.NomeProduto}. Disponível: {produto.QtdEstoque}",
                        CodigoErro = "ESTOQUE_INSUFICIENTE"
                    });
                }

                // Usar preço passado ou padrão do produto
                var precoFinal = itemDTO.PrecoUnitarioPago > 0 ? itemDTO.PrecoUnitarioPago : produto.PrecoProduto;

                // Adicionar item à comanda existente
                var item = new ItemComanda
                {
                    IdProduto = itemDTO.IdProduto,
                    QtdProduto = itemDTO.QtdProduto,
                    PrecoUnitarioPago = precoFinal,
                    StatusItem = "PREPARAR",
                    IdComanda = comandaExistente.IdComanda
                };

                _context.ItensComanda.Add(item);

                // Diminuir estoque do produto
                stockBefore.TryAdd(produto.IdProduto, (produto.QtdEstoque, produto.EstoqueMinimo, produto.NomeProduto));
                produto.QtdEstoque -= itemDTO.QtdProduto;
                _context.Produtos.Update(produto);
            }

            await _context.SaveChangesAsync();
            await _context.Entry(comandaExistente).ReloadAsync();

            await NotificarPedidoNovo(comandaExistente.IdComanda, comandaExistente.IdMesa, pedidoDTO.Itens);
            await NotifyNewOrderAsync(comandaExistente.IdComanda, mesa.NumeroMesa);
            await NotifyStockThresholdsAsync(stockBefore);

            return ApiServiceResults.Ok(new RespostaPadraoDTO
            {
                Sucesso = true,
                Mensagem = "Pedido adicionado à comanda existente com sucesso!",
                Dados = comandaExistente
            });
        }

        // Validação: verificamos se o cliente existe
        var cliente = await _context.Clientes.FindAsync(pedidoDTO.IdCliente);
        if (cliente == null)
        {
            return ApiServiceResults.BadRequest(new RespostaPadraoDTO
            {
                Sucesso = false,
                Mensagem = "Ops! Esse cliente não existe no sistema.",
                CodigoErro = "CLIENTE_INVALIDO"
            });
        }

        // Criar a comanda
        var novaComanda = new Comanda
        {
            IdMesa = mesa.IdMesa,
            IdCliente = pedidoDTO.IdCliente,
            DataAberta = DateTime.UtcNow,
            StatusComanda = "ABERTA",
            ValorTotal = 0m,
            ItensComanda = new List<ItemComanda>()
        };

        // Processar cada item do pedido
        var newOrderStockBefore = new Dictionary<int, (int Stock, int Minimum, string Name)>();
        foreach (var itemDTO in pedidoDTO.Itens)
        {
            if (itemDTO.QtdProduto <= 0)
            {
                return ApiServiceResults.BadRequest(new RespostaPadraoDTO
                {
                    Sucesso = false,
                    Mensagem = $"Quantidade deve ser maior que 0 para o produto {itemDTO.IdProduto}",
                    CodigoErro = "QUANTIDADE_INVALIDA"
                });
            }

            var produto = await _context.Produtos.FindAsync(itemDTO.IdProduto);
            if (produto == null)
            {
                return ApiServiceResults.BadRequest(new RespostaPadraoDTO
                {
                    Sucesso = false,
                    Mensagem = $"Produto não encontrado: {itemDTO.IdProduto}",
                    CodigoErro = "PRODUTO_NAO_ENCONTRADO"
                });
            }

            if (!string.Equals(produto.StatusProduto, "DISPONIVEL", StringComparison.OrdinalIgnoreCase))
            {
                return ApiServiceResults.BadRequest(new RespostaPadraoDTO
                {
                    Sucesso = false,
                    Mensagem = $"Produto indisponível: {produto.NomeProduto}",
                    CodigoErro = "PRODUTO_INDISPONIVEL"
                });
            }

            // Validar estoque
            if (produto.QtdEstoque < itemDTO.QtdProduto)
            {
                return ApiServiceResults.BadRequest(new RespostaPadraoDTO
                {
                    Sucesso = false,
                    Mensagem = $"Estoque insuficiente para {produto.NomeProduto}. Disponível: {produto.QtdEstoque}",
                    CodigoErro = "ESTOQUE_INSUFICIENTE"
                });
            }

            // Usar preço passado ou padrão do produto
            var precoFinal = itemDTO.PrecoUnitarioPago > 0 ? itemDTO.PrecoUnitarioPago : produto.PrecoProduto;

            // Adicionar item à comanda
            var item = new ItemComanda
            {
                IdProduto = itemDTO.IdProduto,
                QtdProduto = itemDTO.QtdProduto,
                PrecoUnitarioPago = precoFinal,
                StatusItem = "PREPARAR"
            };

            novaComanda.ItensComanda.Add(item);

            // Diminuir estoque do produto
            newOrderStockBefore.TryAdd(produto.IdProduto, (produto.QtdEstoque, produto.EstoqueMinimo, produto.NomeProduto));
            produto.QtdEstoque -= itemDTO.QtdProduto;
            _context.Produtos.Update(produto);
        }

        _context.Comandas.Add(novaComanda);
        await _context.SaveChangesAsync();

        await _context.Entry(novaComanda).ReloadAsync();
        await NotificarPedidoNovo(novaComanda.IdComanda, novaComanda.IdMesa, pedidoDTO.Itens);
        await NotifyNewOrderAsync(novaComanda.IdComanda, mesa.NumeroMesa);
        await NotifyStockThresholdsAsync(newOrderStockBefore);

        return ApiServiceResults.CreatedAtAction(nameof(ObterPedido), new { id = novaComanda.IdComanda }, new RespostaPadraoDTO
        {
            Sucesso = true,
            Mensagem = "Pedido criado com sucesso!",
            Dados = novaComanda
        });
    }

    /// <summary>
    /// Atualiza os itens de um pedido (editar quantidade ou remover itens)
    /// PUT: api/pedidos/{id}
    /// </summary>
    public async Task<IActionResult> AtualizarPedido(int id, CriarPedidoDTO pedidoAtualizado)
    {

        var pedido = await _context.Comandas
            .Include(c => c.ItensComanda)
            .ThenInclude(i => i.Produto)
            .FirstOrDefaultAsync(c => c.IdComanda == id);

        if (pedido == null)
            return ApiServiceResults.NotFound(new RespostaPadraoDTO { Sucesso = false, Mensagem = "Pedido não encontrado" });

        var stockBefore = new Dictionary<int, (int Stock, int Minimum, string Name)>();

        // Limpar itens antigos
        var itensAntigos = _context.ItensComanda.Where(i => i.IdComanda == id).ToList();
        foreach (var item in itensAntigos)
        {
            // Restituir estoque
            var produto = await _context.Produtos.FindAsync(item.IdProduto);
            if (produto != null)
            {
                stockBefore.TryAdd(produto.IdProduto, (produto.QtdEstoque, produto.EstoqueMinimo, produto.NomeProduto));
                produto.QtdEstoque += item.QtdProduto;
                _context.Produtos.Update(produto);
            }
            _context.ItensComanda.Remove(item);
        }

        // Adicionar novos itens
        foreach (var itemDTO in pedidoAtualizado.Itens)
        {
            var produto = await _context.Produtos.FindAsync(itemDTO.IdProduto);
            if (produto == null)
                return ApiServiceResults.BadRequest(new RespostaPadraoDTO { Sucesso = false, Mensagem = $"Produto {itemDTO.IdProduto} não encontrado" });

            if (!string.Equals(produto.StatusProduto, "DISPONIVEL", StringComparison.OrdinalIgnoreCase))
                return ApiServiceResults.BadRequest(new RespostaPadraoDTO { Sucesso = false, Mensagem = $"Produto indisponível: {produto.NomeProduto}", CodigoErro = "PRODUTO_INDISPONIVEL" });

            if (produto.QtdEstoque < itemDTO.QtdProduto)
                return ApiServiceResults.BadRequest(new RespostaPadraoDTO { Sucesso = false, Mensagem = $"Estoque insuficiente para {produto.NomeProduto}" });

            var novoItem = new ItemComanda
            {
                IdProduto = itemDTO.IdProduto,
                QtdProduto = itemDTO.QtdProduto,
                PrecoUnitarioPago = itemDTO.PrecoUnitarioPago > 0 ? itemDTO.PrecoUnitarioPago : produto.PrecoProduto,
                IdComanda = id
            };

            stockBefore.TryAdd(produto.IdProduto, (produto.QtdEstoque, produto.EstoqueMinimo, produto.NomeProduto));
            produto.QtdEstoque -= itemDTO.QtdProduto;
            _context.Produtos.Update(produto);
            _context.ItensComanda.Add(novoItem);
        }

        await _context.SaveChangesAsync();
        await _context.Entry(pedido).ReloadAsync();
        await NotifyStockThresholdsAsync(stockBefore);
        await _cozinhaHub.Clients.All.SendAsync("ComandaAtualizada", new
        {
            idComanda = pedido.IdComanda,
            idMesa = pedido.IdMesa,
            novoStatus = pedido.StatusComanda,
            timestamp = DateTime.UtcNow
        });

        return ApiServiceResults.Ok(new RespostaPadraoDTO
        {
            Sucesso = true,
            Mensagem = "Pedido atualizado com sucesso!",
            Dados = pedido
        });
    }

    /// <summary>
    /// Atualiza o status de um pedido
    /// PUT: api/pedidos/{id}/status
    /// </summary>
    public async Task<IActionResult> AtualizarStatusPedido(int id, AtualizarStatusPedidoDTO statusDTO)
    {

        var pedido = await _context.Comandas
            .Include(c => c.Mesa)
            .Include(c => c.ItensComanda)
            .FirstOrDefaultAsync(c => c.IdComanda == id);

        if (pedido == null)
        {
            return ApiServiceResults.NotFound(new RespostaPadraoDTO
            {
                Sucesso = false,
                Mensagem = "Ops! Esse pedido não existe.",
                CodigoErro = "PEDIDO_NAO_ENCONTRADO"
            });
        }

        var novoStatus = statusDTO.Status?.Trim() ?? string.Empty;
        var statusCozinha = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["preparing"] = "PREPARAR",
            ["in_progress"] = "PREPARANDO",
            ["completed"] = "CONCLUIDO"
        };

        // api.ts envia preparing | in_progress | completed
        if (statusCozinha.TryGetValue(novoStatus, out var statusItem))
        {
            foreach (var item in pedido.ItensComanda)
                item.StatusItem = statusItem;

            await _context.SaveChangesAsync();
            if (statusItem == "PREPARANDO")
            {
                await _cozinhaHub.Clients.All.SendAsync("PedidoEmPreparo", new
                {
                    idComanda = pedido.IdComanda,
                    idMesa = pedido.IdMesa,
                    timestamp = DateTime.UtcNow
                });
            }
            else if (statusItem == "CONCLUIDO")
            {
                await _cozinhaHub.Clients.All.SendAsync("PedidoPronto", new
                {
                    idComanda = pedido.IdComanda,
                    idMesa = pedido.IdMesa,
                    timestamp = DateTime.UtcNow
                });
                await _notifications.NotifyAsync(
                    "pedido_pronto",
                    "Pedido pronto",
                    $"Pedido da mesa {pedido.Mesa?.NumeroMesa ?? pedido.IdMesa} está pronto para servir.",
                    "/orders",
                    ["employee", "admin", "owner"]);
            }

            await _cozinhaHub.Clients.All.SendAsync("ComandaAtualizada", new
            {
                idComanda = pedido.IdComanda,
                idMesa = pedido.IdMesa,
                novoStatus = statusItem,
                timestamp = DateTime.UtcNow
            });
            return ApiServiceResults.Ok(new RespostaPadraoDTO
            {
                Sucesso = true,
                Mensagem = $"Itens atualizados para: {statusItem}",
                Dados = pedido
            });
        }

        var statusComanda = novoStatus.ToUpperInvariant();
        if (statusComanda is not ("ABERTA" or "FECHADA"))
        {
            return ApiServiceResults.BadRequest(new RespostaPadraoDTO
            {
                Sucesso = false,
                Mensagem = "Status inválido.",
                CodigoErro = "STATUS_INVALIDO"
            });
        }

        if (statusComanda == "FECHADA")
        {
            return ApiServiceResults.BadRequest(new RespostaPadraoDTO
            {
                Sucesso = false,
                Mensagem = "Use PUT /api/comanda/{id}/pagar para fechar a comanda (trigger trg_fechar_comanda).",
                CodigoErro = "USE_PAGAMENTO"
            });
        }

        pedido.StatusComanda = statusComanda;
        await _context.SaveChangesAsync();
        await _cozinhaHub.Clients.All.SendAsync("ComandaAtualizada", new
        {
            idComanda = pedido.IdComanda,
            idMesa = pedido.IdMesa,
            novoStatus = pedido.StatusComanda,
            timestamp = DateTime.UtcNow
        });

        return ApiServiceResults.Ok(new RespostaPadraoDTO
        {
            Sucesso = true,
            Mensagem = $"Pedido atualizado para status: {statusComanda}",
            Dados = pedido
        });
    }

    /// <summary>
    /// Deleta (fecha) um pedido e libera a mesa
    /// DELETE: api/pedidos/{id}
    /// </summary>
    public async Task<IActionResult> DeletarPedido(int id)
    {

        // Aqui começamos a buscar o pedido para deletar
        var pedido = await _context.Comandas
            .Include(c => c.Mesa)
            .FirstOrDefaultAsync(c => c.IdComanda == id);

        if (pedido == null)
        {
            return ApiServiceResults.NotFound(new RespostaPadraoDTO
            {
                Sucesso = false,
                Mensagem = "Ops! Esse pedido não existe.",
                CodigoErro = "PEDIDO_NAO_ENCONTRADO"
            });
        }

        // Liberar a mesa
        if (pedido.Mesa != null)
        {
            pedido.Mesa.StatusMesa = "DISPONIVEL";
            _context.Mesas.Update(pedido.Mesa);
        }

        // Removemos o pedido do banco
        _context.Comandas.Remove(pedido);
        await _context.SaveChangesAsync();
        await _cozinhaHub.Clients.All.SendAsync("ComandaAtualizada", new
        {
            idComanda = id,
            idMesa = pedido.IdMesa,
            novoStatus = "REMOVIDA",
            timestamp = DateTime.UtcNow
        });

        return ApiServiceResults.Ok(new RespostaPadraoDTO
        {
            Sucesso = true,
            Mensagem = "Pedido deletado e mesa liberada com sucesso!",
            Dados = new { id }
        });
    }

    private Task NotificarPedidoNovo(int idComanda, int idMesa, IEnumerable<ItemPedidoDTO> itens)
    {
        return _cozinhaHub.Clients.All.SendAsync("PedidoNovo", new
        {
            idComanda,
            idMesa,
            itens = itens.Select(item => new
            {
                idProduto = item.IdProduto,
                qtdProduto = item.QtdProduto,
                statusItem = "PREPARAR"
            }),
            timestamp = DateTime.UtcNow
        });
    }

    private Task NotifyNewOrderAsync(int idComanda, int idMesa) =>
        _notifications.NotifyAsync(
            "pedido_novo",
            "Novo pedido para a cozinha",
            $"Comanda #{idComanda} · Mesa {idMesa}.",
            "/orders",
            ["employee", "admin", "owner"]);

    private async Task NotifyStockThresholdsAsync(
        IReadOnlyDictionary<int, (int Stock, int Minimum, string Name)> stockBefore)
    {
        foreach (var (productId, previous) in stockBefore)
        {
            var product = await _context.Produtos.FindAsync(productId);
            if (product is null || previous.Stock <= previous.Minimum || product.QtdEstoque > product.EstoqueMinimo)
                continue;

            await _notifications.NotifyAsync(
                "estoque_baixo",
                "Estoque baixo",
                $"{previous.Name}: restam {product.QtdEstoque} (mínimo {product.EstoqueMinimo}).",
                "/inventory",
                ["admin", "owner"]);
        }
    }
}
