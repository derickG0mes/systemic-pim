namespace PIM3.API.Services;

public interface IDatabaseHealthService
{
    Task CanConnectAsync();
}
