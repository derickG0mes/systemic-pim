# Systemic PIM

Sistema para gerenciamento de restaurante. O projeto é composto por uma API
ASP.NET Core/.NET 10, uma interface web em React 18 com TypeScript, Vite e React
Router 7, um aplicativo mobile Expo (React Native) e SQL Server 2022. Web e
mobile usam SignalR para atualizações em tempo real, e a interface web pode ser
instalada como PWA.

## Funcionalidades

- Pedidos, comandas e pagamento, com baixa automática de estoque.
- Estoque e produtos, com ajuste manual e alerta de estoque baixo.
- Reservas de mesa.
- Faturamento, despesas e relatórios (admin e proprietário).
- Cadastro de funcionários com três perfis: `employee`, `admin` e `owner`.
- Auditoria (logs do sistema) e backup/restauração assinados por HMAC.
- Notificações em tempo real (novos pedidos, pedido pronto, estoque, reservas), com
  push remoto no app mobile para quem está com o app fechado
  ([como configurar](docs/PUSH_NOTIFICATIONS.md)).
- Acessibilidade: widget VLibras e navegação por teclado na web; temas
  Claro, Escuro e Alto contraste no app.

## Estrutura do repositório

| Pasta | Conteúdo |
|---|---|
| [`back-end/`](back-end/README.md) | API ASP.NET Core, scripts SQL, Dockerfile |
| [`front-end/`](front-end/README.md) | Interface web React/Vite (PWA), Nginx, Dockerfile |
| [`mobile/`](mobile/README.md) | Aplicativo Expo para Android e iOS |
| `tests/` | Testes .NET (unitários e de integração) |
| [`docs/`](docs/README.md) | Documentação técnica |
| `.github/workflows/` | CI (`ci.yml`) e CD (`cd.yml`) |
| `docker-compose.yml` | SQL Server, inicialização do banco, API e front-end |

## Requisitos

- Docker Desktop ou Docker Engine com Docker Compose (modo recomendado).
- Para execução sem Docker: .NET SDK 10, Node.js 22.12 ou superior, npm e SQL
  Server acessível.
- Para o app mobile: Node.js, npm e, para gerar o APK, uma conta Expo (EAS).

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

O Compose usa um volume externo para as chaves do ASP.NET Data Protection.
Crie-o uma única vez antes da primeira subida:

```powershell
docker volume create systemic-pim_aspnet_data_protection_keys
```

Inicie os serviços:

```powershell
docker compose up --build
```

O Compose inicia o SQL Server, espera o health check, executa `db-init` e seus
scripts SQL (`01` a `05`) e então inicia a API e a interface.

| Serviço | Endereço |
|---|---|
| Interface | http://localhost:8080 |
| API pela interface | http://localhost:8080/api |
| Health check direto da API | http://localhost:5050/api/healthcheck |
| SQL Server | `localhost:1433` |
| Swagger | http://localhost:5050/swagger (somente com `ASPNETCORE_ENVIRONMENT=Development`; indisponível no Compose padrão) |

O navegador deve usar a API pela interface (`/api`): o Nginx encaminha as
requisições dentro do Docker. Dispositivos móveis só precisam alcançar a porta
8080; não é necessário expor a porta 5050 na rede Wi-Fi. O Compose local permite
cookies de sessão HTTP por configuração explícita (`ALLOW_INSECURE_LOCAL_NETWORK=true`
no `.env`, desligado por padrão); em produção, use HTTPS.

`docker compose down` encerra os serviços e preserva os volumes
`sqlserver_data` e `backup_data`. Use `docker compose down --volumes` somente
quando quiser apagar também o banco e os backups persistidos.

As contas iniciais criadas pelo script 01 estão em
[docs/CONFIGURACAO.md](docs/CONFIGURACAO.md#contas-iniciais).

## Executar sem Docker

Crie o banco e aplique, na ordem, os scripts:

1. [`01-create-database-idempotent.sql`](back-end/Scripts/01-create-database-idempotent.sql)
2. [`02-procedures-views.sql`](back-end/Scripts/02-procedures-views.sql)
3. [`03-constraints.sql`](back-end/Scripts/03-constraints.sql)
4. [`04-create-notifications.sql`](back-end/Scripts/04-create-notifications.sql)
5. [`05-create-push-devices.sql`](back-end/Scripts/05-create-push-devices.sql)

Defina `DB_SERVER`, `DB_NAME` (opcional; padrão `DB_RESTAURANTE`), `DB_USER`,
`DB_PASSWORD`, `JWT_SECRET_KEY` e `BACKUP_HMAC_KEY`. Os scripts criam e usam o
banco `DB_RESTAURANTE`; se escolher outro nome em `DB_NAME`, adapte os scripts.
A API procura `.env` no diretório de trabalho atual; ao iniciá-la a partir de
`back-end`, use um `back-end/.env` local ou variáveis de ambiente.

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

`systemic-pim.sln` contém apenas o projeto da API; os testes têm projeto
próprio (`tests/back-end.Tests.csproj`). No mobile, a partir de `mobile/`, use
`npm run typecheck` e `npm run lint`.

Os testes de integração de backup precisam de SQL Server e ficam desabilitados
por padrão; habilite-os com `RUN_INTEGRATION_TESTS=1` e defina
`BACKUP_TEST_CONNECTION_STRING` apontando para um SQL Server onde os testes
possam criar e remover bancos temporários. Os testes de workflow SQL usam a
variável `INTEGRATION_TEST_SQL_CONNECTION_STRING` com a mesma permissão, e ela
precisa apontar para o catálogo `master` de um servidor local (`localhost`,
`127.0.0.1` ou `.`). Não aponte essas conexões para um banco com dados que devam
ser preservados.

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

O workflow de CI (`.github/workflows/ci.yml`) executa, em push e pull request,
a varredura de segredos (gitleaks), o build e os testes .NET, a auditoria das
dependências de produção, o lint, os testes e o build do front-end.

## App mobile

O aplicativo em [`mobile/`](mobile/README.md) usa Expo e Expo Router e consome a
mesma API pelo Nginx do front-end. Para rodar:

```powershell
Set-Location mobile
npm ci
Copy-Item .env.example .env   # defina EXPO_PUBLIC_API_URL=http://IP_DO_COMPUTADOR:8080/api
npx expo start
```

A geração do APK, a configuração de HTTP na rede local e a validação da sessão
estão no [README do mobile](mobile/README.md).

## Documentação

- [Índice da documentação](docs/README.md)
- [Configuração, execução, segurança e backup](docs/CONFIGURACAO.md)
- [Variáveis de ambiente](docs/VARIAVEIS_AMBIENTE.md)
- [Referência da API (endpoints, SignalR, notificações)](docs/API.md)
- [Notificações push com o app fechado e credenciais (Firebase, Apple, Expo)](docs/PUSH_NOTIFICATIONS.md)
- [Arquitetura, módulos, dados e permissões](docs/ARQUITETURA.md)
- [Guia de implantação e CI/CD](docs/DEPLOY.md)
- [Exemplo TypeScript de integração com a API](docs/EXEMPLO_INTEGRACAO_REACT.ts)
- [Instruções da API](back-end/README.md), do [front-end](front-end/README.md) e do [mobile](mobile/README.md)
- [Guia de contribuição](CONTRIBUTING.md)

## Implantação

O repositório não implanta em nuvem. O fluxo de CD (`.github/workflows/cd.yml`)
roda um smoke test do Compose e publica as imagens `ghcr.io/derickg0mes/systemic-pim-api`
e `ghcr.io/derickg0mes/systemic-pim-front-end` no GitHub Container Registry. O
front-end e a API devem ser publicados com TLS; ao usar um proxy reverso,
configure apenas os proxies confiáveis em `FORWARDED_HEADERS_KNOWN_PROXIES`. A
autenticação usa cookie HttpOnly e proteção CSRF, e pressupõe front-end e API no
mesmo site. Consulte [docs/DEPLOY.md](docs/DEPLOY.md) e
[docs/CONFIGURACAO.md](docs/CONFIGURACAO.md) antes de alterar domínio, proxy,
CORS ou política de cookies.

## Licença

[MIT](LICENSE).
