namespace PIM3.API.Models;

public class Cliente
{
    public int IdCliente { get; set; }
    public string NomeCliente { get; set; } = string.Empty;
    public string TelefoneCliente { get; set; } = string.Empty;
    public string? Feedback { get; set; }
}
