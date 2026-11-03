using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.RateLimiting;
using PIM3.API.DTOs;
using PIM3.API.Services;

namespace PIM3.API.Controllers;

/// <summary>
/// Controller responsável pela autenticação de funcionários
/// Aqui fazemos login, logout e validação de tokens JWT
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class AutenticacaoController : ControllerBase
{
    private readonly IAutenticacaoService _autenticacaoService;
    private readonly JwtService _jwtService;

    public AutenticacaoController(IAutenticacaoService autenticacaoService, JwtService jwtService)
    {
        _autenticacaoService = autenticacaoService;
        _jwtService = jwtService;
    }

    [HttpGet("csrf")]
    [AllowAnonymous]
    public IActionResult GetCsrfToken([FromServices] IAntiforgery antiforgery)
    {
        var tokens = antiforgery.GetAndStoreTokens(HttpContext);
        return Ok(new { requestToken = tokens.RequestToken });
    }

    [HttpPost("logout")]
    [AllowAnonymous]
    public IActionResult Logout()
    {
        _jwtService.ClearAuthCookie(Response);
        return Ok(new RespostaPadraoDTO
        {
            Sucesso = true,
            Mensagem = "Logout realizado com sucesso."
        });
    }

    /// <summary>
    /// Endpoint para fazer login
    /// POST: api/autenticacao/login
    /// </summary>
    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting("login")]
    public Task<IActionResult> Login([FromBody] LoginDTO loginDTO) =>
        _autenticacaoService.Login(loginDTO, Response);

    /// <summary>
    /// Endpoint para verificar se a autenticação está válida
    /// GET: api/autenticacao/validar
    /// </summary>
    [HttpGet("validar")]
    [Authorize]
    public IActionResult Validar()
    {
        var idClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var nome = User.FindFirstValue(ClaimTypes.Name);
        var role = User.FindFirstValue(ClaimTypes.Role);
        if (!int.TryParse(idClaim, out var id) || string.IsNullOrWhiteSpace(nome) || string.IsNullOrWhiteSpace(role))
        {
            return Unauthorized(new RespostaPadraoDTO
            {
                Sucesso = false,
                Mensagem = "Token inválido."
            });
        }

        return Ok(new RespostaPadraoDTO
        {
            Sucesso = true,
            Mensagem = "Token válido!",
            Dados = new { id, nome, role }
        });
    }
}