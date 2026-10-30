using Microsoft.AspNetCore.Mvc;
using PIM3.API.DTOs;
using PIM3.API.Models;

namespace PIM3.API.Services;

public interface IComandaService
{
    IActionResult GetAll();
    IActionResult GetById(int id);
    IActionResult GetAbertasComTotais();
    IActionResult GetComandasByTable(int tableNumber);
    Task<IActionResult> Update(int id, Comanda comandaAtualizada);
    Task<IActionResult> Create(Comanda comanda);
    Task<IActionResult> AddItem(int id, ItemComanda item);
    Task<IActionResult> Pagar(int id, PagarComandaDTO dto, string? idFuncionarioClaim);
    Task<IActionResult> Close(int id, string? idFuncionarioClaim);
    Task<IActionResult> RemoveItem(int id, int itemId);
    Task<IActionResult> MarcarInadimplente(int id);
    Task<IActionResult> Delete(int id);
}
