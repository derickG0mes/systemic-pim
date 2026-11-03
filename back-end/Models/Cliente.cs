using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PIM3.API.Models;

[Table("CLIENTE")]
public class Cliente
{
    [Column("ID_CLIENTE")]
    public int IdCliente { get; set; }

    [Column("NOME_CLIENTE")]
    [StringLength(100, ErrorMessage = "Nome do cliente deve ter no máximo 100 caracteres.")]
    public string NomeCliente { get; set; } = string.Empty;

    [Column("TELEFONE_CLIENTE")]
    [StringLength(11, ErrorMessage = "Telefone do cliente deve ter no máximo 11 caracteres.")]
    public string? TelefoneCliente { get; set; }

    [Column("FEEDBACK")]
    [StringLength(10, ErrorMessage = "Feedback deve ter no máximo 10 caracteres.")]
    public string? Feedback { get; set; }
}
