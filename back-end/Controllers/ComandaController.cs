using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PIM3.API.DTOs;
using PIM3.API.Models;
using PIM3.API.Services;

namespace PIM3.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "employee,admin,owner")]
public class ComandaController : ControllerBase
{
    private readonly IComandaService _service;

    public ComandaController(IComandaService service) => _service = service;

    [HttpGet]
    public IActionResult GetAll() => _service.GetAll();

    [HttpGet("{id}")]
    public IActionResult GetById(int id) => _service.GetById(id);

    [HttpGet("abertas/todas")]
    [Authorize]
    public IActionResult GetAbertasComTotais() => _service.GetAbertasComTotais();

    [HttpGet("mesa/{tableNumber}")]
    public IActionResult GetComandasByTable(int tableNumber) => _service.GetComandasByTable(tableNumber);

    [HttpPut("{id}")]
    public Task<IActionResult> Update(int id, [FromBody] Comanda comandaAtualizada) => _service.Update(id, comandaAtualizada);

    [HttpPost]
    public Task<IActionResult> Create([FromBody] Comanda comanda) => _service.Create(comanda);

    [HttpPost("{id}/itens")]
    public Task<IActionResult> AddItem(int id, [FromBody] ItemComanda item) => _service.AddItem(id, item);

    [HttpPut("{id}/pagar")]
    public Task<IActionResult> Pagar(int id, [FromBody] PagarComandaDTO dto) =>
        _service.Pagar(id, dto, User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

    [HttpPut("{id}/fechar")]
    public Task<IActionResult> Close(int id) =>
        _service.Close(id, User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

    [HttpDelete("{id}/itens/{itemId}")]
    public Task<IActionResult> RemoveItem(int id, int itemId) => _service.RemoveItem(id, itemId);

    [HttpPut("{id}/inadimplente")]
    public Task<IActionResult> MarcarInadimplente(int id) => _service.MarcarInadimplente(id);

    [HttpDelete("{id}")]
    public Task<IActionResult> Delete(int id) => _service.Delete(id);
}
