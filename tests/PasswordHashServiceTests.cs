using System.Security.Cryptography;
using PIM3.API.Services;

namespace back_end.Tests;

public class PasswordHashServiceTests
{
    [Fact]
    public void New_hash_uses_versioned_pbkdf2_sha256_with_600000_iterations()
    {
        const string password = "new-password-for-test";

        var hash = PasswordHashService.HashPassword(password);
        var parts = hash.Split('$');

        Assert.Equal("pbkdf2-sha256", parts[0]);
        Assert.Equal("v1", parts[1]);
        Assert.Equal("600000", parts[2]);
        Assert.True(PasswordHashService.VerifyPassword(password, hash, out var upgradedHash));
        Assert.Null(upgradedHash);
        Assert.False(PasswordHashService.VerifyPassword("wrong-password", hash));
    }

    [Fact]
    public void Legacy_hash_verifies_and_returns_a_new_hash_for_replacement()
    {
        const string password = "legacy-password-for-test";
        var salt = Enumerable.Range(1, 16).Select(value => (byte)value).ToArray();
        var legacyHash = Rfc2898DeriveBytes.Pbkdf2(
            password,
            salt,
            10_000,
            HashAlgorithmName.SHA256,
            20);
        var storedHash = Convert.ToBase64String(salt.Concat(legacyHash).ToArray());

        Assert.True(PasswordHashService.VerifyPassword(password, storedHash, out var upgradedHash));
        Assert.NotNull(upgradedHash);
        Assert.StartsWith("pbkdf2-sha256$v1$600000$", upgradedHash);
        Assert.True(PasswordHashService.VerifyPassword(password, upgradedHash, out var secondUpgrade));
        Assert.Null(secondUpgrade);
    }
}
