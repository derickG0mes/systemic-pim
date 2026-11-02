using Microsoft.AspNetCore.Mvc;
using PIM3.API.Models;

namespace PIM3.API.Services;

public interface IFormaPagamentoService
{
    IActionResult GetAll();
    IActionResult GetById(int id);
    Task<IActionResult> Create(FormaPagamento forma);
    Task<IActionResult> Update(int id, FormaPagamento formaAtualizada);
    Task<IActionResult> Delete(int id);
}
