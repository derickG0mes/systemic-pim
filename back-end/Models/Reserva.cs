using System.ComponentModel.DataAnnotations.Schema;

namespace PIM3.API.Models;

[Table("RESERVA")]
public class Reserva
{
    [Column("ID_RESERVA")]
    public int IdReserva { get; set; }

    [Column("ID_CLIENTE")]
    public int IdCliente { get; set; }

    [Column("ID_MESA")]
    public int IdMesa { get; set; }

    [Column("DATA_RESERVA")]
    public DateTime DataReserva { get; set; }

    [Column("STATUS_RESERVA")]
    public string StatusReserva { get; set; } = "DISPONIVEL";

    // Relacionamentos
    public Cliente? Cliente { get; set; }
    public Mesa? Mesa { get; set; }
}
