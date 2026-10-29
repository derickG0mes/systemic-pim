using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using PIM3.API.Services;

namespace Systemic.IntegrationTests;

public class RbacIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;

    public RbacIntegrationTests(WebApplicationFactory<Program> factory)
    {
        Environment.SetEnvironmentVariable("JWT_SECRET_KEY", "chave_secreta_jwt_de_testes_com_minimo_32_caracteres_12345");
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Token_validation_requires_authentication()
    {
        using var response = await _client.GetAsync("/api/autenticacao/validar");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Token_validation_returns_identity_claims()
    {
        _client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", CreateToken("employee"));

        using var response = await _client.GetAsync("/api/autenticacao/validar");
        var responseBody = await response.Content.ReadAsStringAsync();

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        using var json = JsonDocument.Parse(responseBody);
        var dados = json.RootElement.GetProperty("dados");
        dados.GetProperty("id").GetInt32().Should().Be(1);
        dados.GetProperty("nome").GetString().Should().Be("Teste");
        dados.GetProperty("role").GetString().Should().Be("employee");
    }

    [Theory]
    [InlineData("GET", "/api/cliente")]
    [InlineData("POST", "/api/cliente")]
    [InlineData("POST", "/api/mesa")]
    [InlineData("PUT", "/api/mesa/1")]
    [InlineData("DELETE", "/api/mesa/1")]
    [InlineData("POST", "/api/formapagamento")]
    [InlineData("PUT", "/api/formapagamento/1")]
    [InlineData("DELETE", "/api/formapagamento/1")]
    [InlineData("GET", "/api/faturamento")]
    [InlineData("POST", "/api/faturamento/despesa")]
    [InlineData("GET", "/api/log/sistema")]
    [InlineData("POST", "/api/log/registrar")]
    [InlineData("GET", "/api/funcionario")]
    [InlineData("GET", "/api/funcionario/1")]
    [InlineData("POST", "/api/produto")]
    [InlineData("PUT", "/api/produto/1")]
    [InlineData("DELETE", "/api/produto/1")]
    [InlineData("PUT", "/api/produto/1/ajustar-estoque")]
    public async Task Employee_is_forbidden_from_admin_routes(string method, string path)
    {
        using var request = new HttpRequestMessage(new HttpMethod(method), path);
        if (method is "POST" or "PUT")
            request.Content = new StringContent("{}", Encoding.UTF8, "application/json");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", CreateToken("employee"));

        using var response = await _client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    private string CreateToken(string role)
    {
        using var scope = _factory.Services.CreateScope();
        return scope.ServiceProvider.GetRequiredService<JwtService>()
            .GenerateToken(1, "Teste", "00000000000", role);
    }
}
