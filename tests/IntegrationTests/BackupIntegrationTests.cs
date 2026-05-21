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
            _client = factory.CreateClient();
        }

        [Fact]
        public async Task Restore_Endpoint_Returns_BadRequest_When_No_File()
        {
            var emptyContent = new MultipartFormDataContent();
            var response = await _client.PostAsync("/api/backup/restore", emptyContent);
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }
    }
}
