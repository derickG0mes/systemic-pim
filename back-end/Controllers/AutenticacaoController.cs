using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PIM3.API.Data;
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
    // Injeção de dependência do banco de dados
    private readonly AppDbContext _context;
    
    // Serviço JWT para gerar tokens
    private readonly JwtService _jwtService;

    public AutenticacaoController(AppDbContext context, JwtService jwtService)
    {
        _context = context;
        _jwtService = jwtService;
    }

    /// <summary>
    /// Endpoint para fazer login
    /// POST: api/autenticacao/login
    /// </summary>
    [HttpPost("login")]
    [Microsoft.AspNetCore.Authorization.AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginDTO loginDTO)
    {
        // Validação básica dos dados de entrada
        if (string.IsNullOrWhiteSpace(loginDTO.Email) || string.IsNullOrWhiteSpace(loginDTO.Senha))
        {
            return BadRequest(new RespostaPadraoDTO
            {
                Sucesso = false,
                Mensagem = "Ops! Email e senha são obrigatórios.",
                CodigoErro = "EMAIL_SENHA_VAZIOS"
            });
        }

        // Buscamos o funcionário no banco de dados PELO EMAIL
        var funcionario = await _context.Funcionarios
            .FirstOrDefaultAsync(f => f.EmailFuncionario == loginDTO.Email);

        // Se não encontrar, retorna erro amigável
        if (funcionario == null)
        {
            return Unauthorized(new RespostaPadraoDTO
            {
                Sucesso = false,
                Mensagem = "Ops! Email ou senha incorretos.",
                CodigoErro = "USUARIO_NAO_ENCONTRADO"
            });
        }

        // Verificamos se o funcionário está bloqueado por tentativas de login falhadas
        if (funcionario.LockedUntil.HasValue && funcionario.LockedUntil > DateTime.UtcNow)
        {
            return Unauthorized(new RespostaPadraoDTO
            {
                Sucesso = false,
                Mensagem = "Ops! Sua conta está temporariamente bloqueada. Tente novamente mais tarde.",
                CodigoErro = "CONTA_BLOQUEADA"
            });
        }

        // Verificamos a senha usando hash
        if (!PasswordHashService.VerifyPassword(loginDTO.Senha, funcionario.PasswordFuncionario))
        {
            // Incrementar tentativas de login falhadas
            funcionario.LoginAttempts++;
            
            // Se ultrapassar 5 tentativas, bloqueia por 30 minutos
            if (funcionario.LoginAttempts >= 5)
            {
                funcionario.LockedUntil = DateTime.UtcNow.AddMinutes(30);
            }

            await _context.SaveChangesAsync();

            return Unauthorized(new RespostaPadraoDTO
            {
                Sucesso = false,
                Mensagem = "Ops! Email ou senha incorretos.",
                CodigoErro = "SENHA_INCORRETA"
            });
        }

        // Reset das tentativas de login (login bem-sucedido)
        funcionario.LoginAttempts = 0;
        funcionario.LockedUntil = null;
        await _context.SaveChangesAsync();

        // Geramos o token JWT
        var token = _jwtService.GenerateToken(funcionario.IdFuncionario, funcionario.NomeFuncionario, funcionario.CpfFuncionario ?? "", funcionario.Role);

        return Ok(new RespostaPadraoDTO
        {
            Sucesso = true,
            Mensagem = "Login realizado com sucesso!",
            Dados = new { token, nomeUsuario = funcionario.NomeFuncionario, role = funcionario.Role }
        });
    }

    /// <summary>
    /// Endpoint para verificar se a autenticação está válida
    /// GET: api/autenticacao/validar
    /// </summary>
    [HttpGet("validar")]
    public IActionResult Validar()
    {
        return Ok(new RespostaPadraoDTO
        {
            Sucesso = true,
            Mensagem = "Token válido!",
            Dados = new { autenticado = true }
        });
    }
}