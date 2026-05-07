namespace PIM3.API.DTOs;

/// <summary>
/// DTO para receber credenciais de login do usuário (Funcionário)
/// </summary>
public class LoginDTO
{
    // Email ou identificador do funcionário
    public string Email { get; set; } = string.Empty;
    
    // Senha do funcionário
    public string Senha { get; set; } = string.Empty;
}
