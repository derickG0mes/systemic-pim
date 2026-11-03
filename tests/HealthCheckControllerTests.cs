using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;
using PIM3.API.Controllers;
using PIM3.API.DTOs;
using PIM3.API.Services;

namespace back_end.Tests;

public class HealthCheckControllerTests
{
    [Fact]
    public async Task HealthCheck_returns_only_the_status()
    {
        var databaseHealthService = new FakeDatabaseHealthService();
        var controller = new HealthCheckController(
            databaseHealthService,
            NullLogger<HealthCheckController>.Instance);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext(),
        };

        var result = Assert.IsType<OkObjectResult>(controller.HealthCheck());
        var response = Assert.IsType<RespostaPadraoDTO>(result.Value);
        using var data = JsonDocument.Parse(JsonSerializer.Serialize(response.Dados));

        var properties = data.RootElement.EnumerateObject().ToArray();
        Assert.Single(properties);
        Assert.Equal("status", properties[0].Name);
        Assert.Equal("SAUDÁVEL", properties[0].Value.GetString());

        Assert.IsType<OkObjectResult>(
            await controller.HealthCheckDatabase());

        databaseHealthService.IsUnavailable = true;
        var unavailable = Assert.IsType<ObjectResult>(
            await controller.HealthCheckDatabase());
        Assert.Equal(503, unavailable.StatusCode);
    }

    [Fact]
    public void Info_returns_only_a_generic_status()
    {
        var controller = new HealthCheckController(
            new FakeDatabaseHealthService(),
            NullLogger<HealthCheckController>.Instance);

        var result = Assert.IsType<OkObjectResult>(controller.Info());
        var response = Assert.IsType<RespostaPadraoDTO>(result.Value);
        using var data = JsonDocument.Parse(JsonSerializer.Serialize(response.Dados));

        var properties = data.RootElement.EnumerateObject().ToArray();
        Assert.Single(properties);
        Assert.Equal("status", properties[0].Name);
        Assert.Equal("ok", properties[0].Value.GetString());
    }

    private sealed class FakeDatabaseHealthService : IDatabaseHealthService
    {
        public bool IsUnavailable { get; set; }

        public Task CanConnectAsync() =>
            IsUnavailable
                ? Task.FromException(new InvalidOperationException("Database unavailable"))
                : Task.CompletedTask;
    }
}
