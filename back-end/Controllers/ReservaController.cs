using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PIM3.API.Data;
using PIM3.API.DTOs;
using PIM3.API.Models;

namespace PIM3.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "employee,admin,owner")]
public class ReservaController : ControllerBase
{
    private readonly AppDbContext _context;

    public ReservaController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> ListarReservas()
    {
        var reservas = await _context.Reservas
            .Include(r => r.Cliente)
            .Include(r => r.Mesa)
            .Select(r => new
            {
                r.IdReserva,
                r.IdCliente,
                r.IdMesa,
                NumeroMesa = r.Mesa != null ? r.Mesa.NumeroMesa : r.IdMesa,
                NomeCliente = r.Cliente != null ? r.Cliente.NomeCliente : "",
                r.DataReserva,
                r.StatusReserva
            })
            .ToListAsync();

        return Ok(new RespostaPadraoDTO { Sucesso = true, Dados = reservas });
    }

    [HttpPost]
    public async Task<IActionResult> CriarReserva([FromBody] CriarReservaDTO dto)
    {
        if (string.IsNullOrWhiteSpace(dto.NomeCliente))
            return BadRequest(new RespostaPadraoDTO { Sucesso = false, Mensagem = "Nome do cliente é obrigatório." });

        var mesa = await _context.Mesas.FirstOrDefaultAsync(m => m.NumeroMesa == dto.NumeroMesa || m.IdMesa == dto.NumeroMesa);
        if (mesa == null)
            return BadRequest(new RespostaPadraoDTO { Sucesso = false, Mensagem = $"Mesa {dto.NumeroMesa} não existe." });

        var cliente = await _context.Clientes.FirstOrDefaultAsync(c => c.NomeCliente == dto.NomeCliente.Trim());
        if (cliente == null)
        {
            cliente = new Cliente { NomeCliente = dto.NomeCliente.Trim() };
            _context.Clientes.Add(cliente);
            await _context.SaveChangesAsync();
        }

        var conflito = await _context.Reservas.AnyAsync(r =>
            r.IdMesa == mesa.IdMesa &&
            r.DataReserva >= dto.DataReserva.AddHours(-2) &&
            r.DataReserva <= dto.DataReserva.AddHours(2) &&
            r.StatusReserva != "CANCELADA");

        if (conflito)
            return BadRequest(new RespostaPadraoDTO { Sucesso = false, Mensagem = "A mesa já está reservada para este horário." });

        var reserva = new Reserva
        {
            IdCliente = cliente.IdCliente,
            IdMesa = mesa.IdMesa,
            DataReserva = dto.DataReserva,
            StatusReserva = "DISPONIVEL"
        };

        _context.Reservas.Add(reserva);
        await _context.SaveChangesAsync();

        try
        {
            LogSistemaHelper.Registrar(_context, "RESERVA", $"Reserva criada: {cliente.NomeCliente} - Mesa {mesa.NumeroMesa}");
            await _context.SaveChangesAsync();
        }
        catch
        {
            /* LOG_SISTEMA ausente não impede a reserva */
        }

        return Ok(new RespostaPadraoDTO { Sucesso = true, Mensagem = "Reserva criada com sucesso!", Dados = reserva });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> CancelarReserva(int id)
    {
        var reserva = await _context.Reservas.FirstOrDefaultAsync(r => r.IdReserva == id);
        if (reserva == null)
            return NotFound(new RespostaPadraoDTO { Sucesso = false, Mensagem = "Reserva não encontrada" });

        if (reserva.StatusReserva == "CANCELADA")
            return BadRequest(new RespostaPadraoDTO { Sucesso = false, Mensagem = "Reserva já está cancelada" });

        reserva.StatusReserva = "CANCELADA";
        _context.Reservas.Update(reserva);
        await _context.SaveChangesAsync();

        try
        {
            LogSistemaHelper.Registrar(_context, "RESERVA", $"Reserva {id} cancelada");
            await _context.SaveChangesAsync();
        }
        catch { /* log não bloqueia */ }

        return Ok(new RespostaPadraoDTO { Sucesso = true, Mensagem = "Reserva cancelada com sucesso" });
    }
}
