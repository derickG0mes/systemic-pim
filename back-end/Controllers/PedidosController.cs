using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PIM3.API.DTOs;
using PIM3.API.Services;

namespace PIM3.API.Controllers;

/// <summary>
/// Controller respons?vel pelo gerenciamento de pedidos/comandas
/// Aqui tratamos cria??o, atualiza??o e listagem de pedidos
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "employee,admin,owner")]
public class PedidosController : ControllerBase
{
    private readonly IPedidoService _service;

    public PedidosController(IPedidoService service) => _service = service;

    [HttpGet]
    public Task<IActionResult> ListarPedidos() => _service.ListarPedidos();

    [HttpGet("{id}")]
    public Task<IActionResult> ObterPedido(int id) => _service.ObterPedido(id);

    [HttpPost]
    public Task<IActionResult> CriarPedido([FromBody] CriarPedidoDTO pedidoDTO) => _service.CriarPedido(pedidoDTO);

    [HttpPut("{id}")]
    public Task<IActionResult> AtualizarPedido(int id, [FromBody] CriarPedidoDTO pedidoAtualizado) =>
        _service.AtualizarPedido(id, pedidoAtualizado);

    [HttpPut("{id}/status")]
    public Task<IActionResult> AtualizarStatusPedido(int id, [FromBody] AtualizarStatusPedidoDTO statusDTO) =>
        _service.AtualizarStatusPedido(id, statusDTO);

    [HttpDelete("{id}")]
    public Task<IActionResult> DeletarPedido(int id) => _service.DeletarPedido(id);
}
