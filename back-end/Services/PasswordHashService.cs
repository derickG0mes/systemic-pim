using System.Security.Cryptography;
using System.Text;

namespace PIM3.API.Services;

public class PasswordHashService
{
    // Criptografa a senha com salt aleatório usando PBKDF2 moderno
    public static string HashPassword(string password)
    {
        var salt = new byte[16];
        using (var rng = RandomNumberGenerator.Create())
        {
            rng.GetBytes(salt);
        }

        // Usar o método estático PBKDF2 moderno
        var hash = Rfc2898DeriveBytes.Pbkdf2(password, salt, 10000, HashAlgorithmName.SHA256, 20);

        var hashBytes = new byte[36];
        Array.Copy(salt, 0, hashBytes, 0, 16);
        Array.Copy(hash, 0, hashBytes, 16, 20);

        return Convert.ToBase64String(hashBytes);
    }

    // Verifica se a senha corresponde ao hash
    public static bool VerifyPassword(string password, string hash)
    {
        try
        {
            var hashBytes = Convert.FromBase64String(hash);
            var salt = new byte[16];
            Array.Copy(hashBytes, 0, salt, 0, 16);

            // Usar o método estático PBKDF2 moderno
            var hash2 = Rfc2898DeriveBytes.Pbkdf2(password, salt, 10000, HashAlgorithmName.SHA256, 20);

            for (int i = 0; i < 20; i++)
            {
                if (hashBytes[i + 16] != hash2[i])
                    return false;
            }

            return true;
        }
        catch
        {
            return false;
        }
    }
}
