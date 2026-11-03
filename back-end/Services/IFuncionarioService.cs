using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using PIM3.API.DTOs;

namespace PIM3.API.Services;

public interface IFuncionarioService
{
    Task<IActionResult> Login(LoginRequest request, HttpResponse response);
    IActionResult GetAll(int? pagina, int? tamanho, HttpResponse response);
    IActionResult GetById(int id);
    Task<IActionResult> Create(CreateFuncionarioRequest request, ClaimsPrincipal user);
    Task<IActionResult> Update(int id, CreateFuncionarioRequest request, ClaimsPrincipal user);
    Task<IActionResult> Delete(int id, ClaimsPrincipal user);
}
