namespace PIM3.API.DTOs;

/// <summary>
/// DTO padrão para retornar respostas da API (sucesso ou erro)
/// </summary>
public class RespostaPadraoDTO
{
    // Indica se a operação foi bem-sucedida
    public bool Sucesso { get; set; }
    
    // Mensagem descritiva da operação
    public string Mensagem { get; set; } = string.Empty;
    
    // Dados retornados pela operação (genérico)
    public object? Dados { get; set; }
    
    // Código do erro (se aplicável)
    public string? CodigoErro { get; set; }
}
