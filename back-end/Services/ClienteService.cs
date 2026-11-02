using Microsoft.AspNetCore.Mvc;
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

        _context.Clientes.Add(cliente);
        await _context.SaveChangesAsync();

        return ApiServiceResults.CreatedAtAction("GetById", new { id = cliente.IdCliente }, new RespostaPadraoDTO { Sucesso = true, Mensagem = "Cliente criado com sucesso", Dados = cliente });
    }

    public async Task<IActionResult> Update(int id, Cliente clienteAtualizado)
    {
        var cliente = _context.Clientes.FirstOrDefault(c => c.IdCliente == id);
        if (cliente == null)
            return ApiServiceResults.NotFound(new RespostaPadraoDTO { Sucesso = false, Mensagem = "Cliente não encontrado" });

        cliente.NomeCliente = clienteAtualizado.NomeCliente;
        cliente.TelefoneCliente = clienteAtualizado.TelefoneCliente;
        cliente.Feedback = clienteAtualizado.Feedback;

        _context.Clientes.Update(cliente);
        await _context.SaveChangesAsync();

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
}
