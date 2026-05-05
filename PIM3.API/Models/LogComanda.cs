namespace PIM3.API.Models;

public class LogComanda
{
    public int IdLogComanda { get; set; }
    public DateTime DataLog { get; set; }
    public string AcaoLog { get; set; } = string.Empty;
    public int IdComanda { get; set; }
    public int IdFuncionario { get; set; }

    // Relacionamentos
    public Comanda? Comanda { get; set; }
    public Funcionario? Funcionario { get; set; }
}
