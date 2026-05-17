using System.ComponentModel.DataAnnotations.Schema;

namespace PIM3.API.Models;

[Table("LOG_COMANDA")]
public class LogComanda
{
    [Column("ID_LOG_COMANDA")]
    public int IdLogComanda { get; set; }

    [Column("DATA_LOG")]
    public DateTime DataLog { get; set; }

    [Column("ACAO_LOG")]
    public string AcaoLog { get; set; } = string.Empty;

    [Column("ID_COMANDA")]
    public int IdComanda { get; set; }

    [Column("ID_FUNCIONARIO")]
    public int IdFuncionario { get; set; }

    // Relacionamentos
    public Comanda? Comanda { get; set; }
    public Funcionario? Funcionario { get; set; }
}
