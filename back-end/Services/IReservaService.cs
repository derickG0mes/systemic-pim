using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using PIM3.API.DTOs;

namespace PIM3.API.Services;

public interface IReservaService
{
    Task<IActionResult> ListarReservas(int? pagina, int? tamanho, HttpResponse response);
    Task<IActionResult> CriarReserva(CriarReservaDTO dto);
    Task<IActionResult> CancelarReserva(int id);
}
