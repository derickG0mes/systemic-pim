# Systemic PIM

Sistema web para gerenciamento de restaurante. O projeto é composto por uma
API ASP.NET Core/.NET 10, uma interface React 18 com TypeScript, Vite e React
Router 7, e SQL Server 2022. A interface também usa SignalR para atualizações da
cozinha e oferece suporte a instalação como PWA.

## Requisitos

- Docker Desktop ou Docker Engine com Docker Compose (modo recomendado).
- Para execução sem Docker: .NET SDK 10, Node.js 22.12 ou superior, npm e SQL
  Server acessível.

## Executar com Docker Compose

Na raiz do repositório, copie o exemplo e troque todos os valores
`TROQUE_*` por valores próprios:

```powershell
Copy-Item .env.example .env
```

Configure especialmente `DB_PASSWORD`, `JWT_SECRET_KEY` e `BACKUP_HMAC_KEY`.
Use valores fortes e exclusivos; `JWT_SECRET_KEY` deve ter ao menos 32
caracteres e `BACKUP_HMAC_KEY`, ao menos 32 bytes. Nunca use os placeholders do
arquivo de exemplo em produção nem versione `.env`.

Inicie os serviços:

```powershell
docker compose up --build
```

O Compose inicia o SQL Server, espera o health check, executa `db-init` e seus
scripts SQL e então inicia a API e a interface.

| Serviço | Endereço |
|---|---|
| Interface | http://localhost:8080 |
| API pela interface | http://localhost:8080/api |
| Health check direto da API | http://localhost:5050/api/healthcheck |
| SQL Server | `localhost:1433` |
| Swagger | http://localhost:5050/swagger (somente quando habilitado em Development) |

O navegador deve usar a API pela interface (`/api`): o Nginx encaminha as
requisições dentro do Docker. Dispositivos móveis só precisam alcançar a porta
8080; não é necessário expor a porta 5050 na rede Wi-Fi. O Compose local permite
cookies de sessão HTTP por configuração explícita; em produção, use HTTPS.

`docker compose down` encerra os serviços e preserva os volumes
`sqlserver_data` e `backup_data`. Use `docker compose down --volumes` somente
quando quiser apagar também o banco e os backups persistidos.

## Executar sem Docker

Crie o banco e aplique, na ordem, os scripts:

1. [`01-create-database-idempotent.sql`](back-end/Scripts/01-create-database-idempotent.sql)
2. [`02-procedures-views.sql`](back-end/Scripts/02-procedures-views.sql)
3. [`03-constraints.sql`](back-end/Scripts/03-constraints.sql)

Defina `DB_SERVER`, `DB_NAME` (opcional; padrão `DB_RESTAURANTE`), `DB_USER`,
`DB_PASSWORD`, `JWT_SECRET_KEY` e `BACKUP_HMAC_KEY`. A API procura `.env` no
diretório de trabalho atual; ao iniciá-la a partir de `back-end`, use um
`back-end/.env` local ou variáveis de ambiente.

```powershell
Set-Location back-end
dotnet restore
dotnet run
```

Em outro terminal:

```powershell
Set-Location front-end
npm ci
npm run dev
```

O Vite fica em http://localhost:8080 e encaminha `/api` e `/hubs` para a API
em `localhost:5050`. O cliente usa a mesma origem da página. Garanta que a API
e o SQL Server estejam disponíveis.

## Testes e verificações

Na raiz:

```powershell
dotnet build systemic-pim.sln
dotnet test tests/back-end.Tests.csproj
Set-Location front-end
npm ci
npm test -- --run
npm run lint
npm run build
```

Os testes de integração de backup precisam de SQL Server e ficam desabilitados
por padrão; habilite-os com `RUN_INTEGRATION_TESTS=1` e defina
`BACKUP_TEST_CONNECTION_STRING` apontando para um SQL Server onde os testes
possam criar e remover bancos temporários. Os testes de workflow SQL usam a
variável `INTEGRATION_TEST_SQL_CONNECTION_STRING` com a mesma permissão. Não
aponte essas conexões para um banco com dados que devam ser preservados.

Exemplo no PowerShell com o SQL Server local do Compose ativo. Defina
`$env:DB_PASSWORD` na sessão com a senha do SQL Server; a conexão deve apontar
para `master`:

```powershell
$connectionBuilder = New-Object System.Data.SqlClient.SqlConnectionStringBuilder
$connectionBuilder.DataSource = "localhost,1433"
$connectionBuilder.InitialCatalog = "master"
$connectionBuilder.UserID = "sa"
$connectionBuilder.Password = $env:DB_PASSWORD
$connectionBuilder.TrustServerCertificate = $true
$testConnection = $connectionBuilder.ConnectionString
$env:RUN_INTEGRATION_TESTS = "1"
$env:BACKUP_TEST_CONNECTION_STRING = $testConnection
$env:INTEGRATION_TEST_SQL_CONNECTION_STRING = $testConnection
dotnet test tests/back-end.Tests.csproj
Remove-Item Env:RUN_INTEGRATION_TESTS
Remove-Item Env:BACKUP_TEST_CONNECTION_STRING
Remove-Item Env:INTEGRATION_TEST_SQL_CONNECTION_STRING
```

O workflow de CI executa build e testes .NET, auditoria das dependências de
produção, lint, testes e build do front-end em push e pull request.

## Documentação

- [Índice da documentação](docs/README.md)
- [Configuração, execução, segurança e endpoints](docs/CONFIGURACAO.md)
- [Arquitetura, módulos, dados e permissões](docs/ARQUITETURA.md)
- [Exemplo TypeScript de integração com a API](docs/EXEMPLO_INTEGRACAO_REACT.ts)
- [Instruções da API](back-end/README.md)

## Limitações de implantação

Não há implantação em nuvem configurada neste repositório. O front-end e a API
devem ser publicados com TLS; ao usar um proxy reverso, configure apenas os
proxies confiáveis em `FORWARDED_HEADERS_KNOWN_PROXIES`. A autenticação usa
cookie HttpOnly e proteção CSRF, e pressupõe front-end e API no mesmo site.
Consulte [CONFIGURACAO.md](docs/CONFIGURACAO.md) antes de alterar domínio,
proxy, CORS ou política de cookies.
