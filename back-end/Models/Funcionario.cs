using System.ComponentModel.DataAnnotations;

namespace PIM3.API.Models;

public class Funcionario
{
    public int IdFuncionario { get; set; }

    [Required(ErrorMessage = "Nome é obrigatório")]
    public string NomeFuncionario { get; set; } = string.Empty;

    [EmailAddress(ErrorMessage = "Email inválido")]
    [Required(ErrorMessage = "Email é obrigatório")]
    public string EmailFuncionario { get; set; } = string.Empty;

    [Required(ErrorMessage = "CPF é obrigatório")]
    public string CpfFuncionario { get; set; } = string.Empty;

    public string TelefoneFuncionario { get; set; } = string.Empty;

    [Required(ErrorMessage = "Senha é obrigatória")]
    public string PasswordFuncionario { get; set; } = string.Empty;

    public string StatusFuncionario { get; set; } = "ATIVO";
    public string Role { get; set; } = "employee"; // admin, owner, employee

    // Para controlar tentativas de login falhadas
    public int LoginAttempts { get; set; } = 0;
    public DateTime? LockedUntil { get; set; }
}
