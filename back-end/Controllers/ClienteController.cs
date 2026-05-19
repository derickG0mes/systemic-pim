using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PIM3.API.Data;
using PIM3.API.Models;

namespace PIM3.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ClienteController : ControllerBase
{
    private readonly AppDbContext _context;

    public ClienteController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public IActionResult GetAll()
    {
        var clientes = _context.Clientes.ToList();
        return Ok(new RespostaPadraoDTO { Sucesso = true, Dados = clientes });  // ✅ PADRONIZADO
    }

    [HttpGet("{id}")]
    public IActionResult GetById(int id)
    {
        var cliente = _context.Clientes.FirstOrDefault(c => c.IdCliente == id);
        if (cliente == null)
            return NotFound(new RespostaPadraoDTO { Sucesso = false, Mensagem = "Cliente não encontrado" });

        return Ok(new RespostaPadraoDTO { Sucesso = true, Dados = cliente });  // ✅ PADRONIZADO
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Cliente cliente)
    {
        if (string.IsNullOrEmpty(cliente.NomeCliente))
            return BadRequest(new RespostaPadraoDTO { Sucesso = false, Mensagem = "Nome do cliente é obrigatório" });

        _context.Clientes.Add(cliente);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = cliente.IdCliente }, new RespostaPadraoDTO { Sucesso = true, Mensagem = "Cliente criado com sucesso", Dados = cliente });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] Cliente clienteAtualizado)
    {
        var cliente = _context.Clientes.FirstOrDefault(c => c.IdCliente == id);
        if (cliente == null)
            return NotFound(new RespostaPadraoDTO { Sucesso = false, Mensagem = "Cliente não encontrado" });
        cliente.NomeCliente = clienteAtualizado.NomeCliente;
        cliente.TelefoneCliente = clienteAtualizado.TelefoneCliente;
        cliente.Feedback = clienteAtualizado.Feedback;

        _context.Clientes.Update(cliente);
        await _context.SaveChangesAsync();

        return Ok(new RespostaPadraoDTO { Sucesso = true, Mensagem = "Cliente atualizado", Dados = cliente });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var cliente = _context.Clientes.FirstOrDefault(c => c.IdCliente == id);
        if (cliente == null)
            return NotFound(new RespostaPadraoDTO { Sucesso = false, Mensagem = "Cliente não encontrado" });

        _context.Clientes.Remove(cliente);
        await _context.SaveChangesAsync();

        return Ok(new RespostaPadraoDTO { Sucesso = true, Mensagem = "Cliente deletado com sucesso" });
    }
}
