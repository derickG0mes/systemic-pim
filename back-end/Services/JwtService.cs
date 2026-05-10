using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace PIM3.API.Services;

public class JwtService
{
    private readonly string _secretKey;
    private readonly int _expirationMinutes;

    public JwtService(IConfiguration configuration)
    {
        // Ler do arquivo .env (variáveis de ambiente)
        _secretKey = Environment.GetEnvironmentVariable("JWT_SECRET_KEY") 
            ?? configuration["Jwt:SecretKey"] 
            ?? "sua_chave_secreta_muito_segura_com_minimo_32_caracteres_12345";
            
        var expStr = Environment.GetEnvironmentVariable("JWT_EXPIRATION_MINUTES") 
            ?? configuration["Jwt:ExpirationMinutes"];
        _expirationMinutes = int.TryParse(expStr, out var exp) ? exp : 480;
    }

    public string GenerateToken(int idFuncionario, string nomeFuncionario, string cpf)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_secretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, idFuncionario.ToString()),
            new Claim(ClaimTypes.Name, nomeFuncionario),
            new Claim("cpf", cpf)
        };

        var token = new JwtSecurityToken(
            issuer: "PIM3.API",
            audience: "PIM3.API.Users",
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(_expirationMinutes),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
