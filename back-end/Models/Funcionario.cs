using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PIM3.API.Models;

[Table("FUNCIONARIO")]
public class Funcionario
{
    [Column("ID_FUNCIONARIO")]
    public int IdFuncionario { get; set; }

    [Column("NOME_FUNCIONARIO")]
    [Required(ErrorMessage = "Nome é obrigatório")]
    public string NomeFuncionario { get; set; } = string.Empty;

    [Column("EMAIL_FUNCIONARIO")]
    [EmailAddress(ErrorMessage = "Email inválido")]
    [Required(ErrorMessage = "Email é obrigatório")]
    public string EmailFuncionario { get; set; } = string.Empty;

    [Column("CARGO_FUNCIONARIO")]
    public string? CargoFuncionario { get; set; }

    [Column("CPF_FUNCIONARIO")]
    [Required(ErrorMessage = "CPF é obrigatório")]
    public string CpfFuncionario { get; set; } = string.Empty;

    [Column("TELEFONE_FUNCIONARIO")]
    public string TelefoneFuncionario { get; set; } = string.Empty;

    [Column("PASSWORD_FUNCIONARIO")]
    [Required(ErrorMessage = "Senha é obrigatória")]
    public string PasswordFuncionario { get; set; } = string.Empty;

    [Column("MFA_SECRET")]
    public string? MfaSecret { get; set; }

    [Column("STATUS_FUNCIONARIO")]
    public string StatusFuncionario { get; set; } = "ATIVO";

    [Column("ROLE")]
    public string Role { get; set; } = "employee"; // admin, owner, employee

    // Para controlar tentativas de login falhadas
    [Column("LOGIN_ATTEMPTS")]
    public int LoginAttempts { get; set; } = 0;

    [Column("LOCKED_UNTIL")]
    public DateTime? LockedUntil { get; set; }
}
