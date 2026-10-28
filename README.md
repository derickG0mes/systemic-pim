# Systemic PIM

Aplicação de gerenciamento de restaurante com API .NET 10, front-end React/Vite e SQL Server.

## Executar com Docker Compose

Requisito: Docker Desktop (ou Docker Engine) com suporte ao Docker Compose.

1. Crie o arquivo local de variáveis a partir do exemplo:

   ```powershell
   Copy-Item .env.example .env
   ```

   Altere `DB_PASSWORD` para uma senha que atenda aos requisitos do SQL Server e substitua `JWT_SECRET_KEY` por um segredo aleatório com pelo menos 32 caracteres.

2. Na raiz do repositório, inicie os serviços:

   ```bash
   docker compose up --build
   ```

O Compose inicia o SQL Server com volume persistente, espera o banco ficar disponível e executa os scripts idempotentes `01-create-database-idempotent.sql` e `02-procedures-views.sql` antes de iniciar a API. Em inicializações posteriores, os scripts podem ser reaplicados com segurança para manter o schema e as procedures atualizados.

- Front-end: http://localhost:8080
- API: http://localhost:5050
- Health check da API: http://localhost:5050/api/healthcheck
- SQL Server: `localhost:1433`

Para encerrar os containers, use `Ctrl+C` e então `docker compose down`. Os dados permanecem no volume `sqlserver_data`; para removê-los intencionalmente, execute `docker compose down --volumes`.

## Verificações de CI local

```bash
dotnet build systemic-pim.sln
dotnet test tests/back-end.Tests.csproj
cd front-end
npm ci
npm run lint
npm run build
```

O workflow do GitHub Actions executa essas verificações em cada push e pull request.
