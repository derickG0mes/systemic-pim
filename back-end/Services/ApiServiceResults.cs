using Microsoft.AspNetCore.Mvc;

namespace PIM3.API.Services;

internal static class ApiServiceResults
{
    public static IActionResult Ok(object? value) => new OkObjectResult(value);

    public static IActionResult BadRequest(object? value) => new BadRequestObjectResult(value);

    public static IActionResult NotFound(object? value) => new NotFoundObjectResult(value);

    public static IActionResult Unauthorized(object? value) => new UnauthorizedObjectResult(value);

    public static IActionResult StatusCode(int statusCode, object? value) =>
        new ObjectResult(value) { StatusCode = statusCode };

    public static IActionResult CreatedAtAction(string actionName, object? routeValues, object? value) =>
        new CreatedAtActionResult(actionName, controllerName: null, routeValues, value);
}
