using System.IO.Compression;
using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using FluentAssertions;
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

public sealed class BackupIntegrityIntegrationTests
{
    private const string HmacKey = "integration-test-backup-hmac-key-0123456789";

    [SqlServerFact]
    public async Task Generated_backup_restores_database_data()
    {
        await using var environment = await BackupTestEnvironment.CreateAsync();
        await environment.InitializeDatabaseAsync();
        await environment.AddProductAsync(stock: 7);

        var archive = await environment.GenerateAndDownloadBackupAsync();
        await environment.SetProductStockAsync(stock: 1);

        using var response = await environment.RestoreAsync(archive);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        (await environment.ReadProductStockAsync()).Should().Be(7);
    }

    [SqlServerFact]
    public async Task Restore_rejects_tampered_backup_without_changing_database()
    {
        await using var environment = await BackupTestEnvironment.CreateAsync();
        await environment.InitializeDatabaseAsync();
        await environment.AddProductAsync(stock: 7);

        var archive = await environment.GenerateAndDownloadBackupAsync();
        await environment.SetProductStockAsync(stock: 1);
        var tamperedArchive = TamperSqlEntry(archive);

        using var response = await environment.RestoreAsync(tamperedArchive);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await environment.ReadProductStockAsync()).Should().Be(1);
    }

    private static byte[] TamperSqlEntry(byte[] archiveBytes)
    {
        using var input = new MemoryStream(archiveBytes);
        using var sourceArchive = new ZipArchive(input, ZipArchiveMode.Read);
        using var output = new MemoryStream();
        using (var targetArchive = new ZipArchive(output, ZipArchiveMode.Create, leaveOpen: true))
        {
            foreach (var sourceEntry in sourceArchive.Entries)
            {
                var targetEntry = targetArchive.CreateEntry(
                    sourceEntry.FullName,
                    CompressionLevel.Optimal);
                if (sourceEntry.FullName.EndsWith('/') || sourceEntry.FullName.EndsWith('\\'))
                    continue;

                using var source = sourceEntry.Open();
                using var content = new MemoryStream();
                source.CopyTo(content);
                if (Path.GetExtension(sourceEntry.FullName).Equals(
                        ".sql",
                        StringComparison.OrdinalIgnoreCase))
                {
                    content.Write(Encoding.UTF8.GetBytes("\n-- adulterado"));
                }

                content.Position = 0;
                using var target = targetEntry.Open();
                content.CopyTo(target);
            }
        }

        return output.ToArray();
    }

    private sealed class BackupTestEnvironment : IAsyncDisposable
    {
        private readonly string _databaseName;
        private readonly string _backupDirectory;
        private readonly string? _previousBackupPath;
        private readonly SqlConnectionStringBuilder _adminConnectionString;
        private readonly WebApplicationFactory<Program> _factory;
        private readonly HttpClient _client;

        private BackupTestEnvironment(
            string databaseName,
            string backupDirectory,
            string? previousBackupPath,
            SqlConnectionStringBuilder adminConnectionString,
            WebApplicationFactory<Program> factory)
        {
            _databaseName = databaseName;
            _backupDirectory = backupDirectory;
            _previousBackupPath = previousBackupPath;
            _adminConnectionString = adminConnectionString;
            _factory = factory;
            _client = factory.CreateClient(new WebApplicationFactoryClientOptions
            {
                HandleCookies = true,
            });
        }

        internal static async Task<BackupTestEnvironment> CreateAsync()
        {
            var configuredConnectionString =
                Environment.GetEnvironmentVariable("BACKUP_TEST_CONNECTION_STRING");
            if (string.IsNullOrWhiteSpace(configuredConnectionString))
                throw new InvalidOperationException("The SQL Server test connection string is not configured.");

            var databaseName = $"backup_test_{Guid.NewGuid():N}";
            var adminConnectionString = new SqlConnectionStringBuilder(configuredConnectionString)
            {
                InitialCatalog = "master",
            };
            await using (var connection = new SqlConnection(adminConnectionString.ConnectionString))
            {
                await connection.OpenAsync();
                await using var createDatabase = connection.CreateCommand();
                createDatabase.CommandText = $"CREATE DATABASE [{databaseName}]";
                await createDatabase.ExecuteNonQueryAsync();
            }

            var databaseConnectionString = new SqlConnectionStringBuilder(configuredConnectionString)
            {
                InitialCatalog = databaseName,
                ApplicationName = "SystemicPimBackupIntegrationTests",
            }.ConnectionString;
            var backupDirectory = Path.Combine(
                Path.GetTempPath(),
                $"systemic-backup-tests-{Guid.NewGuid():N}");
            var previousBackupPath = Environment.GetEnvironmentVariable("BACKUP_PATH");

            Environment.SetEnvironmentVariable(
                "JWT_SECRET_KEY",
                "chave_secreta_jwt_de_testes_com_minimo_32_caracteres_12345");
            Environment.SetEnvironmentVariable("BACKUP_PATH", backupDirectory);
            var factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
            {
                builder.ConfigureAppConfiguration((_, configuration) =>
                    configuration.AddInMemoryCollection(new Dictionary<string, string?>
                    {
                        ["BACKUP_HMAC_KEY"] = HmacKey,
                        ["BACKUP_PATH"] = backupDirectory,
                    }));
                builder.ConfigureServices(services =>
                {
                    services.RemoveAll<DbContextOptions<AppDbContext>>();
                    services.RemoveAll<AppDbContext>();
                    services.AddDbContext<AppDbContext>(options =>
                        options.UseSqlServer(databaseConnectionString));
                });
            });

            return new BackupTestEnvironment(
                databaseName,
                backupDirectory,
                previousBackupPath,
                adminConnectionString,
                factory);
        }

        internal async Task InitializeDatabaseAsync()
        {
            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            context.Database.GetDbConnection().Database.Should().Be(_databaseName);
            context.Database.GetDbConnection().Database.Should().NotBe("DB_RESTAURANTE");
            await context.Database.EnsureCreatedAsync();
        }

        internal async Task AddProductAsync(int stock)
        {
            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            context.Produtos.Add(new Produto
            {
                NomeProduto = "Produto de integração",
                CategoriaProduto = "TESTE",
                PrecoProduto = 10,
                QtdEstoque = stock,
                EstoqueMinimo = 1,
                StatusProduto = "DISPONIVEL",
            });
            await context.SaveChangesAsync();
        }

        internal async Task SetProductStockAsync(int stock)
        {
            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var product = await context.Produtos.SingleAsync();
            product.QtdEstoque = stock;
            await context.SaveChangesAsync();
        }

        internal async Task<int> ReadProductStockAsync()
        {
            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            return await context.Produtos.Select(product => product.QtdEstoque).SingleAsync();
        }

        internal async Task<byte[]> GenerateAndDownloadBackupAsync()
        {
            using var generateRequest = new HttpRequestMessage(HttpMethod.Post, "/api/backup/gerar");
            generateRequest.Headers.Authorization =
                new AuthenticationHeaderValue("Bearer", CreateAdminToken());
            await AddAntiforgeryTokenAsync(generateRequest);
            using var generateResponse = await _client.SendAsync(generateRequest);
            generateResponse.StatusCode.Should().Be(
                HttpStatusCode.OK,
                await generateResponse.Content.ReadAsStringAsync());

            using var json = JsonDocument.Parse(await generateResponse.Content.ReadAsStringAsync());
            var fileName = json.RootElement
                .GetProperty("dados")
                .GetProperty("nomeArquivo")
                .GetString();
            fileName.Should().NotBeNullOrWhiteSpace();

            using var downloadRequest = new HttpRequestMessage(
                HttpMethod.Get,
                $"/api/backup/baixar/{Uri.EscapeDataString(fileName!)}");
            downloadRequest.Headers.Authorization =
                new AuthenticationHeaderValue("Bearer", CreateAdminToken());
            using var downloadResponse = await _client.SendAsync(downloadRequest);
            downloadResponse.StatusCode.Should().Be(HttpStatusCode.OK);
            return await downloadResponse.Content.ReadAsByteArrayAsync();
        }

        internal async Task<HttpResponseMessage> RestoreAsync(byte[] archive)
        {
            using var content = new MultipartFormDataContent();
            var file = new ByteArrayContent(archive);
            file.Headers.ContentType = new MediaTypeHeaderValue("application/zip");
            content.Add(file, "Arquivo", "backup.zip");

            using var request = new HttpRequestMessage(HttpMethod.Post, "/api/backup/restore")
            {
                Content = content,
            };
            request.Headers.Authorization =
                new AuthenticationHeaderValue("Bearer", CreateAdminToken());
            await AddAntiforgeryTokenAsync(request);
            return await _client.SendAsync(request);
        }

        private string CreateAdminToken()
        {
            using var scope = _factory.Services.CreateScope();
            return scope.ServiceProvider.GetRequiredService<JwtService>()
                .GenerateToken(1, "Teste", "00000000000", "admin");
        }

        private async Task AddAntiforgeryTokenAsync(HttpRequestMessage request)
        {
            using var tokenRequest = new HttpRequestMessage(
                HttpMethod.Get,
                "/api/autenticacao/csrf");
            if (request.Headers.Authorization != null)
                tokenRequest.Headers.Authorization = request.Headers.Authorization;
            using var response = await _client.SendAsync(tokenRequest);
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            request.Headers.Add(
                "X-CSRF-TOKEN",
                json.RootElement.GetProperty("requestToken").GetString());
        }

        public async ValueTask DisposeAsync()
        {
            _client.Dispose();
            await _factory.DisposeAsync();

            await using var connection = new SqlConnection(_adminConnectionString.ConnectionString);
            await connection.OpenAsync();
            await using var dropDatabase = connection.CreateCommand();
            dropDatabase.CommandText =
                $"ALTER DATABASE [{_databaseName}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [{_databaseName}]";
            await dropDatabase.ExecuteNonQueryAsync();

            if (Directory.Exists(_backupDirectory))
                Directory.Delete(_backupDirectory, recursive: true);

            Environment.SetEnvironmentVariable("BACKUP_PATH", _previousBackupPath);
        }
    }

    public sealed class SqlServerFactAttribute : FactAttribute
    {
        public SqlServerFactAttribute()
        {
            if (!string.Equals(
                    Environment.GetEnvironmentVariable("RUN_INTEGRATION_TESTS"),
                    "1",
                    StringComparison.Ordinal))
            {
                Skip = "Set RUN_INTEGRATION_TESTS=1 and BACKUP_TEST_CONNECTION_STRING to run SQL Server integration tests.";
            }
        }
    }
}
