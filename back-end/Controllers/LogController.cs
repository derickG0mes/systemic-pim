using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PIM3.API.Data;
using PIM3.API.DTOs;
using PIM3.API.Models;

namespace PIM3.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class LogController : ControllerBase
{
    private readonly AppDbContext _context;

    public LogController(AppDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Lista todos os logs de sistema
    /// GET: api/log/sistema
    /// </summary>
    [HttpGet("sistema")]
    public async Task<IActionResult> ListarLogsSistema(
        [FromQuery] int pagina = 1,
        [FromQuery] int tamanho = 50,
        [FromQuery] string? filtro = null)
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

        return Ok(new
        {
            sucesso = true,
            total,
            pagina,
            dados = logs
        });
    }

    /// <summary>
    /// Registra um log no sistema
    /// POST: api/log/registrar
    /// </summary>
    [HttpPost("registrar")]
    public async Task<IActionResult> RegistrarLog([FromBody] CriarLogDTO logDTO)
    {
        if (string.IsNullOrEmpty(logDTO.TipoLog) || string.IsNullOrEmpty(logDTO.DescricaoLog))
            return BadRequest(new RespostaPadraoDTO { Sucesso = false, Mensagem = "Tipo e descrição do log são obrigatórios" });

        // Extrai o nome ou identificador do usuário autenticado através das claims do token JWT
        var usuarioLog = User.Identity?.Name 
            ?? User.FindFirst(ClaimTypes.Name)?.Value 
            ?? User.FindFirst("cpf")?.Value 
            ?? "usuario_autenticado";

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

        return Ok(new RespostaPadraoDTO
        {
            Sucesso = true,
            Mensagem = "Log registrado com sucesso!",
            Dados = new { id = logSistema.IdLogSistema }
        });
    }

    /// <summary>
    /// Lista logs de comandas específicas
    /// GET: api/log/comanda/{idComanda}
    /// </summary>
    [HttpGet("comanda/{idComanda}")]
    public async Task<IActionResult> ListarLogsComanda(int idComanda)
    {
        var logs = await _context.LogsComanda
            .Where(l => l.IdComanda == idComanda)
            .OrderByDescending(l => l.DataLog)
            .ToListAsync();

        return Ok(new { sucesso = true, dados = logs });
    }
}

public class CriarLogDTO
{
    public string? TipoLog { get; set; }
    public string? DescricaoLog { get; set; }
    public string? UsuarioLog { get; set; }
    public string? DadoAnterior { get; set; }
    public string? DadoNovo { get; set; }
}

public static class LogSistemaHelper
{
    public static void Registrar(AppDbContext context, string tipo, string descricao, string? usuario = "system")
    {
        context.LogsSistema.Add(new LogSistema
        {
            TipoLog = tipo,
            DescricaoLog = descricao,
            UsuarioLog = usuario,
            DataLog = DateTime.UtcNow
        });
    }
}
