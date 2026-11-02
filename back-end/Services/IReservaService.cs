using Microsoft.AspNetCore.Mvc;
using PIM3.API.DTOs;

namespace PIM3.API.Services;

public interface IReservaService
{
    Task<IActionResult> ListarReservas();
    Task<IActionResult> CriarReserva(CriarReservaDTO dto);
    Task<IActionResult> CancelarReserva(int id);
}
