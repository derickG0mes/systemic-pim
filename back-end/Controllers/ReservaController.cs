using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PIM3.API.Data;
using PIM3.API.DTOs;
using PIM3.API.Models;
using PIM3.API.Helpers;

namespace PIM3.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReservaController : ControllerBase
{
    private readonly AppDbContext _context;

    public ReservaController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    [Authorize]  // ✅ CRÍTICA: Exigir autenticação para visualizar reservas
    public async Task<IActionResult> ListarReservas()
    {
        var reservas = await _context.Reservas
            .Include(r => r.Cliente)
            .Include(r => r.Mesa)
            .ToListAsync();

        return Ok(new RespostaPadraoDTO { Sucesso = true, Dados = reservas });
    }

    [HttpPost]
    [Authorize]
    public async Task<IActionResult> CriarReserva([FromBody] Reserva reserva)
    {
        // Força a data da reserva enviada a ser considerada com relação a Brasília
        // ou você pode definir que toda nova reserva é validada contra o relógio de Brasília.

        // Verifica se a mesa existe
        var mesa = await _context.Mesas.FindAsync(reserva.IdMesa);
        if (mesa == null) return BadRequest(new RespostaPadraoDTO { Sucesso = false, Mensagem = "Mesa não existe." });

        // Verifica conflitos de horário (ex: margem de 2 horas)
        var conflito = await _context.Reservas.AnyAsync(r =>
            r.IdMesa == reserva.IdMesa &&
            r.DataReserva >= reserva.DataReserva.AddHours(-2) &&
            r.DataReserva <= reserva.DataReserva.AddHours(2) &&
            r.StatusReserva != "CANCELADA");

        if (conflito)
        {
            return BadRequest(new RespostaPadraoDTO { Sucesso = false, Mensagem = "A mesa já está reservada para este horário." });
        }

        _context.Reservas.Add(reserva);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(ListarReservas), new { id = reserva.IdReserva }, new RespostaPadraoDTO { Sucesso = true, Mensagem = "Reserva criada com sucesso!", Dados = reserva });
    }
}
