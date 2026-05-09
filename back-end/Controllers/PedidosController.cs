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
    /// Cria um novo pedido
    /// POST: api/pedidos
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CriarPedido([FromBody] Comanda novaComanda)
    {
        Console.WriteLine($"--> Uma nova comanda está sendo criada para a mesa: {novaComanda.IdMesa}");

        // Validação: verificamos se a mesa existe
        var mesaExiste = await _context.Mesas
            .AnyAsync(m => m.IdMesa == novaComanda.IdMesa);

        if (!mesaExiste)
        {
            Console.WriteLine($"--> Mesa não encontrada: {novaComanda.IdMesa}");
            return BadRequest(new RespostaPadraoDTO
            {
                Sucesso = false,
                Mensagem = "Ops! Essa mesa não existe no sistema.",
                CodigoErro = "MESA_INVALIDA"
            });
        }

        // Validação: verificamos se a mesa já tem uma comanda aberta
        var comandaExistente = await _context.Comandas
            .FirstOrDefaultAsync(c => c.IdMesa == novaComanda.IdMesa && c.StatusComanda == "ABERTA");

        if (comandaExistente != null)
        {
            Console.WriteLine($"--> Comanda já aberta para mesa: {novaComanda.IdMesa}");
            return BadRequest(new RespostaPadraoDTO
            {
                Sucesso = false,
                Mensagem = "Ops! Parece que essa mesa já tem um pedido aberto.",
                CodigoErro = "COMANDA_DUPLICADA"
            });
        }

        // Configuramos os valores padrão da comanda
        novaComanda.DataAberta = DateTime.UtcNow;
        novaComanda.StatusComanda = "ABERTA";
        novaComanda.ValorTotal = 0m;

        // Alterar status da mesa para OCUPADA
        var mesa = await _context.Mesas.FindAsync(novaComanda.IdMesa);
        if (mesa != null)
        {
            mesa.StatusMesa = "OCUPADA";
            _context.Mesas.Update(mesa);
            Console.WriteLine($"--> Mesa {novaComanda.IdMesa} marcada como OCUPADA");
        }

        // Adicionamos ao banco e salvamos
        _context.Comandas.Add(novaComanda);
        await _context.SaveChangesAsync();

        Console.WriteLine($"--> Comanda criada com sucesso. ID: {novaComanda.IdComanda}");

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
