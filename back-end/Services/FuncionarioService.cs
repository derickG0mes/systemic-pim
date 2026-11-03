using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PIM3.API.Controllers;
using PIM3.API.Data;
using PIM3.API.DTOs;
using PIM3.API.Models;

namespace PIM3.API.Services;

public sealed class FuncionarioService : IFuncionarioService
{
    private readonly AppDbContext _context;
    private readonly JwtService _jwtService;

    public FuncionarioService(AppDbContext context, JwtService jwtService)
    {
        _context = context;
        _jwtService = jwtService;
    }

    public async Task<IActionResult> Login(LoginRequest request, HttpResponse response)
    {
        if (string.IsNullOrEmpty(request.CpfFuncionario) || string.IsNullOrEmpty(request.Senha))
        {
            return ApiServiceResults.BadRequest(new { message = "CPF e senha são obrigatórios" });
        }

        var funcionario = _context.Funcionarios.FirstOrDefault(f => f.CpfFuncionario == request.CpfFuncionario);

        if (funcionario == null)
        {
            return ApiServiceResults.Unauthorized(new { message = "CPF ou senha inválidos" });
        }

        if (funcionario.LockedUntil.HasValue && DateTime.UtcNow < funcionario.LockedUntil)
        {
            var minutosRestantes = (int)(funcionario.LockedUntil.Value - DateTime.UtcNow).TotalMinutes;
            return ApiServiceResults.Unauthorized(new { message = $"Conta bloqueada. Tente novamente em {minutosRestantes} minutos" });
        }

        if (funcionario.LockedUntil.HasValue && DateTime.UtcNow >= funcionario.LockedUntil)
        {
            funcionario.LoginAttempts = 0;
            funcionario.LockedUntil = null;
        }

        if (!PasswordHashService.VerifyPassword(
                request.Senha,
                funcionario.PasswordFuncionario,
                out var upgradedHash))
        {
            funcionario.LoginAttempts++;

            if (funcionario.LoginAttempts >= LoginLockoutPolicy.MaxAttempts)
            {
                funcionario.LockedUntil = DateTime.UtcNow.AddMinutes(LoginLockoutPolicy.DurationMinutes);
                await _context.SaveChangesAsync();
                return ApiServiceResults.Unauthorized(new { message = "Conta bloqueada por 15 minutos devido a múltiplas tentativas falhadas" });
            }

            await _context.SaveChangesAsync();
            var tentativasRestantes = LoginLockoutPolicy.MaxAttempts - funcionario.LoginAttempts;
            return ApiServiceResults.Unauthorized(new { message = $"CPF ou senha inválidos. Tentativas restantes: {tentativasRestantes}" });
        }

        funcionario.LoginAttempts = 0;
        funcionario.LockedUntil = null;
        if (upgradedHash != null)
            funcionario.PasswordFuncionario = upgradedHash;
        await _context.SaveChangesAsync();

        var token = _jwtService.GenerateToken(funcionario.IdFuncionario, funcionario.NomeFuncionario, funcionario.CpfFuncionario, funcionario.Role);
        _jwtService.SetAuthCookie(response, token);

        return ApiServiceResults.Ok(new LoginResponse
        {
            IdFuncionario = funcionario.IdFuncionario,
            NomeFuncionario = funcionario.NomeFuncionario
        });
    }

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

        return ApiServiceResults.Ok(new RespostaPadraoDTO { Sucesso = true, Dados = funcionarios });
    }

    public IActionResult GetById(int id)
    {
        var funcionario = _context.Funcionarios.FirstOrDefault(f => f.IdFuncionario == id);

        if (funcionario == null)
        {
            return ApiServiceResults.NotFound(new RespostaPadraoDTO { Sucesso = false, Mensagem = "Funcionário não encontrado" });
        }

        return ApiServiceResults.Ok(new RespostaPadraoDTO
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

    public async Task<IActionResult> Create(CreateFuncionarioRequest request, ClaimsPrincipal user)
    {
        if (string.IsNullOrEmpty(request.NomeFuncionario) || string.IsNullOrEmpty(request.CpfFuncionario) || string.IsNullOrEmpty(request.Senha))
        {
            return ApiServiceResults.BadRequest(new RespostaPadraoDTO { Sucesso = false, Mensagem = "Nome, CPF e senha são obrigatórios" });
        }

        var roleDesejada = FuncionarioDto.MapearRoleBanco(request.Role);
        if (roleDesejada == "owner" && !user.IsInRole("owner"))
        {
            return ApiServiceResults.StatusCode(403, new RespostaPadraoDTO { Sucesso = false, Mensagem = "Apenas proprietários podem criar usuários com perfil de proprietário." });
        }

        var existing = _context.Funcionarios.FirstOrDefault(f => f.CpfFuncionario == request.CpfFuncionario);
        if (existing != null)
        {
            return ApiServiceResults.BadRequest(new RespostaPadraoDTO { Sucesso = false, Mensagem = "CPF já cadastrado" });
        }

        if (_context.Funcionarios.Any(f => f.EmailFuncionario == request.EmailFuncionario))
            return ApiServiceResults.Conflict(new RespostaPadraoDTO { Sucesso = false, Mensagem = "E-mail já cadastrado." });

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
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException exception) when (SqlServerExceptionHelper.IsUniqueConstraintViolation(exception))
        {
            return ApiServiceResults.Conflict(new RespostaPadraoDTO { Sucesso = false, Mensagem = "CPF ou e-mail já cadastrado." });
        }

        LogSistemaHelper.Registrar(_context, "USUARIO", $"Funcionário criado: {funcionario.NomeFuncionario}");
        await _context.SaveChangesAsync();

        return ApiServiceResults.CreatedAtAction("GetById", new { id = funcionario.IdFuncionario }, new RespostaPadraoDTO
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

    public async Task<IActionResult> Update(int id, CreateFuncionarioRequest request, ClaimsPrincipal user)
    {
        var funcionario = _context.Funcionarios.FirstOrDefault(f => f.IdFuncionario == id);

        if (funcionario == null)
        {
            return ApiServiceResults.NotFound(new RespostaPadraoDTO { Sucesso = false, Mensagem = "Funcionário não encontrado" });
        }

        if (!string.IsNullOrEmpty(request.Role))
        {
            var roleDesejada = FuncionarioDto.MapearRoleBanco(request.Role);
            if (roleDesejada == "owner" && funcionario.Role != "owner" && !user.IsInRole("owner"))
            {
                return ApiServiceResults.StatusCode(403, new RespostaPadraoDTO { Sucesso = false, Mensagem = "Apenas proprietários podem promover usuários ao perfil de proprietário." });
            }
            funcionario.Role = roleDesejada;
        }

        funcionario.NomeFuncionario = request.NomeFuncionario;
        funcionario.TelefoneFuncionario = request.TelefoneFuncionario;
        if (!string.IsNullOrEmpty(request.EmailFuncionario))
        {
            if (_context.Funcionarios.Any(f =>
                    f.IdFuncionario != id && f.EmailFuncionario == request.EmailFuncionario))
            {
                return ApiServiceResults.Conflict(new RespostaPadraoDTO { Sucesso = false, Mensagem = "E-mail já cadastrado." });
            }

            funcionario.EmailFuncionario = request.EmailFuncionario;
        }
        if (!string.IsNullOrEmpty(request.CargoFuncionario))
            funcionario.CargoFuncionario = request.CargoFuncionario;

        if (!string.IsNullOrEmpty(request.Senha))
        {
            funcionario.PasswordFuncionario = PasswordHashService.HashPassword(request.Senha);
        }

        _context.Funcionarios.Update(funcionario);
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException exception) when (SqlServerExceptionHelper.IsUniqueConstraintViolation(exception))
        {
            return ApiServiceResults.Conflict(new RespostaPadraoDTO { Sucesso = false, Mensagem = "CPF ou e-mail já cadastrado." });
        }

        return ApiServiceResults.Ok(new RespostaPadraoDTO
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

    public async Task<IActionResult> Delete(int id, ClaimsPrincipal user)
    {
        var funcionario = _context.Funcionarios.FirstOrDefault(f => f.IdFuncionario == id);

        if (funcionario == null)
        {
            return ApiServiceResults.NotFound(new RespostaPadraoDTO { Sucesso = false, Mensagem = "Funcionário não encontrado" });
        }

        if (funcionario.Role == "owner" && !user.IsInRole("owner"))
        {
            return ApiServiceResults.StatusCode(403, new RespostaPadraoDTO { Sucesso = false, Mensagem = "Apenas proprietários podem inativar a conta de outro proprietário." });
        }

        funcionario.StatusFuncionario = "INATIVO";
        _context.Funcionarios.Update(funcionario);
        await _context.SaveChangesAsync();

        return ApiServiceResults.Ok(new RespostaPadraoDTO { Sucesso = true, Mensagem = "Funcionário inativado com sucesso" });
    }
}
