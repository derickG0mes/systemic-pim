using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PIM3.API.Data;

namespace PIM3.API.Services;

/// <summary>
/// Entrega notificações push pelo serviço do Expo (https://docs.expo.dev/push-notifications/sending-notifications/),
/// que repassa ao FCM (Android) e ao APNs (iOS). Funciona com o app fechado.
/// </summary>
public sealed class ExpoPushSender : IPushNotificationSender
{
    public const string HttpClientName = "expo-push";

    /// <summary>O Expo aceita no máximo 100 mensagens por requisição.</summary>
    private const int BatchSize = 100;

    /// <summary>Tempo de vida da mensagem no Expo/FCM/APNs caso o aparelho esteja offline.</summary>
    private const int TimeToLiveSeconds = 3600;

    private const string AndroidChannelId = "systemic-default";

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<ExpoPushSender> _logger;

    public ExpoPushSender(
        IServiceScopeFactory scopeFactory,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<ExpoPushSender> logger)
    {
        _scopeFactory = scopeFactory;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
    }

    public void Enqueue(IReadOnlyCollection<PushMessage> messages)
    {
        if (messages.Count == 0)
            return;

        var snapshot = messages.ToArray();
        _ = Task.Run(() => SendAsync(snapshot));
    }

    internal async Task SendAsync(IReadOnlyCollection<PushMessage> messages)
    {
        try
        {
            using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(30));
            var cancellationToken = timeout.Token;

            await using var scope = _scopeFactory.CreateAsyncScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var employeeIds = messages.Select(message => message.EmployeeId).Distinct().ToArray();
            var devices = await context.PushDevices
                .AsNoTracking()
                .Where(device => employeeIds.Contains(device.EmployeeId))
                .Select(device => new { device.EmployeeId, device.Token })
                .ToListAsync(cancellationToken);
            if (devices.Count == 0)
                return;

            var tokensByEmployee = devices
                .GroupBy(device => device.EmployeeId)
                .ToDictionary(group => group.Key, group => group.Select(device => device.Token).ToArray());

            var requests = new List<(string Token, object Payload)>();
            foreach (var message in messages)
            {
                if (!tokensByEmployee.TryGetValue(message.EmployeeId, out var tokens))
                    continue;

                foreach (var token in tokens)
                    requests.Add((token, BuildPayload(token, message)));
            }

            var invalidTokens = new HashSet<string>(StringComparer.Ordinal);
            foreach (var batch in requests.Chunk(BatchSize))
            {
                var rejected = await SendBatchAsync(batch, cancellationToken);
                invalidTokens.UnionWith(rejected);
            }

            if (invalidTokens.Count > 0)
            {
                var removable = invalidTokens.ToArray();
                await context.PushDevices
                    .Where(device => removable.Contains(device.Token))
                    .ExecuteDeleteAsync(cancellationToken);
                _logger.LogInformation(
                    "Removidos {Count} token(s) push que o Expo informou como não registrados.",
                    removable.Length);
            }
        }
        catch (Exception exception)
        {
            _logger.LogWarning(exception, "Falha ao enviar notificações push; elas continuam disponíveis na central.");
        }
    }

    private static object BuildPayload(string token, PushMessage message) => new
    {
        to = token,
        title = message.Title,
        body = message.Body,
        sound = "default",
        priority = "high",
        ttl = TimeToLiveSeconds,
        channelId = AndroidChannelId,
        data = new
        {
            id = message.NotificationId,
            type = message.Type,
            link = message.Href,
        },
    };

    /// <summary>Envia um lote e devolve os tokens que o Expo marcou como DeviceNotRegistered.</summary>
    private async Task<IReadOnlyCollection<string>> SendBatchAsync(
        (string Token, object Payload)[] batch,
        CancellationToken cancellationToken)
    {
        var client = _httpClientFactory.CreateClient(HttpClientName);
        using var request = new HttpRequestMessage(HttpMethod.Post, "--/api/v2/push/send")
        {
            Content = new StringContent(
                JsonSerializer.Serialize(batch.Select(item => item.Payload)),
                Encoding.UTF8,
                "application/json"),
        };
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        var accessToken = _configuration["EXPO_ACCESS_TOKEN"];
        if (!string.IsNullOrWhiteSpace(accessToken))
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        using var response = await client.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("O serviço de push do Expo respondeu HTTP {StatusCode}.", (int)response.StatusCode);
            return [];
        }

        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var document = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
        if (!document.RootElement.TryGetProperty("data", out var tickets)
            || tickets.ValueKind != JsonValueKind.Array)
        {
            _logger.LogWarning("Resposta inesperada do serviço de push do Expo.");
            return [];
        }

        var invalid = new List<string>();
        var index = 0;
        foreach (var ticket in tickets.EnumerateArray())
        {
            if (index >= batch.Length)
                break;

            var token = batch[index++].Token;
            if (!ticket.TryGetProperty("status", out var status) || status.GetString() == "ok")
                continue;

            var error = ticket.TryGetProperty("details", out var details)
                        && details.TryGetProperty("error", out var errorCode)
                ? errorCode.GetString()
                : null;
            if (string.Equals(error, "DeviceNotRegistered", StringComparison.Ordinal))
                invalid.Add(token);
            else
                _logger.LogWarning("O Expo recusou uma notificação push: {Error}.", error ?? "erro não informado");
        }

        return invalid;
    }
}
