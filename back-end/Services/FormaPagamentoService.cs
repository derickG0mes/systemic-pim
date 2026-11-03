using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PIM3.API.Data;
using PIM3.API.Models;

namespace PIM3.API.Services;

public sealed class FormaPagamentoService : IFormaPagamentoService
{
    private readonly AppDbContext _context;

    public FormaPagamentoService(AppDbContext context)
    {
        _context = context;
    }

    public IActionResult GetAll()
    {
        var formas = _context.FormasPagamento.ToList();
        return ApiServiceResults.Ok(new { sucesso = true, dados = formas });
    }

    public IActionResult GetById(int id)
    {
        var forma = _context.FormasPagamento.FirstOrDefault(f => f.IdFormaPagamento == id);
        if (forma == null)
            return ApiServiceResults.NotFound(new { sucesso = false, mensagem = "Forma de pagamento não encontrada" });

        return ApiServiceResults.Ok(new { sucesso = true, dados = forma });
    }

    public async Task<IActionResult> Create(FormaPagamento forma)
    {
        if (string.IsNullOrEmpty(forma.NomeFormaPagamento))
            return ApiServiceResults.BadRequest(new { message = "Nome da forma de pagamento é obrigatório" });

        if (_context.FormasPagamento.Any(f => f.NomeFormaPagamento == forma.NomeFormaPagamento))
            return ApiServiceResults.Conflict(new { sucesso = false, mensagem = "Nome da forma de pagamento já cadastrado." });

        _context.FormasPagamento.Add(forma);
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException exception) when (SqlServerExceptionHelper.IsUniqueConstraintViolation(exception))
        {
            return ApiServiceResults.Conflict(new { sucesso = false, mensagem = "Nome da forma de pagamento já cadastrado." });
        }

        return ApiServiceResults.CreatedAtAction("GetById", new { id = forma.IdFormaPagamento }, forma);
    }

    public async Task<IActionResult> Update(int id, FormaPagamento formaAtualizada)
    {
        var forma = _context.FormasPagamento.FirstOrDefault(f => f.IdFormaPagamento == id);
        if (forma == null)
            return ApiServiceResults.NotFound(new { message = "Forma de pagamento não encontrada" });

        if (_context.FormasPagamento.Any(f =>
                f.IdFormaPagamento != id && f.NomeFormaPagamento == formaAtualizada.NomeFormaPagamento))
        {
            return ApiServiceResults.Conflict(new { sucesso = false, mensagem = "Nome da forma de pagamento já cadastrado." });
        }

        forma.NomeFormaPagamento = formaAtualizada.NomeFormaPagamento;

        _context.FormasPagamento.Update(forma);
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException exception) when (SqlServerExceptionHelper.IsUniqueConstraintViolation(exception))
        {
            return ApiServiceResults.Conflict(new { sucesso = false, mensagem = "Nome da forma de pagamento já cadastrado." });
        }

        return ApiServiceResults.Ok(forma);
    }

    public async Task<IActionResult> Delete(int id)
    {
        var forma = _context.FormasPagamento.FirstOrDefault(f => f.IdFormaPagamento == id);
        if (forma == null)
            return ApiServiceResults.NotFound(new { message = "Forma de pagamento não encontrada" });

        _context.FormasPagamento.Remove(forma);
        await _context.SaveChangesAsync();

        return ApiServiceResults.Ok(new { message = "Forma de pagamento deletada com sucesso" });
    }
}
