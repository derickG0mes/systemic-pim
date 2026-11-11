# Guia de implantação - Systemic PIM

O repositório entrega **o que é preciso para implantar**, mas não implanta em
nenhum provedor: há Dockerfiles, um `docker-compose.yml`, um CI que valida o
código e um CD que testa o Compose e publica imagens no GitHub Container
Registry (GHCR). Provisionar servidor, domínio, TLS e banco de produção fica a
cargo de quem hospeda.

- [Componentes entregues](#componentes-entregues)
- [CI/CD](#cicd)
- [Checklist de produção](#checklist-de-produção)
- [Rede, TLS e proxy](#rede-tls-e-proxy)
- [Banco de dados](#banco-de-dados)
- [Persistência e backup](#persistência-e-backup)
- [Atualização](#atualização)
- [Verificação após a implantação](#verificação-após-a-implantação)
- [App mobile](#app-mobile)

## Componentes entregues

| Artefato | Descrição |
|---|---|
| `back-end/Dockerfile` | Build com `mcr.microsoft.com/dotnet/sdk:10.0` e runtime `aspnet:10.0` (instala `curl`). Expõe a porta 5050 e define `HEALTHCHECK` em `/api/healthcheck`. O contexto de build é a raiz do repositório |
| `front-end/Dockerfile` | Build com `node:22-alpine` (`npm ci` e `npm run build`) e runtime `nginx:alpine`, com `front-end/nginx.conf`. Expõe a porta 80 e define `HEALTHCHECK` por `wget` |
| `docker-compose.yml` | `sqlserver`, `db-init`, `api` e `front-end`, volumes e health checks. Veja [CONFIGURACAO.md](CONFIGURACAO.md#executar-com-docker-compose) |
| `.github/workflows/ci.yml` | Validação em push e pull request |
| `.github/workflows/cd.yml` | Smoke test do Compose e publicação das imagens |

O `docker-compose.yml` declara o volume `aspnet_data_protection_keys` como
**externo** (`systemic-pim_aspnet_data_protection_keys`). Crie-o antes da
primeira subida:

```sh
docker volume create systemic-pim_aspnet_data_protection_keys
```

## CI/CD

### CI (`ci.yml`)

Executa em todo `push` e `pull_request`, em `ubuntu-latest`:

1. Checkout completo (`fetch-depth: 0`).
2. gitleaks no histórico Git, com `.gitleaksignore`.
3. Setup do .NET 10 e do Node.js 22.
4. `dotnet build systemic-pim.sln --configuration Release` e
   `dotnet test tests/back-end.Tests.csproj --configuration Release`.
5. No `front-end`: `npm ci`, `npm audit --omit=dev --audit-level=high`,
   `npm run lint`, `npm test -- --run` e `npm run build`.

Os testes de integração com SQL Server ficam ignorados no CI (sem
`RUN_INTEGRATION_TESTS=1`). O app mobile não é validado pelo CI.

### CD (`cd.yml`)

Dispara quando o workflow **CI** termina com sucesso na branch `main` e o
commit vem do próprio repositório (não de fork). Tem dois jobs:

1. **`smoke`**: gera um `.env` descartável (senha do SQL Server, `JWT_SECRET_KEY`
   e `BACKUP_HMAC_KEY` aleatórios, `CORS_ALLOWED_ORIGINS=http://localhost:8080`),
   executa `docker compose up -d --build --wait`, confere que
   `http://localhost:5050/api/healthcheck` e `http://localhost:8080/` respondem
   200 e, ao final, derruba tudo com `docker compose down --volumes
   --remove-orphans`.
2. **`publish`** (depende do `smoke`): faz login no GHCR com `GITHUB_TOKEN`
   (permissão `packages: write`) e publica duas imagens, cada uma com as tags
   `<sha-do-commit>` e `latest`:

| Imagem | Origem |
|---|---|
| `ghcr.io/derickg0mes/systemic-pim-api` | `back-end/Dockerfile` |
| `ghcr.io/derickg0mes/systemic-pim-front-end` | `front-end/Dockerfile` |

(O nome é `ghcr.io/<repositório em minúsculas>-api` e `-front-end`.)

⚠️ A CONFIRMAR: o job `smoke` não cria o volume externo
`systemic-pim_aspnet_data_protection_keys` antes do `docker compose up`. O
Compose costuma recusar a subida quando um volume `external` não existe. Se o
CD estiver falhando nesse passo, crie o volume no workflow ou revise a
declaração no `docker-compose.yml`.

## Checklist de produção

- [ ] Gerar `DB_PASSWORD`, `JWT_SECRET_KEY` e `BACKUP_HMAC_KEY` exclusivos
      (`openssl rand -base64 48`) e guardá-los em um gerenciador de segredos,
      não no repositório.
- [ ] `ASPNETCORE_ENVIRONMENT=Production` (já é o padrão do Compose).
- [ ] Servir tudo por HTTPS; manter `ALLOW_INSECURE_LOCAL_NETWORK=false`.
- [ ] `ANTIFORGERY_COOKIE_SECURE_POLICY=Always` (o padrão do Compose é
      `SameAsRequest`).
- [ ] `CORS_ALLOWED_ORIGINS` com as origens reais do front-end (o padrão fora
      do Compose é o placeholder `https://seusite.com`).
- [ ] `FORWARDED_HEADERS_KNOWN_PROXIES` com os IPs dos proxies confiáveis, se
      houver proxy na frente da API.
- [ ] Não publicar a porta 5050 nem a 1433 na internet (o Compose publica ambas
      no host por padrão).
- [ ] Trocar as senhas das contas iniciais do script 01 (veja
      [CONFIGURACAO.md](CONFIGURACAO.md#contas-iniciais)).
- [ ] Ajustar `LOGIN_RATE_LIMIT_PER_MINUTE` e `GLOBAL_RATE_LIMIT_PER_MINUTE`
      à carga esperada.
- [ ] Planejar a retenção de backups (não há rotina automática).

A lista completa das variáveis está em
[VARIAVEIS_AMBIENTE.md](VARIAVEIS_AMBIENTE.md).

## Rede, TLS e proxy

- O Nginx do `front-end` escuta apenas em HTTP (porta 80) e encaminha `/api/` e
  `/hubs/` para `http://api:5050`. O nome `api` é fixo em `nginx.conf`: o
  contêiner da API precisa ser alcançável por esse nome na mesma rede.
- O arquivo `front-end/nginx.conf` traz um bloco `server` de HTTPS **comentado**,
  como modelo (certificados em `/etc/nginx/certs`, HSTS apenas no bloco HTTPS).
- A API e a interface devem ficar no **mesmo site**: o cookie de sessão usa
  `SameSite=Lax` e o antiforgery `SameSite=Strict`.
- Fora de Development, o cookie `systemic_auth` só é enviado por HTTPS (salvo
  `ALLOW_INSECURE_LOCAL_NETWORK=true`). Com HTTPS terminado em um proxy, envie
  `X-Forwarded-Proto: https` e liste o IP do proxy em
  `FORWARDED_HEADERS_KNOWN_PROXIES`.
- ⚠️ A CONFIRMAR: `nginx.conf` define `X-Forwarded-Proto` como `$scheme`. Se o
  TLS for terminado por um proxy **antes** do Nginx do front-end, esse header
  chega à API como `http`. Valide o comportamento de redirecionamento e de
  cookies nesse desenho.
- O limitador de taxa usa o IP da conexão. Atrás do Nginx, a API só enxerga o IP
  do contêiner do proxy, a menos que `FORWARDED_HEADERS_KNOWN_PROXIES` o liste.
- Os hubs SignalR usam WebSocket; o proxy deve repassar `Upgrade` e
  `Connection` (o Nginx do projeto já faz isso em `/hubs/`).

## Banco de dados

- No Compose, o `db-init` aplica os scripts `01` a `04` automaticamente. Todos
  são idempotentes.
- Em um SQL Server próprio, aplique os quatro scripts manualmente, na ordem, e
  informe `DB_SERVER`, `DB_USER` e `DB_PASSWORD`. O nome do banco precisa ser
  `DB_RESTAURANTE`, porque os scripts usam o nome literal.
- A API conecta com `TrustServerCertificate=true`.
- Ao atualizar uma instalação antiga, execute `04-create-notifications.sql`
  antes de subir a nova versão da API.

## Persistência e backup

| Volume | Conteúdo |
|---|---|
| `sqlserver_data` | Arquivos do SQL Server (`/var/opt/mssql`) |
| `backup_data` | Backups gerados pela API (`BACKUP_PATH`, padrão `/app/backups`) |
| `systemic-pim_aspnet_data_protection_keys` (externo) | Chaves do ASP.NET Data Protection |

`docker compose down` preserva os volumes; `docker compose down --volumes`
remove `sqlserver_data` e `backup_data` (o volume externo não é removido).
Os backups pela API (menu **Backup**) contêm o SQL completo e são assinados
com `BACKUP_HMAC_KEY`; para restaurar em outro ambiente, use a mesma chave.
Guarde cópias dos ZIPs fora do host. Detalhes em
[CONFIGURACAO.md](CONFIGURACAO.md#backup-e-restauração).

## Atualização

Com o código novo no servidor:

```sh
git pull
docker compose up --build -d
```

Como os scripts SQL são idempotentes, podem ser reexecutados sem perder dados.
Faça um backup pela API antes de atualizar. Para usar as imagens publicadas no
GHCR em vez de compilar no servidor, substitua `build` por `image` no serviço
correspondente (por exemplo, `ghcr.io/derickg0mes/systemic-pim-api:<sha>`).

## Verificação após a implantação

```sh
curl -i http://localhost:5050/api/healthcheck           # 200, status "SAUDÁVEL"
curl -i http://localhost:5050/api/healthcheck/database  # 200, status "CONECTADO" (503 se o banco estiver fora)
curl -I http://localhost:8080/                          # 200, página do front-end
curl -i http://localhost:8080/api/healthcheck           # 200, confirma o proxy do Nginx
```

Depois faça login pela interface, abra o sino de notificações (confirma o
SignalR) e gere um backup de teste.

## App mobile

O app não faz parte do Compose. Para distribuição, o APK é gerado pelo EAS
Build; o perfil `production` exige `EXPO_PUBLIC_API_URL` com HTTPS. Passo a
passo em [mobile/README.md](../mobile/README.md#gerar-e-instalar-o-apk-android).
