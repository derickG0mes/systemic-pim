using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PIM3.API.Data;
using PIM3.API.DTOs;
using PIM3.API.Models;
using PIM3.API.Services;

namespace PIM3.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "admin,owner")]
public class LogController : ControllerBase
{
    private readonly ILogService _service;

    public LogController(ILogService service)
    {
        _service = service;
    }

    [HttpGet("sistema")]
    public Task<IActionResult> ListarLogsSistema(
        [FromQuery] int pagina = 1,
        [FromQuery] int tamanho = 50,
        [FromQuery] string? filtro = null) =>
        _service.ListarLogsSistema(pagina, tamanho, filtro);

    [HttpPost("registrar")]
    public Task<IActionResult> RegistrarLog([FromBody] CriarLogDTO logDTO)
    {
        var usuarioLog = User.Identity?.Name 
            ?? User.FindFirst(ClaimTypes.Name)?.Value 
            ?? User.FindFirst("cpf")?.Value 
            ?? "usuario_autenticado";

        return _service.RegistrarLog(logDTO, usuarioLog);
    }

    [HttpGet("comanda/{idComanda}")]
    public Task<IActionResult> ListarLogsComanda(int idComanda) =>
        _service.ListarLogsComanda(idComanda);
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
