namespace PIM3.API.Helpers;

public static class TimeZoneHelper
{
    // Fuso horário oficial de Brasília
    private static readonly string TimeZoneId = "E. South America Standard Time";
    private static readonly TimeZoneInfo BrazilTimeZone = TimeZoneInfo.FindSystemTimeZoneById(TimeZoneId);

    /// <summary>
    /// Retorna a data e hora atual estritamente no fuso horário de Brasília (UTC-3),
    /// ignorando o relógio local do servidor onde a aplicação está rodando.
    /// </summary>
    public static DateTime GetBrazilTime()
    {
        return TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, BrazilTimeZone);
    }
}
