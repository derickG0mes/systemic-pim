using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PIM3.API.Data;
using PIM3.API.DTOs;

namespace PIM3.API.Services;

public sealed class AutenticacaoService : IAutenticacaoService
{
    private readonly AppDbContext _context;
    private readonly JwtService _jwtService;
    private readonly ILogger<AutenticacaoService> _logger;

    public AutenticacaoService(
        AppDbContext context,
        JwtService jwtService,
        ILogger<AutenticacaoService> logger)
    {
        _context = context;
        _jwtService = jwtService;
        _logger = logger;
    }

    internal static IActionResult InvalidCredentialsResult() =>
        ApiServiceResults.Unauthorized(new RespostaPadraoDTO
        {
            Sucesso = false,
            Mensagem = "Ops! Email ou senha incorretos.",
            CodigoErro = "CREDENCIAIS_INVALIDAS"
        });

    public async Task<IActionResult> Login(LoginDTO loginDTO, HttpResponse response)
    {
        if (string.IsNullOrWhiteSpace(loginDTO.Email) || string.IsNullOrWhiteSpace(loginDTO.Senha))
        {
            return ApiServiceResults.BadRequest(new RespostaPadraoDTO
            {
                Sucesso = false,
                Mensagem = "Ops! Email e senha são obrigatórios.",
                CodigoErro = "EMAIL_SENHA_VAZIOS"
            });
        }

        var funcionario = await _context.Funcionarios
            .FirstOrDefaultAsync(f => f.EmailFuncionario == loginDTO.Email);

        if (funcionario == null)
        {
            PasswordHashService.VerifyDummyPassword(loginDTO.Senha);
            _logger.LogWarning("Login rejected because the account was not found.");
            return InvalidCredentialsResult();
        }

        if (funcionario.LockedUntil.HasValue && funcionario.LockedUntil > DateTime.UtcNow)
        {
            PasswordHashService.VerifyDummyPassword(loginDTO.Senha);
            _logger.LogWarning("Login rejected because the account is locked.");
            return InvalidCredentialsResult();
        }

        if (!PasswordHashService.VerifyPassword(
                loginDTO.Senha,
                funcionario.PasswordFuncionario,
                out var upgradedHash))
        {
            _logger.LogWarning("Login rejected because the password was invalid.");
            funcionario.LoginAttempts++;

            if (funcionario.LoginAttempts >= LoginLockoutPolicy.MaxAttempts)
            {
                funcionario.LockedUntil = DateTime.UtcNow.AddMinutes(LoginLockoutPolicy.DurationMinutes);
            }

            await _context.SaveChangesAsync();

            return InvalidCredentialsResult();
        }

        funcionario.LoginAttempts = 0;
        funcionario.LockedUntil = null;
        if (upgradedHash != null)
            funcionario.PasswordFuncionario = upgradedHash;
        await _context.SaveChangesAsync();

        var token = _jwtService.GenerateToken(funcionario.IdFuncionario, funcionario.NomeFuncionario, funcionario.CpfFuncionario ?? "", funcionario.Role);
        _jwtService.SetAuthCookie(response, token);

        return ApiServiceResults.Ok(new RespostaPadraoDTO
        {
            Sucesso = true,
            Mensagem = "Login realizado com sucesso!",
            Dados = new
            {
                id = funcionario.IdFuncionario,
                nomeUsuario = funcionario.NomeFuncionario,
                role = funcionario.Role
            }
        });
    }
}
