using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PIM3.API.Data;
using PIM3.API.DTOs;
using PIM3.API.Models;

namespace PIM3.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ComandaController : ControllerBase
{
    private readonly AppDbContext _context;

    public ComandaController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public IActionResult GetAll()
    {
        var comandas = _context.Comandas
            .Include(c => c.ItensComanda)
            .ThenInclude(i => i.Produto)
            .Include(c => c.Cliente)
            .Include(c => c.Mesa)
            .ToList();

        return Ok(new { sucesso = true, dados = comandas });  // ✅ CRÍTICA: Estrutura consistente
    }

    [HttpGet("{id}")]
    public IActionResult GetById(int id)
    {
        var comanda = _context.Comandas
            .Include(c => c.ItensComanda)
            .ThenInclude(i => i.Produto)
            .Include(c => c.Cliente)
            .Include(c => c.Mesa)
            .FirstOrDefault(c => c.IdComanda == id);

        if (comanda == null)
            return NotFound(new { sucesso = false, mensagem = "Comanda não encontrada" });

        return Ok(new { sucesso = true, dados = comanda });  // ✅ Estrutura consistente
    }

    /// <summary>
    /// Lista apenas as comandas abertas (ativas)
    /// Endpoint específico para o frontend atualizar a UI
    /// </summary>
    [HttpGet("abertas/todas")]
    [Authorize]  // ✅ CRÍTICA: Exigir autenticação em vez de AllowAnonymous
    public IActionResult GetAbertasComTotais()
    {
        Console.WriteLine("--> Listando todas as comandas abertas com totais...");

        try
        {
            var comandasAbertas = _context.Comandas
                .Where(c => c.StatusComanda == "ABERTA")
                .Include(c => c.ItensComanda)
                .Select(c => new
                {
                    c.IdComanda,
                    c.DataAberta,
                    c.IdMesa,
                    c.IdCliente,
                    c.StatusComanda,
                    ValorTotal = c.ItensComanda.Sum(i => i.QtdProduto * i.PrecoUnitarioPago),
                    // Retorna os itens ativos para reconstruir o estado após o F5
                    ItensComanda = c.ItensComanda
                        .Where(i => i.StatusItem != "CONCLUIDO" && i.StatusItem != "ENTREGUE")
                        .Select(i => new
                        {
                            i.IdItemComanda,
                            i.IdProduto,
                            i.QtdProduto,
                            i.PrecoUnitarioPago,
                            i.StatusItem,
                            NomeProduto = i.Produto != null ? i.Produto.NomeProduto : ""
                        }).ToList()
                })
                .ToList();

            Console.WriteLine($"--> Total de comandas abertas: {comandasAbertas.Count}");

            foreach (var cmd in comandasAbertas)
            {
                Console.WriteLine($"--> Comanda {cmd.IdComanda} (Mesa {cmd.IdMesa}): R$ {cmd.ValorTotal}");
            }

            // ✅ Retornar dados com total calculado dinamicamente
            return Ok(comandasAbertas);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"--> ERRO: {ex.Message}");
            Console.WriteLine($"--> StackTrace: {ex.StackTrace}");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    /// <summary>
    /// Abre uma nova comanda
    /// </summary>
    [HttpGet("mesa/{tableNumber}")]
    public IActionResult GetComandasByTable(int tableNumber)
    {
        Console.WriteLine($"--> Buscando comandas da mesa {tableNumber}");

        var comandas = _context.Comandas
            .Where(c => c.IdMesa == tableNumber && c.StatusComanda == "ABERTA")
            .Include(c => c.ItensComanda)
            .Include(c => c.Mesa)
            .Include(c => c.Cliente)
            .ToList();

        return Ok(comandas);
    }

    /// <summary>
    /// Atualiza dados gerais de uma comanda (não itens)
    /// PUT: api/comanda/{id}
    /// </summary>
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] Comanda comandaAtualizada)
    {
        var comanda = _context.Comandas.FirstOrDefault(c => c.IdComanda == id);
        if (comanda == null)
            return NotFound(new { message = "Comanda não encontrada" });

        // Só permitir atualizar cliente e mesa se a comanda ainda não foi fechada
        if (comanda.StatusComanda != "FECHADA")
        {
            comanda.IdCliente = comandaAtualizada.IdCliente;
            comanda.IdMesa = comandaAtualizada.IdMesa;
        }

        _context.Comandas.Update(comanda);
        await _context.SaveChangesAsync();

        return Ok(comanda);
    }

    /// <summary>
    /// Abre uma nova comanda
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Comanda comanda)
    {
        if (comanda.IdMesa <= 0 || comanda.IdCliente <= 0)
            return BadRequest(new { message = "Mesa e Cliente são obrigatórios" });

        // Verificar se mesa existe
        var mesa = _context.Mesas.FirstOrDefault(m => m.IdMesa == comanda.IdMesa);
        if (mesa == null)
            return BadRequest(new { message = "Mesa não encontrada" });

        // Verificar se cliente existe
        var cliente = _context.Clientes.FirstOrDefault(c => c.IdCliente == comanda.IdCliente);
        if (cliente == null)
            return BadRequest(new { message = "Cliente não encontrado" });

        // Verificar se já existe comanda aberta para esta mesa
        var comandaAberta = _context.Comandas
            .FirstOrDefault(c => c.IdMesa == comanda.IdMesa && c.StatusComanda == "ABERTA");
        if (comandaAberta != null)
            return BadRequest(new { message = "Já existe uma comanda aberta para esta mesa" });

        comanda.DataAberta = DateTime.UtcNow;
        comanda.StatusComanda = "ABERTA";
        comanda.ValorTotal = 0m;

        // Alterar status da mesa para OCUPADA
        mesa.StatusMesa = "OCUPADA";
        _context.Mesas.Update(mesa);

        _context.Comandas.Add(comanda);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = comanda.IdComanda }, comanda);
    }

    /// <summary>
    /// Adiciona um item à comanda e recalcula o total
    /// </summary>
    [HttpPost("{id}/itens")]
    public async Task<IActionResult> AddItem(int id, [FromBody] ItemComanda item)
    {
        var comanda = _context.Comandas
            .Include(c => c.ItensComanda)
            .FirstOrDefault(c => c.IdComanda == id);
        if (comanda == null)
            return NotFound(new { message = "Comanda não encontrada" });

        if (comanda.StatusComanda != "ABERTA")
            return BadRequest(new { message = "Comanda não está aberta. Não é possível adicionar itens" });

        if (item.QtdProduto <= 0)
            return BadRequest(new { message = "Quantidade deve ser maior que 0" });

        if (item.PrecoUnitarioPago <= 0)
            return BadRequest(new { message = "Preço deve ser maior que 0" });

        var produto = _context.Produtos.FirstOrDefault(p => p.IdProduto == item.IdProduto);
        if (produto == null)
            return NotFound(new { message = "Produto não encontrado" });

        // Validar estoque
        if (produto.QtdEstoque < item.QtdProduto)
            return BadRequest(new { message = $"Estoque insuficiente. Disponível: {produto.QtdEstoque}" });

        // Se não foi passado preço, usa o preço do produto
        if (item.PrecoUnitarioPago == 0)
            item.PrecoUnitarioPago = produto.PrecoProduto;

        item.IdComanda = id;
        _context.ItensComanda.Add(item);

        // Diminuir estoque
        produto.QtdEstoque -= item.QtdProduto;
        _context.Produtos.Update(produto);

        // Recalcular total da comanda
        comanda.RecalcularTotal();
        _context.Comandas.Update(comanda);

        await _context.SaveChangesAsync();

        return Ok(new { message = "Item adicionado com sucesso", itemId = item.IdItemComanda, novoTotal = comanda.ValorTotal });
    }

    /// <summary>
    /// Fecha a comanda e libera a mesa
    /// </summary>
    [HttpPut("{id}/fechar")]
    public async Task<IActionResult> Close(int id)
    {
        var comanda = _context.Comandas
            .Include(c => c.Mesa)
            .FirstOrDefault(c => c.IdComanda == id);
        if (comanda == null)
            return NotFound(new { message = "Comanda não encontrada" });

        comanda.DataFechada = DateTime.UtcNow;
        comanda.StatusComanda = "FECHADA";

        // Liberar a mesa
        if (comanda.Mesa != null)
        {
            comanda.Mesa.StatusMesa = "DISPONIVEL";
            _context.Mesas.Update(comanda.Mesa);
        }

        _context.Comandas.Update(comanda);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Comanda fechada e mesa liberada com sucesso" });
    }

    /// <summary>
    /// Remove um item da comanda e recalcula o total
    /// </summary>
    [HttpDelete("{id}/itens/{itemId}")]
    public async Task<IActionResult> RemoveItem(int id, int itemId)
    {
        var comanda = _context.Comandas
            .Include(c => c.ItensComanda)
            .FirstOrDefault(c => c.IdComanda == id);
        if (comanda == null)
            return NotFound(new { message = "Comanda não encontrada" });

        if (comanda.StatusComanda != "ABERTA")
            return BadRequest(new { message = "Comanda não está aberta. Não é possível remover itens" });

        var item = comanda.ItensComanda.FirstOrDefault(i => i.IdItemComanda == itemId);
        if (item == null)
            return NotFound(new { message = "Item não encontrado nesta comanda" });

        // Restaurar estoque do produto
        var produto = _context.Produtos.FirstOrDefault(p => p.IdProduto == item.IdProduto);
        if (produto != null)
        {
            produto.QtdEstoque += item.QtdProduto;
            _context.Produtos.Update(produto);
        }

        _context.ItensComanda.Remove(item);

        // Recalcular total da comanda
        comanda.RecalcularTotal();
        _context.Comandas.Update(comanda);

        await _context.SaveChangesAsync();

        return Ok(new { message = "Item removido com sucesso", novoTotal = comanda.ValorTotal });
    }

    /// <summary>
    /// Deleta a comanda e libera a mesa
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var comanda = _context.Comandas
            .Include(c => c.Mesa)
            .FirstOrDefault(c => c.IdComanda == id);
        if (comanda == null)
            return NotFound(new { message = "Comanda não encontrada" });

        // Liberar a mesa
        if (comanda.Mesa != null)
        {
            comanda.Mesa.StatusMesa = "DISPONIVEL";
            _context.Mesas.Update(comanda.Mesa);
        }

        _context.Comandas.Remove(comanda);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Comanda deletada e mesa liberada com sucesso" });
    }
}
