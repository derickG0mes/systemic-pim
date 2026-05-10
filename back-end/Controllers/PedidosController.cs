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

        // Validação: verificamos se a mesa existe
        var mesa = await _context.Mesas.FindAsync(pedidoDTO.IdMesa);
        if (mesa == null)
        {
            Console.WriteLine($"--> Mesa não encontrada: {pedidoDTO.IdMesa}");
            return BadRequest(new RespostaPadraoDTO
            {
                Sucesso = false,
                Mensagem = "Ops! Essa mesa não existe no sistema.",
                CodigoErro = "MESA_INVALIDA"
            });
        }

        // Validação: verificamos se a mesa já tem uma comanda aberta
        var comandaExistente = await _context.Comandas
            .FirstOrDefaultAsync(c => c.IdMesa == pedidoDTO.IdMesa && c.StatusComanda == "ABERTA");

        if (comandaExistente != null)
        {
            Console.WriteLine($"--> Comanda já aberta para mesa: {pedidoDTO.IdMesa}");
            return BadRequest(new RespostaPadraoDTO
            {
                Sucesso = false,
                Mensagem = "Ops! Parece que essa mesa já tem um pedido aberto.",
                CodigoErro = "COMANDA_DUPLICADA"
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
            IdMesa = pedidoDTO.IdMesa,
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
                PrecoUnitarioPago = precoFinal
            };

            novaComanda.ItensComanda.Add(item);

            // Diminuir estoque do produto
            produto.QtdEstoque -= itemDTO.QtdProduto;
            _context.Produtos.Update(produto);

            Console.WriteLine($"--> Item adicionado: {produto.NomeProduto} x{itemDTO.QtdProduto} @ R$ {precoFinal}");
        }

        // ✅ Recalcular total da comanda
        novaComanda.RecalcularTotal();
        Console.WriteLine($"--> Total da comanda: R$ {novaComanda.ValorTotal}");

        // Alterar status da mesa para OCUPADA
        mesa.StatusMesa = "OCUPADA";
        _context.Mesas.Update(mesa);

        // Adicionar comanda ao banco
        _context.Comandas.Add(novaComanda);
        await _context.SaveChangesAsync();

        Console.WriteLine($"--> Pedido criado com sucesso. ID: {novaComanda.IdComanda}, Total: R$ {novaComanda.ValorTotal}");

        return CreatedAtAction(nameof(ObterPedido), new { id = novaComanda.IdComanda }, new RespostaPadraoDTO
        {
            Sucesso = true,
            Mensagem = "Pedido criado com sucesso!",
            Dados = novaComanda
        });
    }

    /// <summary>
    /// Atualiza o status de um pedido
    /// PUT: api/pedidos/{id}/status
    /// </summary>
    [HttpPut("{id}/status")]
    public async Task<IActionResult> AtualizarStatusPedido(int id, [FromBody] dynamic statusDTO)
    {
        Console.WriteLine($"--> Alguém tentou atualizar o status do pedido {id}");

        // Buscamos o pedido no banco
        var pedido = await _context.Comandas
            .Include(c => c.Mesa)
            .FirstOrDefaultAsync(c => c.IdComanda == id);

        if (pedido == null)
        {
            Console.WriteLine($"--> Pedido não encontrado para atualização: {id}");
            return NotFound(new RespostaPadraoDTO
            {
                Sucesso = false,
                Mensagem = "Ops! Esse pedido não existe.",
                CodigoErro = "PEDIDO_NAO_ENCONTRADO"
            });
        }

        string novoStatus = statusDTO.status;
        var statusPermitidos = new[] { "ABERTA", "FECHADA" };

        if (!statusPermitidos.Contains(novoStatus))
        {
            return BadRequest(new RespostaPadraoDTO
            {
                Sucesso = false,
                Mensagem = "Status inválido. Use: ABERTA ou FECHADA",
                CodigoErro = "STATUS_INVALIDO"
            });
        }

        // Se está fechando, liberar a mesa
        if (novoStatus == "FECHADA" && pedido.Mesa != null)
        {
            pedido.Mesa.StatusMesa = "DISPONIVEL";
            pedido.DataFechada = DateTime.UtcNow;
            _context.Mesas.Update(pedido.Mesa);
            Console.WriteLine($"--> Mesa {pedido.IdMesa} liberada");
        }

        pedido.StatusComanda = novoStatus;
        await _context.SaveChangesAsync();

        Console.WriteLine($"--> Status do pedido {id} atualizado para: {novoStatus}");

        return Ok(new RespostaPadraoDTO
        {
            Sucesso = true,
            Mensagem = $"Pedido atualizado para status: {novoStatus}",
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
