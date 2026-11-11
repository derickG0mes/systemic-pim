using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace PIM3.API.DTOs;

/// <summary>Corpo de PUT /api/notificacoes/dispositivos.</summary>
public sealed class RegisterPushDeviceDto
{
    /// <summary>Token do Expo, no formato ExponentPushToken[...] ou ExpoPushToken[...].</summary>
    [Required]
    [StringLength(200)]
    [JsonPropertyName("token")]
    public string Token { get; set; } = string.Empty;

    /// <summary>"android" ou "ios".</summary>
    [Required]
    [StringLength(20)]
    [JsonPropertyName("plataforma")]
    public string Platform { get; set; } = string.Empty;
}

/// <summary>Corpo de DELETE /api/notificacoes/dispositivos.</summary>
public sealed class UnregisterPushDeviceDto
{
    [Required]
    [StringLength(200)]
    [JsonPropertyName("token")]
    public string Token { get; set; } = string.Empty;
}
