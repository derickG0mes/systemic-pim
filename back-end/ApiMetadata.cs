namespace PIM3.API;

public static class ApiMetadata
{
    public const string Version = "2.0";
    public const int Port = 5050;

    public static string BaseUrl => $"http://localhost:{Port}";
    public static string ListenUrl => $"http://0.0.0.0:{Port}";
}
