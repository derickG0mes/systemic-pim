namespace PIM3.API.Services;

public static class LoginLockoutPolicy
{
    public const int MaxAttempts = 5;
    public const int DurationMinutes = 15;
}
