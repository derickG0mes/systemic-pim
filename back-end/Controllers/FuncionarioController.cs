using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PIM3.API.Data;
using PIM3.API.DTOs;
using PIM3.API.Models;
using PIM3.API.Services;

namespace PIM3.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FuncionarioController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly JwtService _jwtService;

    // Constantes para bloqueio
    private const int MAX_LOGIN_ATTEMPTS = 5;
    private const int LOCK_DURATION_MINUTES = 15;

    public FuncionarioController(AppDbContext context, JwtService jwtService)
    {
        _context = context;
        _jwtService = jwtService;
    }

    /// <summary>
    /// Login do funcionário
    /// Bloqueia a conta por 15 minutos após 5 tentativas falhadas
    /// </summary>
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        if (string.IsNullOrEmpty(request.CpfFuncionario) || string.IsNullOrEmpty(request.Senha))
        {
            return BadRequest(new { message = "CPF e senha são obrigatórios" });
        }

        var funcionario = _context.Funcionarios.FirstOrDefault(f => f.CpfFuncionario == request.CpfFuncionario);

        if (funcionario == null)
        {
            return Unauthorized(new { message = "CPF ou senha inválidos" });
        }

        // Verifica se a conta está bloqueada
        if (funcionario.LockedUntil.HasValue && DateTime.UtcNow < funcionario.LockedUntil)
        {
            var minutosRestantes = (int)(funcionario.LockedUntil.Value - DateTime.UtcNow).TotalMinutes;
            return Unauthorized(new { message = $"Conta bloqueada. Tente novamente em {minutosRestantes} minutos" });
        }

        // Reseta o bloqueio se o tempo expirou
        if (funcionario.LockedUntil.HasValue && DateTime.UtcNow >= funcionario.LockedUntil)
        {
            funcionario.LoginAttempts = 0;
            funcionario.LockedUntil = null;
        }

        // Verifica a senha
        if (!PasswordHashService.VerifyPassword(request.Senha, funcionario.PasswordFuncionario))
        {
            funcionario.LoginAttempts++;

            // Bloqueia a conta após 5 tentativas falhadas
            if (funcionario.LoginAttempts >= MAX_LOGIN_ATTEMPTS)
            {
                funcionario.LockedUntil = DateTime.UtcNow.AddMinutes(LOCK_DURATION_MINUTES);
                _context.SaveChanges();
                return Unauthorized(new { message = "Conta bloqueada por 15 minutos devido a múltiplas tentativas falhadas" });
            }

            _context.SaveChanges();
            var tentativasRestantes = MAX_LOGIN_ATTEMPTS - funcionario.LoginAttempts;
            return Unauthorized(new { message = $"CPF ou senha inválidos. Tentativas restantes: {tentativasRestantes}" });
        }

        // Login bem-sucedido - reseta tentativas
        funcionario.LoginAttempts = 0;
        funcionario.LockedUntil = null;
        _context.SaveChanges();

        var token = _jwtService.GenerateToken(funcionario.IdFuncionario, funcionario.NomeFuncionario, funcionario.CpfFuncionario);

        return Ok(new LoginResponse
        {
            IdFuncionario = funcionario.IdFuncionario,
            NomeFuncionario = funcionario.NomeFuncionario,
            Token = token
        });
    }

    /// <summary>
    /// Retorna todos os funcionários (sem senhas)
    /// Requer autenticação
    /// </summary>
    [HttpGet]
    [Authorize]
    public IActionResult GetAll()
    {
        var funcionarios = _context.Funcionarios
            .Select(f => new FuncionarioDto
            {
                IdFuncionario = f.IdFuncionario,
                NomeFuncionario = f.NomeFuncionario,
                CpfFuncionario = f.CpfFuncionario,
                TelefoneFuncionario = f.TelefoneFuncionario,
                StatusFuncionario = f.StatusFuncionario
            })
            .ToList();

        return Ok(funcionarios);
    }

    /// <summary>
    /// Retorna um funcionário específico
    /// </summary>
    [HttpGet("{id}")]
    [Authorize]
    public IActionResult GetById(int id)
    {
        var funcionario = _context.Funcionarios.FirstOrDefault(f => f.IdFuncionario == id);

        if (funcionario == null)
        {
            return NotFound(new { message = "Funcionário não encontrado" });
        }

        return Ok(new FuncionarioDto
        {
            IdFuncionario = funcionario.IdFuncionario,
            NomeFuncionario = funcionario.NomeFuncionario,
            CpfFuncionario = funcionario.CpfFuncionario,
            TelefoneFuncionario = funcionario.TelefoneFuncionario,
            StatusFuncionario = funcionario.StatusFuncionario
        });
    }

    /// <summary>
    /// Cria um novo funcionário
    /// </summary>
    [HttpPost]
    [Authorize]
    public async Task<IActionResult> Create([FromBody] CreateFuncionarioRequest request)
    {
        if (string.IsNullOrEmpty(request.NomeFuncionario) || string.IsNullOrEmpty(request.CpfFuncionario) || string.IsNullOrEmpty(request.Senha))
        {
            return BadRequest(new { message = "Nome, CPF e senha são obrigatórios" });
        }

        // Verifica se o CPF já existe
        var existing = _context.Funcionarios.FirstOrDefault(f => f.CpfFuncionario == request.CpfFuncionario);
        if (existing != null)
        {
            return BadRequest(new { message = "CPF já cadastrado" });
        }

        var funcionario = new Funcionario
        {
            NomeFuncionario = request.NomeFuncionario,
            CpfFuncionario = request.CpfFuncionario,
            TelefoneFuncionario = request.TelefoneFuncionario,
            EmailFuncionario = request.EmailFuncionario,
            CargoFuncionario = request.CargoFuncionario,
            Role = request.Role ?? "employee",
            PasswordFuncionario = PasswordHashService.HashPassword(request.Senha),
            StatusFuncionario = "ATIVO"
        };

        _context.Funcionarios.Add(funcionario);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = funcionario.IdFuncionario }, new FuncionarioDto
        {
            IdFuncionario = funcionario.IdFuncionario,
            NomeFuncionario = funcionario.NomeFuncionario,
            CpfFuncionario = funcionario.CpfFuncionario,
            TelefoneFuncionario = funcionario.TelefoneFuncionario,
            StatusFuncionario = funcionario.StatusFuncionario
        });
    }

    /// <summary>
    /// Atualiza um funcionário
    /// </summary>
    [HttpPut("{id}")]
    [Authorize]
    public async Task<IActionResult> Update(int id, [FromBody] CreateFuncionarioRequest request)
    {
        var funcionario = _context.Funcionarios.FirstOrDefault(f => f.IdFuncionario == id);

        if (funcionario == null)
        {
            return NotFound(new { message = "Funcionário não encontrado" });
        }

        funcionario.NomeFuncionario = request.NomeFuncionario;
        funcionario.TelefoneFuncionario = request.TelefoneFuncionario;

        if (!string.IsNullOrEmpty(request.Senha))
        {
            funcionario.PasswordFuncionario = PasswordHashService.HashPassword(request.Senha);
        }

        _context.Funcionarios.Update(funcionario);
        await _context.SaveChangesAsync();

        return Ok(new FuncionarioDto
        {
            IdFuncionario = funcionario.IdFuncionario,
            NomeFuncionario = funcionario.NomeFuncionario,
            CpfFuncionario = funcionario.CpfFuncionario,
            TelefoneFuncionario = funcionario.TelefoneFuncionario,
            StatusFuncionario = funcionario.StatusFuncionario
        });
    }

    /// <summary>
    /// Deleta um funcionário (muda status para INATIVO)
    /// </summary>
    [HttpDelete("{id}")]
    [Authorize]
    public async Task<IActionResult> Delete(int id)
    {
        var funcionario = _context.Funcionarios.FirstOrDefault(f => f.IdFuncionario == id);

        if (funcionario == null)
        {
            return NotFound(new { message = "Funcionário não encontrado" });
        }

        funcionario.StatusFuncionario = "INATIVO";
        _context.Funcionarios.Update(funcionario);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Funcionário deletado com sucesso" });
    }
}
