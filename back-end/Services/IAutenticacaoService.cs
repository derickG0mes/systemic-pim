using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using PIM3.API.DTOs;

namespace PIM3.API.Services;

public interface IAutenticacaoService
{
    Task<IActionResult> Login(LoginDTO loginDTO, HttpResponse response);
}
