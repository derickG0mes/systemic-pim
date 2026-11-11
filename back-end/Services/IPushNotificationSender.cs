namespace PIM3.API.Services;

/// <summary>Uma notificação já gravada, a ser entregue como push aos dispositivos do funcionário.</summary>
public sealed record PushMessage(
    int EmployeeId,
    int NotificationId,
    string Type,
    string Title,
    string Body,
    string Href);

public interface IPushNotificationSender
{
    /// <summary>
    /// Agenda o envio em segundo plano e retorna imediatamente. Falhas são registradas em log
    /// e nunca interrompem a operação que gerou a notificação.
    /// </summary>
    void Enqueue(IReadOnlyCollection<PushMessage> messages);
}
