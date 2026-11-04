using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PIM3.API.Models;
using PIM3.API.Services;

namespace PIM3.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "employee,admin,owner")]
public class MesaController : ControllerBase
{
    private readonly IMesaService _service;

    public MesaController(IMesaService service)
    {
        _service = service;
    }

    [HttpGet]
    public IActionResult GetAll([FromQuery] int? pagina, [FromQuery] int? tamanho) =>
        _service.GetAll(pagina, tamanho, Response);

    [HttpGet("{id}")]
    public IActionResult GetById(int id) => _service.GetById(id);

    [HttpPost]
    [Authorize(Roles = "admin,owner")]
    public Task<IActionResult> Create([FromBody] Mesa mesa) => _service.Create(mesa);

    [HttpPut("{id}")]
    [Authorize(Roles = "admin,owner")]
    public Task<IActionResult> Update(int id, [FromBody] Mesa mesaAtualizada) =>
        _service.Update(id, mesaAtualizada);

    [HttpDelete("{id}")]
    [Authorize(Roles = "admin,owner")]
    public Task<IActionResult> Delete(int id) => _service.Delete(id);
}
