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

        var token = _jwtService.GenerateToken(funcionario.IdFuncionario, funcionario.NomeFuncionario, funcionario.CpfFuncionario, funcionario.Role);

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
        var funcionarios = _context.Funcionarios.ToList().Select(f => new FuncionarioDto
        {
            IdFuncionario = f.IdFuncionario,
            NomeFuncionario = f.NomeFuncionario,
            EmailFuncionario = f.EmailFuncionario,
            CpfFuncionario = f.CpfFuncionario,
            TelefoneFuncionario = f.TelefoneFuncionario,
            CargoFuncionario = f.CargoFuncionario ?? "",
            Role = f.Role,
            Perfil = FuncionarioDto.MapearPerfil(f.Role),
            StatusFuncionario = f.StatusFuncionario
        }).ToList();

        return Ok(new RespostaPadraoDTO { Sucesso = true, Dados = funcionarios });
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
            return NotFound(new RespostaPadraoDTO { Sucesso = false, Mensagem = "Funcionário não encontrado" });
        }

        return Ok(new RespostaPadraoDTO
        {
            Sucesso = true,
            Dados = new FuncionarioDto
            {
                IdFuncionario = funcionario.IdFuncionario,
                NomeFuncionario = funcionario.NomeFuncionario,
                EmailFuncionario = funcionario.EmailFuncionario,
                CpfFuncionario = funcionario.CpfFuncionario,
                TelefoneFuncionario = funcionario.TelefoneFuncionario,
                CargoFuncionario = funcionario.CargoFuncionario ?? "",
                Role = funcionario.Role,
                StatusFuncionario = funcionario.StatusFuncionario
            }
        });
    }

    /// <summary>
    /// Cria um novo funcionário
    /// </summary>
    [HttpPost]
    [Authorize(Roles = "admin,owner")]
    public async Task<IActionResult> Create([FromBody] CreateFuncionarioRequest request)
    {
        if (string.IsNullOrEmpty(request.NomeFuncionario) || string.IsNullOrEmpty(request.CpfFuncionario) || string.IsNullOrEmpty(request.Senha))
        {
            return BadRequest(new RespostaPadraoDTO { Sucesso = false, Mensagem = "Nome, CPF e senha são obrigatórios" });
        }

        var roleDesejada = FuncionarioDto.MapearRoleBanco(request.Role);
        if (roleDesejada == "owner" && !User.IsInRole("owner"))
        {
            return StatusCode(403, new RespostaPadraoDTO { Sucesso = false, Mensagem = "Apenas proprietários podem criar usuários com perfil de proprietário." });
        }

        // Verifica se o CPF já existe
        var existing = _context.Funcionarios.FirstOrDefault(f => f.CpfFuncionario == request.CpfFuncionario);
        if (existing != null)
        {
            return BadRequest(new RespostaPadraoDTO { Sucesso = false, Mensagem = "CPF já cadastrado" });
        }

        var funcionario = new Funcionario
        {
            NomeFuncionario = request.NomeFuncionario,
            CpfFuncionario = request.CpfFuncionario,
            TelefoneFuncionario = request.TelefoneFuncionario,
            EmailFuncionario = request.EmailFuncionario,
            CargoFuncionario = request.CargoFuncionario,
            Role = roleDesejada,
            PasswordFuncionario = PasswordHashService.HashPassword(request.Senha),
            StatusFuncionario = "ATIVO"
        };

        _context.Funcionarios.Add(funcionario);
        await _context.SaveChangesAsync();
        LogSistemaHelper.Registrar(_context, "USUARIO", $"Funcionário criado: {funcionario.NomeFuncionario}");
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = funcionario.IdFuncionario }, new RespostaPadraoDTO
        {
            Sucesso = true,
            Mensagem = "Funcionário criado com sucesso",
            Dados = new FuncionarioDto
            {
                IdFuncionario = funcionario.IdFuncionario,
                NomeFuncionario = funcionario.NomeFuncionario,
                EmailFuncionario = funcionario.EmailFuncionario,
                CpfFuncionario = funcionario.CpfFuncionario,
                TelefoneFuncionario = funcionario.TelefoneFuncionario,
                Role = funcionario.Role,
                StatusFuncionario = funcionario.StatusFuncionario
            }
        });
    }

    /// <summary>
    /// Atualiza um funcionário
    /// </summary>
    [HttpPut("{id}")]
    [Authorize(Roles = "admin,owner")]
    public async Task<IActionResult> Update(int id, [FromBody] CreateFuncionarioRequest request)
    {
        var funcionario = _context.Funcionarios.FirstOrDefault(f => f.IdFuncionario == id);

        if (funcionario == null)
        {
            return NotFound(new RespostaPadraoDTO { Sucesso = false, Mensagem = "Funcionário não encontrado" });
        }

        if (!string.IsNullOrEmpty(request.Role))
        {
            var roleDesejada = FuncionarioDto.MapearRoleBanco(request.Role);
            if (roleDesejada == "owner" && funcionario.Role != "owner" && !User.IsInRole("owner"))
            {
                return StatusCode(403, new RespostaPadraoDTO { Sucesso = false, Mensagem = "Apenas proprietários podem promover usuários ao perfil de proprietário." });
            }
            funcionario.Role = roleDesejada;
        }

        funcionario.NomeFuncionario = request.NomeFuncionario;
        funcionario.TelefoneFuncionario = request.TelefoneFuncionario;
        if (!string.IsNullOrEmpty(request.EmailFuncionario))
            funcionario.EmailFuncionario = request.EmailFuncionario;
        if (!string.IsNullOrEmpty(request.CargoFuncionario))
            funcionario.CargoFuncionario = request.CargoFuncionario;

        if (!string.IsNullOrEmpty(request.Senha))
        {
            funcionario.PasswordFuncionario = PasswordHashService.HashPassword(request.Senha);
        }

        _context.Funcionarios.Update(funcionario);
        await _context.SaveChangesAsync();

        return Ok(new RespostaPadraoDTO
        {
            Sucesso = true,
            Mensagem = "Funcionário atualizado com sucesso",
            Dados = new FuncionarioDto
            {
                IdFuncionario = funcionario.IdFuncionario,
                NomeFuncionario = funcionario.NomeFuncionario,
                EmailFuncionario = funcionario.EmailFuncionario,
                CpfFuncionario = funcionario.CpfFuncionario,
                TelefoneFuncionario = funcionario.TelefoneFuncionario,
                Role = funcionario.Role,
                StatusFuncionario = funcionario.StatusFuncionario
            }
        });
    }

    /// <summary>
    /// Deleta um funcionário (muda status para INATIVO)
    /// </summary>
    [HttpDelete("{id}")]
    [Authorize(Roles = "admin,owner")]
    public async Task<IActionResult> Delete(int id)
    {
        var funcionario = _context.Funcionarios.FirstOrDefault(f => f.IdFuncionario == id);

        if (funcionario == null)
        {
            return NotFound(new RespostaPadraoDTO { Sucesso = false, Mensagem = "Funcionário não encontrado" });
        }

        if (funcionario.Role == "owner" && !User.IsInRole("owner"))
        {
            return StatusCode(403, new RespostaPadraoDTO { Sucesso = false, Mensagem = "Apenas proprietários podem inativar a conta de outro proprietário." });
        }

        funcionario.StatusFuncionario = "INATIVO";
        _context.Funcionarios.Update(funcionario);
        await _context.SaveChangesAsync();

        return Ok(new RespostaPadraoDTO { Sucesso = true, Mensagem = "Funcionário inativado com sucesso" });
    }
}
