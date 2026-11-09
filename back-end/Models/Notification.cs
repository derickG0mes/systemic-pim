using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PIM3.API.Models;

[Table("NOTIFICACAO")]
public sealed class Notification
{
    [Key]
    [Column("ID_NOTIFICACAO")]
    public int Id { get; set; }

    [Column("ID_FUNCIONARIO")]
    public int EmployeeId { get; set; }

    [Column("TIPO")]
    [MaxLength(40)]
    public string Type { get; set; } = string.Empty;

    [Column("TITULO")]
    [MaxLength(120)]
    public string Title { get; set; } = string.Empty;

    [Column("MENSAGEM")]
    [MaxLength(500)]
    public string Message { get; set; } = string.Empty;

    [Column("LINK")]
    [MaxLength(200)]
    public string Link { get; set; } = string.Empty;

    [Column("CRIADA_EM")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("LIDA_EM")]
    public DateTime? ReadAt { get; set; }
}
