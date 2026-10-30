using Microsoft.AspNetCore.Mvc;
using PIM3.API.DTOs;

namespace PIM3.API.Services;

public interface IPedidoService
{
    Task<IActionResult> ListarPedidos();
    Task<IActionResult> ObterPedido(int id);
    Task<IActionResult> CriarPedido(CriarPedidoDTO pedidoDTO);
    Task<IActionResult> AtualizarPedido(int id, CriarPedidoDTO pedidoAtualizado);
    Task<IActionResult> AtualizarStatusPedido(int id, AtualizarStatusPedidoDTO statusDTO);
    Task<IActionResult> DeletarPedido(int id);
}
