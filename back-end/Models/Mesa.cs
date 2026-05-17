using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PIM3.API.Models;

[Table("MESA")]
public class Mesa
{
    [Column("ID_MESA")]
    public int IdMesa { get; set; }

    [Column("NUMERO_MESA")]
    [Range(1, int.MaxValue, ErrorMessage = "Número da mesa deve ser maior que 0")]
    public int NumeroMesa { get; set; }

    [Column("STATUS_MESA")]
    public string StatusMesa { get; set; } = "DISPONIVEL";

    [Column("CAPACIDADE_MESA")]
    [Range(1, int.MaxValue, ErrorMessage = "Capacidade da mesa deve ser maior que 0")]
    public int CapacidadeMesa { get; set; }
}
