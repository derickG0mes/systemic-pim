using System.Text.Json.Serialization;

namespace PIM3.API.DTOs;

public class AjusteEstoqueDTO
{
    public string? Tipo { get; set; }
    public int Quantidade { get; set; }
    public string? Motivo { get; set; }
}

public class ProdutoDto
{
    public int IdProduto { get; set; }
    [JsonPropertyName("nomeProduto")]
    public string NomeProduto { get; set; } = string.Empty;
    [JsonPropertyName("descricaoProduto")]
    public string? DescricaoProduto { get; set; }
    [JsonPropertyName("precoProduto")]
    public decimal PrecoProduto { get; set; }
    [JsonPropertyName("qtdEstoque")]
    public int QtdEstoque { get; set; }
    [JsonPropertyName("estoqueMinimo")]
    public int EstoqueMinimo { get; set; }
    [JsonPropertyName("statusProduto")]
    public string StatusProduto { get; set; } = "DISPONIVEL";
    [JsonPropertyName("categoriaProduto")]
    public string CategoriaProduto { get; set; } = string.Empty;
    [JsonPropertyName("categoria")]
    public string Categoria { get; set; } = string.Empty;
}

public static class CategoriaProdutoHelper
{
    public static string ParaFront(string? categoriaDb, string nomeProduto)
    {
        var cat = (categoriaDb ?? "").ToUpperInvariant();
        if (cat == "ENTRADA") return "Entradas";
        if (cat == "BEBIDA") return "Bebidas";
        if (cat == "SOBREMESA") return "Sobremesas";
        if (cat == "PRINCIPAL") return InferirPrincipal(nomeProduto);
        if (categoriaDb is "Entradas" or "Bebidas" or "Sobremesas" or "Carnes" or "Peixes" or "Massas" or "Saladas")
            return categoriaDb;
        return InferirPrincipal(nomeProduto);
    }

    public static string ParaBanco(string? categoriaFront)
    {
        if (string.IsNullOrWhiteSpace(categoriaFront)) return "PRINCIPAL";
        return categoriaFront.Trim() switch
        {
            "Entradas" => "ENTRADA",
            "Bebidas" => "BEBIDA",
            "Sobremesas" => "SOBREMESA",
            "Carnes" or "Peixes" or "Massas" or "Saladas" => "PRINCIPAL",
            _ => "PRINCIPAL"
        };
    }

    private static string InferirPrincipal(string nome)
    {
        var n = nome.ToLowerInvariant();
        if (n.Contains("salm") || n.Contains("peixe") || n.Contains("atum")) return "Peixes";
        if (n.Contains("salada")) return "Saladas";
        if (n.Contains("pizza") || n.Contains("massa") || n.Contains("risoto") || n.Contains("hamb") || n.Contains("espaguete")) return "Massas";
        if (n.Contains("picanha") || n.Contains("frango") || n.Contains("carne") || n.Contains("brasa")) return "Carnes";
        return "Massas";
    }

    public static ProdutoDto Mapear(Models.Produto p) => new()
    {
        IdProduto = p.IdProduto,
        NomeProduto = p.NomeProduto,
        DescricaoProduto = p.DescricaoProduto,
        PrecoProduto = p.PrecoProduto,
        QtdEstoque = p.QtdEstoque,
        EstoqueMinimo = p.EstoqueMinimo,
        StatusProduto = p.StatusProduto,
        CategoriaProduto = p.CategoriaProduto,
        Categoria = ParaFront(p.CategoriaProduto, p.NomeProduto)
    };
}
