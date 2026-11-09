using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace PIM3.API.Hubs;

[Authorize]
public sealed class NotificationsHub : Hub
{
    public static string EmployeeGroup(int employeeId) => $"employee:{employeeId}";

    public override async Task OnConnectedAsync()
    {
        var employeeId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (int.TryParse(employeeId, out var parsedId))
            await Groups.AddToGroupAsync(Context.ConnectionId, EmployeeGroup(parsedId));

        await base.OnConnectedAsync();
    }
}
