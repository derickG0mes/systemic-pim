using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using PIM3.API.DTOs;
using PIM3.API.Services;

namespace PIM3.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FuncionarioController : ControllerBase
{
    private readonly IFuncionarioService _service;

    public FuncionarioController(IFuncionarioService service)
    {
        _service = service;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting("login")]
    public Task<IActionResult> Login([FromBody] LoginRequest request) =>
        _service.Login(request, Response);

    [HttpGet]
    [Authorize(Roles = "admin,owner")]
    public IActionResult GetAll([FromQuery] int? pagina, [FromQuery] int? tamanho) =>
        _service.GetAll(pagina, tamanho, Response);

    [HttpGet("{id}")]
    [Authorize(Roles = "admin,owner")]
    public IActionResult GetById(int id) => _service.GetById(id);

    [HttpPost]
    [Authorize(Roles = "admin,owner")]
    public Task<IActionResult> Create([FromBody] CreateFuncionarioRequest request) =>
        _service.Create(request, User);

    [HttpPut("{id}")]
    [Authorize(Roles = "admin,owner")]
    public Task<IActionResult> Update(int id, [FromBody] CreateFuncionarioRequest request) =>
        _service.Update(id, request, User);

    [HttpDelete("{id}")]
    [Authorize(Roles = "admin,owner")]
    public Task<IActionResult> Delete(int id) => _service.Delete(id, User);
}
