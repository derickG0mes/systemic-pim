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
    public string Token { get; set; } = string.Empty;
}

// DTO para Funcionário (sem senha)
public class FuncionarioDto
{
    public int IdFuncionario { get; set; }
    public string NomeFuncionario { get; set; } = string.Empty;
    public string CpfFuncionario { get; set; } = string.Empty;
    public string TelefoneFuncionario { get; set; } = string.Empty;
    public string StatusFuncionario { get; set; } = string.Empty;
}

// DTO para criar/atualizar Funcionário
public class CreateFuncionarioRequest
{
    public string NomeFuncionario { get; set; } = string.Empty;
    public string CpfFuncionario { get; set; } = string.Empty;
    public string EmailFuncionario { get; set; } = string.Empty;
    public string CargoFuncionario { get; set; } = string.Empty;
    public string Role { get; set; } = "employee";
    public string TelefoneFuncionario { get; set; } = string.Empty;
    public string Senha { get; set; } = string.Empty;
}
