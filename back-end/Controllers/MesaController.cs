using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PIM3.API.Data;
using PIM3.API.DTOs;
using PIM3.API.Models;

namespace PIM3.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "employee,admin,owner")]
public class MesaController : ControllerBase
{
    private readonly AppDbContext _context;

    public MesaController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public IActionResult GetAll()
    {
        var mesas = _context.Mesas.ToList();
        return Ok(new RespostaPadraoDTO { Sucesso = true, Dados = mesas });
    }

    [HttpGet("{id}")]
    public IActionResult GetById(int id)
    {
        var mesa = _context.Mesas.FirstOrDefault(m => m.IdMesa == id);
        if (mesa == null)
            return NotFound(new RespostaPadraoDTO { Sucesso = false, Mensagem = "Mesa não encontrada" });

        return Ok(new RespostaPadraoDTO { Sucesso = true, Dados = mesa });
    }

    [HttpPost]
    [Authorize(Roles = "admin,owner")]
    public async Task<IActionResult> Create([FromBody] Mesa mesa)
    {
        if (mesa.NumeroMesa <= 0 || mesa.CapacidadeMesa <= 0)
            return BadRequest(new RespostaPadraoDTO { Sucesso = false, Mensagem = "Número e capacidade da mesa devem ser maiores que 0" });

        _context.Mesas.Add(mesa);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = mesa.IdMesa }, new RespostaPadraoDTO { Sucesso = true, Mensagem = "Mesa criada com sucesso", Dados = mesa });
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "admin,owner")]
    public async Task<IActionResult> Update(int id, [FromBody] Mesa mesaAtualizada)
    {
        var mesa = _context.Mesas.FirstOrDefault(m => m.IdMesa == id);
        if (mesa == null)
            return NotFound(new RespostaPadraoDTO { Sucesso = false, Mensagem = "Mesa não encontrada" });
        // Validação rigorosa
        if (mesaAtualizada.NumeroMesa <= 0 || mesaAtualizada.CapacidadeMesa <= 0)
            return BadRequest(new { message = "Número e capacidade da mesa devem ser maiores que 0" });

        // Validar status permitidos
        var statusPermitidos = new[] { "DISPONIVEL", "OCUPADA" };
        if (!statusPermitidos.Contains(mesaAtualizada.StatusMesa))
            return BadRequest(new { message = "Status inválido. Use: DISPONIVEL ou OCUPADA" });

        // Impedir que mude status se houver comanda aberta
        if (mesaAtualizada.StatusMesa != mesa.StatusMesa)
        {
            var temComandaAberta = _context.Comandas
                .Any(c => c.IdMesa == id && c.StatusComanda == "ABERTA");

            if (temComandaAberta && mesaAtualizada.StatusMesa == "DISPONIVEL")
                return BadRequest(new { message = "Não é possível liberar a mesa enquanto houver comanda aberta" });
        }

        mesa.NumeroMesa = mesaAtualizada.NumeroMesa;
        mesa.StatusMesa = mesaAtualizada.StatusMesa;
        mesa.CapacidadeMesa = mesaAtualizada.CapacidadeMesa;

        _context.Mesas.Update(mesa);
        await _context.SaveChangesAsync();

        return Ok(mesa);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "admin,owner")]
    public async Task<IActionResult> Delete(int id)
    {
        var mesa = _context.Mesas.FirstOrDefault(m => m.IdMesa == id);
        if (mesa == null)
            return NotFound(new { message = "Mesa não encontrada" });

        _context.Mesas.Remove(mesa);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Mesa deletada com sucesso" });
    }
}
