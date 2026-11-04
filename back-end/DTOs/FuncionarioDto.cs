using System.ComponentModel.DataAnnotations;

namespace PIM3.API.DTOs;

// DTO para Login
public class LoginRequest
{
    public string CpfFuncionario { get; set; } = string.Empty;
    public string Senha { get; set; } = string.Empty;
}

public class LoginResponse
{
    public int IdFuncionario { get; set; }
    public string NomeFuncionario { get; set; } = string.Empty;
}

// DTO para Funcionário (sem senha)
public class FuncionarioDto
{
    public int IdFuncionario { get; set; }
    public string NomeFuncionario { get; set; } = string.Empty;
    public string EmailFuncionario { get; set; } = string.Empty;
    public string CpfFuncionario { get; set; } = string.Empty;
    public string TelefoneFuncionario { get; set; } = string.Empty;
    public string CargoFuncionario { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string Perfil { get; set; } = string.Empty;
    public string StatusFuncionario { get; set; } = string.Empty;

    public static string MapearPerfil(string role) => role?.ToLowerInvariant() switch
    {
        "admin" => "Administrador",
        "owner" => "Proprietário",
        _ => "Funcionário"
    };

    public static string MapearRoleBanco(string? perfilOuRole)
    {
        var v = (perfilOuRole ?? "").Trim().ToLowerInvariant();
        if (v is "proprietário" or "proprietario" or "owner") return "owner";
        if (v is "administrador" or "admin") return "admin";
        return "employee";
    }
}

// DTO para criar/atualizar Funcionário
public class CreateFuncionarioRequest
{
    [StringLength(100, ErrorMessage = "Nome do funcionário deve ter no máximo 100 caracteres.")]
    public string NomeFuncionario { get; set; } = string.Empty;

    [StringLength(11, ErrorMessage = "CPF deve ter no máximo 11 caracteres.")]
    public string CpfFuncionario { get; set; } = string.Empty;

    [StringLength(100, ErrorMessage = "E-mail deve ter no máximo 100 caracteres.")]
    public string EmailFuncionario { get; set; } = string.Empty;

    [StringLength(20, ErrorMessage = "Cargo deve ter no máximo 20 caracteres.")]
    public string CargoFuncionario { get; set; } = string.Empty;

    [StringLength(20, ErrorMessage = "Perfil deve ter no máximo 20 caracteres.")]
    public string Role { get; set; } = "employee";

    [StringLength(11, ErrorMessage = "Telefone deve ter no máximo 11 caracteres.")]
    public string TelefoneFuncionario { get; set; } = string.Empty;

    [StringLength(255, ErrorMessage = "Senha deve ter no máximo 255 caracteres.")]
    public string Senha { get; set; } = string.Empty;
}
