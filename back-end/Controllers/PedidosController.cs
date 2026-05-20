using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PIM3.API.Data;
using PIM3.API.DTOs;
using PIM3.API.Models;

namespace PIM3.API.Controllers;

/// <summary>
/// Controller responsável pelo gerenciamento de pedidos/comandas
/// Aqui tratamos criação, atualização e listagem de pedidos
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]  // Requer autenticação
public class PedidosController : ControllerBase
{
    // Injeção de dependência do banco de dados
    private readonly AppDbContext _context;

    public PedidosController(AppDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Lista todos os pedidos (comandas) do sistema
    /// GET: api/pedidos
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> ListarPedidos()
    {
        Console.WriteLine("--> Alguém tentou acessar a lista de pedidos agora.");

        // Aqui buscamos todas as comandas com seus itens relacionados
        var pedidos = await _context.Comandas
            .Include(c => c.ItensComanda)
            .ThenInclude(i => i.Produto)  // ✅ CRÍTICA: Incluir dados do produto nos itens
            .Include(c => c.Mesa)  // ✅ Incluir dados da mesa
            .Include(c => c.Cliente)  // ✅ Incluir dados do cliente
            .ToListAsync();

        Console.WriteLine($"--> Total de pedidos encontrados: {pedidos.Count}");

        return Ok(new RespostaPadraoDTO
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
    [HttpGet("{id}")]
    public async Task<IActionResult> ObterPedido(int id)
    {
        Console.WriteLine($"--> Alguém tentou acessar o pedido {id}");

        // Aqui começamos a buscar o pedido no banco
        var pedido = await _context.Comandas
            .Include(c => c.ItensComanda)
            .FirstOrDefaultAsync(c => c.IdComanda == id);

        if (pedido == null)
        {
            Console.WriteLine($"--> Pedido não encontrado: {id}");
            return NotFound(new RespostaPadraoDTO
            {
                Sucesso = false,
                Mensagem = "Ops! Esse pedido não existe.",
                CodigoErro = "PEDIDO_NAO_ENCONTRADO"
            });
        }

        Console.WriteLine($"--> Pedido encontrado: {id}");
        return Ok(new RespostaPadraoDTO
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
    [HttpPost]
    public async Task<IActionResult> CriarPedido([FromBody] CriarPedidoDTO pedidoDTO)
    {
        Console.WriteLine($"--> Criando pedido para mesa: {pedidoDTO.IdMesa} com {pedidoDTO.Itens.Count} itens");

        // Validação: IdMesa ou NumeroMesa (front envia tableNumber)
        var mesa = await _context.Mesas.FindAsync(pedidoDTO.IdMesa)
            ?? await _context.Mesas.FirstOrDefaultAsync(m => m.NumeroMesa == pedidoDTO.IdMesa);
        if (mesa == null)
        {
            Console.WriteLine($"--> Mesa não encontrada: {pedidoDTO.IdMesa}");
            Console.WriteLine($"--> Mesas disponíveis no banco: {await _context.Mesas.CountAsync()}");
            var mesasDisponiveis = await _context.Mesas.Select(m => m.IdMesa).ToListAsync();
            Console.WriteLine($"--> IDs de mesas: [{string.Join(", ", mesasDisponiveis)}]");
            return BadRequest(new RespostaPadraoDTO
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
            Console.WriteLine($"--> Comanda já aberta para mesa: {pedidoDTO.IdMesa}. Adicionando itens à comanda existente ID: {comandaExistente.IdComanda}");
            
            // Adicionar itens à comanda existente
            foreach (var itemDTO in pedidoDTO.Itens)
            {
                if (itemDTO.QtdProduto <= 0)
                {
                    return BadRequest(new RespostaPadraoDTO
                    {
                        Sucesso = false,
                        Mensagem = $"Quantidade deve ser maior que 0 para o produto {itemDTO.IdProduto}",
                        CodigoErro = "QUANTIDADE_INVALIDA"
                    });
                }

                var produto = await _context.Produtos.FindAsync(itemDTO.IdProduto);
                if (produto == null)
                {
                    return BadRequest(new RespostaPadraoDTO
                    {
                        Sucesso = false,
                        Mensagem = $"Produto não encontrado: {itemDTO.IdProduto}",
                        CodigoErro = "PRODUTO_NAO_ENCONTRADO"
                    });
                }

                // Validar estoque
                if (produto.QtdEstoque < itemDTO.QtdProduto)
                {
                    return BadRequest(new RespostaPadraoDTO
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
                produto.QtdEstoque -= itemDTO.QtdProduto;
                _context.Produtos.Update(produto);

                Console.WriteLine($"--> Item adicionado à comanda existente: {produto.NomeProduto} x{itemDTO.QtdProduto} @ R$ {precoFinal}");
            }

            await _context.SaveChangesAsync();
            await _context.Entry(comandaExistente).ReloadAsync();
            
            Console.WriteLine($"--> Pedido adicionado com sucesso à comanda existente. ID: {comandaExistente.IdComanda}, Novo Total: R$ {comandaExistente.ValorTotal}");

            return Ok(new RespostaPadraoDTO
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
            Console.WriteLine($"--> Cliente não encontrado: {pedidoDTO.IdCliente}");
            return BadRequest(new RespostaPadraoDTO
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

        // ✅ Processar cada item do pedido
        foreach (var itemDTO in pedidoDTO.Itens)
        {
            if (itemDTO.QtdProduto <= 0)
            {
                return BadRequest(new RespostaPadraoDTO
                {
                    Sucesso = false,
                    Mensagem = $"Quantidade deve ser maior que 0 para o produto {itemDTO.IdProduto}",
                    CodigoErro = "QUANTIDADE_INVALIDA"
                });
            }

            var produto = await _context.Produtos.FindAsync(itemDTO.IdProduto);
            if (produto == null)
            {
                return BadRequest(new RespostaPadraoDTO
                {
                    Sucesso = false,
                    Mensagem = $"Produto não encontrado: {itemDTO.IdProduto}",
                    CodigoErro = "PRODUTO_NAO_ENCONTRADO"
                });
            }

            // Validar estoque
            if (produto.QtdEstoque < itemDTO.QtdProduto)
            {
                return BadRequest(new RespostaPadraoDTO
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
            produto.QtdEstoque -= itemDTO.QtdProduto;
            _context.Produtos.Update(produto);

            Console.WriteLine($"--> Item adicionado: {produto.NomeProduto} x{itemDTO.QtdProduto} @ R$ {precoFinal}");
        }

        _context.Comandas.Add(novaComanda);
        await _context.SaveChangesAsync();

        await _context.Entry(novaComanda).ReloadAsync();
        Console.WriteLine($"--> Pedido criado com sucesso. ID: {novaComanda.IdComanda}, Total: R$ {novaComanda.ValorTotal}");

        return CreatedAtAction(nameof(ObterPedido), new { id = novaComanda.IdComanda }, new RespostaPadraoDTO
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
    [HttpPut("{id}")]
    public async Task<IActionResult> AtualizarPedido(int id, [FromBody] CriarPedidoDTO pedidoAtualizado)
    {
        Console.WriteLine($"--> Alguém tentou atualizar o pedido {id}");

        var pedido = await _context.Comandas
            .Include(c => c.ItensComanda)
            .ThenInclude(i => i.Produto)
            .FirstOrDefaultAsync(c => c.IdComanda == id);

        if (pedido == null)
            return NotFound(new RespostaPadraoDTO { Sucesso = false, Mensagem = "Pedido não encontrado" });

        // ✅ Limpar itens antigos
        var itensAntigos = _context.ItensComanda.Where(i => i.IdComanda == id).ToList();
        foreach (var item in itensAntigos)
        {
            // Restituir estoque
            var produto = await _context.Produtos.FindAsync(item.IdProduto);
            if (produto != null)
            {
                produto.QtdEstoque += item.QtdProduto;
                _context.Produtos.Update(produto);
            }
            _context.ItensComanda.Remove(item);
        }

        // ✅ Adicionar novos itens
        foreach (var itemDTO in pedidoAtualizado.Itens)
        {
            var produto = await _context.Produtos.FindAsync(itemDTO.IdProduto);
            if (produto == null)
                return BadRequest(new RespostaPadraoDTO { Sucesso = false, Mensagem = $"Produto {itemDTO.IdProduto} não encontrado" });

            if (produto.QtdEstoque < itemDTO.QtdProduto)
                return BadRequest(new RespostaPadraoDTO { Sucesso = false, Mensagem = $"Estoque insuficiente para {produto.NomeProduto}" });

            var novoItem = new ItemComanda
            {
                IdProduto = itemDTO.IdProduto,
                QtdProduto = itemDTO.QtdProduto,
                PrecoUnitarioPago = itemDTO.PrecoUnitarioPago > 0 ? itemDTO.PrecoUnitarioPago : produto.PrecoProduto,
                IdComanda = id
            };

            produto.QtdEstoque -= itemDTO.QtdProduto;
            _context.Produtos.Update(produto);
            _context.ItensComanda.Add(novoItem);
        }

        await _context.SaveChangesAsync();
        await _context.Entry(pedido).ReloadAsync();

        return Ok(new RespostaPadraoDTO
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
    [HttpPut("{id}/status")]
    public async Task<IActionResult> AtualizarStatusPedido(int id, [FromBody] AtualizarStatusPedidoDTO statusDTO)
    {
        Console.WriteLine($"--> Alguém tentou atualizar o status do pedido {id}");

        var pedido = await _context.Comandas
            .Include(c => c.Mesa)
            .Include(c => c.ItensComanda)
            .FirstOrDefaultAsync(c => c.IdComanda == id);

        if (pedido == null)
        {
            return NotFound(new RespostaPadraoDTO
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
            return Ok(new RespostaPadraoDTO
            {
                Sucesso = true,
                Mensagem = $"Itens atualizados para: {statusItem}",
                Dados = pedido
            });
        }

        var statusComanda = novoStatus.ToUpperInvariant();
        if (statusComanda is not ("ABERTA" or "FECHADA"))
        {
            return BadRequest(new RespostaPadraoDTO
            {
                Sucesso = false,
                Mensagem = "Status inválido.",
                CodigoErro = "STATUS_INVALIDO"
            });
        }

        if (statusComanda == "FECHADA")
        {
            return BadRequest(new RespostaPadraoDTO
            {
                Sucesso = false,
                Mensagem = "Use PUT /api/comanda/{id}/pagar para fechar a comanda (trigger trg_fechar_comanda).",
                CodigoErro = "USE_PAGAMENTO"
            });
        }

        pedido.StatusComanda = statusComanda;
        await _context.SaveChangesAsync();

        return Ok(new RespostaPadraoDTO
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
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeletarPedido(int id)
    {
        Console.WriteLine($"--> Alguém tentou deletar o pedido {id}");

        // Aqui começamos a buscar o pedido para deletar
        var pedido = await _context.Comandas
            .Include(c => c.Mesa)
            .FirstOrDefaultAsync(c => c.IdComanda == id);

        if (pedido == null)
        {
            Console.WriteLine($"--> Pedido não encontrado para deleção: {id}");
            return NotFound(new RespostaPadraoDTO
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
            Console.WriteLine($"--> Mesa {pedido.IdMesa} liberada");
        }

        // Removemos o pedido do banco
        _context.Comandas.Remove(pedido);
        await _context.SaveChangesAsync();

        Console.WriteLine($"--> Pedido deletado com sucesso: {id}");

        return Ok(new RespostaPadraoDTO
        {
            Sucesso = true,
            Mensagem = "Pedido deletado e mesa liberada com sucesso!",
            Dados = new { id }
        });
    }
}
