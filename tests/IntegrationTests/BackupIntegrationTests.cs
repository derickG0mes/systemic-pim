using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Systemic.IntegrationTests
{
    public class BackupIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly HttpClient _client;
        public BackupIntegrationTests(WebApplicationFactory<Program> factory)
        {
            Environment.SetEnvironmentVariable("JWT_SECRET_KEY", "chave_secreta_jwt_de_testes_com_minimo_32_caracteres_12345");
            _client = factory.CreateClient();
        }

        [Fact]
        public async Task Restore_Endpoint_Returns_Unauthorized_When_Unauthenticated()
        {
            var emptyContent = new MultipartFormDataContent();
            var response = await _client.PostAsync("/api/backup/restore", emptyContent);
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }
}
