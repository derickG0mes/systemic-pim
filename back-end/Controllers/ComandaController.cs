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

        comanda.DataAberta = DateTime.UtcNow;
        comanda.StatusComanda = "ABERTA";

        _context.Comandas.Add(comanda);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = comanda.IdComanda }, comanda);
    }

    /// <summary>
    /// Adiciona um item à comanda
    /// </summary>
    [HttpPost("{id}/itens")]
    public async Task<IActionResult> AddItem(int id, [FromBody] ItemComanda item)
    {
        var comanda = _context.Comandas.FirstOrDefault(c => c.IdComanda == id);
        if (comanda == null)
            return NotFound(new { message = "Comanda não encontrada" });

        if (comanda.StatusComanda != "ABERTA")
            return BadRequest(new { message = "Comanda não está aberta" });

        var produto = _context.Produtos.FirstOrDefault(p => p.IdProduto == item.IdProduto);
        if (produto == null)
            return NotFound(new { message = "Produto não encontrado" });

        item.IdComanda = id;
        _context.ItensComanda.Add(item);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Item adicionado com sucesso", itemId = item.IdItemComanda });
    }

    /// <summary>
    /// Fecha a comanda
    /// </summary>
    [HttpPut("{id}/fechar")]
    public async Task<IActionResult> Close(int id)
    {
        var comanda = _context.Comandas.FirstOrDefault(c => c.IdComanda == id);
        if (comanda == null)
            return NotFound(new { message = "Comanda não encontrada" });

        comanda.DataFechada = DateTime.UtcNow;
        comanda.StatusComanda = "FECHADA";

        _context.Comandas.Update(comanda);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Comanda fechada com sucesso" });
    }

    /// <summary>
    /// Calcula o total da comanda
    /// </summary>
    [HttpGet("{id}/total")]
    public IActionResult GetTotal(int id)
    {
        var comanda = _context.Comandas
            .Include(c => c.ItensComanda)
            .FirstOrDefault(c => c.IdComanda == id);

        if (comanda == null)
            return NotFound(new { message = "Comanda não encontrada" });

        var total = comanda.ItensComanda.Sum(item => item.QtdProduto * item.PrecoUnitarioPago);

        return Ok(new { total = total });
    }

    /// <summary>
    /// Deleta a comanda
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var comanda = _context.Comandas.FirstOrDefault(c => c.IdComanda == id);
        if (comanda == null)
            return NotFound(new { message = "Comanda não encontrada" });

        _context.Comandas.Remove(comanda);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Comanda deletada com sucesso" });
    }
}
