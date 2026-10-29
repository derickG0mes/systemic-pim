using System.Globalization;
using System.Security.Cryptography;

namespace PIM3.API.Services;

public class PasswordHashService
{
    private const string Algorithm = "pbkdf2-sha256";
    private const string Version = "v1";
    private const int Iterations = 600_000;
    private const int LegacyIterations = 10_000;
    private const int MaxSupportedIterations = 5_000_000;
    private const int SaltSize = 16;
    private const int HashSize = 32;
    private const int LegacyHashSize = 20;

    public static string HashPassword(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(SaltSize);
        var derivedKey = Rfc2898DeriveBytes.Pbkdf2(
            password,
            salt,
            Iterations,
            HashAlgorithmName.SHA256,
            HashSize);

        return string.Join(
            '$',
            Algorithm,
            Version,
            Iterations.ToString(CultureInfo.InvariantCulture),
            Convert.ToBase64String(salt),
            Convert.ToBase64String(derivedKey));
    }

    public static bool VerifyPassword(string password, string storedHash) =>
        VerifyPassword(password, storedHash, out _);

    public static bool VerifyPassword(string password, string storedHash, out string? upgradedHash)
    {
        upgradedHash = null;
        if (string.IsNullOrEmpty(password) || string.IsNullOrWhiteSpace(storedHash))
            return false;

        byte[] salt;
        byte[] expectedHash;
        int iterations;
        bool needsUpgrade;

        if (TryParseVersionedHash(storedHash, out salt, out expectedHash, out iterations))
        {
            needsUpgrade = iterations < Iterations;
        }
        else if (TryParseLegacyHash(storedHash, out salt, out expectedHash))
        {
            iterations = LegacyIterations;
            needsUpgrade = true;
        }
        else
        {
            return false;
        }

        var actualHash = Rfc2898DeriveBytes.Pbkdf2(
            password,
            salt,
            iterations,
            HashAlgorithmName.SHA256,
            expectedHash.Length);

        if (!CryptographicOperations.FixedTimeEquals(expectedHash, actualHash))
            return false;

        if (needsUpgrade)
            upgradedHash = HashPassword(password);

        return true;
    }

    private static bool TryParseVersionedHash(
        string value,
        out byte[] salt,
        out byte[] expectedHash,
        out int iterations)
    {
        salt = [];
        expectedHash = [];
        iterations = 0;
        var parts = value.Split('$');

        if (parts.Length != 5
            || parts[0] != Algorithm
            || parts[1] != Version
            || !int.TryParse(parts[2], NumberStyles.None, CultureInfo.InvariantCulture, out iterations)
            || iterations <= 0
            || iterations > MaxSupportedIterations)
        {
            return false;
        }

        try
        {
            salt = Convert.FromBase64String(parts[3]);
            expectedHash = Convert.FromBase64String(parts[4]);
        }
        catch (FormatException)
        {
            return false;
        }

        return salt.Length == SaltSize && expectedHash.Length == HashSize;
    }

    private static bool TryParseLegacyHash(string value, out byte[] salt, out byte[] expectedHash)
    {
        salt = [];
        expectedHash = [];

        try
        {
            var decoded = Convert.FromBase64String(value);
            if (decoded.Length != SaltSize + LegacyHashSize)
                return false;

            salt = decoded[..SaltSize];
            expectedHash = decoded[SaltSize..];
            return true;
        }
        catch (FormatException)
        {
            return false;
        }
    }
}
