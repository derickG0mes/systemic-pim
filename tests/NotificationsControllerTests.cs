using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using PIM3.API.Controllers;
using PIM3.API.DTOs;
using PIM3.API.Services;

namespace back_end.Tests;

public sealed class NotificationsControllerTests
{
    [Fact]
    public async Task List_uses_the_authenticated_employee_and_requested_limit()
    {
        var service = new FakeNotificationService();
        var controller = CreateController(service, "42");

        var result = Assert.IsType<OkObjectResult>(await controller.List(25));

        Assert.Equal(42, service.EmployeeId);
        Assert.Equal(25, service.Limit);
        Assert.IsType<RespostaPadraoDTO>(result.Value);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(101)]
    public async Task List_rejects_limits_outside_the_supported_range(int limit)
    {
        var service = new FakeNotificationService();
        var controller = CreateController(service, "42");

        var result = Assert.IsType<BadRequestObjectResult>(await controller.List(limit));

        Assert.Null(service.EmployeeId);
        Assert.IsType<RespostaPadraoDTO>(result.Value);
    }

    [Fact]
    public async Task MarkRead_scopes_the_request_to_the_authenticated_employee()
    {
        var service = new FakeNotificationService();
        var controller = CreateController(service, "42");

        var result = Assert.IsType<NoContentResult>(await controller.MarkRead(7));

        Assert.Equal(42, service.EmployeeId);
        Assert.Equal(7, service.NotificationId);
    }

    [Fact]
    public async Task List_rejects_a_missing_employee_claim()
    {
        var service = new FakeNotificationService();
        var controller = CreateController(service, "not-an-id");

        var result = Assert.IsType<UnauthorizedResult>(await controller.List(10));

        Assert.Null(service.EmployeeId);
    }

    private static NotificationsController CreateController(FakeNotificationService service, string employeeId)
    {
        var controller = new NotificationsController(service)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(
                        [new Claim(ClaimTypes.NameIdentifier, employeeId)],
                        "test")),
                },
            },
        };
        return controller;
    }

    private sealed class FakeNotificationService : INotificationService
    {
        public int? EmployeeId { get; private set; }
        public int? Limit { get; private set; }
        public int? NotificationId { get; private set; }

        public Task NotifyAsync(string type, string title, string message, string href, IReadOnlyCollection<string> roles) =>
            Task.CompletedTask;

        public Task<NotificationListDto> ListAsync(int employeeId, int limit)
        {
            EmployeeId = employeeId;
            Limit = limit;
            return Task.FromResult(new NotificationListDto([], 0));
        }

        public Task<bool> MarkReadAsync(int employeeId, int notificationId)
        {
            EmployeeId = employeeId;
            NotificationId = notificationId;
            return Task.FromResult(true);
        }

        public Task<int> MarkAllReadAsync(int employeeId)
        {
            EmployeeId = employeeId;
            return Task.FromResult(0);
        }
    }
}
