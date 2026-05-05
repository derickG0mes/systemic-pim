namespace PIM3.API.Models;

public class Mesa
{
    public int IdMesa { get; set; }
    public int NumeroMesa { get; set; }
    public string StatusMesa { get; set; } = "DISPONIVEL";
    public int CapacidadeMesa { get; set; }
}
