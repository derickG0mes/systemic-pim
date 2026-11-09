using PIM3.API.DTOs;

namespace PIM3.API.Services;

public interface INotificationService
{
    Task NotifyAsync(
        string type,
        string title,
        string message,
        string href,
        IReadOnlyCollection<string> roles);

    Task<NotificationListDto> ListAsync(int employeeId, int limit);
    Task<bool> MarkReadAsync(int employeeId, int notificationId);
    Task<int> MarkAllReadAsync(int employeeId);
}
