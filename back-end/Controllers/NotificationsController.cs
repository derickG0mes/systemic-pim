using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PIM3.API.DTOs;
using PIM3.API.Services;

namespace PIM3.API.Controllers;

[ApiController]
[Route("api/notificacoes")]
[Authorize(Roles = "employee,admin,owner")]
public sealed class NotificationsController : ControllerBase
{
    private readonly INotificationService _notifications;

    public NotificationsController(INotificationService notifications) => _notifications = notifications;

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] int limit = 50)
    {
        if (limit is < 1 or > 100)
            return BadRequest(new RespostaPadraoDTO { Sucesso = false, Mensagem = "O limite deve estar entre 1 e 100." });
        if (!TryGetEmployeeId(out var employeeId)) return Unauthorized();
        return Ok(new RespostaPadraoDTO { Sucesso = true, Dados = await _notifications.ListAsync(employeeId, limit) });
    }

    [HttpPatch("{id:int}/lida")]
    public async Task<IActionResult> MarkRead(int id)
    {
        if (!TryGetEmployeeId(out var employeeId)) return Unauthorized();
        return await _notifications.MarkReadAsync(employeeId, id)
            ? NoContent()
            : NotFound(new RespostaPadraoDTO { Sucesso = false, Mensagem = "Notificação não encontrada." });
    }

    [HttpPost("marcar-todas-lidas")]
    public async Task<IActionResult> MarkAllRead()
    {
        if (!TryGetEmployeeId(out var employeeId)) return Unauthorized();
        var updated = await _notifications.MarkAllReadAsync(employeeId);
        return Ok(new RespostaPadraoDTO { Sucesso = true, Dados = new { atualizadas = updated } });
    }

    private bool TryGetEmployeeId(out int employeeId) =>
        int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out employeeId);
}
