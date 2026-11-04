using Microsoft.AspNetCore.Mvc;
using PIM3.API.DTOs;
using PIM3.API.Services;

namespace back_end.Tests;

public sealed class AutenticacaoServiceTests
{
    [Fact]
    public void Invalid_credentials_responses_are_identical()
    {
        var missingAccount = Assert.IsType<UnauthorizedObjectResult>(
            AutenticacaoService.InvalidCredentialsResult());
        var incorrectPassword = Assert.IsType<UnauthorizedObjectResult>(
            AutenticacaoService.InvalidCredentialsResult());

        Assert.Equal(401, missingAccount.StatusCode);
        Assert.Equal(missingAccount.StatusCode, incorrectPassword.StatusCode);
        Assert.Equal(
            System.Text.Json.JsonSerializer.Serialize(missingAccount.Value),
            System.Text.Json.JsonSerializer.Serialize(incorrectPassword.Value));

        var response = Assert.IsType<RespostaPadraoDTO>(missingAccount.Value);
        Assert.Equal("CREDENCIAIS_INVALIDAS", response.CodigoErro);
    }
}
