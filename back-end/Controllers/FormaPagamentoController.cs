using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PIM3.API.Models;
using PIM3.API.Services;

namespace PIM3.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "employee,admin,owner")]
public class FormaPagamentoController : ControllerBase
{
    private readonly IFormaPagamentoService _service;

    public FormaPagamentoController(IFormaPagamentoService service)
    {
        _service = service;
    }

    [HttpGet]
    public IActionResult GetAll() => _service.GetAll();

    [HttpGet("{id}")]
    public IActionResult GetById(int id) => _service.GetById(id);

    [HttpPost]
    [Authorize(Roles = "admin,owner")]
    public Task<IActionResult> Create([FromBody] FormaPagamento forma) => _service.Create(forma);

    [HttpPut("{id}")]
    [Authorize(Roles = "admin,owner")]
    public Task<IActionResult> Update(int id, [FromBody] FormaPagamento formaAtualizada) =>
        _service.Update(id, formaAtualizada);

    [HttpDelete("{id}")]
    [Authorize(Roles = "admin,owner")]
    public Task<IActionResult> Delete(int id) => _service.Delete(id);
}
