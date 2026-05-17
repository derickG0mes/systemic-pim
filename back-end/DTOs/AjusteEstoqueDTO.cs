namespace PIM3.API.DTOs;

public class AjusteEstoqueDTO
{
    public string Tipo { get; set; } // "ADICIONAR" ou "REMOVER"
    public int Quantidade { get; set; }
    public string Motivo { get; set; } // Ex: "Dano no recebimento", "Erro de lançamento", etc
}
