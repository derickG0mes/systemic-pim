namespace PIM3.API.DTOs;

public sealed record NotificationDto(
    int Id,
    string Type,
    string Title,
    string Message,
    string Href,
    DateTime CreatedAt,
    DateTime? ReadAt);

public sealed record NotificationListDto(
    IReadOnlyList<NotificationDto> Items,
    int UnreadCount);
