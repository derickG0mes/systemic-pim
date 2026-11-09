using System.Net;
using System.Net.Http.Headers;
using System.Diagnostics;
using System.Net.Http.Json;
using System.Runtime.CompilerServices;
using System.Security.Cryptography;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.Routing;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using PIM3.API.Data;
using PIM3.API.Models;
using PIM3.API.Services;
using Xunit.Abstractions;

namespace Systemic.IntegrationTests;

[CollectionDefinition("Process-wide environment", DisableParallelization = true)]
public sealed class ProcessWideEnvironmentCollection
{
}

[Collection("Process-wide environment")]
public sealed class WorkflowIntegrationTests
{
    private readonly ITestOutputHelper _output;

    public WorkflowIntegrationTests(ITestOutputHelper output)
    {
        _output = output;
    }

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
    public async Task Reservations_reject_overlaps_past_dates_and_missing_tables()
    {
        await using var environment = await WorkflowTestEnvironment.CreateAsync();
        await environment.LoginAsAdminAsync();
        var mesa = await environment.CreateMesaAsync();
        var dataReserva = DateTime.UtcNow.AddDays(1);

        using var created = await environment.SendUnsafeAsync(
            HttpMethod.Post,
            "/api/reserva",
            new
            {
                nomeCliente = $"Reserva-{Guid.NewGuid():N}",
                numeroMesa = mesa.NumeroMesa,
                dataReserva,
            });
        Assert.Equal(HttpStatusCode.OK, created.StatusCode);

        using var overlap = await environment.SendUnsafeAsync(
            HttpMethod.Post,
            "/api/reserva",
            new
            {
                nomeCliente = $"Reserva-{Guid.NewGuid():N}",
                numeroMesa = mesa.NumeroMesa,
                dataReserva = dataReserva.AddHours(1),
            });
        Assert.Equal(HttpStatusCode.BadRequest, overlap.StatusCode);
        Assert.Contains("já está reservada", await overlap.Content.ReadAsStringAsync());

        using var past = await environment.SendUnsafeAsync(
            HttpMethod.Post,
            "/api/reserva",
            new
            {
                nomeCliente = $"Reserva-{Guid.NewGuid():N}",
                numeroMesa = mesa.NumeroMesa,
                dataReserva = DateTime.UtcNow.AddDays(-1),
            });
        Assert.Equal(HttpStatusCode.BadRequest, past.StatusCode);
        Assert.Contains("deve ser futura", await past.Content.ReadAsStringAsync());

        using var missingTable = await environment.SendUnsafeAsync(
            HttpMethod.Post,
            "/api/reserva",
            new
            {
                nomeCliente = $"Reserva-{Guid.NewGuid():N}",
                numeroMesa = int.MaxValue,
                dataReserva,
            });
        Assert.Equal(HttpStatusCode.BadRequest, missingTable.StatusCode);
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
            .GetProperty("idComanda")
            .GetInt32();

        using var statusResponse = await environment.SendUnsafeAsync(
            HttpMethod.Put,
            $"/api/pedidos/{comandaId}/status",
            new { status = "in_progress" });
        Assert.True(
            statusResponse.StatusCode == HttpStatusCode.OK,
            $"Expected status update to return OK, got {(int)statusResponse.StatusCode}: " +
            await statusResponse.Content.ReadAsStringAsync());

        Assert.Equal("PREPARANDO", await environment.ReadOrderItemStatusAsync(
            comandaId,
            orderData.Produto.IdProduto));
        Assert.Equal(8, await environment.ReadProductStockAsync(orderData.Produto.IdProduto));
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
        Assert.True(
            paymentResponse.StatusCode == HttpStatusCode.OK,
            $"Expected payment to return OK, got {(int)paymentResponse.StatusCode}: " +
            await paymentResponse.Content.ReadAsStringAsync());

        Assert.Equal(35m, await environment.ReadComandaTotalAsync(comandaId));
        Assert.Equal("FECHADA", await environment.ReadComandaStatusAsync(comandaId));
        Assert.Equal("DISPONIVEL", await environment.ReadMesaStatusAsync(orderData.Mesa.IdMesa));
    }

    [IsolatedSqlServerFact]
    public async Task Concurrent_comanda_creation_on_same_table_returns_one_created_and_nine_conflicts()
    {
        await using var environment = await WorkflowTestEnvironment.CreateAsync();
        await environment.LoginAsAdminAsync();
        var mesa = await environment.CreateMesaAsync();
        var customer = await environment.CreateCustomerAsync();
        var csrfToken = await environment.GetCsrfTokenForTestAsync();
        var start = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);

        var requests = Enumerable.Range(0, 10)
            .Select(async _ =>
            {
                using var request = new HttpRequestMessage(HttpMethod.Post, "/api/comanda")
                {
                    Content = JsonContent.Create(new
                    {
                        idMesa = mesa.IdMesa,
                        idCliente = customer.IdCliente,
                    }),
                };
                request.Headers.Add("X-CSRF-TOKEN", csrfToken);
                await start.Task;
                return await environment.Client.SendAsync(request);
            })
            .ToArray();

        start.SetResult(true);
        var responses = await Task.WhenAll(requests);
        try
        {
            Assert.Equal(1, responses.Count(response => response.StatusCode == HttpStatusCode.Created));
            Assert.Equal(9, responses.Count(response => response.StatusCode == HttpStatusCode.Conflict));

            await using var context = environment.CreateContextForTest();
            Assert.Equal(1, await context.Comandas.CountAsync(comanda =>
                comanda.IdMesa == mesa.IdMesa && comanda.StatusComanda == "ABERTA"));
            Assert.Equal("OCUPADA", await environment.ReadMesaStatusAsync(mesa.IdMesa));
        }
        finally
        {
            foreach (var response in responses)
                response.Dispose();
        }
    }

    [IsolatedSqlServerFact]
    public async Task Comanda_service_accepts_available_product()
    {
        await using var environment = await WorkflowTestEnvironment.CreateAsync();
        await environment.LoginAsAdminAsync();
        var orderData = await environment.CreateOrderDataAsync();
        var comandaId = await environment.CreateComandaAsync(orderData.Mesa, orderData.Cliente);

        using var response = await environment.SendUnsafeAsync(
            HttpMethod.Post,
            $"/api/comanda/{comandaId}/itens",
            new
            {
                idProduto = orderData.Produto.IdProduto,
                qtdProduto = 1,
                precoUnitarioPago = orderData.Produto.PrecoProduto,
            });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(9, await environment.ReadProductStockAsync(orderData.Produto.IdProduto));
    }

    [IsolatedSqlServerFact]
    public async Task Comanda_service_rejects_unavailable_product_without_changing_stock()
    {
        await using var environment = await WorkflowTestEnvironment.CreateAsync();
        await environment.LoginAsAdminAsync();
        var orderData = await environment.CreateOrderDataAsync("INDISPONIVEL");
        var comandaId = await environment.CreateComandaAsync(orderData.Mesa, orderData.Cliente);

        using var response = await environment.SendUnsafeAsync(
            HttpMethod.Post,
            $"/api/comanda/{comandaId}/itens",
            new
            {
                idProduto = orderData.Produto.IdProduto,
                qtdProduto = 1,
                precoUnitarioPago = orderData.Produto.PrecoProduto,
            });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("Produto indisponível", await response.Content.ReadAsStringAsync());
        Assert.Equal(10, await environment.ReadProductStockAsync(orderData.Produto.IdProduto));
    }

    [IsolatedSqlServerFact]
    public async Task Add_item_rolls_back_item_stock_and_total_after_database_failure()
    {
        await using var environment = await WorkflowTestEnvironment.CreateAsync();
        await environment.LoginAsAdminAsync();
        var orderData = await environment.CreateOrderDataAsync();
        var comandaId = await environment.CreateComandaAsync(orderData.Mesa, orderData.Cliente);

        await using (var context = environment.CreateContextForTest())
        {
            await context.Database.ExecuteSqlRawAsync(
                "CREATE TRIGGER dbo.trg_test_fail_comanda_update ON dbo.COMANDA AFTER UPDATE AS " +
                "BEGIN SET NOCOUNT ON; THROW 51010, 'Injected integration failure', 1; END;");
        }

        using var response = await environment.SendUnsafeAsync(
            HttpMethod.Post,
            $"/api/comanda/{comandaId}/itens",
            new
            {
                idProduto = orderData.Produto.IdProduto,
                qtdProduto = 1,
                precoUnitarioPago = orderData.Produto.PrecoProduto,
            });

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        await using var verification = environment.CreateContextForTest();
        Assert.Equal(0, await verification.ItensComanda.CountAsync(item => item.IdComanda == comandaId));
        Assert.Equal(
            10,
            await verification.Produtos
                .Where(product => product.IdProduto == orderData.Produto.IdProduto)
                .Select(product => product.QtdEstoque)
                .SingleAsync());
        Assert.Equal(
            0m,
            await verification.Comandas
                .Where(comanda => comanda.IdComanda == comandaId)
                .Select(comanda => comanda.ValorTotal)
                .SingleAsync());
    }

    [IsolatedSqlServerFact]
    public async Task Pedido_service_accepts_available_product()
    {
        await using var environment = await WorkflowTestEnvironment.CreateAsync();
        await environment.LoginAsAdminAsync();
        var orderData = await environment.CreateOrderDataAsync();

        using var response = await environment.SendUnsafeAsync(
            HttpMethod.Post,
            "/api/pedidos",
            CreatePedidoBody(orderData));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal(8, await environment.ReadProductStockAsync(orderData.Produto.IdProduto));
    }

    [IsolatedSqlServerFact]
    public async Task Pedido_service_rejects_unavailable_product_when_creating_order()
    {
        await using var environment = await WorkflowTestEnvironment.CreateAsync();
        await environment.LoginAsAdminAsync();
        var orderData = await environment.CreateOrderDataAsync("INDISPONIVEL");

        using var response = await environment.SendUnsafeAsync(
            HttpMethod.Post,
            "/api/pedidos",
            CreatePedidoBody(orderData));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("Produto indisponível", await response.Content.ReadAsStringAsync());
        Assert.Equal(10, await environment.ReadProductStockAsync(orderData.Produto.IdProduto));
    }

    [IsolatedSqlServerFact]
    public async Task Pedido_service_rejects_unavailable_product_for_existing_order_and_update()
    {
        await using var environment = await WorkflowTestEnvironment.CreateAsync();
        await environment.LoginAsAdminAsync();
        var activeOrder = await environment.CreateOrderDataAsync();
        using var createdResponse = await environment.SendUnsafeAsync(
            HttpMethod.Post,
            "/api/pedidos",
            CreatePedidoBody(activeOrder));
        Assert.Equal(HttpStatusCode.Created, createdResponse.StatusCode);
        using var created = JsonDocument.Parse(await createdResponse.Content.ReadAsStringAsync());
        var comandaId = created.RootElement.GetProperty("dados").GetProperty("idComanda").GetInt32();

        var unavailable = await environment.CreateProductAsync("INDISPONIVEL");
        using var existingResponse = await environment.SendUnsafeAsync(
            HttpMethod.Post,
            "/api/pedidos",
            new
            {
                idMesa = activeOrder.Mesa.IdMesa,
                idCliente = activeOrder.Cliente.IdCliente,
                itens = new[]
                {
                    new
                    {
                        idProduto = unavailable.IdProduto,
                        qtdProduto = 1,
                        precoUnitarioPago = unavailable.PrecoProduto,
                    },
                },
            });
        Assert.Equal(HttpStatusCode.BadRequest, existingResponse.StatusCode);
        Assert.Equal(10, await environment.ReadProductStockAsync(unavailable.IdProduto));

        using var updateResponse = await environment.SendUnsafeAsync(
            HttpMethod.Put,
            $"/api/pedidos/{comandaId}",
            new
            {
                idMesa = activeOrder.Mesa.IdMesa,
                idCliente = activeOrder.Cliente.IdCliente,
                itens = new[]
                {
                    new
                    {
                        idProduto = unavailable.IdProduto,
                        qtdProduto = 1,
                        precoUnitarioPago = unavailable.PrecoProduto,
                    },
                },
            });
        Assert.Equal(HttpStatusCode.BadRequest, updateResponse.StatusCode);
        Assert.Equal(10, await environment.ReadProductStockAsync(unavailable.IdProduto));
        Assert.Equal(8, await environment.ReadProductStockAsync(activeOrder.Produto.IdProduto));
    }

    [IsolatedSqlServerFact]
    public async Task Duplicate_customer_employee_payment_and_table_values_return_conflict()
    {
        await using var environment = await WorkflowTestEnvironment.CreateAsync();
        await environment.LoginAsAdminAsync();

        var customerPhone = "11987654321";
        using var customerCreated = await environment.SendUnsafeAsync(
            HttpMethod.Post,
            "/api/cliente",
            new
            {
                nomeCliente = $"Cliente-{Guid.NewGuid():N}",
                telefoneCliente = customerPhone,
            });
        Assert.Equal(HttpStatusCode.Created, customerCreated.StatusCode);
        using var customerDuplicate = await environment.SendUnsafeAsync(
            HttpMethod.Post,
            "/api/cliente",
            new
            {
                nomeCliente = $"Cliente-{Guid.NewGuid():N}",
                telefoneCliente = customerPhone,
            });
        Assert.Equal(HttpStatusCode.Conflict, customerDuplicate.StatusCode);
        Assert.Contains("Telefone do cliente já cadastrado", await customerDuplicate.Content.ReadAsStringAsync());

        var tableNumber = RandomNumberGenerator.GetInt32(1000, 100000);
        using var tableCreated = await environment.SendUnsafeAsync(
            HttpMethod.Post,
            "/api/mesa",
            new
            {
                numeroMesa = tableNumber,
                capacidadeMesa = 4,
                statusMesa = "DISPONIVEL",
            });
        Assert.Equal(HttpStatusCode.Created, tableCreated.StatusCode);
        using var tableDuplicate = await environment.SendUnsafeAsync(
            HttpMethod.Post,
            "/api/mesa",
            new
            {
                numeroMesa = tableNumber,
                capacidadeMesa = 4,
                statusMesa = "DISPONIVEL",
            });
        Assert.Equal(HttpStatusCode.Conflict, tableDuplicate.StatusCode);
        Assert.Contains("Número da mesa já cadastrado", await tableDuplicate.Content.ReadAsStringAsync());

        var email = $"employee-{Guid.NewGuid():N}@systemic.test";
        using var employeeCreated = await environment.SendUnsafeAsync(
            HttpMethod.Post,
            "/api/funcionario",
            CreateEmployeeBody(email, CreateCpf()));
        Assert.Equal(HttpStatusCode.Created, employeeCreated.StatusCode);

        using var employeeDuplicate = await environment.SendUnsafeAsync(
            HttpMethod.Post,
            "/api/funcionario",
            CreateEmployeeBody(email, CreateCpf()));
        Assert.Equal(HttpStatusCode.Conflict, employeeDuplicate.StatusCode);
        Assert.Contains("E-mail já cadastrado", await employeeDuplicate.Content.ReadAsStringAsync());

        var paymentName = $"Forma-{Guid.NewGuid():N}"[..20];
        using var paymentCreated = await environment.SendUnsafeAsync(
            HttpMethod.Post,
            "/api/formapagamento",
            new { nomeFormaPagamento = paymentName });
        Assert.Equal(HttpStatusCode.Created, paymentCreated.StatusCode);
        using var paymentDuplicate = await environment.SendUnsafeAsync(
            HttpMethod.Post,
            "/api/formapagamento",
            new { nomeFormaPagamento = paymentName });
        Assert.Equal(HttpStatusCode.Conflict, paymentDuplicate.StatusCode);
        Assert.Contains("Nome da forma de pagamento já cadastrado", await paymentDuplicate.Content.ReadAsStringAsync());
    }

    [IsolatedSqlServerFact]
    public async Task Text_input_injection_payloads_do_not_cause_server_errors()
    {
        await using var environment = await WorkflowTestEnvironment.CreateAsync();
        await environment.LoginAsAdminAsync();
        var orderData = await environment.CreateOrderDataAsync();
        var payloads = new[] { "' OR 1=1 --", "<script>alert(1)</script>", "Café 東京" };

        foreach (var payload in payloads)
        {
            var phone = $"119{RandomNumberGenerator.GetInt32(10000000, 99999999)}";
            using var customer = await environment.SendUnsafeAsync(
                HttpMethod.Post,
                "/api/cliente",
                new
                {
                    nomeCliente = payload,
                    telefoneCliente = phone,
                });
            await AssertSafeTextResponseAsync(customer);

            using var product = await environment.SendUnsafeAsync(
                HttpMethod.Post,
                "/api/produto",
                new
                {
                    nomeProduto = payload,
                    descricaoProduto = payload,
                    precoProduto = 1m,
                    qtdEstoque = 1,
                    estoqueMinimo = 0,
                    statusProduto = "DISPONIVEL",
                    categoriaProduto = "PRINCIPAL",
                });
            await AssertSafeTextResponseAsync(product);

            using var table = await environment.SendUnsafeAsync(
                HttpMethod.Post,
                "/api/mesa",
                new
                {
                    numeroMesa = RandomNumberGenerator.GetInt32(100000, 200000),
                    capacidadeMesa = 4,
                    statusMesa = payload,
                });
            await AssertSafeTextResponseAsync(table);

            using var paymentMethod = await environment.SendUnsafeAsync(
                HttpMethod.Post,
                "/api/formapagamento",
                new { nomeFormaPagamento = $"F-{payload}" });
            await AssertSafeTextResponseAsync(paymentMethod);

            using var employee = await environment.SendUnsafeAsync(
                HttpMethod.Post,
                "/api/funcionario",
                CreateEmployeeBody(
                    $"injection-{Guid.NewGuid():N}@systemic.test",
                    CreateCpf(),
                    payload));
            await AssertSafeTextResponseAsync(employee);

            using var expense = await environment.SendUnsafeAsync(
                HttpMethod.Post,
                "/api/faturamento/despesa",
                new
                {
                    descricaoDespesa = payload,
                    categoriaDespesa = payload,
                    valorDespesa = 1m,
                    idFormaPagamento = orderData.FormaPagamento.IdFormaPagamento,
                });
            await AssertSafeTextResponseAsync(expense);
        }
    }

    [IsolatedSqlServerFact]
    public async Task Login_returns_identical_responses_for_missing_wrong_and_locked_accounts()
    {
        await using var environment = await WorkflowTestEnvironment.CreateAsync();
        var csrfToken = await environment.GetCsrfTokenForTestAsync();

        using var missing = await environment.SendLoginAsync(
            csrfToken,
            $"missing-{Guid.NewGuid():N}@systemic.test",
            "senha-incorreta");
        using var incorrect = await environment.SendLoginAsync(
            csrfToken,
            environment.AdminEmailForTest,
            "senha-incorreta");

        Assert.Equal(HttpStatusCode.Unauthorized, missing.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, incorrect.StatusCode);
        var expectedBody = await missing.Content.ReadAsStringAsync();
        Assert.Equal(expectedBody, await incorrect.Content.ReadAsStringAsync());

        for (var attempt = 1; attempt < LoginLockoutPolicy.MaxAttempts; attempt++)
        {
            using var failedAttempt = await environment.SendLoginAsync(
                csrfToken,
                environment.AdminEmailForTest,
                "senha-incorreta");
            Assert.Equal(HttpStatusCode.Unauthorized, failedAttempt.StatusCode);
            Assert.Equal(expectedBody, await failedAttempt.Content.ReadAsStringAsync());
        }

        using var locked = await environment.SendLoginAsync(
            csrfToken,
            environment.AdminEmailForTest,
            environment.AdminPasswordForTest);
        Assert.Equal(HttpStatusCode.Unauthorized, locked.StatusCode);
        Assert.Equal(expectedBody, await locked.Content.ReadAsStringAsync());
    }

    [IsolatedSqlServerFact]
    public async Task Login_lockout_expires_after_fifteen_minutes()
    {
        var clock = new TestTimeProvider(DateTimeOffset.UtcNow);
        await using var environment = await WorkflowTestEnvironment.CreateAsync(timeProvider: clock);
        var csrfToken = await environment.GetCsrfTokenForTestAsync();

        for (var attempt = 0; attempt < LoginLockoutPolicy.MaxAttempts; attempt++)
        {
            using var failedAttempt = await environment.SendLoginAsync(
                csrfToken,
                environment.AdminEmailForTest,
                "senha-incorreta");
            Assert.Equal(HttpStatusCode.Unauthorized, failedAttempt.StatusCode);
        }

        using var locked = await environment.SendLoginAsync(
            csrfToken,
            environment.AdminEmailForTest,
            environment.AdminPasswordForTest);
        Assert.Equal(HttpStatusCode.Unauthorized, locked.StatusCode);

        clock.Advance(TimeSpan.FromMinutes(LoginLockoutPolicy.DurationMinutes) - TimeSpan.FromSeconds(1));
        using var stillLocked = await environment.SendLoginAsync(
            csrfToken,
            environment.AdminEmailForTest,
            environment.AdminPasswordForTest);
        Assert.Equal(HttpStatusCode.Unauthorized, stillLocked.StatusCode);

        clock.Advance(TimeSpan.FromSeconds(2));
        using var unlocked = await environment.SendLoginAsync(
            csrfToken,
            environment.AdminEmailForTest,
            environment.AdminPasswordForTest);
        Assert.Equal(HttpStatusCode.OK, unlocked.StatusCode);
    }

    [IsolatedSqlServerFact]
    public async Task Api_contract_checks_authentication_roles_and_csrf_for_all_72_actions()
    {
        await using var environment = await WorkflowTestEnvironment.CreateAsync();
        var actions = environment.GetApiActionsForTest();
        Assert.Equal(72, actions.Count);

        var csrfToken = await environment.GetCsrfTokenForTestAsync();
        var protectedActions = actions
            .Where(RequiresAuthentication)
            .ToArray();
        Assert.Equal(65, protectedActions.Length);

        foreach (var action in protectedActions)
        {
            var (method, path) = GetActionRequest(action);
            using var response = await SendContractRequestAsync(
                environment.Client,
                method,
                path,
                csrfToken,
                includeCsrf: true);
            Assert.True(
                response.StatusCode == HttpStatusCode.Unauthorized,
                $"{method} {path}: expected 401 without login, got {(int)response.StatusCode}.");
        }

        await environment.LoginAsAdminAsync();
        csrfToken = await environment.GetCsrfTokenForTestAsync();
        var bodyActions = actions
            .Where(HasBodyParameter)
            .ToArray();
        Assert.NotEmpty(bodyActions);
        foreach (var action in bodyActions)
        {
            var (method, path) = GetActionRequest(action);
            using var response = await SendContractRequestAsync(
                environment.Client,
                method,
                path,
                csrfToken,
                includeCsrf: true,
                invalidJson: true);
            Assert.True(
                response.StatusCode == HttpStatusCode.BadRequest,
                $"{method} {path}: expected 400 for malformed body, got {(int)response.StatusCode}.");
        }

        var mutableActions = actions
            .Where(action => IsMutatingMethod(GetActionRequest(action).Method))
            .ToArray();
        foreach (var action in mutableActions)
        {
            var (method, path) = GetActionRequest(action);
            using var response = await SendContractRequestAsync(
                environment.Client,
                method,
                path,
                csrfToken,
                includeCsrf: false);
            Assert.True(
                response.StatusCode == HttpStatusCode.BadRequest,
                $"{method} {path}: expected 400 without CSRF, got {(int)response.StatusCode}.");
        }

        var idActions = actions
            .Where(action => action.RoutePattern.Parameters.Any(parameter =>
                string.Equals(parameter.Name, "id", StringComparison.OrdinalIgnoreCase)))
            .ToList();
        idActions.AddRange(actions.Where(action =>
        {
            var descriptor = action.Metadata.GetMetadata<ControllerActionDescriptor>();
            return descriptor?.ControllerName == "Backup" && descriptor.ActionName == "BaixarBackup";
        }));
        foreach (var action in idActions)
        {
            var (method, path) = GetActionRequest(action);
            using var response = await SendContractRequestAsync(
                environment.Client,
                method,
                path,
                csrfToken,
                includeCsrf: true,
                body: CreatePlaceholderBody(action));
            var responseBody = await response.Content.ReadAsStringAsync();
            Assert.True(
                response.StatusCode == HttpStatusCode.NotFound,
                $"{method} {path}: expected 404 for a nonexistent ID, got {(int)response.StatusCode}. Response: {responseBody}");
        }

        await environment.LoginAsEmployeeForTestAsync();
        csrfToken = await environment.GetCsrfTokenForTestAsync();
        var adminOnlyActions = protectedActions
            .Where(IsAdminOnly)
            .ToArray();
        Assert.NotEmpty(adminOnlyActions);

        foreach (var action in adminOnlyActions)
        {
            var (method, path) = GetActionRequest(action);
            using var response = await SendContractRequestAsync(
                environment.Client,
                method,
                path,
                csrfToken,
                includeCsrf: true);
            Assert.True(
                response.StatusCode == HttpStatusCode.Forbidden,
                $"{method} {path}: expected 403 for employee, got {(int)response.StatusCode}.");
        }
    }

    [IsolatedSqlServerFact]
    public async Task Lists_support_opt_in_database_pagination_with_stable_ids_and_totals()
    {
        await using var environment = await WorkflowTestEnvironment.CreateAsync();
        await environment.LoginAsAdminAsync();

        var now = DateTime.UtcNow;
        await using (var context = environment.CreateContextForTest())
        {
            var customers = Enumerable.Range(0, 3)
                .Select(index => new Cliente { NomeCliente = $"PaginationCustomer-{index}-{Guid.NewGuid():N}" })
                .ToArray();
            var defaultPageCustomers = Enumerable.Range(0, 51)
                .Select(_ => new Cliente { NomeCliente = $"PaginationDefault-{Guid.NewGuid():N}" })
                .ToArray();
            var tables = Enumerable.Range(0, 3)
                .Select(index => new Mesa
                {
                    NumeroMesa = 300_000 + index,
                    CapacidadeMesa = 4,
                    StatusMesa = "DISPONIVEL",
                })
                .ToArray();
            var products = Enumerable.Range(0, 3)
                .Select(index => new Produto
                {
                    NomeProduto = $"PaginationProduct-{index}-{Guid.NewGuid():N}"[..45],
                    PrecoProduto = 1m,
                    QtdEstoque = 10,
                    EstoqueMinimo = 1,
                    StatusProduto = "DISPONIVEL",
                    CategoriaProduto = "PRINCIPAL",
                })
                .ToArray();
            var employees = Enumerable.Range(0, 3)
                .Select(index => new Funcionario
                {
                    NomeFuncionario = $"PaginationEmployee-{index}",
                    EmailFuncionario = $"pagination-{Guid.NewGuid():N}@systemic.test",
                    CargoFuncionario = "Teste",
                    CpfFuncionario = CreateCpf(),
                    TelefoneFuncionario = "11999999999",
                    PasswordFuncionario = "not-used-by-this-test",
                    Role = "employee",
                    StatusFuncionario = "ATIVO",
                })
                .ToArray();

            context.AddRange(customers);
            context.AddRange(defaultPageCustomers);
            context.AddRange(tables);
            context.AddRange(products);
            context.AddRange(employees);
            await context.SaveChangesAsync();

            context.AddRange(Enumerable.Range(0, 3).Select(index => new Comanda
            {
                IdMesa = tables[index].IdMesa,
                IdCliente = customers[index].IdCliente,
                DataAberta = now.AddSeconds(index),
                StatusComanda = "ABERTA",
                ValorTotal = 0m,
            }));
            context.AddRange(Enumerable.Range(0, 3).Select(index => new Reserva
            {
                IdMesa = tables[index].IdMesa,
                IdCliente = customers[index].IdCliente,
                DataReserva = now.AddDays(index + 1),
                StatusReserva = "DISPONIVEL",
            }));
            await context.SaveChangesAsync();
        }

        var lists = new[]
        {
            (Path: "/api/Produto", IdProperty: "idProduto"),
            (Path: "/api/Mesa", IdProperty: "idMesa"),
            (Path: "/api/Comanda", IdProperty: "idComanda"),
            (Path: "/api/Comanda/abertas/todas", IdProperty: "idComanda"),
            (Path: "/api/Pedidos", IdProperty: "idComanda"),
            (Path: "/api/Reserva", IdProperty: "idReserva"),
            (Path: "/api/Cliente", IdProperty: "idCliente"),
            (Path: "/api/Funcionario", IdProperty: "idFuncionario"),
        };

        foreach (var list in lists)
        {
            using var fullResponse = await environment.Client.GetAsync(list.Path);
            Assert.Equal(HttpStatusCode.OK, fullResponse.StatusCode);
            Assert.False(
                fullResponse.Headers.Contains("X-Total-Count"),
                $"{list.Path}: unpaginated response unexpectedly included X-Total-Count.");
            var fullIds = await ReadListIdsAsync(fullResponse, list.IdProperty);
            var expectedIds = fullIds.Order().ToArray();
            Assert.True(expectedIds.Length >= 3, $"{list.Path}: pagination fixture did not create enough rows.");
            if (list.Path == "/api/Cliente")
                Assert.True(expectedIds.Length > 50, "Cliente fixture did not create enough rows to test the default page size.");

            var actualIds = new List<int>();
            for (var page = 1; actualIds.Count < expectedIds.Length; page++)
            {
                using var request = new HttpRequestMessage(
                    HttpMethod.Get,
                    $"{list.Path}?pagina={page}&tamanho=2");
                request.Headers.Add("Origin", "http://localhost:8080");
                using var response = await environment.Client.SendAsync(request);
                Assert.Equal(HttpStatusCode.OK, response.StatusCode);
                Assert.Equal(
                    expectedIds.Length.ToString(System.Globalization.CultureInfo.InvariantCulture),
                    Assert.Single(response.Headers.GetValues("X-Total-Count")));
                Assert.Contains(
                    "X-Total-Count",
                    Assert.Single(response.Headers.GetValues("Access-Control-Expose-Headers")),
                    StringComparison.OrdinalIgnoreCase);
                actualIds.AddRange(await ReadListIdsAsync(response, list.IdProperty));
            }

            Assert.Equal(expectedIds, actualIds);
            Assert.Equal(actualIds.Count, actualIds.Distinct().Count());

            using var pageOnly = await environment.Client.GetAsync($"{list.Path}?pagina=1");
            Assert.Equal(HttpStatusCode.OK, pageOnly.StatusCode);
            Assert.Equal(expectedIds.Length.ToString(), Assert.Single(pageOnly.Headers.GetValues("X-Total-Count")));
            Assert.Equal(Math.Min(50, expectedIds.Length), (await ReadListIdsAsync(pageOnly, list.IdProperty)).Length);

            using var sizeOnly = await environment.Client.GetAsync($"{list.Path}?tamanho=2");
            Assert.Equal(HttpStatusCode.OK, sizeOnly.StatusCode);
            Assert.Equal(expectedIds.Length.ToString(), Assert.Single(sizeOnly.Headers.GetValues("X-Total-Count")));
            Assert.Equal(2, (await ReadListIdsAsync(sizeOnly, list.IdProperty)).Length);

            using var invalidPage = await environment.Client.GetAsync($"{list.Path}?pagina=0");
            Assert.Equal(HttpStatusCode.BadRequest, invalidPage.StatusCode);

            using var invalidSize = await environment.Client.GetAsync($"{list.Path}?tamanho=201");
            Assert.Equal(HttpStatusCode.BadRequest, invalidSize.StatusCode);

            using var overflowingOffset = await environment.Client.GetAsync(
                $"{list.Path}?pagina=2147483647&tamanho=200");
            Assert.Equal(HttpStatusCode.BadRequest, overflowingOffset.StatusCode);
        }
    }

    private static async Task<int[]> ReadListIdsAsync(HttpResponseMessage response, string idProperty)
    {
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return document.RootElement
            .GetProperty("dados")
            .EnumerateArray()
            .Select(item => item.GetProperty(idProperty).GetInt32())
            .ToArray();
    }

    [IsolatedSqlServerFact]
    public async Task Main_api_routes_report_latency_with_two_hundred_isolated_rows_per_table()
    {
        await using var environment = await WorkflowTestEnvironment.CreateAsync();
        await environment.LoginAsAdminAsync();

        const int rowCount = 200;
        var now = DateTime.UtcNow;
        await using (var context = environment.CreateContextForTest())
        {
            var customers = Enumerable.Range(0, rowCount)
                .Select(index => new Cliente { NomeCliente = $"LatencyCustomer-{index:D3}" })
                .ToArray();
            var tables = Enumerable.Range(0, rowCount)
                .Select(index => new Mesa
                {
                    NumeroMesa = 200_000 + index,
                    CapacidadeMesa = 4,
                    StatusMesa = "DISPONIVEL",
                })
                .ToArray();
            var products = Enumerable.Range(0, rowCount)
                .Select(index => new Produto
                {
                    NomeProduto = $"LatencyProduct-{index:D3}",
                    PrecoProduto = 1m,
                    QtdEstoque = 1_000,
                    EstoqueMinimo = 1,
                    StatusProduto = "DISPONIVEL",
                    CategoriaProduto = "PRINCIPAL",
                })
                .ToArray();

            context.AddRange(customers);
            context.AddRange(tables);
            context.AddRange(products);
            await context.SaveChangesAsync();

            var checks = Enumerable.Range(0, rowCount)
                .Select(index => new Comanda
                {
                    IdMesa = tables[index].IdMesa,
                    IdCliente = customers[index].IdCliente,
                    DataAberta = now,
                    StatusComanda = "ABERTA",
                    ValorTotal = 0m,
                })
                .ToArray();
            context.AddRange(checks);
            await context.SaveChangesAsync();

            var items = Enumerable.Range(0, rowCount)
                .Select(index => new ItemComanda
                {
                    IdComanda = checks[index].IdComanda,
                    IdProduto = products[index].IdProduto,
                    QtdProduto = 1,
                    PrecoUnitarioPago = 1m,
                    StatusItem = "PREPARAR",
                })
                .ToArray();
            var reservations = Enumerable.Range(0, rowCount)
                .Select(index => new Reserva
                {
                    IdMesa = tables[index].IdMesa,
                    IdCliente = customers[index].IdCliente,
                    DataReserva = now.AddDays(1),
                    StatusReserva = "DISPONIVEL",
                })
                .ToArray();
            context.AddRange(items);
            context.AddRange(reservations);
            await context.SaveChangesAsync();

            Assert.True(await context.Mesas.CountAsync() >= rowCount);
            Assert.True(await context.Clientes.CountAsync() >= rowCount);
            Assert.True(await context.Produtos.CountAsync() >= rowCount);
            Assert.True(await context.Comandas.CountAsync() >= rowCount);
            Assert.True(await context.ItensComanda.CountAsync() >= rowCount);
            Assert.True(await context.Reservas.CountAsync() >= rowCount);
        }

        var routes = new[]
        {
            "/api/mesa",
            "/api/comanda",
            "/api/comanda/abertas/todas",
            "/api/pedidos",
            "/api/produto",
            "/api/reserva",
        };
        foreach (var route in routes)
        {
            var elapsedMilliseconds = new double[20];
            for (var index = 0; index < elapsedMilliseconds.Length; index++)
            {
                var stopwatch = Stopwatch.StartNew();
                using var response = await environment.Client.GetAsync(route);
                var body = await response.Content.ReadAsByteArrayAsync();
                stopwatch.Stop();
                Assert.Equal(HttpStatusCode.OK, response.StatusCode);
                Assert.NotEmpty(body);
                elapsedMilliseconds[index] = stopwatch.Elapsed.TotalMilliseconds;
            }

            Array.Sort(elapsedMilliseconds);
            var p50 = Percentile(elapsedMilliseconds, 0.50);
            var p95 = Percentile(elapsedMilliseconds, 0.95);
            _output.WriteLine($"LATENCY|GET {route}|20|p50={p50:F2}ms|p95={p95:F2}ms");
        }
    }

    [IsolatedSqlServerFact]
    public async Task Api_responses_include_security_headers()
    {
        await using var environment = await WorkflowTestEnvironment.CreateAsync();
        using var response = await environment.Client.GetAsync("/api/healthcheck");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("nosniff", response.Headers.GetValues("X-Content-Type-Options").Single());
        Assert.Equal("DENY", response.Headers.GetValues("X-Frame-Options").Single());
        Assert.Equal("no-referrer", response.Headers.GetValues("Referrer-Policy").Single());
        Assert.Equal(
            "default-src 'none'; frame-ancestors 'none'",
            response.Headers.GetValues("Content-Security-Policy").Single());
        Assert.False(response.Headers.Contains("Strict-Transport-Security"));
    }

    [IsolatedSqlServerFact]
    public async Task Login_rate_limit_returns_429_and_retry_after()
    {
        await using var environment = await WorkflowTestEnvironment.CreateAsync(loginPermitLimit: 2);
        Assert.Equal("2", environment.GetConfigurationValueForTest("LOGIN_RATE_LIMIT_PER_MINUTE"));
        var csrfToken = await environment.GetCsrfTokenForTestAsync();

        using var first = await environment.SendLoginAsync(
            csrfToken,
            $"missing-{Guid.NewGuid():N}@systemic.test",
            "senha-incorreta");
        using var second = await environment.SendLoginAsync(
            csrfToken,
            $"missing-{Guid.NewGuid():N}@systemic.test",
            "senha-incorreta");
        using var limited = await environment.SendLoginAsync(
            csrfToken,
            $"missing-{Guid.NewGuid():N}@systemic.test",
            "senha-incorreta");

        Assert.Equal(HttpStatusCode.Unauthorized, first.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, second.StatusCode);
        Assert.Equal(HttpStatusCode.TooManyRequests, limited.StatusCode);
        Assert.True(limited.Headers.TryGetValues("Retry-After", out var retryValues));
        Assert.True(int.TryParse(retryValues.Single(), out var retryAfter));
        Assert.True(retryAfter > 0);
    }

    [IsolatedSqlServerFact]
    public async Task Production_antiforgery_cookie_is_secure()
    {
        await using var environment = await WorkflowTestEnvironment.CreateAsync(
            environmentName: "Production",
            antiforgeryCookieSecurePolicy: "Always",
            useHttps: true);
        using var response = await environment.Client.GetAsync("/api/autenticacao/csrf");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var csrfCookie = response.Headers.GetValues("Set-Cookie")
            .Single(value => value.StartsWith("systemic_csrf=", StringComparison.Ordinal));
        Assert.Contains("secure", csrfCookie, StringComparison.OrdinalIgnoreCase);
    }

    [IsolatedSqlServerFact]
    public async Task Oversized_name_fields_return_400_with_field_specific_validation()
    {
        await using var environment = await WorkflowTestEnvironment.CreateAsync();
        await environment.LoginAsAdminAsync();

        using var cliente = await environment.SendUnsafeAsync(
            HttpMethod.Post,
            "/api/cliente",
            new { nomeCliente = new string('C', 101) });
        Assert.Equal(HttpStatusCode.BadRequest, cliente.StatusCode);
        Assert.Contains("NomeCliente", await cliente.Content.ReadAsStringAsync());

        using var funcionario = await environment.SendUnsafeAsync(
            HttpMethod.Post,
            "/api/funcionario",
            CreateEmployeeBody($"long-{Guid.NewGuid():N}@systemic.test", CreateCpf(), new string('F', 101)));
        Assert.Equal(HttpStatusCode.BadRequest, funcionario.StatusCode);
        Assert.Contains("NomeFuncionario", await funcionario.Content.ReadAsStringAsync());

        using var pagamento = await environment.SendUnsafeAsync(
            HttpMethod.Post,
            "/api/formapagamento",
            new { nomeFormaPagamento = new string('P', 21) });
        Assert.Equal(HttpStatusCode.BadRequest, pagamento.StatusCode);
        Assert.Contains("NomeFormaPagamento", await pagamento.Content.ReadAsStringAsync());

        using var mesa = await environment.SendUnsafeAsync(
            HttpMethod.Post,
            "/api/mesa",
            new { numeroMesa = 987654, capacidadeMesa = 4, statusMesa = new string('M', 21) });
        Assert.Equal(HttpStatusCode.BadRequest, mesa.StatusCode);
        Assert.Contains("StatusMesa", await mesa.Content.ReadAsStringAsync());

        using var produto = await environment.SendUnsafeAsync(
            HttpMethod.Post,
            "/api/produto",
            new
            {
                nomeProduto = new string('P', 46),
                precoProduto = 1m,
                qtdEstoque = 1,
                estoqueMinimo = 1,
                statusProduto = "DISPONIVEL",
                categoriaProduto = "PRINCIPAL",
            });
        Assert.Equal(HttpStatusCode.BadRequest, produto.StatusCode);
        Assert.Contains("NomeProduto", await produto.Content.ReadAsStringAsync());

        var orderData = await environment.CreateOrderDataAsync();
        using var despesa = await environment.SendUnsafeAsync(
            HttpMethod.Post,
            "/api/faturamento/despesa",
            new
            {
                descricaoDespesa = new string('D', 101),
                categoriaDespesa = "Diversos",
                valorDespesa = 1m,
                idFormaPagamento = orderData.FormaPagamento.IdFormaPagamento,
            });
        Assert.Equal(HttpStatusCode.BadRequest, despesa.StatusCode);
        Assert.Contains("DescricaoDespesa", await despesa.Content.ReadAsStringAsync());
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

    private static object CreatePedidoBody(WorkflowTestEnvironment.OrderData orderData) => new
    {
        idMesa = orderData.Mesa.IdMesa,
        idCliente = orderData.Cliente.IdCliente,
        itens = new[]
        {
            new
            {
                idProduto = orderData.Produto.IdProduto,
                qtdProduto = 2,
                precoUnitarioPago = orderData.Produto.PrecoProduto,
            },
        },
    };

    private static object CreateEmployeeBody(string email, string cpf, string? name = null) => new
    {
        nomeFuncionario = name ?? "Funcionário de teste",
        cpfFuncionario = cpf,
        emailFuncionario = email,
        cargoFuncionario = "Teste",
        role = "employee",
        telefoneFuncionario = "11999999999",
        senha = "senha-local-de-teste",
    };

    private static string CreateCpf() =>
        string.Concat(Enumerable.Range(0, 11).Select(_ => RandomNumberGenerator.GetInt32(10).ToString()));

    private static bool RequiresAuthentication(RouteEndpoint endpoint) =>
        endpoint.Metadata.GetMetadata<IAllowAnonymous>() is null
        && endpoint.Metadata.GetOrderedMetadata<IAuthorizeData>().Count > 0;

    private static bool IsAdminOnly(RouteEndpoint endpoint)
    {
        var roles = endpoint.Metadata.GetOrderedMetadata<IAuthorizeData>()
            .SelectMany(metadata => (metadata.Roles ?? string.Empty)
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        return (roles.Contains("admin") || roles.Contains("owner"))
            && !roles.Contains("employee");
    }

    private static (HttpMethod Method, string Path) GetActionRequest(RouteEndpoint endpoint)
    {
        var methods = endpoint.Metadata.GetMetadata<HttpMethodMetadata>()?.HttpMethods;
        if (methods is null || methods.Count != 1)
            throw new InvalidOperationException("Each controller action must declare exactly one HTTP method.");

        var route = endpoint.RoutePattern.RawText
            ?? throw new InvalidOperationException("A controller action has no route template.");
        var path = Regex.Replace(route, @"\{[^}]+\}", int.MaxValue.ToString());
        return (new HttpMethod(methods[0]), $"/{path.TrimStart('/')}");
    }

    private static double Percentile(double[] sortedValues, double percentile)
    {
        var index = Math.Clamp((int)Math.Ceiling(percentile * sortedValues.Length) - 1, 0, sortedValues.Length - 1);
        return sortedValues[index];
    }

    private static bool IsMutatingMethod(HttpMethod method) =>
        method == HttpMethod.Post
        || method == HttpMethod.Put
        || method == HttpMethod.Delete
        || string.Equals(method.Method, "PATCH", StringComparison.OrdinalIgnoreCase);

    private static bool HasBodyParameter(RouteEndpoint endpoint) =>
        endpoint.Metadata.GetMetadata<ControllerActionDescriptor>()?.Parameters
            .Any(parameter => parameter.BindingInfo?.BindingSource?.Id is "Body" or "Form" or "FormFile")
        ?? false;

    private static object? CreatePlaceholderBody(RouteEndpoint endpoint)
    {
        var descriptor = endpoint.Metadata.GetMetadata<ControllerActionDescriptor>();
        var parameter = descriptor?.Parameters.FirstOrDefault(candidate =>
            candidate.BindingInfo?.BindingSource?.Id is "Body" or "Form" or "FormFile");
        if (parameter is null)
            return null;

        var type = parameter.ParameterType;
        if (type == typeof(string))
            return "Contrato";
        if (type.IsValueType)
            return type == typeof(int) ? 1 : Activator.CreateInstance(type);

        var body = Activator.CreateInstance(type);
        if (body is null)
            return new { };

        foreach (var property in type.GetProperties().Where(property => property.CanWrite))
        {
            var propertyType = Nullable.GetUnderlyingType(property.PropertyType) ?? property.PropertyType;
            object? value = propertyType == typeof(string) ? PlaceholderString(property.Name) :
                propertyType == typeof(int) ? 1 :
                propertyType == typeof(long) ? 1L :
                propertyType == typeof(decimal) ? 1m :
                propertyType == typeof(double) ? 1d :
                propertyType == typeof(float) ? 1f :
                propertyType == typeof(bool) ? true :
                propertyType == typeof(DateTime) ? DateTime.UtcNow.AddDays(1) :
                propertyType == typeof(DateTimeOffset) ? DateTimeOffset.UtcNow.AddDays(1) :
                propertyType == typeof(Guid) ? Guid.NewGuid() :
                property.PropertyType.IsArray
                    ? Array.CreateInstance(property.PropertyType.GetElementType()!, 0)
                    : property.PropertyType.IsGenericType
                      && property.PropertyType.GetGenericTypeDefinition() == typeof(List<>)
                        ? Activator.CreateInstance(property.PropertyType)
                        : null;

            if (value is not null)
                property.SetValue(body, value);
        }

        return body;
    }

    private static string PlaceholderString(string propertyName) =>
        propertyName.Contains("email", StringComparison.OrdinalIgnoreCase) ? "contrato@systemic.test" :
        propertyName.Contains("cpf", StringComparison.OrdinalIgnoreCase) ? "12345678901" :
        propertyName.Contains("telefone", StringComparison.OrdinalIgnoreCase) ? "11999999999" :
        propertyName.Contains("senha", StringComparison.OrdinalIgnoreCase) ? "senha-contrato" :
        propertyName.Contains("role", StringComparison.OrdinalIgnoreCase) ? "employee" :
        propertyName.Contains("statusComanda", StringComparison.OrdinalIgnoreCase) ? "ABERTA" :
        propertyName.Contains("status", StringComparison.OrdinalIgnoreCase) ? "DISPONIVEL" :
        "Contrato";

    private static async Task AssertSafeTextResponseAsync(HttpResponseMessage response)
    {
        Assert.True(
            (int)response.StatusCode < 500,
            $"Unexpected server error: {(int)response.StatusCode}; {await response.Content.ReadAsStringAsync()}");
    }

    private static async Task<HttpResponseMessage> SendContractRequestAsync(
        HttpClient client,
        HttpMethod method,
        string path,
        string csrfToken,
        bool includeCsrf,
        bool invalidJson = false,
        object? body = null)
    {
        using var request = new HttpRequestMessage(method, path);
        if (method != HttpMethod.Get && method != HttpMethod.Head && method != HttpMethod.Delete)
        {
            request.Content = invalidJson
                ? new StringContent("{", System.Text.Encoding.UTF8, "application/json")
                : JsonContent.Create(body ?? new { });
        }
        if (includeCsrf && IsMutatingMethod(method))
            request.Headers.Add("X-CSRF-TOKEN", csrfToken);
        return await client.SendAsync(request);
    }

    private sealed class TestTimeProvider(DateTimeOffset initialTime) : TimeProvider
    {
        private DateTimeOffset _utcNow = initialTime;

        public override DateTimeOffset GetUtcNow() => _utcNow;

        internal void Advance(TimeSpan duration) => _utcNow = _utcNow.Add(duration);
    }

    private sealed class WorkflowTestEnvironment : IAsyncDisposable
    {
        private static readonly string JwtSecret = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));
        private readonly string _databaseName;
        private readonly string _adminEmail;
        private readonly string _adminPassword;
        private readonly string? _previousJwtSecret;
        private readonly string? _previousLoginRateLimit;
        private string? _adminToken;
        private readonly SqlConnectionStringBuilder _serverConnectionString;
        private readonly string _databaseConnectionString;
        private readonly WebApplicationFactory<Program> _factory;

        private WorkflowTestEnvironment(
            string databaseName,
            string adminEmail,
            string adminPassword,
            string? previousJwtSecret,
            string? previousLoginRateLimit,
            SqlConnectionStringBuilder serverConnectionString,
            string databaseConnectionString,
            WebApplicationFactory<Program> factory,
            bool useHttps)
        {
            _databaseName = databaseName;
            _adminEmail = adminEmail;
            _adminPassword = adminPassword;
            _previousJwtSecret = previousJwtSecret;
            _previousLoginRateLimit = previousLoginRateLimit;
            _serverConnectionString = serverConnectionString;
            _databaseConnectionString = databaseConnectionString;
            _factory = factory;
            Client = factory.CreateClient(new WebApplicationFactoryClientOptions
            {
                HandleCookies = true,
                BaseAddress = new Uri(useHttps ? "https://localhost" : "http://localhost"),
            });
        }

        internal HttpClient Client { get; }
        internal string? GetConfigurationValueForTest(string key) =>
            _factory.Services.GetRequiredService<IConfiguration>()[key];
        internal IReadOnlyList<RouteEndpoint> GetApiActionsForTest() =>
            _factory.Services.GetRequiredService<EndpointDataSource>()
                .Endpoints
                .OfType<RouteEndpoint>()
                .Where(endpoint => endpoint.Metadata.GetMetadata<ControllerActionDescriptor>() is not null)
                .ToArray();
        internal string AdminEmailForTest => _adminEmail;
        internal string AdminPasswordForTest => _adminPassword;

        internal static async Task<WorkflowTestEnvironment> CreateAsync(
            int? loginPermitLimit = null,
            string environmentName = "Development",
            string? antiforgeryCookieSecurePolicy = null,
            bool useHttps = false,
            TimeProvider? timeProvider = null)
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
            var previousLoginRateLimit = Environment.GetEnvironmentVariable("LOGIN_RATE_LIMIT_PER_MINUTE");

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
                if (loginPermitLimit.HasValue)
                    Environment.SetEnvironmentVariable(
                        "LOGIN_RATE_LIMIT_PER_MINUTE",
                        loginPermitLimit.Value.ToString());

                var factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
                {
                    builder.UseEnvironment(environmentName);
                    builder.ConfigureAppConfiguration((_, configuration) =>
                    {
                        var settings = new Dictionary<string, string?>
                        {
                            ["Jwt:SecretKey"] = JwtSecret,
                        };
                        if (loginPermitLimit.HasValue)
                            settings["LOGIN_RATE_LIMIT_PER_MINUTE"] = loginPermitLimit.Value.ToString();
                        if (antiforgeryCookieSecurePolicy is not null)
                            settings["ANTIFORGERY_COOKIE_SECURE_POLICY"] = antiforgeryCookieSecurePolicy;
                        configuration.AddInMemoryCollection(settings);
                    });
                    builder.ConfigureServices(services =>
                    {
                        services.RemoveAll<DbContextOptions<AppDbContext>>();
                        services.RemoveAll<AppDbContext>();
                        services.AddDbContext<AppDbContext>(options =>
                            options.UseSqlServer(databaseConnectionString));
                        if (timeProvider is not null)
                        {
                            services.RemoveAll<TimeProvider>();
                            services.AddSingleton<TimeProvider>(timeProvider);
                        }
                    });
                });

                environment = new WorkflowTestEnvironment(
                    databaseName,
                    adminEmail,
                    adminPassword,
                    previousJwtSecret,
                    previousLoginRateLimit,
                    serverConnectionString,
                    databaseConnectionString,
                    factory,
                    useHttps);
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
                    Environment.SetEnvironmentVariable("LOGIN_RATE_LIMIT_PER_MINUTE", previousLoginRateLimit);
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
            var authCookieHeader = response.Headers.GetValues("Set-Cookie")
                .First(value => value.StartsWith(
                    $"{JwtService.AuthCookieName}=",
                    StringComparison.Ordinal));
            var token = authCookieHeader.Split(';')[0].Substring($"{JwtService.AuthCookieName}=".Length);
            _adminToken = token;
            Client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", token);

            using var validationResponse = await Client.GetAsync("/api/autenticacao/validar");
            Assert.Equal(HttpStatusCode.OK, validationResponse.StatusCode);
        }

        internal async Task LoginAsEmployeeForTestAsync()
        {
            const string password = "integration-test-employee-password";
            var email = $"employee-{Guid.NewGuid():N}@systemic.test";
            await using (var context = CreateContext())
            {
                context.Funcionarios.Add(new Funcionario
                {
                    NomeFuncionario = "Funcionário de integração",
                    EmailFuncionario = email,
                    CargoFuncionario = "Teste",
                    CpfFuncionario = CreateCpf(),
                    TelefoneFuncionario = "11999999999",
                    PasswordFuncionario = PasswordHashService.HashPassword(password),
                    Role = "employee",
                    StatusFuncionario = "ATIVO",
                });
                await context.SaveChangesAsync();
            }

            using var request = new HttpRequestMessage(HttpMethod.Post, "/api/autenticacao/login")
            {
                Content = JsonContent.Create(new { email, password }),
            };
            request.Headers.Add("X-CSRF-TOKEN", await GetCsrfTokenAsync());
            using var response = await Client.SendAsync(request);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var authCookieHeader = response.Headers.GetValues("Set-Cookie")
                .First(value => value.StartsWith(
                    $"{JwtService.AuthCookieName}=",
                    StringComparison.Ordinal));
            var token = authCookieHeader.Split(';')[0].Substring($"{JwtService.AuthCookieName}=".Length);
            Client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", token);
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
            if (!string.IsNullOrEmpty(_adminToken))
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _adminToken);
            return await Client.SendAsync(request);
        }

        internal async Task<HttpResponseMessage> SendLoginAsync(string csrfToken, string email, string password)
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, "/api/autenticacao/login")
            {
                Content = JsonContent.Create(new { email, password }),
            };
            request.Headers.Add("X-CSRF-TOKEN", csrfToken);
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

        internal async Task<Cliente> CreateCustomerAsync()
        {
            var customer = new Cliente { NomeCliente = $"Cliente-{Guid.NewGuid():N}" };
            await using var context = CreateContext();
            context.Clientes.Add(customer);
            await context.SaveChangesAsync();
            return customer;
        }

        internal AppDbContext CreateContextForTest() => CreateContext();

        internal Task<string> GetCsrfTokenForTestAsync() => GetCsrfTokenAsync();

        internal async Task<OrderData> CreateOrderDataAsync(string productStatus = "DISPONIVEL")
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
                StatusProduto = productStatus,
                CategoriaProduto = "PRINCIPAL",
            };
            context.AddRange(mesa, cliente, produto);
            await context.SaveChangesAsync();
            var formaPagamento = await context.FormasPagamento
                .AsNoTracking()
                .FirstAsync(forma => forma.NomeFormaPagamento == "PIX");
            return new OrderData(mesa, cliente, produto, formaPagamento);
        }

        internal async Task<Produto> CreateProductAsync(string status)
        {
            var produto = new Produto
            {
                NomeProduto = $"Produto-{Guid.NewGuid():N}"[..40],
                PrecoProduto = 17.50m,
                QtdEstoque = 10,
                EstoqueMinimo = 1,
                StatusProduto = status,
                CategoriaProduto = "PRINCIPAL",
            };
            await using var context = CreateContext();
            context.Produtos.Add(produto);
            await context.SaveChangesAsync();
            return produto;
        }

        internal Task<int> CreateComandaAsync(Mesa mesa, Cliente cliente) =>
            CreateComandaAsyncCore(mesa.IdMesa, cliente.IdCliente);

        private async Task<int> CreateComandaAsyncCore(int mesaId, int clienteId)
        {
            using var response = await SendUnsafeAsync(
                HttpMethod.Post,
                "/api/comanda",
                new { idMesa = mesaId, idCliente = clienteId });
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            return json.RootElement.GetProperty("idComanda").GetInt32();
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

        internal async Task<string> ReadOrderItemStatusAsync(int comandaId, int productId)
        {
            await using var context = CreateContext();
            return await context.ItensComanda
                .Where(item => item.IdComanda == comandaId && item.IdProduto == productId)
                .Select(item => item.StatusItem)
                .SingleAsync();
        }

        internal async Task<int> ReadProductStockAsync(int productId)
        {
            await using var context = CreateContext();
            return await context.Produtos
                .Where(produto => produto.IdProduto == productId)
                .Select(produto => produto.QtdEstoque)
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
            Environment.SetEnvironmentVariable("LOGIN_RATE_LIMIT_PER_MINUTE", _previousLoginRateLimit);
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
                         "03-constraints.sql",
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
