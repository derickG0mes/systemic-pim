using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using PIM3.API.Data;
using PIM3.API.DTOs;
using PIM3.API.Models;
using PIM3.API.Services;

namespace PIM3.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "employee,admin,owner")]
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
        var produtos = _context.Produtos.ToList().Select(CategoriaProdutoHelper.Mapear).ToList();
        return Ok(new RespostaPadraoDTO { Sucesso = true, Dados = produtos });
    }

    [HttpGet("{id}")]
    public IActionResult GetById(int id)
    {
        var produto = _context.Produtos.FirstOrDefault(p => p.IdProduto == id);
        if (produto == null)
            return NotFound(new RespostaPadraoDTO { Sucesso = false, Mensagem = "Produto não encontrado" });

        return Ok(new RespostaPadraoDTO { Sucesso = true, Dados = CategoriaProdutoHelper.Mapear(produto) });
    }

    [HttpPost]
    [Authorize(Roles = "admin,owner")]
    public async Task<IActionResult> Create([FromBody] ProdutoDto dto)
    {
        if (string.IsNullOrEmpty(dto.NomeProduto))
            return BadRequest(new RespostaPadraoDTO { Sucesso = false, Mensagem = "Nome do produto é obrigatório" });

        var produto = new Produto
        {
            NomeProduto = dto.NomeProduto,
            DescricaoProduto = dto.DescricaoProduto,
            PrecoProduto = dto.PrecoProduto,
            QtdEstoque = dto.QtdEstoque,
            EstoqueMinimo = dto.EstoqueMinimo > 0 ? dto.EstoqueMinimo : 5,
            StatusProduto = string.IsNullOrEmpty(dto.StatusProduto) ? "DISPONIVEL" : dto.StatusProduto,
            CategoriaProduto = CategoriaProdutoHelper.ParaBanco(dto.Categoria ?? dto.CategoriaProduto)
        };

        _context.Produtos.Add(produto);
        await _context.SaveChangesAsync();
        LogSistemaHelper.Registrar(_context, "ESTOQUE", $"Produto criado: {produto.NomeProduto}");
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = produto.IdProduto },
            new RespostaPadraoDTO { Sucesso = true, Mensagem = "Produto criado com sucesso", Dados = CategoriaProdutoHelper.Mapear(produto) });
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "admin,owner")]
    public async Task<IActionResult> Update(int id, [FromBody] ProdutoDto dto)
    {
        var produto = _context.Produtos.FirstOrDefault(p => p.IdProduto == id);
        if (produto == null)
            return NotFound(new RespostaPadraoDTO { Sucesso = false, Mensagem = "Produto não encontrado" });

        produto.NomeProduto = dto.NomeProduto;
        produto.DescricaoProduto = dto.DescricaoProduto;
        produto.QtdEstoque = dto.QtdEstoque;
        produto.PrecoProduto = dto.PrecoProduto;
        produto.EstoqueMinimo = dto.EstoqueMinimo;
        produto.StatusProduto = dto.StatusProduto;
        if (!string.IsNullOrEmpty(dto.Categoria) || !string.IsNullOrEmpty(dto.CategoriaProduto))
            produto.CategoriaProduto = CategoriaProdutoHelper.ParaBanco(dto.Categoria ?? dto.CategoriaProduto);

        _context.Produtos.Update(produto);
        await _context.SaveChangesAsync();
        LogSistemaHelper.Registrar(_context, "ESTOQUE", $"Produto atualizado: {produto.NomeProduto}");
        await _context.SaveChangesAsync();

        return Ok(new RespostaPadraoDTO { Sucesso = true, Mensagem = "Produto atualizado", Dados = CategoriaProdutoHelper.Mapear(produto) });
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "admin,owner")]
    public async Task<IActionResult> Delete(int id)
    {
        var produto = _context.Produtos.FirstOrDefault(p => p.IdProduto == id);
        if (produto == null)
            return NotFound(new RespostaPadraoDTO { Sucesso = false, Mensagem = "Produto não encontrado" });

        _context.Produtos.Remove(produto);
        await _context.SaveChangesAsync();
        LogSistemaHelper.Registrar(_context, "ESTOQUE", $"Produto removido: {produto.NomeProduto}");
        await _context.SaveChangesAsync();

        return Ok(new RespostaPadraoDTO { Sucesso = true, Mensagem = "Produto deletado com sucesso" });
    }

    [HttpPut("{id}/ajustar-estoque")]
    [Authorize(Roles = "admin,owner")]
    public async Task<IActionResult> AjustarEstoque(int id, [FromBody] AjusteEstoqueDTO ajuste)
    {
        if (ajuste == null || string.IsNullOrEmpty(ajuste.Motivo))
            return BadRequest(new RespostaPadraoDTO { Sucesso = false, Mensagem = "Motivo do ajuste é obrigatório" });

        var produto = _context.Produtos.FirstOrDefault(p => p.IdProduto == id);
        if (produto == null)
            return NotFound(new RespostaPadraoDTO { Sucesso = false, Mensagem = "Produto não encontrado" });

        List<AjusteEstoqueSqlResultDto> resultados;
        try
        {
            resultados = await DatabaseRoutineQueries.AjustarEstoqueAsync(
                _context,
                id,
                ajuste.Tipo == "ADICIONAR" ? "ADICIONAR" : "REMOVER",
                ajuste.Quantidade,
                ajuste.Motivo,
                User.Identity?.Name ?? string.Empty);
        }
        catch (SqlException exception) when (exception.Number == 50025)
        {
            return BadRequest(new RespostaPadraoDTO
            {
                Sucesso = false,
                Mensagem = $"Estoque insuficiente. Disponível: {produto.QtdEstoque}"
            });
        }

        var resultado = resultados.Single();
        produto.QtdEstoque = resultado.QuantidadeNova;

        return Ok(new RespostaPadraoDTO
        {
            Sucesso = true,
            Mensagem = "Estoque ajustado com sucesso",
            Dados = new
            {
                quantidadeAnterior = resultado.QuantidadeAnterior,
                quantidadeNova = resultado.QuantidadeNova,
                motivo = ajuste.Motivo,
                produto = CategoriaProdutoHelper.Mapear(produto)
            }
        });
    }
}
