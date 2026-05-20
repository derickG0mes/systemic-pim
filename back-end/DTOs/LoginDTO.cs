using System.Text.Json.Serialization;

namespace PIM3.API.DTOs;

/// <summary>
/// DTO para receber credenciais de login do usuário (Funcionário)
/// </summary>
public class LoginDTO
{
    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;
    
    // Senha do funcionário
    [JsonPropertyName("password")]
    public string Senha { get; set; } = string.Empty;
}
