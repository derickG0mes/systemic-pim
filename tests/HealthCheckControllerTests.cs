using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;
using PIM3.API.Controllers;
using PIM3.API.DTOs;

namespace back_end.Tests;

public class HealthCheckControllerTests
{
    [Fact]
    public void HealthCheck_returns_only_the_status()
    {
        var controller = new HealthCheckController(
            context: null!,
            NullLogger<HealthCheckController>.Instance);

        var result = Assert.IsType<OkObjectResult>(controller.HealthCheck());
        var response = Assert.IsType<RespostaPadraoDTO>(result.Value);
        using var data = JsonDocument.Parse(JsonSerializer.Serialize(response.Dados));

        var properties = data.RootElement.EnumerateObject().ToArray();
        Assert.Single(properties);
        Assert.Equal("status", properties[0].Name);
        Assert.Equal("SAUDÁVEL", properties[0].Value.GetString());
    }

    [Fact]
    public void Info_returns_only_a_generic_status()
    {
        var controller = new HealthCheckController(
            context: null!,
            NullLogger<HealthCheckController>.Instance);

        var result = Assert.IsType<OkObjectResult>(controller.Info());
        var response = Assert.IsType<RespostaPadraoDTO>(result.Value);
        using var data = JsonDocument.Parse(JsonSerializer.Serialize(response.Dados));

        var properties = data.RootElement.EnumerateObject().ToArray();
        Assert.Single(properties);
        Assert.Equal("status", properties[0].Name);
        Assert.Equal("ok", properties[0].Value.GetString());
    }
}
