namespace PIM3.API.Models;

public class Funcionario
{
    public int IdFuncionario { get; set; }
    public string NomeFuncionario { get; set; } = string.Empty;
    public string CpfFuncionario { get; set; } = string.Empty;
    public string TelefoneFuncionario { get; set; } = string.Empty;
    public string PasswordFuncionario { get; set; } = string.Empty;
    public string StatusFuncionario { get; set; } = "ATIVO";

    // Para controlar tentativas de login falhadas
    public int LoginAttempts { get; set; } = 0;
    public DateTime? LockedUntil { get; set; }
}
