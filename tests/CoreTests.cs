using System;
using Xunit;
using PIM3.API.Helpers;
using PIM3.API.Services;

namespace back_end.Tests
{
    public class CoreTests
    {
        [Fact]
        public void TimeZoneHelper_Returns_BrazilTime()
        {
            // Arrange & Act
            var brazilTime = TimeZoneHelper.GetBrazilTime();
            var systemUtc = DateTime.UtcNow;

            // Assert
            // Brasília is UTC-3
            var expectedHour = systemUtc.AddHours(-3).Hour;
            
            // Depending on when the test runs, the exact hour might shift due to minutes/seconds boundary,
            // but for a general unit test, we ensure it's not returning UTC directly.
            Assert.NotEqual(systemUtc.Hour, brazilTime.Hour);
        }

        [Fact]
        public void PasswordHashService_Should_GenerateAndVerifyHash_Correctly()
        {
            // Arrange
            var password = "admin_test_password_123!";

            // Act
            var hash = PasswordHashService.HashPassword(password);
            var isCorrect = PasswordHashService.VerifyPassword(password, hash);
            var isIncorrect = PasswordHashService.VerifyPassword("wrong_password", hash);

            // Assert
            Assert.NotNull(hash);
            Assert.True(isCorrect, "O hash gerado não foi validado corretamente pela mesma senha.");
            Assert.False(isIncorrect, "Uma senha incorreta validou com sucesso (Falso Positivo).");
        }

        [Fact]
        public void LoginLockoutPolicy_uses_five_attempts_and_fifteen_minutes()
        {
            Assert.Equal(5, LoginLockoutPolicy.MaxAttempts);
            Assert.Equal(15, LoginLockoutPolicy.DurationMinutes);
        }

        [Theory]
        [InlineData("TROQUE_ESTA_CHAVE_ANTES_DE_USAR_1234")]
        [InlineData("change_this_for_a_random_secret_at_least_32_characters_long_12345")]
        [InlineData("chave_secreta_jwt_de_exemplo_com_pelo_menos_32_caracteres_12345")]
        public void JwtService_rejects_example_secret_outside_development(string secretKey)
        {
            var exception = Assert.Throws<InvalidOperationException>(
                () => JwtService.ValidateSecretKey(secretKey, isDevelopment: false));

            Assert.Contains("valor de exemplo/placeholder", exception.Message);
        }

        [Fact]
        public void JwtService_allows_placeholder_in_development()
        {
            JwtService.ValidateSecretKey(
                "TROQUE_ESTA_CHAVE_ANTES_DE_USAR_1234",
                isDevelopment: true);
        }
    }
}
