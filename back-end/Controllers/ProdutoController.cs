using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PIM3.API.DTOs;
using PIM3.API.Services;

namespace PIM3.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "employee,admin,owner")]
public class ProdutoController : ControllerBase
{
    private readonly IProdutoService _service;

    public ProdutoController(IProdutoService service)
    {
        _service = service;
    }

    [HttpGet]
    public IActionResult GetAll() => _service.GetAll();

    [HttpGet("{id}")]
    public IActionResult GetById(int id) => _service.GetById(id);

    [HttpPost]
    [Authorize(Roles = "admin,owner")]
    public Task<IActionResult> Create([FromBody] ProdutoDto dto) => _service.Create(dto);

    [HttpPut("{id}")]
    [Authorize(Roles = "admin,owner")]
    public Task<IActionResult> Update(int id, [FromBody] ProdutoDto dto) => _service.Update(id, dto);

    [HttpDelete("{id}")]
    [Authorize(Roles = "admin,owner")]
    public Task<IActionResult> Delete(int id) => _service.Delete(id);

    [HttpPut("{id}/ajustar-estoque")]
    [Authorize(Roles = "admin,owner")]
    public Task<IActionResult> AjustarEstoque(int id, [FromBody] AjusteEstoqueDTO ajuste) =>
        _service.AjustarEstoque(id, ajuste, User.Identity?.Name);
}
