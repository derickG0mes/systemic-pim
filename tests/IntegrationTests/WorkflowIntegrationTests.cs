using System.Net;
using System.Net.Http.Json;
using System.Runtime.CompilerServices;
using System.Security.Cryptography;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using PIM3.API.Data;
using PIM3.API.Models;
using PIM3.API.Services;

namespace Systemic.IntegrationTests;

public sealed class WorkflowIntegrationTests
{
    [IsolatedSqlServerFact]
    public async Task Reservations_can_be_created_listed_and_cancelled_after_real_login()
    {
        await using var environment = await WorkflowTestEnvironment.CreateAsync();
        await environment.LoginAsAdminAsync();
        var mesa = await environment.CreateMesaAsync();

        using var createResponse = await environment.SendUnsafeAsync(
            HttpMethod.Post,
            "/api/reserva",
            new
            {
                nomeCliente = $"Reserva-{Guid.NewGuid():N}",
                numeroMesa = mesa.NumeroMesa,
                dataReserva = DateTime.UtcNow.AddDays(1),
            });
        Assert.Equal(HttpStatusCode.OK, createResponse.StatusCode);
        using var created = JsonDocument.Parse(await createResponse.Content.ReadAsStringAsync());
        var reservaId = created.RootElement.GetProperty("dados").GetProperty("idReserva").GetInt32();

        using var listResponse = await environment.Client.GetAsync("/api/reserva");
        Assert.Equal(HttpStatusCode.OK, listResponse.StatusCode);
        using var listed = JsonDocument.Parse(await listResponse.Content.ReadAsStringAsync());
        Assert.Contains(
            listed.RootElement.GetProperty("dados").EnumerateArray(),
            reserva => reserva.GetProperty("idReserva").GetInt32() == reservaId);

        using var cancelResponse = await environment.SendUnsafeAsync(
            HttpMethod.Delete,
            $"/api/reserva/{reservaId}");
        Assert.Equal(HttpStatusCode.OK, cancelResponse.StatusCode);
    }

    [IsolatedSqlServerFact]
    public async Task Order_payment_trigger_updates_total_closes_check_and_releases_table()
    {
        await using var environment = await WorkflowTestEnvironment.CreateAsync();
        await environment.LoginAsAdminAsync();
        var orderData = await environment.CreateOrderDataAsync();

        using var createResponse = await environment.SendUnsafeAsync(
            HttpMethod.Post,
            "/api/pedidos",
            new
            {
                idMesa = orderData.Mesa.IdMesa,
                idCliente = orderData.Cliente.IdCliente,
                itens = new[]
                {
                    new
                    {
                        idProduto = orderData.Produto.IdProduto,
                        qtdProduto = 2,
                        precoUnitarioPago = 17.50m,
                    },
                },
            });
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        using var created = JsonDocument.Parse(await createResponse.Content.ReadAsStringAsync());
        var comandaId = created.RootElement
            .GetProperty("dados")
            .GetProperty("dados")
            .GetProperty("idComanda")
            .GetInt32();

        Assert.Equal(35m, await environment.ReadComandaTotalAsync(comandaId));
        Assert.Equal("OCUPADA", await environment.ReadMesaStatusAsync(orderData.Mesa.IdMesa));

        using var paymentResponse = await environment.SendUnsafeAsync(
            HttpMethod.Put,
            $"/api/comanda/{comandaId}/pagar",
            new
            {
                idFormaPagamento = orderData.FormaPagamento.IdFormaPagamento,
                troco = 0m,
            });
        Assert.Equal(HttpStatusCode.OK, paymentResponse.StatusCode);

        Assert.Equal("FECHADA", await environment.ReadComandaStatusAsync(comandaId));
        Assert.Equal("DISPONIVEL", await environment.ReadMesaStatusAsync(orderData.Mesa.IdMesa));
    }

    [IsolatedSqlServerFact]
    public async Task Reservation_operation_is_visible_in_admin_audit_log()
    {
        await using var environment = await WorkflowTestEnvironment.CreateAsync();
        await environment.LoginAsAdminAsync();
        var mesa = await environment.CreateMesaAsync();
        var marker = $"IntegrationAudit-{Guid.NewGuid():N}";

        using var createResponse = await environment.SendUnsafeAsync(
            HttpMethod.Post,
            "/api/reserva",
            new
            {
                nomeCliente = marker,
                numeroMesa = mesa.NumeroMesa,
                dataReserva = DateTime.UtcNow.AddDays(2),
            });
        Assert.Equal(HttpStatusCode.OK, createResponse.StatusCode);

        using var logResponse = await environment.Client.GetAsync(
            $"/api/log/sistema?filtro={Uri.EscapeDataString(marker)}");
        Assert.Equal(HttpStatusCode.OK, logResponse.StatusCode);
        using var logs = JsonDocument.Parse(await logResponse.Content.ReadAsStringAsync());
        Assert.Contains(
            logs.RootElement.GetProperty("dados").EnumerateArray(),
            entry => entry.GetProperty("descricaoLog").GetString()?.Contains(marker) == true);
    }

    private sealed class WorkflowTestEnvironment : IAsyncDisposable
    {
        private const string JwtSecret = "integration-test-jwt-signing-key-with-at-least-32-characters";
        private readonly string _databaseName;
        private readonly string _adminEmail;
        private readonly string _adminPassword;
        private readonly string? _previousJwtSecret;
        private readonly SqlConnectionStringBuilder _serverConnectionString;
        private readonly string _databaseConnectionString;
        private readonly WebApplicationFactory<Program> _factory;

        private WorkflowTestEnvironment(
            string databaseName,
            string adminEmail,
            string adminPassword,
            string? previousJwtSecret,
            SqlConnectionStringBuilder serverConnectionString,
            string databaseConnectionString,
            WebApplicationFactory<Program> factory)
        {
            _databaseName = databaseName;
            _adminEmail = adminEmail;
            _adminPassword = adminPassword;
            _previousJwtSecret = previousJwtSecret;
            _serverConnectionString = serverConnectionString;
            _databaseConnectionString = databaseConnectionString;
            _factory = factory;
            Client = factory.CreateClient(new WebApplicationFactoryClientOptions
            {
                HandleCookies = true,
            });
        }

        internal HttpClient Client { get; }

        internal static async Task<WorkflowTestEnvironment> CreateAsync()
        {
            var configuredConnectionString = Environment.GetEnvironmentVariable(
                "INTEGRATION_TEST_SQL_CONNECTION_STRING");
            if (string.IsNullOrWhiteSpace(configuredConnectionString))
                throw new InvalidOperationException(
                    "INTEGRATION_TEST_SQL_CONNECTION_STRING must point to the local Compose SQL Server master database.");

            var serverConnectionString = new SqlConnectionStringBuilder(configuredConnectionString);
            var server = serverConnectionString.DataSource.Split(',')[0].Trim();
            if (serverConnectionString.InitialCatalog != "master"
                || server is not ("localhost" or "127.0.0.1" or "."))
            {
                throw new InvalidOperationException(
                    "Integration tests require a local SQL Server connection whose initial catalog is master.");
            }

            var databaseName = $"SystemicIntegration_{Guid.NewGuid():N}";
            var databaseConnectionString = new SqlConnectionStringBuilder(serverConnectionString.ConnectionString)
            {
                InitialCatalog = databaseName,
                ApplicationName = "SystemicWorkflowIntegrationTests",
            }.ConnectionString;
            var adminEmail = $"admin-{Guid.NewGuid():N}@systemic.test";
            var adminPassword = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));
            var previousJwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET_KEY");

            await using (var connection = new SqlConnection(serverConnectionString.ConnectionString))
            {
                await connection.OpenAsync();
                await using var createDatabase = connection.CreateCommand();
                createDatabase.CommandText = $"CREATE DATABASE [{databaseName}]";
                await createDatabase.ExecuteNonQueryAsync();
            }

            WorkflowTestEnvironment? environment = null;
            try
            {
                await ApplyDatabaseScriptsAsync(serverConnectionString, databaseName);
                Environment.SetEnvironmentVariable("JWT_SECRET_KEY", JwtSecret);

                var factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
                {
                    builder.UseEnvironment("Development");
                    builder.ConfigureAppConfiguration((_, configuration) =>
                        configuration.AddInMemoryCollection(new Dictionary<string, string?>
                        {
                            ["Jwt:SecretKey"] = JwtSecret,
                        }));
                    builder.ConfigureServices(services =>
                    {
                        services.RemoveAll<DbContextOptions<AppDbContext>>();
                        services.RemoveAll<AppDbContext>();
                        services.AddDbContext<AppDbContext>(options =>
                            options.UseSqlServer(databaseConnectionString));
                    });
                });

                environment = new WorkflowTestEnvironment(
                    databaseName,
                    adminEmail,
                    adminPassword,
                    previousJwtSecret,
                    serverConnectionString,
                    databaseConnectionString,
                    factory);
                await environment.CreateAdminAsync();
                return environment;
            }
            catch
            {
                if (environment is not null)
                {
                    await environment.DisposeAsync();
                }
                else
                {
                    Environment.SetEnvironmentVariable("JWT_SECRET_KEY", previousJwtSecret);
                    await DropDatabaseAsync(serverConnectionString, databaseName);
                }
                throw;
            }
        }

        internal async Task LoginAsAdminAsync()
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, "/api/autenticacao/login")
            {
                Content = JsonContent.Create(new
                {
                    email = _adminEmail,
                    password = _adminPassword,
                }),
            };
            request.Headers.Add("X-CSRF-TOKEN", await GetCsrfTokenAsync());

            using var response = await Client.SendAsync(request);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        internal async Task<HttpResponseMessage> SendUnsafeAsync(
            HttpMethod method,
            string path,
            object? body = null)
        {
            using var request = new HttpRequestMessage(method, path);
            if (body is not null)
                request.Content = JsonContent.Create(body);
            request.Headers.Add("X-CSRF-TOKEN", await GetCsrfTokenAsync());
            return await Client.SendAsync(request);
        }

        internal async Task<Mesa> CreateMesaAsync()
        {
            var mesa = new Mesa
            {
                NumeroMesa = RandomNumberGenerator.GetInt32(1000, 100000),
                CapacidadeMesa = 4,
                StatusMesa = "DISPONIVEL",
            };
            await using var context = CreateContext();
            context.Mesas.Add(mesa);
            await context.SaveChangesAsync();
            return mesa;
        }

        internal async Task<OrderData> CreateOrderDataAsync()
        {
            await using var context = CreateContext();
            var mesa = new Mesa
            {
                NumeroMesa = RandomNumberGenerator.GetInt32(1000, 100000),
                CapacidadeMesa = 4,
                StatusMesa = "DISPONIVEL",
            };
            var cliente = new Cliente { NomeCliente = $"Cliente-{Guid.NewGuid():N}" };
            var produto = new Produto
            {
                NomeProduto = $"Produto-{Guid.NewGuid():N}"[..40],
                PrecoProduto = 17.50m,
                QtdEstoque = 10,
                EstoqueMinimo = 1,
                StatusProduto = "DISPONIVEL",
                CategoriaProduto = "PRINCIPAL",
            };
            context.AddRange(mesa, cliente, produto);
            await context.SaveChangesAsync();
            var formaPagamento = await context.FormasPagamento
                .AsNoTracking()
                .FirstAsync(forma => forma.NomeFormaPagamento == "PIX");
            return new OrderData(mesa, cliente, produto, formaPagamento);
        }

        internal async Task<decimal> ReadComandaTotalAsync(int comandaId)
        {
            await using var context = CreateContext();
            return await context.Comandas
                .Where(comanda => comanda.IdComanda == comandaId)
                .Select(comanda => comanda.ValorTotal)
                .SingleAsync();
        }

        internal async Task<string> ReadComandaStatusAsync(int comandaId)
        {
            await using var context = CreateContext();
            return await context.Comandas
                .Where(comanda => comanda.IdComanda == comandaId)
                .Select(comanda => comanda.StatusComanda)
                .SingleAsync();
        }

        internal async Task<string> ReadMesaStatusAsync(int mesaId)
        {
            await using var context = CreateContext();
            return await context.Mesas
                .Where(mesa => mesa.IdMesa == mesaId)
                .Select(mesa => mesa.StatusMesa)
                .SingleAsync();
        }

        public async ValueTask DisposeAsync()
        {
            Client.Dispose();
            await _factory.DisposeAsync();
            await DropDatabaseAsync(_serverConnectionString, _databaseName);
            Environment.SetEnvironmentVariable("JWT_SECRET_KEY", _previousJwtSecret);
        }

        private async Task CreateAdminAsync()
        {
            await using var context = CreateContext();
            context.Funcionarios.Add(new Funcionario
            {
                NomeFuncionario = "Administrador de integração",
                EmailFuncionario = _adminEmail,
                CargoFuncionario = "Gerente",
                CpfFuncionario = string.Concat(
                    Enumerable.Range(0, 11)
                        .Select(_ => RandomNumberGenerator.GetInt32(10).ToString())),
                TelefoneFuncionario = "11999999999",
                PasswordFuncionario = PasswordHashService.HashPassword(_adminPassword),
                Role = "admin",
                StatusFuncionario = "ATIVO",
            });
            await context.SaveChangesAsync();
        }

        private AppDbContext CreateContext()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseSqlServer(_databaseConnectionString)
                .Options;
            return new AppDbContext(options);
        }

        private async Task<string> GetCsrfTokenAsync()
        {
            using var response = await Client.GetAsync("/api/autenticacao/csrf");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            return json.RootElement.GetProperty("requestToken").GetString()
                ?? throw new InvalidOperationException("CSRF token was missing from the response.");
        }

        private static async Task ApplyDatabaseScriptsAsync(
            SqlConnectionStringBuilder serverConnectionString,
            string databaseName)
        {
            var repositoryRoot = FindRepositoryRoot();
            foreach (var scriptName in new[]
                     {
                         "01-create-database-idempotent.sql",
                         "02-procedures-views.sql",
                     })
            {
                var path = Path.Combine(repositoryRoot, "back-end", "Scripts", scriptName);
                var script = await File.ReadAllTextAsync(path);
                script = script.Replace("DB_RESTAURANTE", databaseName, StringComparison.Ordinal);
                var batches = Regex.Split(
                    script,
                    @"^\s*GO\s*(?:--.*)?$",
                    RegexOptions.Multiline | RegexOptions.IgnoreCase);

                await using var connection = new SqlConnection(serverConnectionString.ConnectionString);
                await connection.OpenAsync();
                foreach (var batch in batches.Where(batch => !string.IsNullOrWhiteSpace(batch)))
                {
                    await using var command = connection.CreateCommand();
                    command.CommandText = batch;
                    command.CommandTimeout = 120;
                    await command.ExecuteNonQueryAsync();
                }
            }
        }

        private static string FindRepositoryRoot()
        {
            for (var directory = new DirectoryInfo(AppContext.BaseDirectory);
                 directory is not null;
                 directory = directory.Parent)
            {
                if (File.Exists(Path.Combine(directory.FullName, "back-end", "Scripts", "01-create-database-idempotent.sql")))
                    return directory.FullName;
            }

            throw new DirectoryNotFoundException("Could not locate the repository SQL scripts.");
        }

        private static async Task DropDatabaseAsync(
            SqlConnectionStringBuilder serverConnectionString,
            string databaseName)
        {
            await using var connection = new SqlConnection(serverConnectionString.ConnectionString);
            await connection.OpenAsync();
            await using var command = connection.CreateCommand();
            command.CommandText =
                $"IF DB_ID(N'{databaseName}') IS NOT NULL BEGIN ALTER DATABASE [{databaseName}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [{databaseName}]; END";
            await command.ExecuteNonQueryAsync();
        }

        internal sealed record OrderData(
            Mesa Mesa,
            Cliente Cliente,
            Produto Produto,
            FormaPagamento FormaPagamento);
    }

    private sealed class IsolatedSqlServerFactAttribute : FactAttribute
    {
        public IsolatedSqlServerFactAttribute()
        {
            if (!string.Equals(
                    Environment.GetEnvironmentVariable("RUN_INTEGRATION_TESTS"),
                    "1",
                    StringComparison.Ordinal))
            {
                Skip = "Set RUN_INTEGRATION_TESTS=1 and INTEGRATION_TEST_SQL_CONNECTION_STRING to run isolated SQL Server workflow tests.";
            }
        }
    }

    internal static class IntegrationDatabaseIsolation
    {
        [ModuleInitializer]
        internal static void SetSafeDatabaseName()
        {
            if (string.Equals(
                    Environment.GetEnvironmentVariable("RUN_INTEGRATION_TESTS"),
                    "1",
                    StringComparison.Ordinal))
            {
                Environment.SetEnvironmentVariable("DB_NAME", "SystemicIntegrationIsolationGuard");
            }
        }
    }
}
