using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using PIM3.API.Data;
using PIM3.API.Hubs;
using PIM3.API.Services;

var builder = WebApplication.CreateBuilder(args);

Console.WriteLine("╔════════════════════════════════════════════════════════════╗");
Console.WriteLine("║   INICIANDO API PIM3 - Gerenciamento de Restaurante       ║");
Console.WriteLine("║   Versão: 1.0.0 | Modo: Desenvolvimento                  ║");
Console.WriteLine("╚════════════════════════════════════════════════════════════╝\n");

// ═══════════════════════════════════════════════════════════════════════════════
// 1️⃣  CONFIGURAÇÃO DO BANCO DE DADOS
// ═══════════════════════════════════════════════════════════════════════════════
Console.WriteLine("📦 Configurando banco de dados...");

// Aqui lemos a string de conexão do arquivo appsettings.json
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
Console.WriteLine($"   ✓ Connection String carregada: {(string.IsNullOrEmpty(connectionString) ? "❌ NÃO ENCONTRADA" : "✅ ENCONTRADA")}");

// Adicionamos o DbContext para acesso ao SQL Server
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(connectionString)
);
Console.WriteLine("   ✓ DbContext configurado\n");

// ═══════════════════════════════════════════════════════════════════════════════
// 2️⃣  CONFIGURAÇÃO DE AUTENTICAÇÃO JWT
// ═══════════════════════════════════════════════════════════════════════════════
Console.WriteLine("🔐 Configurando autenticação JWT...");

var jwtSettings = builder.Configuration.GetSection("Jwt");
var secretKey = jwtSettings["SecretKey"] ?? "sua_chave_secreta_muito_segura_aqui_12345";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
            ValidateIssuer = true,
            ValidIssuer = "PIM3.API",
            ValidateAudience = true,
            ValidAudience = "PIM3.API.Users",
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(5)
        };

        // Suporte a JWT via QueryString para SignalR (comunicação em tempo real)
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                if (!string.IsNullOrEmpty(accessToken) && context.HttpContext.WebSockets.IsWebSocketRequest)
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

// ═══════════════════════════════════════════════════════════════════════════════
// 3️⃣  CONFIGURAÇÃO DE COMUNICAÇÃO EM TEMPO REAL (SignalR)
// ═══════════════════════════════════════════════════════════════════════════════
Console.WriteLine("📡 Configurando SignalR para comunicação em tempo real...");
builder.Services.AddSignalR();
Console.WriteLine("   ✓ SignalR pronto para WebSocket\n");

// ═══════════════════════════════════════════════════════════════════════════════
// 4️⃣  CONFIGURAÇÃO DE CORS (Cross-Origin Resource Sharing)
// ═══════════════════════════════════════════════════════════════════════════════
Console.WriteLine("🌐 Configurando CORS para aceitar requisições do React...");

// CORS permite que o front-end (React) faça requisições para a API .NET
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        // Aqui definimos quais URLs do front-end podem acessar a API
        policy.WithOrigins(
            "http://localhost:5173",  // URL padrão do Vite (desenvolvimento)
            "http://localhost:3000",  // URL alternativa (se grupo usar outra porta)
            "http://localhost:5174",  // Fallback Vite
            "http://localhost:8080"   // Porta do Frontend React (conforme vite.config.ts)
        )
        .AllowAnyMethod()           // Permite GET, POST, PUT, DELETE, etc
        .AllowAnyHeader()           // Permite qualquer header (Content-Type, Authorization, etc)
        .AllowCredentials();        // Permite cookies e credentials
    });
});

Console.WriteLine("   ✓ CORS configurado para http://localhost:5173, 3000, 5174 e 8080\n");

// ═══════════════════════════════════════════════════════════════════════════════
// 5️⃣  CONFIGURAÇÃO DE CONTROLLERS E DOCUMENTAÇÃO
// ═══════════════════════════════════════════════════════════════════════════════
builder.Services.AddControllers();
builder.Services.AddOpenApi();

Console.WriteLine("✅ Todos os serviços foram registrados!\n");

// ═══════════════════════════════════════════════════════════════════════════════
// 🚀 CONSTRUIR E CONFIGURAR A APLICAÇÃO
// ═══════════════════════════════════════════════════════════════════════════════
var app = builder.Build();

Console.WriteLine("═══════════════════════════════════════════════════════════");
Console.WriteLine("🔧 Configurando pipeline de requisições HTTP");
Console.WriteLine("═══════════════════════════════════════════════════════════\n");

// Mostrar documentação OpenAPI em desenvolvimento
if (app.Environment.IsDevelopment())
{
    Console.WriteLine("📚 Modo desenvolvimento ativo!");
    Console.WriteLine("   📖 Swagger disponível em: http://localhost:5000/swagger\n");
    app.MapOpenApi();
}

// 🔷 Ativar CORS - IMPORTANTE! Deve vir antes de autenticação
Console.WriteLine("📌 Ativando CORS...");
app.UseCors("AllowReactApp");
Console.WriteLine("   ✓ CORS ativado\n");

// 🔷 Usar autenticação JWT
Console.WriteLine("🔐 Ativando autenticação JWT...");
app.UseAuthentication();
Console.WriteLine("   ✓ Autenticação ativada\n");

// 🔷 Usar autorização
Console.WriteLine("🛡️ Ativando autorização...");
app.UseAuthorization();
Console.WriteLine("   ✓ Autorização ativada\n");

// 🔷 Redirecionar HTTP para HTTPS (segurança)
app.UseHttpsRedirection();

// 🔷 Mapear todos os controllers
Console.WriteLine("🗺️ Mapeando controllers e rotas...");
app.MapControllers();
Console.WriteLine("   ✓ Controllers mapeados\n");

// 🔷 Mapear SignalR Hub para comunicação em tempo real
Console.WriteLine("📡 Mapeando SignalR Hub...");
app.MapHub<CozinhaHub>("/hubs/cozinha");
Console.WriteLine("   ✓ Hub de cozinha disponível em: /hubs/cozinha\n");

// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 INICIAR A APLICAÇÃO
// ═══════════════════════════════════════════════════════════════════════════════
Console.WriteLine("╔════════════════════════════════════════════════════════════╗");
Console.WriteLine("║  🚀 API ESTÁ PRONTA PARA RECEBER REQUISIÇÕES!             ║");
Console.WriteLine("║  📍 Endereço: http://localhost:5000                       ║");
Console.WriteLine("║  📖 Swagger: http://localhost:5000/swagger                ║");
Console.WriteLine("║  🏥 Health: http://localhost:5000/api/healthcheck         ║");
Console.WriteLine("╚════════════════════════════════════════════════════════════╝\n");

app.Run();
