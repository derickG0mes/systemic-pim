using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace PIM3.API.Services;

public class JwtService
{
    public const string AuthCookieName = "systemic_auth";

    private static readonly HashSet<string> ExampleSecretKeys = new(StringComparer.Ordinal)
    {
        "TROQUE_ESTA_CHAVE_ANTES_DE_USAR_1234",
        "SUBSTITUA_POR_CHAVE_GERADA_COM_OPENSSL",
        "change_this_for_a_random_secret_at_least_32_characters_long_12345",
        "chave_secreta_jwt_de_exemplo_com_pelo_menos_32_caracteres_12345"
    };

    private readonly string _secretKey;
    private readonly int _expirationMinutes;
    private readonly bool _secureCookie;

    public JwtService(IConfiguration configuration, IHostEnvironment environment)
    {
        // Ler do arquivo .env (variáveis de ambiente)
        var secretKey = Environment.GetEnvironmentVariable("JWT_SECRET_KEY")
            ?? configuration["Jwt:SecretKey"];
        _secretKey = ValidateSecretKey(secretKey, environment.IsDevelopment());
        _secureCookie = !environment.IsDevelopment();
            
        var expStr = Environment.GetEnvironmentVariable("JWT_EXPIRATION_MINUTES") 
            ?? configuration["Jwt:ExpirationMinutes"];
        _expirationMinutes = int.TryParse(expStr, out var exp) ? exp : 480;
    }

    public void SetAuthCookie(HttpResponse response, string token)
    {
        response.Cookies.Append(
            AuthCookieName,
            token,
            CreateAuthCookieOptions(response.HttpContext));
    }

    public void ClearAuthCookie(HttpResponse response)
    {
        response.Cookies.Delete(
            AuthCookieName,
            CreateAuthCookieOptions(response.HttpContext));
    }

    private CookieOptions CreateAuthCookieOptions(HttpContext context) => new()
    {
        HttpOnly = true,
        Secure = _secureCookie || context.Request.IsHttps,
        SameSite = SameSiteMode.Lax,
        IsEssential = true,
        Path = "/",
        Expires = DateTimeOffset.UtcNow.AddMinutes(_expirationMinutes)
    };

    public static string ValidateSecretKey(string? secretKey, bool isDevelopment)
    {
        if (string.IsNullOrWhiteSpace(secretKey) || secretKey.Length < 32)
        {
            throw new InvalidOperationException("Falha na inicialização: A variável de ambiente JWT_SECRET_KEY não foi definida ou possui menos de 32 caracteres. Configure uma chave segura no arquivo .env antes de executar a aplicação.");
        }

        if (!isDevelopment && ExampleSecretKeys.Contains(secretKey))
        {
            throw new InvalidOperationException("Falha na inicialização: JWT_SECRET_KEY está usando um valor de exemplo/placeholder. Gere uma chave exclusiva com `openssl rand -base64 48` e configure-a no arquivo .env ou em um gerenciador de segredos.");
        }

        return secretKey;
    }

    public string GenerateToken(int idFuncionario, string nomeFuncionario, string cpf, string role)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_secretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, idFuncionario.ToString()),
            new Claim(ClaimTypes.Name, nomeFuncionario),
            new Claim("cpf", cpf),
            new Claim(ClaimTypes.Role, role)
        };

        var token = new JwtSecurityToken(
            issuer: "PIM4.API",
            audience: "PIM4.API.Users",
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(_expirationMinutes),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
