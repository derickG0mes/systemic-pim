using System.Text;
using Microsoft.Data.SqlClient;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using PIM3.API.Data;
using PIM3.API.Helpers;
using PIM3.API.Hubs;
using PIM3.API.Services;

// Carregar variáveis de ambiente do arquivo .env
EnvLoader.Load(Path.Combine(Directory.GetCurrentDirectory(), ".env"));

var builder = WebApplication.CreateBuilder(args);
builder.WebHost.UseUrls("http://0.0.0.0:5050");

Console.WriteLine("╔════════════════════════════════════════════════════════════╗");
Console.WriteLine("║   INICIANDO API PIM4 - Gerenciamento de Restaurante       ║");
Console.WriteLine("║   Versão: 1.0.0 | Modo: Desenvolvimento                  ║");
Console.WriteLine("╚════════════════════════════════════════════════════════════╝\n");

// ═══════════════════════════════════════════════════════════════════════════════
// 1️⃣  CONFIGURAÇÃO DO BANCO DE DADOS
// ═══════════════════════════════════════════════════════════════════════════════
Console.WriteLine("📦 Configurando banco de dados...");

// Ler variáveis de ambiente do arquivo .env
var dbServer = Environment.GetEnvironmentVariable("DB_SERVER") ?? "localhost";
var dbName = Environment.GetEnvironmentVariable("DB_NAME") ?? "DB_RESTAURANTE";
var dbUser = Environment.GetEnvironmentVariable("DB_USER") ?? "sa";
var dbPassword = Environment.GetEnvironmentVariable("DB_PASSWORD") ?? "";

// 🔍 Verificar variáveis carregadas
Console.WriteLine($"   DB_SERVER lido: '{dbServer}'");
Console.WriteLine($"   DB_NAME lido:   '{dbName}'");
Console.WriteLine($"   DB_USER lido:   '{dbUser}'");
Console.WriteLine($"   DB_PASSWORD lido: '{(string.IsNullOrEmpty(dbPassword) ? "⚠️ VAZIO!" : "✓ preenchido")}'");

// Construir connection string com SqlConnectionStringBuilder (usando Autenticação do Windows para contornar falha de logon do 'sa')
var csBuilder = new SqlConnectionStringBuilder
{
    DataSource = dbServer,
    InitialCatalog = dbName,
    IntegratedSecurity = true,
    TrustServerCertificate = true
};
var connectionString = csBuilder.ConnectionString;
Console.WriteLine($"   ✓ Connection String: Server={dbServer}, Database={dbName}");
Console.WriteLine($"   ✓ User: {dbUser}\n");

// Adicionamos o DbContext para acesso ao SQL Server
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(connectionString)
);
Console.WriteLine("   ✓ DbContext configurado\n");

// ═══════════════════════════════════════════════════════════════════════════════
// 2️⃣  CONFIGURAÇÃO DE AUTENTICAÇÃO JWT
// ═══════════════════════════════════════════════════════════════════════════════
Console.WriteLine("🔐 Configurando autenticação JWT...");

// Ler variáveis de ambiente do arquivo .env
var jwtSecretKey = Environment.GetEnvironmentVariable("JWT_SECRET_KEY") ?? builder.Configuration["Jwt:SecretKey"];

if (string.IsNullOrWhiteSpace(jwtSecretKey) || jwtSecretKey.Length < 32)
{
    throw new InvalidOperationException("Falha na inicialização: A variável de ambiente JWT_SECRET_KEY não foi definida ou possui menos de 32 caracteres. Configure uma chave segura no arquivo .env antes de executar a aplicação.");
}

var jwtExpirationMinutes = int.TryParse(Environment.GetEnvironmentVariable("JWT_EXPIRATION_MINUTES"), out var exp) ? exp : 480;

Console.WriteLine($"   ✓ JWT Secret Key carregada");
Console.WriteLine($"   ✓ Expiração: {jwtExpirationMinutes} minutos");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecretKey)),
            ValidateIssuer = true,
            ValidIssuer = "PIM3.API",
            ValidateAudience = true,
            ValidAudience = "PIM3.API.Users",
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(5)
        };

                // Navegadores enviam o access token na query string para o hub SignalR.
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                if (!string.IsNullOrEmpty(accessToken)
                    && context.HttpContext.Request.Path.StartsWithSegments("/hubs/cozinha"))
                {
                    context.Token = accessToken;
                }
                return Task.CompletedTask;
            }
        };
    });

Console.WriteLine("   ✓ JWT configurado com segurança\n");

// Adicionar serviço JWT para gerar tokens
builder.Services.AddScoped<JwtService>();
builder.Services.AddScoped<BackupService>();
builder.Services.AddScoped<PIM3.API.Services.Backup.BackupRestoreService>();

// ═══════════════════════════════════════════════════════════════════════════════
// 3️⃣  CONFIGURAÇÃO DE COMUNICAÇÃO EM TEMPO REAL (SignalR)
// ═══════════════════════════════════════════════════════════════════════════════
Console.WriteLine("📡 Configurando SignalR para comunicação em tempo real...");
builder.Services.AddSignalR();
Console.WriteLine("   ✓ SignalR pronto para WebSocket\n");

// ═══════════════════════════════════════════════════════════════════════════════
// 4️⃣  CONFIGURAÇÃO DE CORS (Cross-Origin Resource Sharing) – Dev + Prod
// ═══════════════════════════════════════════════════════════════════════════════
Console.WriteLine("🌐 Configurando CORS para aceitar requisições do React...");

builder.Services.AddCors(options =>
{
    // Política permissiva para desenvolvimento
    options.AddPolicy("DevCors", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });

    // Política restrita para produção
    options.AddPolicy("ProdCors", policy =>
    {
        policy.WithOrigins("https://seusite.com")
              .AllowAnyMethod()
              .AllowAnyHeader()
              .SetIsOriginAllowedToAllowWildcardSubdomains()
              .AllowCredentials();
    });
});

Console.WriteLine("   ✓ CORS DevCors + ProdCors registrados\n");

// ═══════════════════════════════════════════════════════════════════════════════
// 5️⃣  CONFIGURAÇÃO DE CONTROLLERS E DOCUMENTAÇÃO
// ═══════════════════════════════════════════════════════════════════════════════
builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
    options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
});
builder.Services.AddSwaggerGen();

Console.WriteLine("✅ Todos os serviços foram registrados!\n");

// ═══════════════════════════════════════════════════════════════════════════════
// 🚀 CONSTRUIR E CONFIGURAR A APLICAÇÃO
// ═══════════════════════════════════════════════════════════════════════════════
var app = builder.Build();

Console.WriteLine("═══════════════════════════════════════════════════════════");
Console.WriteLine("🔧 Configurando pipeline de requisições HTTP");
Console.WriteLine("═══════════════════════════════════════════════════════════\n");

// Mostrar documentação Swagger em desenvolvimento
if (app.Environment.IsDevelopment())
{
    Console.WriteLine("📚 Modo desenvolvimento ativo!");
    Console.WriteLine("   📖 Swagger disponível em: http://localhost:5050/swagger\n");
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "PIM3 API v1");
        c.RoutePrefix = "swagger";
    });
}

app.UseRouting();

Console.WriteLine("📌 Ativando CORS...");
if (app.Environment.IsDevelopment())
{
    app.UseCors("DevCors");
    Console.WriteLine("   ✓ CORS DevCors ativado (DEV)\n");
}
else
{
    app.UseCors("ProdCors");
    Console.WriteLine("   ✓ CORS ProdCors ativado (PROD)\n");
}

Console.WriteLine("🔐 Ativando autenticação JWT...");
app.UseAuthentication();
Console.WriteLine("   ✓ Autenticação ativada\n");

// 🔷 Usar autorização
Console.WriteLine("🛡️ Ativando autorização...");
app.UseAuthorization();
Console.WriteLine("   ✓ Autorização ativada\n");

// 🔷 Redirecionar HTTP para HTTPS (segurança) - apenas em produção
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

// 🔷 Mapear todos os controllers
Console.WriteLine("🗺️ Mapeando controllers e rotas...");
app.MapControllers();
Console.WriteLine("   ✓ Controllers mapeados\n");

// 🔷 Mapear SignalR Hub para comunicação em tempo real
Console.WriteLine("📡 Mapeando SignalR Hub...");
app.MapHub<CozinhaHub>("/hubs/cozinha");
Console.WriteLine("   ✓ Hub de cozinha disponível em: /hubs/cozinha\n");

// ═══════════════════════════════════════════════════════════════════════════════
// 🗄️  VERIFICAR CONEXÃO COM O BANCO DE DADOS
// ═══════════════════════════════════════════════════════════════════════════════
app.Lifetime.ApplicationStarted.Register(() =>
{
    _ = Task.Run(async () =>
    {
        try
        {
            await using var scope = app.Services.CreateAsyncScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            if (await dbContext.Database.CanConnectAsync())
                Console.WriteLine("   ✓ Conexão com o banco de dados estabelecida.\n");
            else
                Console.WriteLine("   ⚠️ Não foi possível conectar ao banco.\n");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"   ❌ ERRO ao verificar banco de dados: {ex.Message}\n");
        }
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 INICIAR A APLICAÇÃO
// ═══════════════════════════════════════════════════════════════
Console.WriteLine("╔════════════════════════════════════════════════════════════╗");
Console.WriteLine("║  🚀 API ESTÁ PRONTA PARA RECEBER REQUISIÇÕES!             ║");
Console.WriteLine("║  📍 Endereço: http://0.0.0.0:5050                         ║");
Console.WriteLine("║  📖 Swagger: http://localhost:5050/swagger                ║");
Console.WriteLine("║  🏥 Health: http://localhost:5050/api/healthcheck         ║");
Console.WriteLine("╚════════════════════════════════════════════════════════════╝\n");

await app.RunAsync();
