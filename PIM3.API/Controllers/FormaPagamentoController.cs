using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PIM3.API.Data;
using PIM3.API.Models;

namespace PIM3.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class FormaPagamentoController : ControllerBase
{
    private readonly AppDbContext _context;

    public FormaPagamentoController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public IActionResult GetAll()
    {
        var formas = _context.FormasPagamento.ToList();
        return Ok(formas);
    }

    [HttpGet("{id}")]
    public IActionResult GetById(int id)
    {
        var forma = _context.FormasPagamento.FirstOrDefault(f => f.IdFormaPagamento == id);
        if (forma == null)
            return NotFound(new { message = "Forma de pagamento não encontrada" });

        return Ok(forma);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] FormaPagamento forma)
    {
        if (string.IsNullOrEmpty(forma.NomeFormaPagamento))
            return BadRequest(new { message = "Nome da forma de pagamento é obrigatório" });

        _context.FormasPagamento.Add(forma);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = forma.IdFormaPagamento }, forma);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] FormaPagamento formaAtualizada)
    {
        var forma = _context.FormasPagamento.FirstOrDefault(f => f.IdFormaPagamento == id);
        if (forma == null)
            return NotFound(new { message = "Forma de pagamento não encontrada" });

        forma.NomeFormaPagamento = formaAtualizada.NomeFormaPagamento;

        _context.FormasPagamento.Update(forma);
        await _context.SaveChangesAsync();

        return Ok(forma);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var forma = _context.FormasPagamento.FirstOrDefault(f => f.IdFormaPagamento == id);
        if (forma == null)
            return NotFound(new { message = "Forma de pagamento não encontrada" });

        _context.FormasPagamento.Remove(forma);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Forma de pagamento deletada com sucesso" });
    }
}
