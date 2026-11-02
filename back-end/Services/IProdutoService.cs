using Microsoft.AspNetCore.Mvc;
using PIM3.API.DTOs;

namespace PIM3.API.Services;

public interface IProdutoService
{
    IActionResult GetAll();
    IActionResult GetById(int id);
    Task<IActionResult> Create(ProdutoDto dto);
    Task<IActionResult> Update(int id, ProdutoDto dto);
    Task<IActionResult> Delete(int id);
    Task<IActionResult> AjustarEstoque(int id, AjusteEstoqueDTO ajuste, string? usuario);
}
