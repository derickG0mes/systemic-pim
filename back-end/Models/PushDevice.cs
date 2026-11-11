using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PIM3.API.Models;

/// <summary>
/// Dispositivo móvel registrado para receber notificações push (token do Expo).
/// Um funcionário pode ter vários dispositivos; cada token pertence a um só funcionário.
/// </summary>
[Table("DISPOSITIVO_PUSH")]
public sealed class PushDevice
{
    [Key]
    [Column("ID_DISPOSITIVO_PUSH")]
    public int Id { get; set; }

    [Column("ID_FUNCIONARIO")]
    public int EmployeeId { get; set; }

    [Column("TOKEN")]
    [MaxLength(200)]
    public string Token { get; set; } = string.Empty;

    [Column("PLATAFORMA")]
    [MaxLength(20)]
    public string Platform { get; set; } = string.Empty;

    [Column("CRIADO_EM")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("ATUALIZADO_EM")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
