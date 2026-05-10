using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PIM3.API.Data;
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

        return Ok(comandas);
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
            return NotFound(new { message = "Comanda não encontrada" });

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
