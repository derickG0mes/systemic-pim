using System.ComponentModel.DataAnnotations;

namespace PIM3.API.Models;

public class Mesa
{
    public int IdMesa { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "Número da mesa deve ser maior que 0")]
    public int NumeroMesa { get; set; }

    public string StatusMesa { get; set; } = "DISPONIVEL";

    [Range(1, int.MaxValue, ErrorMessage = "Capacidade da mesa deve ser maior que 0")]
    public int CapacidadeMesa { get; set; }
}
