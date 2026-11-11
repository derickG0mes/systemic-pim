# Variáveis de ambiente - Systemic PIM

Referência única das variáveis lidas pelo código e pelos arquivos de
orquestração. Nunca versione valores reais: os arquivos `.env` estão no
`.gitignore` e só os `.env.example` (com placeholders `TROQUE_*`) são
versionados.

## Onde cada arquivo `.env` é lido

| Arquivo | Lido por | Observação |
|---|---|---|
| `.env` (raiz) | `docker compose` (substituição `${...}` e `env_file` do serviço `api`) | Copie de [`.env.example`](../.env.example). |
| `back-end/.env` | `EnvLoader` da API, **somente** quando o diretório de trabalho é `back-end` | Útil com `dotnet run`. `EnvLoader` não sobrescreve variáveis já definidas no processo. |
| `mobile/.env` | Expo (Metro) em desenvolvimento | Copie de [`mobile/.env.example`](../mobile/.env.example). Não é enviado ao EAS Build (veja [Mobile](#mobile)). |
| `front-end/.env` | **Nada** | `front-end/.env.example` lista `VITE_PORT`, `VITE_API_URL`, `VITE_SIGNALR_HUB_URL` e `VITE_APP_ENV`, mas nenhuma delas é lida pelo código (`import.meta.env` não é usado). O front-end usa `window.location.origin + "/api"`. |

`EnvLoader` procura `.env` em `Directory.GetCurrentDirectory()`, aceita linhas
`CHAVE=VALOR`, ignora linhas vazias e iniciadas por `#` e remove aspas simples
ou duplas ao redor do valor.

## API (back-end)

| Variável | Obrigatória | Padrão | Descrição |
|---|---|---|---|
| `DB_SERVER` | Não | `localhost` | Host (ou `host,porta`) do SQL Server. No Compose é fixado em `sqlserver`. |
| `DB_NAME` | Não | `DB_RESTAURANTE` | Nome do banco. No Compose é fixado em `DB_RESTAURANTE`. Os scripts SQL usam `DB_RESTAURANTE` literalmente; mudar `DB_NAME` exige adaptar os scripts. |
| `DB_USER` | Não | `sa` | Usuário do SQL Server. |
| `DB_PASSWORD` | Sim (na prática) | vazio | Senha do SQL Server. No Compose é obrigatória (`${DB_PASSWORD:?...}`). |
| `JWT_SECRET_KEY` | Sim fora de Development | — | Chave de assinatura do JWT (HMAC-SHA256). Mínimo de 32 caracteres. Fora de Development, os placeholders conhecidos do projeto são rejeitados. Se ausente ou inválida, a API encerra com código 1. Alternativa: `Jwt:SecretKey` na configuração. |
| `JWT_EXPIRATION_MINUTES` | Não | `480` | Validade do JWT e do cookie, em minutos. Valor não numérico volta ao padrão. Alternativa: `Jwt:ExpirationMinutes` (já definido em `appsettings.json`). |
| `BACKUP_HMAC_KEY` | Sim para gerar/restaurar backup | — | Chave HMAC-SHA256 dos backups. Mínimo de 32 bytes (UTF-8). Sem ela, `POST /api/backup/gerar` e `POST /api/backup/restore` falham. |
| `BACKUP_PATH` | Não | `<AppContext.BaseDirectory>/backups` | Diretório dos backups. No Compose é `/app/backups`, montado no volume `backup_data`. |
| `CORS_ALLOWED_ORIGINS` | Em produção | `https://seusite.com` | Origens permitidas, separadas por vírgula. Só vale fora de Development. No Compose o padrão é `http://localhost:8080`. |
| `ALLOW_INSECURE_LOCAL_NETWORK` | Não | `false` | Permite cookie de sessão sem `Secure` sobre HTTP. Use apenas na rede local de desenvolvimento. |
| `ANTIFORGERY_COOKIE_SECURE_POLICY` | Não | `Always` fora de Development, `SameAsRequest` em Development | `Always` ou `SameAsRequest`. Outro valor impede a inicialização. No Compose o padrão é `SameAsRequest`. |
| `FORWARDED_HEADERS_KNOWN_PROXIES` | Atrás de proxy | vazio | IPs (não hostnames) de proxies confiáveis, separados por vírgula. IP inválido impede a inicialização. Vazio mantém o padrão do ASP.NET Core (somente loopback). |
| `LOGIN_RATE_LIMIT_PER_MINUTE` | Não | `60` | Requisições por minuto, por IP, nos endpoints de login. Inteiro maior que zero. |
| `GLOBAL_RATE_LIMIT_PER_MINUTE` | Não | `600` | Requisições por minuto, por IP, em toda a API. Inteiro maior que zero. |
| `ASPNETCORE_ENVIRONMENT` | Não | `Production` (padrão do ASP.NET Core) | `Development` habilita Swagger e o CORS local. O perfil `back-end` de `launchSettings.json` define `Development`; o Compose define `Production`. |

A porta da API é fixa em `5050` (`ApiMetadata.Port`; escuta em `0.0.0.0`). A
variável `API_PORT` de `back-end/.env.example` não é lida.

## Docker Compose

Estas variáveis são consumidas por [`docker-compose.yml`](../docker-compose.yml):

| Variável | Padrão | Descrição |
|---|---|---|
| `DB_PASSWORD` | — (obrigatória) | Senha do `sa`. Usada pelo SQL Server (`MSSQL_SA_PASSWORD`), pelo `db-init` e pela API. |
| `DB_USER` | `sa` | Usuário usado pelo `db-init`. |
| `SQL_SERVER_PORT` | `1433` | Porta publicada do SQL Server. |
| `FRONTEND_PORT` | `8080` | Porta publicada do front-end (Nginx). |
| `BACKUP_PATH` | `/app/backups` | Também define o ponto de montagem do volume `backup_data`. |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:8080` | Repassada à API. |
| `ALLOW_INSECURE_LOCAL_NETWORK` | `false` | Repassada à API. |
| `LOGIN_RATE_LIMIT_PER_MINUTE` | `60` | Repassada à API. |
| `GLOBAL_RATE_LIMIT_PER_MINUTE` | `600` | Repassada à API. |
| `ANTIFORGERY_COOKIE_SECURE_POLICY` | `SameAsRequest` | Repassada à API. |

O serviço `api` também recebe todo o conteúdo de `.env` via `env_file`, por
isso `JWT_SECRET_KEY`, `JWT_EXPIRATION_MINUTES`, `BACKUP_HMAC_KEY` e
`FORWARDED_HEADERS_KNOWN_PROXIES` chegam à API sem entrada em `environment`.
`DB_SERVER`, `DB_NAME` e `ASPNETCORE_ENVIRONMENT` são fixados pelo Compose
(`sqlserver`, `DB_RESTAURANTE` e `Production`) e prevalecem sobre o `.env`.

## Mobile

| Variável | Onde | Descrição |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | `mobile/.env` (desenvolvimento) ou variável do ambiente `preview`/`production` no Expo Services (build EAS) | URL base completa da API, terminando em `/api` (por exemplo `http://IP_DO_COMPUTADOR:8080/api`). `localhost` não serve no celular. |
| `EAS_BUILD_PROFILE` | Definida pelo EAS Build | `app.config.js` valida `EXPO_PUBLIC_API_URL` nos perfis `preview` e `production` e exige HTTPS em `production`. O perfil `preview` também habilita tráfego HTTP em texto claro no Android (`usesCleartextTraffic`). |

No perfil `production` de `eas.json`, o valor atual é o placeholder
`https://api.example.invalid/api` e precisa ser substituído antes de publicar.

No perfil `preview`, `eas.json` não traz mais a URL; ele aponta para o ambiente
`preview` do Expo Services. Arquivos `.env` locais não são enviados ao build
remoto, então a variável deve existir nesse ambiente. Veja
[`mobile/README.md`](../mobile/README.md#gerar-e-instalar-o-apk-android).

## Testes automatizados

| Variável | Descrição |
|---|---|
| `RUN_INTEGRATION_TESTS` | Defina `1` para habilitar os testes de integração com SQL Server (ficam ignorados por padrão). |
| `BACKUP_TEST_CONNECTION_STRING` | Conexão de um SQL Server onde os testes de backup criam e removem bancos `backup_test_<guid>`. |
| `INTEGRATION_TEST_SQL_CONNECTION_STRING` | Conexão para os testes de workflow. Deve usar o catálogo `master` de um servidor **local** (`localhost`, `127.0.0.1` ou `.`); cada teste cria um banco `SystemicIntegration_<guid>`. |

Esses testes definem `JWT_SECRET_KEY`, `BACKUP_PATH` e
`LOGIN_RATE_LIMIT_PER_MINUTE` no processo durante a execução. Não aponte as
conexões para um servidor cujos dados precisem ser preservados.

## Gerar segredos

```sh
openssl rand -base64 48
```

Use um valor diferente para `JWT_SECRET_KEY`, `BACKUP_HMAC_KEY` e
`DB_PASSWORD`. A senha do SQL Server precisa atender à política de
complexidade da imagem `mssql/server`.
