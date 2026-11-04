using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PIM3.API.DTOs;
using PIM3.API.Services;

namespace PIM3.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "employee,admin,owner")]
public class ReservaController : ControllerBase
{
    private readonly IReservaService _service;

    public ReservaController(IReservaService service)
    {
        _service = service;
    }

    [HttpGet]
    public Task<IActionResult> ListarReservas([FromQuery] int? pagina, [FromQuery] int? tamanho) =>
        _service.ListarReservas(pagina, tamanho, Response);

    [HttpPost]
    public Task<IActionResult> CriarReserva([FromBody] CriarReservaDTO dto) => _service.CriarReserva(dto);

    [HttpDelete("{id}")]
    public Task<IActionResult> CancelarReserva(int id) => _service.CancelarReserva(id);
}
