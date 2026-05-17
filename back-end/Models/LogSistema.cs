using System.ComponentModel.DataAnnotations.Schema;

namespace PIM3.API.Models;

[Table("LOG_SISTEMA")]
public class LogSistema
{
    [Column("ID_LOG_SISTEMA")]
    public int IdLogSistema { get; set; }

    [Column("DATA_LOG")]
    public DateTime DataLog { get; set; } = DateTime.UtcNow;

    [Column("TIPO_LOG")]
    public string TipoLog { get; set; } = string.Empty;

    [Column("DESCRICAO_LOG")]
    public string DescricaoLog { get; set; } = string.Empty;

    [Column("USUARIO_LOG")]
    public string? UsuarioLog { get; set; }

    [Column("DADO_ANTERIOR")]
    public string? DadoAnterior { get; set; }

    [Column("DADO_NOVO")]
    public string? DadoNovo { get; set; }
}
