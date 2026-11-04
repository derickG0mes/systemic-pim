using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using PIM3.API.DTOs;

namespace PIM3.API.Services;

public interface IPedidoService
{
    Task<IActionResult> ListarPedidos(int? pagina, int? tamanho, HttpResponse response);
    Task<IActionResult> ObterPedido(int id);
    Task<IActionResult> CriarPedido(CriarPedidoDTO pedidoDTO);
    Task<IActionResult> AtualizarPedido(int id, CriarPedidoDTO pedidoAtualizado);
    Task<IActionResult> AtualizarStatusPedido(int id, AtualizarStatusPedidoDTO statusDTO);
    Task<IActionResult> DeletarPedido(int id);
}
