namespace PIM3.API.Models;

public class Reserva
{
    public int IdReserva { get; set; }
    public int IdCliente { get; set; }
    public int IdMesa { get; set; }
    public DateTime DataReserva { get; set; }
    public string StatusReserva { get; set; } = "DISPONIVEL";

    // Relacionamentos
    public Cliente? Cliente { get; set; }
    public Mesa? Mesa { get; set; }
}
