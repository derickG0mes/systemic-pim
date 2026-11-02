using Microsoft.AspNetCore.Mvc;
using PIM3.API.Models;

namespace PIM3.API.Services;

public interface IMesaService
{
    IActionResult GetAll();
    IActionResult GetById(int id);
    Task<IActionResult> Create(Mesa mesa);
    Task<IActionResult> Update(int id, Mesa mesaAtualizada);
    Task<IActionResult> Delete(int id);
}
