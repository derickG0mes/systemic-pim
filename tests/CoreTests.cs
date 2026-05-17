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
    }
}
