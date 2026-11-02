using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PIM3.API.Controllers;
using PIM3.API.Data;
using PIM3.API.DTOs;
using PIM3.API.Models;

namespace PIM3.API.Services;

public sealed class LogService : ILogService
{
    private readonly AppDbContext _context;

    public LogService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IActionResult> ListarLogsSistema(int pagina, int tamanho, string? filtro)
    {
        var query = _context.LogsSistema.AsQueryable();

        if (!string.IsNullOrEmpty(filtro))
            query = query.Where(l => l.TipoLog.Contains(filtro) || l.DescricaoLog.Contains(filtro));

        var logs = await query
            .OrderByDescending(l => l.DataLog)
            .Skip((pagina - 1) * tamanho)
            .Take(tamanho)
            .ToListAsync();

        var total = await query.CountAsync();

        return ApiServiceResults.Ok(new
        {
            sucesso = true,
            total,
            pagina,
            dados = logs
        });
    }

    public async Task<IActionResult> RegistrarLog(CriarLogDTO logDTO, string usuarioLog)
    {
        if (string.IsNullOrEmpty(logDTO.TipoLog) || string.IsNullOrEmpty(logDTO.DescricaoLog))
            return ApiServiceResults.BadRequest(new RespostaPadraoDTO { Sucesso = false, Mensagem = "Tipo e descrição do log são obrigatórios" });

        var logSistema = new LogSistema
        {
            TipoLog = logDTO.TipoLog,
            DescricaoLog = logDTO.DescricaoLog,
            UsuarioLog = usuarioLog,
            DadoAnterior = logDTO.DadoAnterior,
            DadoNovo = logDTO.DadoNovo,
            DataLog = DateTime.UtcNow
        };

        _context.LogsSistema.Add(logSistema);
        await _context.SaveChangesAsync();

        return ApiServiceResults.Ok(new RespostaPadraoDTO
        {
            Sucesso = true,
            Mensagem = "Log registrado com sucesso!",
            Dados = new { id = logSistema.IdLogSistema }
        });
    }

    public async Task<IActionResult> ListarLogsComanda(int idComanda)
    {
        var logs = await _context.LogsComanda
            .Where(l => l.IdComanda == idComanda)
            .OrderByDescending(l => l.DataLog)
            .ToListAsync();

        return ApiServiceResults.Ok(new { sucesso = true, dados = logs });
    }
}
