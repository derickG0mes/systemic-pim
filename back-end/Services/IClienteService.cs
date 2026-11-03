using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using PIM3.API.Models;

namespace PIM3.API.Services;

public interface IClienteService
{
    IActionResult GetAll(int? pagina, int? tamanho, HttpResponse response);
    IActionResult GetById(int id);
    Task<IActionResult> Create(Cliente cliente);
    Task<IActionResult> Update(int id, Cliente clienteAtualizado);
    Task<IActionResult> Delete(int id);
}
