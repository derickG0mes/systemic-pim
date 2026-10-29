using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using PIM3.API.Controllers;
using PIM3.API.Data;
using PIM3.API.DTOs;
using PIM3.API.Hubs;

namespace back_end.Tests;

public class ComandaControllerClaimTests
{
    [Theory]
    [InlineData("pagar", null)]
    [InlineData("pagar", "not-a-number")]
    [InlineData("pagar", "0")]
    [InlineData("fechar", null)]
    [InlineData("fechar", "not-a-number")]
    [InlineData("fechar", "0")]
    public async Task Payment_actions_reject_missing_or_invalid_employee_claims(
        string action,
        string? claimValue)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlServer("Server=localhost;Database=not-used;TrustServerCertificate=True")
            .Options;
        await using var context = new AppDbContext(options);
        var controller = new ComandaController(
            context,
            null!,
            NullLogger<ComandaController>.Instance);
        var claims = claimValue is null
            ? Array.Empty<Claim>()
            : new[] { new Claim(ClaimTypes.NameIdentifier, claimValue) };
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(claims, "test"))
            }
        };

        var result = action switch
        {
            "pagar" => await controller.Pagar(1, new PagarComandaDTO()),
            "fechar" => await controller.Close(1),
            _ => throw new ArgumentOutOfRangeException(nameof(action))
        };

        Assert.IsType<UnauthorizedObjectResult>(result);
    }
}
