using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PIM3.API.Models;
using PIM3.API.Services;

namespace PIM3.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "admin,owner")]
public class ClienteController : ControllerBase
{
    private readonly IClienteService _service;

    public ClienteController(IClienteService service)
    {
        _service = service;
    }

    [HttpGet]
    public IActionResult GetAll([FromQuery] int? pagina, [FromQuery] int? tamanho) =>
        _service.GetAll(pagina, tamanho, Response);

    [HttpGet("{id}")]
    public IActionResult GetById(int id) => _service.GetById(id);

    [HttpPost]
    public Task<IActionResult> Create([FromBody] Cliente cliente) => _service.Create(cliente);

    [HttpPut("{id}")]
    public Task<IActionResult> Update(int id, [FromBody] Cliente clienteAtualizado) =>
        _service.Update(id, clienteAtualizado);

    [HttpDelete("{id}")]
    public Task<IActionResult> Delete(int id) => _service.Delete(id);
}
