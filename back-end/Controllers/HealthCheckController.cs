using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PIM3.API.DTOs;
using PIM3.API.Services;

namespace PIM3.API.Controllers;

/// <summary>
/// Controller para verificar se a API e o banco de dados estão funcionando
/// Útil para monitoramento e diagnóstico
/// </summary>
[ApiController]
[Route("api/[controller]")]
[AllowAnonymous]
public class HealthCheckController : ControllerBase
{
    private readonly IDatabaseHealthService _databaseHealthService;
    private readonly ILogger<HealthCheckController> _logger;

    public HealthCheckController(
        IDatabaseHealthService databaseHealthService,
        ILogger<HealthCheckController> logger)
    {
        _databaseHealthService = databaseHealthService;
        _logger = logger;
    }

    /// <summary>
    /// Verifica o status da API
    /// GET: api/healthcheck
    /// </summary>
    [HttpGet]
    public IActionResult HealthCheck()
    {
        return Ok(new RespostaPadraoDTO
        {
            Sucesso = true,
            Mensagem = "API está funcionando perfeitamente!",
            Dados = new
            {
                status = "SAUDÁVEL"
            }
        });
    }

    /// <summary>
    /// Verifica se a conexão com o banco de dados está ok
    /// GET: api/healthcheck/database
    /// </summary>
    [HttpGet("database")]
    public async Task<IActionResult> HealthCheckDatabase()
    {
        try
        {
            await _databaseHealthService.CanConnectAsync();

            return Ok(new RespostaPadraoDTO
            {
                Sucesso = true,
                Mensagem = "Banco de dados está conectado!",
                Dados = new
                {
                    status = "CONECTADO",
                    banco = "SQL Server",
                    timestamp = DateTime.UtcNow
                }
            });
        }
        catch (Exception ex)
        {
            var correlationId = HttpContext.TraceIdentifier;
            _logger.LogError(ex, "Database health check failed. CorrelationId: {CorrelationId}", correlationId);

            return StatusCode(503, new RespostaPadraoDTO
            {
                Sucesso = false,
                Mensagem = "Serviço temporariamente indisponível.",
                CodigoErro = "DATABASE_INDISPONIVEL",
                Dados = new { correlationId }
            });
        }
    }

    /// <summary>
    /// Retorna um status genérico da API
    /// GET: api/healthcheck/info
    /// </summary>
    [HttpGet("info")]
    public IActionResult Info()
    {
        return Ok(new RespostaPadraoDTO
        {
            Sucesso = true,
            Mensagem = "Status da API",
            Dados = new { status = "ok" }
        });
    }
}
