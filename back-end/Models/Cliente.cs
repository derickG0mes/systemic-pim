using System.ComponentModel.DataAnnotations.Schema;

namespace PIM3.API.Models;

[Table("CLIENTE")]
public class Cliente
{
    [Column("ID_CLIENTE")]
    public int IdCliente { get; set; }

    [Column("NOME_CLIENTE")]
    public string NomeCliente { get; set; } = string.Empty;

    [Column("TELEFONE_CLIENTE")]
    public string TelefoneCliente { get; set; } = string.Empty;

    [Column("FEEDBACK")]
    public string? Feedback { get; set; }
}
