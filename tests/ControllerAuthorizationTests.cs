using System.Reflection;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Routing;
using PIM3.API.Controllers;
using Xunit;

namespace back_end.Tests;

public class ControllerAuthorizationTests
{
    private static readonly HashSet<(string Controller, string Action)> ExpectedAnonymousActions = new()
    {
        ("AutenticacaoController", "GetCsrfToken"),
        ("AutenticacaoController", "Logout"),
        ("AutenticacaoController", "Login"),
        ("FuncionarioController", "Login"),
        ("HealthCheckController", "HealthCheck"),
        ("HealthCheckController", "HealthCheckDatabase"),
        ("HealthCheckController", "Info")
    };

    [Fact]
    public void All_controller_http_actions_must_have_explicit_authorization_or_anonymous_policy()
    {
        var controllerBaseType = typeof(ControllerBase);
        var controllerTypes = typeof(HealthCheckController).Assembly.GetTypes()
            .Where(t => controllerBaseType.IsAssignableFrom(t) && !t.IsAbstract)
            .ToList();

        var unprotectedActions = new List<string>();

        foreach (var controller in controllerTypes)
        {
            var controllerHasAuthorize = controller.GetCustomAttribute<AuthorizeAttribute>(inherit: true) != null;
            var controllerHasAllowAnonymous = controller.GetCustomAttribute<AllowAnonymousAttribute>(inherit: true) != null;

            var methods = controller.GetMethods(BindingFlags.Instance | BindingFlags.Public | BindingFlags.DeclaredOnly)
                .Where(m => !m.IsSpecialName && (
                    m.GetCustomAttributes().OfType<HttpMethodAttribute>().Any() ||
                    typeof(IActionResult).IsAssignableFrom(m.ReturnType) ||
                    (m.ReturnType.IsGenericType && m.ReturnType.GetGenericTypeDefinition() == typeof(Task<>) &&
                     typeof(IActionResult).IsAssignableFrom(m.ReturnType.GetGenericArguments()[0]))));

            foreach (var method in methods)
            {
                var methodHasAuthorize = method.GetCustomAttribute<AuthorizeAttribute>(inherit: true) != null;
                var methodHasAllowAnonymous = method.GetCustomAttribute<AllowAnonymousAttribute>(inherit: true) != null;

                var isProtected = controllerHasAuthorize || methodHasAuthorize;
                var isExplicitAnonymous = controllerHasAllowAnonymous || methodHasAllowAnonymous;

                if (!isProtected && !isExplicitAnonymous)
                {
                    unprotectedActions.Add($"{controller.Name}.{method.Name}");
                }
                else if (isExplicitAnonymous)
                {
                    Assert.True(
                        ExpectedAnonymousActions.Contains((controller.Name, method.Name)),
                        $"Action {controller.Name}.{method.Name} is marked [AllowAnonymous] but is not registered in ExpectedAnonymousActions.");
                }
            }
        }

        Assert.Empty(unprotectedActions);
    }
}
