namespace PIM3.API.Services;

public enum PushDeviceRegistrationResult
{
    Registered,
    InvalidToken,
    InvalidPlatform,
}

public interface IPushDeviceService
{
    /// <summary>
    /// Registra (ou transfere para o funcionário) o token push de um dispositivo.
    /// O mesmo token nunca fica associado a dois funcionários.
    /// </summary>
    Task<PushDeviceRegistrationResult> RegisterAsync(int employeeId, string token, string platform);

    /// <summary>Remove o token, somente se ele pertencer ao funcionário informado.</summary>
    Task UnregisterAsync(int employeeId, string token);
}
