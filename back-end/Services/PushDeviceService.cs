using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using PIM3.API.Data;
using PIM3.API.Models;

namespace PIM3.API.Services;

public sealed partial class PushDeviceService : IPushDeviceService
{
    /// <summary>Quantidade máxima de dispositivos mantidos por funcionário (os mais recentes).</summary>
    internal const int MaxDevicesPerEmployee = 5;

    private static readonly string[] AllowedPlatforms = ["android", "ios"];

    private readonly AppDbContext _context;

    public PushDeviceService(AppDbContext context) => _context = context;

    [GeneratedRegex(@"^(Exponent|Expo)PushToken\[[A-Za-z0-9_\-]{8,150}\]$", RegexOptions.CultureInvariant)]
    private static partial Regex ExpoTokenPattern();

    internal static bool IsValidExpoToken(string? token) =>
        !string.IsNullOrWhiteSpace(token) && ExpoTokenPattern().IsMatch(token);

    public async Task<PushDeviceRegistrationResult> RegisterAsync(int employeeId, string token, string platform)
    {
        token = token?.Trim() ?? string.Empty;
        if (!IsValidExpoToken(token))
            return PushDeviceRegistrationResult.InvalidToken;

        var normalizedPlatform = platform?.Trim().ToLowerInvariant() ?? string.Empty;
        if (!AllowedPlatforms.Contains(normalizedPlatform))
            return PushDeviceRegistrationResult.InvalidPlatform;

        try
        {
            await UpsertAsync(employeeId, token, normalizedPlatform);
        }
        catch (DbUpdateException exception) when (SqlServerExceptionHelper.IsUniqueConstraintViolation(exception))
        {
            // Duas requisições registraram o mesmo token ao mesmo tempo: tenta uma vez mais,
            // agora encontrando a linha criada pela outra requisição.
            _context.ChangeTracker.Clear();
            await UpsertAsync(employeeId, token, normalizedPlatform);
        }

        return PushDeviceRegistrationResult.Registered;
    }

    public Task UnregisterAsync(int employeeId, string token)
    {
        token = token?.Trim() ?? string.Empty;
        return _context.PushDevices
            .Where(device => device.EmployeeId == employeeId && device.Token == token)
            .ExecuteDeleteAsync();
    }

    private async Task UpsertAsync(int employeeId, string token, string platform)
    {
        var now = DateTime.UtcNow;
        var device = await _context.PushDevices.FirstOrDefaultAsync(item => item.Token == token);
        if (device is null)
        {
            _context.PushDevices.Add(new PushDevice
            {
                EmployeeId = employeeId,
                Token = token,
                Platform = platform,
                CreatedAt = now,
                UpdatedAt = now,
            });
        }
        else
        {
            device.EmployeeId = employeeId;
            device.Platform = platform;
            device.UpdatedAt = now;
        }

        await _context.SaveChangesAsync();

        var staleIds = await _context.PushDevices
            .Where(item => item.EmployeeId == employeeId)
            .OrderByDescending(item => item.UpdatedAt)
            .ThenByDescending(item => item.Id)
            .Skip(MaxDevicesPerEmployee)
            .Select(item => item.Id)
            .ToListAsync();
        if (staleIds.Count > 0)
        {
            await _context.PushDevices
                .Where(item => staleIds.Contains(item.Id))
                .ExecuteDeleteAsync();
        }
    }
}
