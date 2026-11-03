using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using PIM3.API.Data;
using PIM3.API.DTOs;
using PIM3.API.Models;

namespace PIM3.API.Services;

public sealed class MesaService : IMesaService
{
    private readonly AppDbContext _context;

    public MesaService(AppDbContext context)
    {
        _context = context;
    }

    public IActionResult GetAll(int? pagina, int? tamanho, HttpResponse response)
    {
        if (!ListPagination.TryCreate(pagina, tamanho, out var pagination))
            return ListPagination.InvalidRequest();

        var query = _context.Mesas.AsQueryable();
        if (pagination.IsRequested)
        {
            var totalCount = query.Count();
            pagination.SetTotalCount(response, totalCount);
            query = pagination.Apply(query, mesa => mesa.IdMesa);
        }

        var mesas = query.ToList();
        return ApiServiceResults.Ok(new RespostaPadraoDTO { Sucesso = true, Dados = mesas });
    }

    public IActionResult GetById(int id)
    {
        var mesa = _context.Mesas.FirstOrDefault(m => m.IdMesa == id);
        if (mesa == null)
            return ApiServiceResults.NotFound(new RespostaPadraoDTO { Sucesso = false, Mensagem = "Mesa não encontrada" });

        return ApiServiceResults.Ok(new RespostaPadraoDTO { Sucesso = true, Dados = mesa });
    }

    public async Task<IActionResult> Create(Mesa mesa)
    {
        if (mesa.NumeroMesa <= 0 || mesa.CapacidadeMesa <= 0)
            return ApiServiceResults.BadRequest(new RespostaPadraoDTO { Sucesso = false, Mensagem = "Número e capacidade da mesa devem ser maiores que 0" });

        if (_context.Mesas.Any(existing => existing.NumeroMesa == mesa.NumeroMesa))
            return DuplicateTableNumberResult();

        _context.Mesas.Add(mesa);
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException exception) when (SqlServerExceptionHelper.IsUniqueConstraintViolation(exception))
        {
            return DuplicateTableNumberResult();
        }

        return ApiServiceResults.CreatedAtAction("GetById", new { id = mesa.IdMesa }, new RespostaPadraoDTO { Sucesso = true, Mensagem = "Mesa criada com sucesso", Dados = mesa });
    }

    public async Task<IActionResult> Update(int id, Mesa mesaAtualizada)
    {
        var mesa = _context.Mesas.FirstOrDefault(m => m.IdMesa == id);
        if (mesa == null)
            return ApiServiceResults.NotFound(new RespostaPadraoDTO { Sucesso = false, Mensagem = "Mesa não encontrada" });

        if (_context.Mesas.Any(existing =>
                existing.IdMesa != id
                && existing.NumeroMesa == mesaAtualizada.NumeroMesa))
        {
            return DuplicateTableNumberResult();
        }

        if (mesaAtualizada.NumeroMesa <= 0 || mesaAtualizada.CapacidadeMesa <= 0)
            return ApiServiceResults.BadRequest(new { message = "Número e capacidade da mesa devem ser maiores que 0" });

        var statusPermitidos = new[] { "DISPONIVEL", "OCUPADA" };
        if (!statusPermitidos.Contains(mesaAtualizada.StatusMesa))
            return ApiServiceResults.BadRequest(new { message = "Status inválido. Use: DISPONIVEL ou OCUPADA" });

        if (mesaAtualizada.StatusMesa != mesa.StatusMesa)
        {
            var temComandaAberta = _context.Comandas
                .Any(c => c.IdMesa == id && c.StatusComanda == "ABERTA");

            if (temComandaAberta && mesaAtualizada.StatusMesa == "DISPONIVEL")
                return ApiServiceResults.BadRequest(new { message = "Não é possível liberar a mesa enquanto houver comanda aberta" });
        }

        mesa.NumeroMesa = mesaAtualizada.NumeroMesa;
        mesa.StatusMesa = mesaAtualizada.StatusMesa;
        mesa.CapacidadeMesa = mesaAtualizada.CapacidadeMesa;

        _context.Mesas.Update(mesa);
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException exception) when (SqlServerExceptionHelper.IsUniqueConstraintViolation(exception))
        {
            return DuplicateTableNumberResult();
        }

        return ApiServiceResults.Ok(mesa);
    }

    public async Task<IActionResult> Delete(int id)
    {
        var mesa = _context.Mesas.FirstOrDefault(m => m.IdMesa == id);
        if (mesa == null)
            return ApiServiceResults.NotFound(new { message = "Mesa não encontrada" });

        _context.Mesas.Remove(mesa);
        await _context.SaveChangesAsync();

        return ApiServiceResults.Ok(new { message = "Mesa deletada com sucesso" });
    }

    private static IActionResult DuplicateTableNumberResult() =>
        ApiServiceResults.Conflict(new { message = "Número da mesa já cadastrado." });
}
