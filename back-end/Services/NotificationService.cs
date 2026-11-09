using System.Data.Common;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using PIM3.API.Data;
using PIM3.API.DTOs;
using PIM3.API.Hubs;
using PIM3.API.Models;

namespace PIM3.API.Services;

public sealed class NotificationService : INotificationService
{
    private readonly AppDbContext _context;
    private readonly IHubContext<NotificationsHub> _hub;
    private readonly ILogger<NotificationService> _logger;

    public NotificationService(
        AppDbContext context,
        IHubContext<NotificationsHub> hub,
        ILogger<NotificationService> logger)
    {
        _context = context;
        _hub = hub;
        _logger = logger;
    }

    public async Task NotifyAsync(
        string type,
        string title,
        string message,
        string href,
        IReadOnlyCollection<string> roles)
    {
        int[] recipients;
        try
        {
            var roleSet = roles.ToHashSet(StringComparer.OrdinalIgnoreCase);
            var employees = await _context.Funcionarios
                .AsNoTracking()
                .Where(employee => employee.StatusFuncionario == "ATIVO")
                .Select(employee => new { employee.IdFuncionario, employee.Role })
                .ToListAsync();
            recipients = employees
                .Where(employee => roleSet.Contains(employee.Role))
                .Select(employee => employee.IdFuncionario)
                .ToArray();

            if (recipients.Length == 0) return;

            var notifications = recipients.Select(employeeId => new Notification
            {
                EmployeeId = employeeId,
                Type = type,
                Title = title,
                Message = message,
                Link = href,
                CreatedAt = DateTime.UtcNow,
            }).ToArray();

            _context.Notifications.AddRange(notifications);
            await _context.SaveChangesAsync();

            foreach (var notification in notifications)
            {
                var dto = ToDto(notification);
                try
                {
                    await _hub.Clients
                        .Group(NotificationsHub.EmployeeGroup(notification.EmployeeId))
                        .SendAsync("NotificationCreated", dto);
                }
                catch (Exception exception)
                {
                    _logger.LogWarning(
                        exception,
                        "Falha na entrega em tempo real da notificação {NotificationId} ao funcionário {EmployeeId}; ela continua disponível na central.",
                        notification.Id,
                        notification.EmployeeId);
                }
            }
        }
        catch (DbUpdateException exception)
        {
            _logger.LogError(exception, "Falha ao persistir a notificação {NotificationType}.", type);
        }
        catch (DbException exception)
        {
            _logger.LogError(exception, "Falha ao acessar o banco ao criar a notificação {NotificationType}.", type);
        }
    }

    public async Task<NotificationListDto> ListAsync(int employeeId, int limit)
    {
        var notifications = await _context.Notifications
            .AsNoTracking()
            .Where(notification => notification.EmployeeId == employeeId)
            .OrderByDescending(notification => notification.CreatedAt)
            .Take(limit)
            .Select(notification => new NotificationDto(
                notification.Id,
                notification.Type,
                notification.Title,
                notification.Message,
                notification.Link,
                notification.CreatedAt,
                notification.ReadAt))
            .ToListAsync();
        var unreadCount = await _context.Notifications
            .CountAsync(notification => notification.EmployeeId == employeeId && notification.ReadAt == null);

        return new NotificationListDto(notifications, unreadCount);
    }

    public async Task<bool> MarkReadAsync(int employeeId, int notificationId)
    {
        var notification = await _context.Notifications.FirstOrDefaultAsync(
            item => item.Id == notificationId && item.EmployeeId == employeeId);
        if (notification is null) return false;
        if (notification.ReadAt is null)
        {
            notification.ReadAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        return true;
    }

    public async Task<int> MarkAllReadAsync(int employeeId)
    {
        var now = DateTime.UtcNow;
        return await _context.Notifications
            .Where(item => item.EmployeeId == employeeId && item.ReadAt == null)
            .ExecuteUpdateAsync(updates => updates.SetProperty(item => item.ReadAt, now));
    }

    private static NotificationDto ToDto(Notification notification) =>
        new(
            notification.Id,
            notification.Type,
            notification.Title,
            notification.Message,
            notification.Link,
            notification.CreatedAt,
            notification.ReadAt);
}
