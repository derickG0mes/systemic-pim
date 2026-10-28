using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using PIM3.API.Services;
using Xunit;

namespace Systemic.IntegrationTests
{
    public class BackupIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly WebApplicationFactory<Program> _factory;
        private readonly HttpClient _client;
        public BackupIntegrationTests(WebApplicationFactory<Program> factory)
        {
            Environment.SetEnvironmentVariable("JWT_SECRET_KEY", "chave_secreta_jwt_de_testes_com_minimo_32_caracteres_12345");
            _factory = factory;
            _client = factory.CreateClient();
        }

        [Fact]
        public async Task Restore_Endpoint_Returns_Unauthorized_When_Unauthenticated()
        {
            var emptyContent = new MultipartFormDataContent();
            var response = await _client.PostAsync("/api/backup/restore", emptyContent);
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task Restore_Endpoint_Returns_Forbidden_For_Employee()
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, "/api/backup/restore")
            {
                Content = new MultipartFormDataContent()
            };
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", CreateToken("employee"));

            using var response = await _client.SendAsync(request);

            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }

        [Fact]
        public async Task Restore_Endpoint_Returns_BadRequest_For_Invalid_Zip()
        {
            using var content = new MultipartFormDataContent();
            var file = new ByteArrayContent(Encoding.UTF8.GetBytes("not a zip archive"));
            file.Headers.ContentType = new MediaTypeHeaderValue("application/zip");
            content.Add(file, "Arquivo", "invalid.zip");

            using var request = new HttpRequestMessage(HttpMethod.Post, "/api/backup/restore")
            {
                Content = content
            };
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", CreateToken("admin"));

            using var response = await _client.SendAsync(request);

            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        private string CreateToken(string role)
        {
            using var scope = _factory.Services.CreateScope();
            return scope.ServiceProvider.GetRequiredService<JwtService>()
                .GenerateToken(1, "Teste", "00000000000", role);
        }
    }
}
