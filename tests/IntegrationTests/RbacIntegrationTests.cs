using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
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
        _client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            HandleCookies = true
        });
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

    [Fact]
    public async Task Token_validation_accepts_the_http_only_auth_cookie()
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/autenticacao/validar");
        request.Headers.Add(
            "Cookie",
            $"{JwtService.AuthCookieName}={CreateToken("employee")}");

        using var response = await _client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public void Auth_cookie_is_http_only_and_secure_over_https()
    {
        using var scope = _factory.Services.CreateScope();
        var jwtService = scope.ServiceProvider.GetRequiredService<JwtService>();
        var context = new DefaultHttpContext();
        context.Request.Scheme = "https";

        jwtService.SetAuthCookie(context.Response, "cookie-test");

        var cookie = context.Response.Headers.SetCookie.ToString();
        cookie.Should().Contain($"{JwtService.AuthCookieName}=cookie-test");
        cookie.ToLowerInvariant().Should().Contain("httponly");
        cookie.ToLowerInvariant().Should().Contain("secure");
        cookie.ToLowerInvariant().Should().Contain("samesite=lax");
    }

    [Fact]
    public void Auth_cookie_is_secure_in_production_even_when_request_is_http()
    {
        var productionFactory = _factory.WithWebHostBuilder(builder =>
            builder.UseEnvironment("Production"));
        using var scope = productionFactory.Services.CreateScope();
        var jwtService = scope.ServiceProvider.GetRequiredService<JwtService>();
        var context = new DefaultHttpContext();
        context.Request.Scheme = "http";

        jwtService.SetAuthCookie(context.Response, "cookie-test");

        var cookie = context.Response.Headers.SetCookie.ToString().ToLowerInvariant();
        cookie.Should().Contain("httponly");
        cookie.Should().Contain("secure");
        cookie.Should().Contain("samesite=lax");
    }

    [Fact]
    public async Task Logout_clears_the_auth_cookie_and_requires_csrf()
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/autenticacao/logout");
        await AddAntiforgeryTokenAsync(request);

        using var response = await _client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        response.Headers.GetValues("Set-Cookie")
            .Should().Contain(value =>
                value.StartsWith($"{JwtService.AuthCookieName}=", StringComparison.Ordinal)
                && value.Contains("expires=", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task Unsafe_requests_require_an_antiforgery_token()
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/log/registrar")
        {
            Content = new StringContent("{}", Encoding.UTF8, "application/json")
        };
        request.Headers.Authorization =
            new AuthenticationHeaderValue("Bearer", CreateToken("admin"));

        using var response = await _client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
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
        {
            request.Content = new StringContent("{}", Encoding.UTF8, "application/json");
        }
        if (method is "POST" or "PUT" or "DELETE")
        {
            await AddAntiforgeryTokenAsync(request);
        }
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

    private async Task AddAntiforgeryTokenAsync(HttpRequestMessage request)
    {
        using var response = await _client.GetAsync("/api/autenticacao/csrf");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        request.Headers.Add(
            "X-CSRF-TOKEN",
            json.RootElement.GetProperty("requestToken").GetString());
    }
}
