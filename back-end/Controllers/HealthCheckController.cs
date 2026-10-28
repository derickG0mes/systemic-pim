using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PIM3.API.Data;
using PIM3.API.DTOs;

namespace PIM3.API.Controllers;

/// <summary>
/// Controller para verificar se a API e o banco de dados estão funcionando
/// Útil para monitoramento e diagnóstico
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class HealthCheckController : ControllerBase
{
    // Injeção de dependência do banco de dados
    private readonly AppDbContext _context;
    private readonly ILogger<HealthCheckController> _logger;

    public HealthCheckController(AppDbContext context, ILogger<HealthCheckController> logger)
    {
        _context = context;
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
            Mensagem = "API está funcionando perfeitamente! 🚀",
            Dados = new
            {
                status = "SAUDÁVEL",
                timestamp = DateTime.UtcNow,
                versao = "1.0.0"
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
            // Tentamos fazer uma conexão simples com o banco
            await _context.Database.ExecuteSqlRawAsync("SELECT 1");

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
            _logger.LogError(ex, "Database health check failed");

            return StatusCode(503, new RespostaPadraoDTO
            {
                Sucesso = false,
                Mensagem = "Ops! O banco de dados não está acessível.",
                CodigoErro = "DATABASE_INDISPONIVEL",
                Dados = new { erro = ex.Message }
            });
        }
    }

    /// <summary>
    /// Retorna informações sobre a API
    /// GET: api/healthcheck/info
    /// </summary>
    [HttpGet("info")]
    public IActionResult Info()
    {
        return Ok(new RespostaPadraoDTO
        {
            Sucesso = true,
            Mensagem = "Informações da API",
            Dados = new
            {
                nome = "Systemic API - PIM IV",
                descricao = "API para gerenciamento de restaurante/bar",
                versao = "2.0.0",
                ambiente = "Desenvolvimento",
                desenvolvedor = "Turma de Estudantes",
                urlBase = "http://localhost:5000"
            }
        });
    }
}
