using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PIM3.API.Data;
using PIM3.API.DTOs;
using PIM3.API.Models;

namespace PIM3.API.Services;

public sealed class ClienteService : IClienteService
{
    private readonly AppDbContext _context;

    public ClienteService(AppDbContext context)
    {
        _context = context;
    }

    public IActionResult GetAll()
    {
        var clientes = _context.Clientes.ToList();
        return ApiServiceResults.Ok(new RespostaPadraoDTO { Sucesso = true, Dados = clientes });
    }

    public IActionResult GetById(int id)
    {
        var cliente = _context.Clientes.FirstOrDefault(c => c.IdCliente == id);
        if (cliente == null)
            return ApiServiceResults.NotFound(new RespostaPadraoDTO { Sucesso = false, Mensagem = "Cliente não encontrado" });

        return ApiServiceResults.Ok(new RespostaPadraoDTO { Sucesso = true, Dados = cliente });
    }

    public async Task<IActionResult> Create(Cliente cliente)
    {
        if (string.IsNullOrEmpty(cliente.NomeCliente))
            return ApiServiceResults.BadRequest(new RespostaPadraoDTO { Sucesso = false, Mensagem = "Nome do cliente é obrigatório" });

        if (HasDuplicatePhone(cliente.TelefoneCliente))
            return DuplicatePhoneResult();

        _context.Clientes.Add(cliente);
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException exception) when (SqlServerExceptionHelper.IsUniqueConstraintViolation(exception))
        {
            return DuplicatePhoneResult();
        }

        return ApiServiceResults.CreatedAtAction("GetById", new { id = cliente.IdCliente }, new RespostaPadraoDTO { Sucesso = true, Mensagem = "Cliente criado com sucesso", Dados = cliente });
    }

    public async Task<IActionResult> Update(int id, Cliente clienteAtualizado)
    {
        var cliente = _context.Clientes.FirstOrDefault(c => c.IdCliente == id);
        if (cliente == null)
            return ApiServiceResults.NotFound(new RespostaPadraoDTO { Sucesso = false, Mensagem = "Cliente não encontrado" });

        if (!string.IsNullOrWhiteSpace(clienteAtualizado.TelefoneCliente)
            && _context.Clientes.Any(c =>
                c.IdCliente != id
                && c.TelefoneCliente == clienteAtualizado.TelefoneCliente))
        {
            return DuplicatePhoneResult();
        }

        cliente.NomeCliente = clienteAtualizado.NomeCliente;
        cliente.TelefoneCliente = clienteAtualizado.TelefoneCliente;
        cliente.Feedback = clienteAtualizado.Feedback;

        _context.Clientes.Update(cliente);
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException exception) when (SqlServerExceptionHelper.IsUniqueConstraintViolation(exception))
        {
            return DuplicatePhoneResult();
        }

        return ApiServiceResults.Ok(new RespostaPadraoDTO { Sucesso = true, Mensagem = "Cliente atualizado", Dados = cliente });
    }

    public async Task<IActionResult> Delete(int id)
    {
        var cliente = _context.Clientes.FirstOrDefault(c => c.IdCliente == id);
        if (cliente == null)
            return ApiServiceResults.NotFound(new RespostaPadraoDTO { Sucesso = false, Mensagem = "Cliente não encontrado" });

        _context.Clientes.Remove(cliente);
        await _context.SaveChangesAsync();

        return ApiServiceResults.Ok(new RespostaPadraoDTO { Sucesso = true, Mensagem = "Cliente deletado com sucesso" });
    }

    private bool HasDuplicatePhone(string? phone) =>
        !string.IsNullOrWhiteSpace(phone)
        && _context.Clientes.Any(cliente => cliente.TelefoneCliente == phone);

    private static IActionResult DuplicatePhoneResult() =>
        ApiServiceResults.Conflict(new RespostaPadraoDTO
        {
            Sucesso = false,
            Mensagem = "Telefone do cliente já cadastrado."
        });
}
