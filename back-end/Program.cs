using System.Text;
using System.Net;
using Microsoft.Data.SqlClient;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using PIM3.API.Data;
using PIM3.API.Helpers;
using PIM3.API.Hubs;
using PIM3.API.Services;
using PIM3.API;

// Carregar variáveis de ambiente do arquivo .env
EnvLoader.Load(Path.Combine(Directory.GetCurrentDirectory(), ".env"));

var builder = WebApplication.CreateBuilder(args);
builder.WebHost.UseUrls(ApiMetadata.ListenUrl);

var dbServer = Environment.GetEnvironmentVariable("DB_SERVER") ?? "localhost";
var dbName = Environment.GetEnvironmentVariable("DB_NAME") ?? "DB_RESTAURANTE";
var dbUser = Environment.GetEnvironmentVariable("DB_USER") ?? "sa";
var dbPassword = Environment.GetEnvironmentVariable("DB_PASSWORD") ?? "";

var csBuilder = new SqlConnectionStringBuilder
{
    DataSource = dbServer,
    InitialCatalog = dbName,
    UserID = dbUser,
    Password = dbPassword,
    TrustServerCertificate = true
};
var connectionString = csBuilder.ConnectionString;

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(connectionString)
);

var forwardedProxyAddresses = builder.Configuration["FORWARDED_HEADERS_KNOWN_PROXIES"];
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.ForwardLimit = 1;

    if (string.IsNullOrWhiteSpace(forwardedProxyAddresses))
        return;

    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
    foreach (var address in forwardedProxyAddresses.Split(
                 ',',
                 StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
    {
        if (!IPAddress.TryParse(address, out var proxyAddress))
            throw new InvalidOperationException("FORWARDED_HEADERS_KNOWN_PROXIES deve conter endereços IP válidos separados por vírgula.");

        options.KnownProxies.Add(proxyAddress);
    }
});

string jwtSecretKey;
try
{
    jwtSecretKey = JwtService.ValidateSecretKey(
        Environment.GetEnvironmentVariable("JWT_SECRET_KEY") ?? builder.Configuration["Jwt:SecretKey"],
        builder.Environment.IsDevelopment());
}
catch (InvalidOperationException exception)
{
    Console.Error.WriteLine(exception.Message);
    Environment.ExitCode = 1;
    return;
}

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecretKey)),
            ValidateIssuer = true,
            ValidIssuer = "PIM4.API",
            ValidateAudience = true,
            ValidAudience = "PIM4.API.Users",
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(5)
        };

        // Navegadores enviam o access token na query string para o hub SignalR.
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                if (context.Request.Cookies.TryGetValue(JwtService.AuthCookieName, out var cookieToken))
                    context.Token = cookieToken;
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddScoped<JwtService>();
builder.Services.AddScoped<BackupService>();
builder.Services.AddScoped<PIM3.API.Services.Backup.BackupRestoreService>();
builder.Services.AddScoped<IComandaService, ComandaService>();
builder.Services.AddScoped<IPedidoService, PedidoService>();
builder.Services.AddScoped<IFaturamentoService, FaturamentoService>();

builder.Services.AddSignalR();

var productionCorsOrigins = (builder.Configuration["CORS_ALLOWED_ORIGINS"] ?? "https://seusite.com")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

builder.Services.AddCors(options =>
{
    options.AddPolicy("DevCors", policy =>
    {
        policy.WithOrigins(
                "http://localhost:8080",
                "http://127.0.0.1:8080",
                "http://localhost:5173",
                "http://127.0.0.1:5173")
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });

    options.AddPolicy("ProdCors", policy =>
    {
        policy.WithOrigins(productionCorsOrigins)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

builder.Services.AddAntiforgery(options =>
{
    options.HeaderName = "X-CSRF-TOKEN";
    options.Cookie.Name = "systemic_csrf";
    options.Cookie.HttpOnly = true;
    options.Cookie.SameSite = SameSiteMode.Strict;
    options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
});

// 5. CONFIGURAÇÃO DE CONTROLLERS E DOCUMENTAÇÃO
builder.Services.AddControllersWithViews(options =>
{
    options.Filters.Add(new AutoValidateAntiforgeryTokenAttribute());
}).AddJsonOptions(options =>
{
    options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
    options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
});
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Systemic API - PIM IV",
        Version = ApiMetadata.Version,
        Description = "API para gerenciamento de restaurantes e operações do Systemic."
    });
    options.AddServer(new OpenApiServer { Url = ApiMetadata.BaseUrl });
});

// CONSTRUIR E CONFIGURAR A APLICAÇÃO
var app = builder.Build();
app.UseForwardedHeaders();

// Mostrar documentação Swagger em desenvolvimento
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", $"Systemic API - PIM IV v{ApiMetadata.Version}");
        c.RoutePrefix = "swagger";
    });
}

app.UseRouting();
if (app.Environment.IsDevelopment())
{
    app.UseCors("DevCors");
}
else
{
    app.UseCors("ProdCors");
}
app.UseAuthentication();

// Usar autorização
app.UseAuthorization();

// Redirecionar HTTP para HTTPS (segurança) - apenas em produção
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

// Mapear todos os controllers
app.MapControllers();

// Mapear SignalR Hub para comunicação em tempo real
app.MapHub<CozinhaHub>("/hubs/cozinha");

// VERIFICAR CONEXÃO COM O BANCO DE DADOS
app.Lifetime.ApplicationStarted.Register(() =>
{
    _ = Task.Run(async () =>
    {
        try
        {
            await using var scope = app.Services.CreateAsyncScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            if (!await dbContext.Database.CanConnectAsync())
                app.Logger.LogWarning("Database connection check failed.");
        }
        catch (Exception ex)
        {
            app.Logger.LogError(ex, "Database connection check failed.");
        }
    });
});

// INICIAR A APLICAÇÃO
// ═══════════════════════════════════════════════════════════════

Console.WriteLine($"Systemic API - PIM IV iniciada em {ApiMetadata.BaseUrl} (Swagger: /swagger)");
await app.RunAsync();
