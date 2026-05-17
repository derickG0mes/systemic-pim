using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PIM3.API.Data;
using PIM3.API.DTOs;
using PIM3.API.Models;

namespace PIM3.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProdutoController : ControllerBase
{
    private readonly AppDbContext _context;

    public ProdutoController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public IActionResult GetAll()
    {
        var produtos = _context.Produtos.ToList();
        return Ok(produtos);
    }

    [HttpGet("{id}")]
    public IActionResult GetById(int id)
    {
        var produto = _context.Produtos.FirstOrDefault(p => p.IdProduto == id);
        if (produto == null)
            return NotFound(new { message = "Produto não encontrado" });

        return Ok(produto);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Produto produto)
    {
        if (string.IsNullOrEmpty(produto.NomeProduto) || produto.QtdEstoque < 0)
            return BadRequest(new { message = "Nome do produto e quantidade de estoque obrigatórios" });

        _context.Produtos.Add(produto);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = produto.IdProduto }, produto);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] Produto produtoAtualizado)
    {
        var produto = _context.Produtos.FirstOrDefault(p => p.IdProduto == id);
        if (produto == null)
            return NotFound(new { message = "Produto não encontrado" });

        produto.NomeProduto = produtoAtualizado.NomeProduto;
        produto.DescricaoProduto = produtoAtualizado.DescricaoProduto;
        produto.QtdEstoque = produtoAtualizado.QtdEstoque;
        produto.StatusProduto = produtoAtualizado.StatusProduto;

        _context.Produtos.Update(produto);
        await _context.SaveChangesAsync();

        return Ok(produto);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var produto = _context.Produtos.FirstOrDefault(p => p.IdProduto == id);
        if (produto == null)
            return NotFound(new { message = "Produto não encontrado" });

        _context.Produtos.Remove(produto);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Produto deletado com sucesso" });
    }

    /// <summary>
    /// Ajusta o estoque com log de movimentação obrigatório
    /// PUT: api/produto/{id}/ajustar-estoque
    /// </summary>
    [HttpPut("{id}/ajustar-estoque")]
    public async Task<IActionResult> AjustarEstoque(int id, [FromBody] AjusteEstoqueDTO ajuste)
    {
        if (ajuste == null || string.IsNullOrEmpty(ajuste.Motivo))
            return BadRequest(new { message = "Motivo do ajuste é obrigatório", sucesso = false });

        var produto = _context.Produtos.FirstOrDefault(p => p.IdProduto == id);
        if (produto == null)
            return NotFound(new { message = "Produto não encontrado", sucesso = false });

        int quantidadeAnterior = produto.QtdEstoque;
        int quantidadeNova = ajuste.Tipo == "ADICIONAR"
            ? quantidadeAnterior + ajuste.Quantidade
            : quantidadeAnterior - ajuste.Quantidade;

        // Validação: não permite estoque negativo
        if (quantidadeNova < 0)
            return BadRequest(new
            {
                message = $"Estoque insuficiente. Disponível: {quantidadeAnterior}, Tentou remover: {ajuste.Quantidade}",
                sucesso = false
            });

        produto.QtdEstoque = quantidadeNova;
        _context.Produtos.Update(produto);
        await _context.SaveChangesAsync();

        Console.WriteLine($"[ESTOQUE] Produto {produto.NomeProduto} - De {quantidadeAnterior} para {quantidadeNova} ({ajuste.Tipo}: {ajuste.Quantidade}) - Motivo: {ajuste.Motivo}");

        return Ok(new
        {
            sucesso = true,
            mensagem = "Estoque ajustado com sucesso",
            quantidadeAnterior,
            quantidadeNova,
            motivo = ajuste.Motivo,
            dados = produto
        });
    }
}
