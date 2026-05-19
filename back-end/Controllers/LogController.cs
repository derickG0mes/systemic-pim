using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PIM3.API.Data;
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
    /// Registra um log no sistema (chamado internamente)
    /// POST: api/log/registrar
    /// </summary>
    [HttpPost("registrar")]
    [AllowAnonymous] // Permitir chamadas internas
    public async Task<IActionResult> RegistrarLog([FromBody] CriarLogDTO logDTO)
    {
        if (string.IsNullOrEmpty(logDTO.TipoLog) || string.IsNullOrEmpty(logDTO.DescricaoLog))
            return BadRequest(new { sucesso = false, mensagem = "Tipo e descrição obrigatórios" });

        var logSistema = new LogSistema
        {
            TipoLog = logDTO.TipoLog,
            DescricaoLog = logDTO.DescricaoLog,
            UsuarioLog = logDTO.UsuarioLog,
            DadoAnterior = logDTO.DadoAnterior,
            DadoNovo = logDTO.DadoNovo
        };

        _context.LogsSistema.Add(logSistema);
        await _context.SaveChangesAsync();

        return Ok(new { sucesso = true, id = logSistema.IdLogSistema });
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
    public string? TipoLog { get; set; } // ESTOQUE, USUARIO, PEDIDO, AUDITORIA
    public string? DescricaoLog { get; set; }
    public string? UsuarioLog { get; set; }
    public string? DadoAnterior { get; set; }
    public string? DadoNovo { get; set; }
}
