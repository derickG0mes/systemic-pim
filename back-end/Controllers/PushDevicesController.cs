using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PIM3.API.DTOs;
using PIM3.API.Services;

namespace PIM3.API.Controllers;

/// <summary>
/// Cadastro de dispositivos móveis para notificações push. O token é sempre associado
/// ao funcionário autenticado, nunca a um ID informado pelo cliente.
/// </summary>
[ApiController]
[Route("api/notificacoes/dispositivos")]
[Authorize(Roles = "employee,admin,owner")]
public sealed class PushDevicesController : ControllerBase
{
    private readonly IPushDeviceService _devices;

    public PushDevicesController(IPushDeviceService devices) => _devices = devices;

    [HttpPut]
    public async Task<IActionResult> Register([FromBody] RegisterPushDeviceDto dto)
    {
        if (!TryGetEmployeeId(out var employeeId)) return Unauthorized();

        var result = await _devices.RegisterAsync(employeeId, dto.Token, dto.Platform);
        return result switch
        {
            PushDeviceRegistrationResult.Registered => NoContent(),
            PushDeviceRegistrationResult.InvalidPlatform => BadRequest(new RespostaPadraoDTO
            {
                Sucesso = false,
                Mensagem = "Plataforma inválida. Use android ou ios.",
                CodigoErro = "PLATAFORMA_INVALIDA",
            }),
            _ => BadRequest(new RespostaPadraoDTO
            {
                Sucesso = false,
                Mensagem = "Token de push inválido.",
                CodigoErro = "TOKEN_PUSH_INVALIDO",
            }),
        };
    }

    [HttpDelete]
    public async Task<IActionResult> Unregister([FromBody] UnregisterPushDeviceDto dto)
    {
        if (!TryGetEmployeeId(out var employeeId)) return Unauthorized();

        await _devices.UnregisterAsync(employeeId, dto.Token);
        return NoContent();
    }

    private bool TryGetEmployeeId(out int employeeId) =>
        int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out employeeId);
}
