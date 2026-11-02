using Microsoft.AspNetCore.Mvc;
using PIM3.API.Controllers;

namespace PIM3.API.Services;

public interface ILogService
{
    Task<IActionResult> ListarLogsSistema(int pagina, int tamanho, string? filtro);
    Task<IActionResult> RegistrarLog(CriarLogDTO logDTO, string usuarioLog);
    Task<IActionResult> ListarLogsComanda(int idComanda);
}
