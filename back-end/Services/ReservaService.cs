using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using PIM3.API.Controllers;
using PIM3.API.Data;
using PIM3.API.DTOs;
using PIM3.API.Models;

namespace PIM3.API.Services;

public sealed class ReservaService : IReservaService
{
    private readonly AppDbContext _context;
    private readonly ILogger<ReservaService> _logger;
    private readonly INotificationService _notifications;

    public ReservaService(AppDbContext context, ILogger<ReservaService> logger, INotificationService notifications)
    {
        _context = context;
        _logger = logger;
        _notifications = notifications;
    }

    public async Task<IActionResult> ListarReservas(int? pagina, int? tamanho, HttpResponse response)
    {
        if (!ListPagination.TryCreate(pagina, tamanho, out var pagination))
            return ListPagination.InvalidRequest();

        IQueryable<Reserva> query = _context.Reservas
            .Include(r => r.Cliente)
            .Include(r => r.Mesa);

        if (pagination.IsRequested)
        {
            var totalCount = await query.CountAsync();
            pagination.SetTotalCount(response, totalCount);
            query = pagination.Apply(query, reserva => reserva.IdReserva);
        }

        var reservas = await query
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

        return ApiServiceResults.Ok(new RespostaPadraoDTO { Sucesso = true, Dados = reservas });
    }

    public async Task<IActionResult> CriarReserva(CriarReservaDTO dto)
    {
        if (string.IsNullOrWhiteSpace(dto.NomeCliente))
            return ApiServiceResults.BadRequest(new RespostaPadraoDTO { Sucesso = false, Mensagem = "Nome do cliente é obrigatório." });

        if (dto.DataReserva <= DateTime.UtcNow)
            return ApiServiceResults.BadRequest(new RespostaPadraoDTO { Sucesso = false, Mensagem = "A data da reserva deve ser futura." });

        var mesa = await _context.Mesas.FirstOrDefaultAsync(m => m.NumeroMesa == dto.NumeroMesa || m.IdMesa == dto.NumeroMesa);
        if (mesa == null)
            return ApiServiceResults.BadRequest(new RespostaPadraoDTO { Sucesso = false, Mensagem = $"Mesa {dto.NumeroMesa} não existe." });

        var conflito = await _context.Reservas.AnyAsync(r =>
            r.IdMesa == mesa.IdMesa &&
            r.DataReserva >= dto.DataReserva.AddHours(-2) &&
            r.DataReserva <= dto.DataReserva.AddHours(2) &&
            r.StatusReserva != "CANCELADA");

        if (conflito)
            return ApiServiceResults.BadRequest(new RespostaPadraoDTO { Sucesso = false, Mensagem = "A mesa já está reservada para este horário." });

        var cliente = await _context.Clientes.FirstOrDefaultAsync(c => c.NomeCliente == dto.NomeCliente.Trim());
        if (cliente == null)
        {
            cliente = new Cliente { NomeCliente = dto.NomeCliente.Trim() };
            _context.Clientes.Add(cliente);
            await _context.SaveChangesAsync();
        }

        var reserva = new Reserva
        {
            IdCliente = cliente.IdCliente,
            IdMesa = mesa.IdMesa,
            DataReserva = dto.DataReserva,
            StatusReserva = "DISPONIVEL"
        };

        _context.Reservas.Add(reserva);
        await _context.SaveChangesAsync();
        await _notifications.NotifyAsync(
            "reserva_criada",
            "Nova reserva",
            $"{cliente.NomeCliente} · Mesa {mesa.NumeroMesa} · {reserva.DataReserva:dd/MM HH:mm}",
            "/reservations",
            ["employee", "admin", "owner"]);

        try
        {
            LogSistemaHelper.Registrar(_context, "RESERVA", $"Reserva criada: {cliente.NomeCliente} - Mesa {mesa.NumeroMesa}");
            await _context.SaveChangesAsync();
        }
        catch (Exception exception)
        {
            _logger.LogError(
                exception,
                "Falha ao registrar log da reserva {ReservationId} na mesa {TableNumber}.",
                reserva.IdReserva,
                mesa.NumeroMesa);
        }

        return ApiServiceResults.Ok(new RespostaPadraoDTO { Sucesso = true, Mensagem = "Reserva criada com sucesso!", Dados = reserva });
    }

    public async Task<IActionResult> CancelarReserva(int id)
    {
        var reserva = await _context.Reservas.FirstOrDefaultAsync(r => r.IdReserva == id);
        if (reserva == null)
            return ApiServiceResults.NotFound(new RespostaPadraoDTO { Sucesso = false, Mensagem = "Reserva não encontrada" });

        if (reserva.StatusReserva == "CANCELADA")
            return ApiServiceResults.BadRequest(new RespostaPadraoDTO { Sucesso = false, Mensagem = "Reserva já está cancelada" });

        reserva.StatusReserva = "CANCELADA";
        _context.Reservas.Update(reserva);
        await _context.SaveChangesAsync();

        try
        {
            LogSistemaHelper.Registrar(_context, "RESERVA", $"Reserva {id} cancelada");
            await _context.SaveChangesAsync();
        }
        catch (Exception exception)
        {
            _logger.LogError(
                exception,
                "Falha ao registrar log de cancelamento da reserva {ReservationId}.",
                id);
        }

        await _notifications.NotifyAsync(
            "reserva_cancelada",
            "Reserva cancelada",
            $"A reserva #{reserva.IdReserva} foi cancelada.",
            "/reservations",
            ["employee", "admin", "owner"]);

        return ApiServiceResults.Ok(new RespostaPadraoDTO { Sucesso = true, Mensagem = "Reserva cancelada com sucesso" });
    }
}
