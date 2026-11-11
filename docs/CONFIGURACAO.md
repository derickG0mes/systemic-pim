# Configuração e uso - Systemic - PIM IV

Este documento descreve a execução local e em Docker, a autenticação, a
persistência (banco e backup) e as particularidades de segurança. A lista de
variáveis de ambiente está em [VARIAVEIS_AMBIENTE.md](VARIAVEIS_AMBIENTE.md) e a
referência dos endpoints em [API.md](API.md).

## Executar com Docker Compose

Requisitos: Docker Engine ou Docker Desktop com o plugin Compose.

Na raiz do repositório:

```powershell
Copy-Item .env.example .env
```

Edite `.env`: substitua todos os valores `TROQUE_*`, configure uma senha SQL
Server válida e gere chaves exclusivas para `JWT_SECRET_KEY` e
`BACKUP_HMAC_KEY` (por exemplo, com `openssl rand -base64 48`). A chave JWT
deve ter pelo menos 32 caracteres; a chave HMAC deve ter pelo menos 32 bytes.
O placeholder da chave JWT é rejeitado fora de Development. Não reutilize nem
versione valores reais.

Crie uma vez o volume externo que guarda as chaves do ASP.NET Data Protection
(o `docker-compose.yml` o declara como `external: true`, então o
`docker compose up` falha se ele não existir):

```sh
docker volume create systemic-pim_aspnet_data_protection_keys
```

Suba os serviços:

```sh
docker compose up --build
```

O Compose executa SQL Server, `db-init`, API e front-end. `db-init` aguarda o
SQL Server e executa `01-create-database-idempotent.sql`,
`02-procedures-views.sql`, `03-constraints.sql`,
`04-create-notifications.sql` e `05-create-push-devices.sql` antes da API. Os volumes `sqlserver_data` e
`backup_data` persistem o banco e os arquivos de backup, respectivamente; o
volume externo preserva as chaves de proteção de dados para que os cookies
antiforgery continuem válidos depois de recriar a API. `BACKUP_PATH` usa
`/app/backups` por padrão; se substituído, deve apontar para um caminho
absoluto dentro do container.

| Serviço | Endereço |
|---|---|
| Front-end | http://localhost:8080 |
| API pelo front-end (recomendado) | http://localhost:8080/api |
| API direta (diagnóstico) | http://localhost:5050 |
| Swagger | Indisponível no Compose padrão (a API roda em `Production`) |
| Health da API | http://localhost:5050/api/healthcheck |
| SQL Server | `localhost:1433` |

O navegador deve acessar a API pelo front-end (`/api`): o Nginx encaminha essas
requisições internamente para o serviço `api`. Assim, dispositivos móveis só
precisam alcançar a porta 8080; a porta 5050 não precisa estar acessível na
rede Wi-Fi. O endpoint direto na porta 5050 é útil apenas para diagnóstico.

No Compose local, `ALLOW_INSECURE_LOCAL_NETWORK=true` e
`ANTIFORGERY_COOKIE_SECURE_POLICY=SameAsRequest` permitem autenticação por
cookie sobre HTTP. O Compose já define `SameAsRequest` por padrão, mas
`ALLOW_INSECURE_LOCAL_NETWORK` vem desligado (`false`): ative-o no `.env` para
fazer login por HTTP em `localhost` ou na rede local. Use essa exceção somente
na rede local de desenvolvimento. Em produção, mantenha HTTPS e cookies
`Secure`.

Encerre com `docker compose down`. Para apagar deliberadamente os dados do
banco e dos backups: `docker compose down --volumes` (o volume externo das
chaves não é removido por esse comando).

### Contas iniciais

O script `01-create-database-idempotent.sql` cria quatro contas, todas com hash
legado e sem senha publicada neste repositório:

| E-mail | Perfil |
|---|---|
| `admin@restaurante.com` | `admin` |
| `owner@restaurante.com` | `owner` |
| `garcom@restaurante.com` | `employee` |
| `cozinha@restaurante.com` | `employee` |

Em bancos **novos**, as quatro contas nascem com a senha **`Systemic@2026`**
(hash PBKDF2-SHA256 versionado, validado contra o `PasswordHashService`). Essa
senha é pública no repositório: use-a apenas em desenvolvimento e troque-a no
primeiro acesso, com `PUT /api/funcionario/{id}` ou pela tela de usuários.
Não suba o seed em produção sem redefinir essas senhas.

Bancos **criados antes** dessa mudança continuam com o hash antigo, cuja senha
não consta no repositório, porque o script 01 só insere contas que ainda não
existem. Para esses bancos, execute uma vez:

```sql
UPDATE dbo.FUNCIONARIO
SET PASSWORD_FUNCIONARIO = 'pbkdf2-sha256$v1$600000$TiB5Vjy08cmmh2KAkn5RfA==$oRQUjBzyoqAvmuhpxfiWQTIZ6XXuC80rSbu0cD9vQwE=',
    LOGIN_ATTEMPTS = 0,
    LOCKED_UNTIL = NULL
WHERE EMAIL_FUNCIONARIO IN (
    'admin@restaurante.com', 'owner@restaurante.com',
    'garcom@restaurante.com', 'cozinha@restaurante.com');
```

O mesmo script cria o cliente padrão "Consumidor", as mesas 1 a 20 (capacidade
4), as formas de pagamento PIX, Cartão de Crédito, Cartão de Débito e Dinheiro,
e 18 produtos de cardápio.

## Execução local

Requisitos: .NET SDK 10, Node.js 22.12 ou superior, npm e SQL Server.

Aplique os scripts SQL, nesta ordem, no servidor (por exemplo, com `sqlcmd`):

1. `back-end/Scripts/01-create-database-idempotent.sql`
2. `back-end/Scripts/02-procedures-views.sql`
3. `back-end/Scripts/03-constraints.sql`
4. `back-end/Scripts/04-create-notifications.sql`
5. `back-end/Scripts/05-create-push-devices.sql`

Todos são idempotentes. Os scripts usam o banco `DB_RESTAURANTE` literalmente;
se usar outro nome em `DB_NAME`, adapte os scripts. O script 04 cria a tabela
`NOTIFICACAO` e seus índices; execute-o também em bancos já existentes antes de
atualizar a API (sem ele, as notificações não são gravadas nem listadas). O
script 05 cria a tabela `DISPOSITIVO_PUSH` (tokens de push dos aparelhos); execute-o
também em bancos existentes antes de atualizar a API: sem ele, o cadastro de
aparelhos falha e o push remoto não é enviado (as demais funções não são afetadas).

`Program.cs` monta a connection string com `DB_SERVER`, `DB_NAME`, `DB_USER` e
`DB_PASSWORD` (com `TrustServerCertificate=true`). `DB_NAME` assume
`DB_RESTAURANTE` quando ausente. `EnvLoader` procura `.env` no diretório de
trabalho atual; portanto, ao executar a API a partir da pasta `back-end`,
configure as variáveis no processo ou use um `back-end/.env` local. O `.env` da
raiz é lido automaticamente pelo Compose. Não versione arquivos `.env`.

```powershell
cd back-end
dotnet restore
dotnet run
```

O perfil `back-end` de `launchSettings.json` inicia a API em Development, na
porta 5050, com Swagger.

Em outro terminal:

```powershell
cd front-end
npm ci
npm run dev
```

O Vite usa a porta 8080 e encaminha `/api` e `/hubs` para
`http://localhost:5050`. O cliente HTTP usa a mesma origem da página (`/api`),
sem exigir acesso direto à porta da API pelo navegador.

### Dados de teste

`back-end/Scripts/seed-dados-testes.sql` popula funcionários, clientes,
reservas, despesas, 120 comandas pagas, 4 comandas abertas e logs de exemplo. Ele
não roda no Compose; execute-o manualmente depois dos scripts 01 a 03. Ele
recusa a execução se detectar que já foi aplicado e usa gerador aleatório, então
cada banco recebe valores diferentes.

### Scripts históricos

`migration-cliente-consumidor.sql` (insere o cliente "Consumidor") e
`migration-logs-sistema.sql` (cria `LOG_SISTEMA` e o índice
`IDX_LOG_SISTEMA_DATA`) servem para bancos antigos. As duas operações já fazem
parte do script 01.

## Swagger

O documento interno chama-se `v1` e a URL é `/swagger/v1/swagger.json`. A
versão exibida é `2.0`, com título `Systemic API - PIM IV`. O Swagger e sua
interface só são habilitados no ambiente Development. O perfil local
`back-end/Properties/launchSettings.json` define esse ambiente para
`dotnet run`. O Compose define `ASPNETCORE_ENVIRONMENT=Production`, por isso o
Swagger não fica disponível no container padrão.

## Autenticação, senha e bloqueio

Os exemplos de requisição estão em [API.md](API.md#fluxo-de-autenticação-com-exemplos).

### Login por email

`POST /api/autenticacao/login`, sem autenticação. Corpo JSON:

```json
{ "email": "usuario@example.com", "password": "senha" }
```

No sucesso, a API emite o JWT no cookie `systemic_auth` (`HttpOnly`,
`SameSite=Lax`, `Path=/`). O envelope JSON contém somente dados não sensíveis
do usuário (`id`, `nomeUsuario`, `role`), sem o token.

### Login por CPF

`POST /api/funcionario/login`, sem autenticação. Corpo:

```json
{ "cpfFuncionario": "12345678901", "senha": "senha" }
```

No sucesso, a API emite o mesmo cookie de autenticação e retorna
`idFuncionario` e `nomeFuncionario`, sem token no corpo JSON.

### Cookie e proteção CSRF

O fluxo do navegador envia o cookie JWT automaticamente; o front-end não
persiste o JWT em `localStorage` nem constrói um header `Authorization`.

**Atributo `Secure`:** o cookie `systemic_auth` é marcado como `Secure` quando
a requisição usa HTTPS ou quando a API não está em Development e
`ALLOW_INSECURE_LOCAL_NETWORK` não está ativo. Em Development, ou fora dele com
`ALLOW_INSECURE_LOCAL_NETWORK=true`, requisições HTTP recebem o cookie sem
`Secure`.

Antes do login, a aplicação obtém um request token em
`GET /api/autenticacao/csrf` (o cookie antiforgery `systemic_csrf` é
`HttpOnly` e `SameSite=Strict`) e envia o token no header `X-CSRF-TOKEN` em
login e em toda requisição mutável (`POST`, `PUT`, `PATCH` ou `DELETE`). A API
valida esses tokens por um filtro global. `POST /api/autenticacao/logout`
também requer o header e apaga o cookie de autenticação.

Depois do login, a aplicação descarta o token CSRF e busca outro antes de novas
operações mutáveis. Na inicialização, `GET /api/autenticacao/validar` valida a
sessão e retorna id, nome e role das claims. `AuthContext` (web) e o
`AuthContext` do mobile usam a role retornada pelo servidor; a role salva em
`restaurant_user` (localStorage da web) não é considerada fonte de autorização.

O cookie antiforgery usa `ANTIFORGERY_COOKIE_SECURE_POLICY=SameAsRequest` no
Compose local para funcionar com HTTP; fora do Compose, o padrão é `Always`
quando o ambiente não é Development e `SameAsRequest` em Development.
Em produção, defina explicitamente `ANTIFORGERY_COOKIE_SECURE_POLICY=Always`.
Valores diferentes de `Always` e `SameAsRequest` impedem a inicialização.

### Senhas e bloqueio

Novos hashes usam PBKDF2-SHA-256, salt aleatório de 16 bytes e 600.000
iterações, armazenados no formato versionado
`pbkdf2-sha256$v1$<iterações>$<salt-base64>$<hash-base64>`. Hashes legados
Base64 (10.000 iterações, saída de 20 bytes) continuam válidos; após login
bem-sucedido por email ou CPF, são substituídos pelo formato atual. O JWT tem
validade padrão de 480 minutos, ajustável por `JWT_EXPIRATION_MINUTES` (ou
`Jwt:ExpirationMinutes`).

- Login por email e por CPF: após 5 falhas, bloqueio por 15 minutos. Os dois
  fluxos usam `LoginLockoutPolicy` como fonte única desses limites.
- O login por email responde sempre com a mesma mensagem genérica
  (`CREDENCIAIS_INVALIDAS`), inclusive para conta bloqueada; o login por CPF
  informa as tentativas restantes e o tempo de bloqueio.
- O estado adicional de tentativas do `AuthContext` web existe apenas em
  memória no navegador; o bloqueio é controlado também pelo servidor.

O seed SQL contém contas com hashes PBKDF2 legados e nenhuma senha em texto
claro. Um login válido atualiza o hash para PBKDF2-SHA-256 versionado com
600.000 iterações. Credenciais de teste não são publicadas.

## Proxy, CORS, limites e cabeçalhos de segurança

**CORS.** Em Development, o CORS com credenciais permite origens `http`
`localhost`, loopback e endereços IPv4 privados (10.x, 172.16-31.x, 192.168.x)
nas portas 8080 e 5173. Fora de Development, vale `CORS_ALLOWED_ORIGINS` (lista
separada por vírgulas). No Compose, o Nginx encaminha `/api` e `/hubs` para a
API, então o navegador usa a mesma origem e não depende de CORS nem de acesso
móvel à porta 5050. O header `X-Total-Count` é exposto ao CORS.

**TLS e proxy.** Em produção, termine TLS no proxy e envie
`X-Forwarded-Proto: https`. Configure `FORWARDED_HEADERS_KNOWN_PROXIES` com os
IPs confiáveis separados por vírgulas; somente esses proxies podem informar o
protocolo encaminhado. A API processa um salto de `X-Forwarded-For` e
`X-Forwarded-Proto` antes da autenticação. Fora de Development, a API aplica
`UseHttpsRedirection`.

**Validação de segredos.** Em ambiente diferente de Development, a
inicialização termina com código 1 e mensagem explícita se `JWT_SECRET_KEY`
estiver ausente, tiver menos de 32 caracteres ou for um placeholder conhecido.

**Limites de taxa.** A API limita cada IP a 60 requisições de login por minuto
e a 600 requisições globais por minuto por padrão. Ajuste
`LOGIN_RATE_LIMIT_PER_MINUTE` e `GLOBAL_RATE_LIMIT_PER_MINUTE` para inteiros
positivos conforme a carga; zero ou valor inválido impede a inicialização.
Rejeições retornam HTTP 429 e `Retry-After`. A política de login também limita
`POST /api/funcionario/login`.

⚠️ A CONFIRMAR: o IP usado pelo limitador é `RemoteIpAddress`. No Compose
padrão, a API só recebe conexões do container do Nginx; sem
`FORWARDED_HEADERS_KNOWN_PROXIES` apontando para o IP desse container, o
`X-Forwarded-For` é ignorado e todos os clientes dividem a mesma cota. Valide
no ambiente de destino.

**Cabeçalhos da API.** Todas as respostas levam `X-Content-Type-Options:
nosniff`, `X-Frame-Options: DENY` e `Referrer-Policy: no-referrer`. A CSP
estrita (`default-src 'none'; frame-ancestors 'none'`) limita-se a `/api` para
não bloquear a interface Swagger em Development, e HSTS só é enviado em HTTPS
fora de Development.

**Cabeçalhos do Nginx** (`front-end/nginx.conf`). Define CSP com conexão para a
mesma origem e WebSocket do SignalR, e permite scripts, frames e recursos do
VLibras. Também envia `X-Content-Type-Options: nosniff`, `Referrer-Policy:
strict-origin-when-cross-origin`, `X-Frame-Options: DENY` e `Permissions-Policy`.
O documento permite acelerômetro e giroscópio para a origem do VLibras, mas o
iframe externo não delegou essas permissões na verificação do navegador;
sensores do widget permanecem não verificados. O arquivo traz um bloco `server`
de HTTPS comentado, como modelo.

## Regras de acesso

A API aplica autorização por role em cada controller. A matriz por endpoint está
em [API.md](API.md#endpoints) e o resumo de perfis em
[API.md](API.md#perfis-e-permissões).

O front-end usa React Router 7.18.5 pelo pacote `react-router`;
`react-router-dom` não está instalado. `ProtectedRoute` aguarda a validação do
perfil no servidor antes de renderizar uma rota protegida. A matriz de páginas
(`front-end/src/lib/rbac.ts`) e as regras da API são controles independentes.

| Perfil do front-end | Páginas permitidas |
|---|---|
| `employee` | `/orders`, `/tabs`, `/reservations`, `/accessibility` |
| `admin` | Todas as páginas protegidas |
| `owner` | Todas as páginas protegidas |

No app mobile, as abas Mesas, Pedidos e Reservas aparecem para todos os
perfis; Resumo e Produtos (e, a partir de Resumo, Relatórios, Usuários e
Auditoria) só para `admin` e `owner`.

## Banco de dados e scripts

Banco: `DB_RESTAURANTE`. O esquema é evoluído por scripts SQL versionados; o
projeto não usa migrations do Entity Framework Core.

Os scripts definem 14 tabelas: `FUNCIONARIO`, `CLIENTE`, `MESA`,
`FORMA_PAGAMENTO`, `PRODUTO`, `RESERVA`, `COMANDA`, `ITEM_COMANDA`,
`DETALHE_PAGAMENTO`, `DESPESAS`, `LOG_COMANDA`, `LOG_SISTEMA` (script 01) e
`NOTIFICACAO` (script 04) e `DISPOSITIVO_PUSH` (script 05). O modelo de dados está em
[ARQUITETURA.md](ARQUITETURA.md#modelo-de-dados).

| Script | Conteúdo |
|---|---|
| `01-create-database-idempotent.sql` | Cria o banco e as 12 primeiras tabelas quando não existem, cinco índices, três triggers (`trg_abrir_comanda`, `trg_atualizar_valor_total`, `trg_fechar_comanda`) e os dados básicos (contas, cliente "Consumidor", mesas, formas de pagamento, produtos) |
| `02-procedures-views.sql` | Procedures `sp_fechar_comanda`, `sp_relatorio_faturamento`, `sp_ajustar_estoque` e views `vw_comandas_abertas`, `vw_produtos_mais_vendidos` |
| `03-constraints.sql` | Índices únicos `UX_COMANDA_MESA_ABERTA` (uma comanda aberta por mesa), `UX_CLIENTE_TELEFONE` e `UX_MESA_NUMERO`. Aborta com mensagem se existirem duplicatas |
| `04-create-notifications.sql` | Tabela `NOTIFICACAO` e dois índices |
| `05-create-push-devices.sql` | Tabela `DISPOSITIVO_PUSH` (token do Expo por aparelho), índice único no token e índice por funcionário |

A API chama `sp_relatorio_faturamento` e `sp_ajustar_estoque` e consulta as
duas views. Ela não chama `sp_fechar_comanda`: o fechamento ocorre ao inserir
`DETALHE_PAGAMENTO`, e o trigger `trg_fechar_comanda` fecha a comanda e libera
a mesa.

`CriarPedidoDTO` contém `idMesa`, `idCliente` e `itens`. No fluxo da interface,
`RestaurantContext` envia a `POST /api/pedidos` apenas `idMesa` e `itens`, sem
`idCliente`; a tela exige uma comanda aberta e o servidor acrescenta os itens a
essa comanda. Se a API receber o pedido sem comanda aberta, valida o `idCliente`
do DTO: cliente inexistente resulta em HTTP 400 (`CLIENTE_INVALIDO`), e cliente
válido permite criar uma nova comanda. O endpoint separado `POST /api/comanda`
tem sua própria regra: `idCliente` ≤ 0 resolve para o cliente "Consumidor".

## Backup e restauração

`BACKUP_PATH` pode ser definido como variável de ambiente ou configuração. Sem
ela, a API grava em `backups` sob `AppContext.BaseDirectory`. `BACKUP_HMAC_KEY`
(mínimo de 32 bytes) é necessária para gerar e para restaurar.

**Geração** (`POST /api/backup/gerar`). Cria, em `BACKUP_PATH`, uma pasta
`backup_<ddMMyyyy>_<HHmmss>` com:

- `backup_banco_<ddMMyyyy>.sql`: `DELETE` e `INSERT` de todas as tabelas
  mapeadas pelo EF Core (incluindo `NOTIFICACAO` e `DISPOSITIVO_PUSH`), com `NOCHECK`/`CHECK` das
  constraints;
- `backup_logs_<ddMMyyyy>.json`: `LOG_SISTEMA` e `LOG_COMANDA`;
- `backup_config_<ddMMyyyy>.json`: `appsettings.json` com senha da connection
  string e `Jwt:SecretKey` ocultadas;
- `backup_hmac.sha256`: assinatura HMAC-SHA256 do conteúdo.

A pasta é compactada em `backup_<ddMMyyyy>_<HHmmss>.zip` no mesmo diretório.
A pasta de trabalho não é removida depois da compactação; somente os arquivos
`.zip` aparecem em `GET /api/backup/listar`.

**Restauração** (`POST /api/backup/restore`, ZIP de até 100 MB). A API só aceita
arquivo `.zip` com no máximo 10.000 entradas, 512 MB descompactados e exatamente
um script `.sql` (até 256 MB); recusa caminhos absolutos, `..` e links
simbólicos; e exige uma assinatura `backup_hmac.sha256` válida para a
`BACKUP_HMAC_KEY` atual. Em seguida gera um backup de segurança do estado atual
e executa o SQL em uma transação, registrando o evento `BACKUP` no log do
sistema. Se qualquer etapa falhar, a transação é revertida.

No Docker Compose, `BACKUP_PATH` aponta para `/app/backups`, persistido no
volume nomeado `backup_data`; uma substituição deve ser um caminho absoluto
dentro do container.

## Tempo real

A interface web usa o hub `/hubs/cozinha` para recarregar comandas e o hub
`/hubs/notificacoes` para o sino de notificações. O app mobile usa
`/hubs/notificacoes`. Eventos, payloads e destinatários estão em
[API.md](API.md#tempo-real-signalr).

Quando o SignalR está habilitado (sessão ativa) mas desconectado, o
`RestaurantContext` da web consulta as comandas a cada 60 s como contingência.
O sino da web e a central do mobile também consultam `GET /api/notificacoes` a
cada 30 s.

**Push remoto (app fechado).** A API também envia cada notificação ao serviço de push do
Expo, que entrega pelo FCM (Android) e pelo APNs (iOS). Isso exige que a API alcance
`https://exp.host` e que as credenciais do Firebase/Apple estejam configuradas no Expo; o
passo a passo está em [PUSH_NOTIFICATIONS.md](PUSH_NOTIFICATIONS.md). Sem as credenciais,
nada quebra: o app segue recebendo por SignalR e pela consulta periódica.

## CI e testes

Em push e pull request, `.github/workflows/ci.yml` executa, nesta ordem:
varredura de segredos no histórico Git com gitleaks (usando `.gitleaksignore`),
build da solução .NET e testes .NET em Release, instalação (`npm ci`),
auditoria das dependências de produção (`npm audit --omit=dev
--audit-level=high`), lint, testes e build do front-end. O mobile não faz
parte do CI. O fluxo de CD está descrito em [DEPLOY.md](DEPLOY.md#cicd).

Para executar as verificações localmente:

```powershell
dotnet build systemic-pim.sln
dotnet test tests/back-end.Tests.csproj
Set-Location front-end
npm ci
npm audit --omit=dev --audit-level=high
npm run lint
npm test -- --run
npm run build
```

`systemic-pim.sln` contém apenas o projeto da API (`back-end`); o projeto de
testes é executado diretamente por `tests/back-end.Tests.csproj`. Os testes de
integração com SQL Server ficam desabilitados sem `RUN_INTEGRATION_TESTS=1`; as
variáveis exigidas estão em [VARIAVEIS_AMBIENTE.md](VARIAVEIS_AMBIENTE.md#testes-automatizados).

Verificações do mobile, a partir de `mobile/`: `npm run typecheck` e
`npm run lint`.

## Limitações e operação

- O repositório não faz deploy em nuvem. O CD publica imagens Docker no GitHub
  Container Registry e roda um smoke test do Compose; o deploy em si fica por
  conta de quem hospeda. Veja [DEPLOY.md](DEPLOY.md).
- O Compose executa a API em Production e expõe os serviços em HTTP local. Para
  autenticar pelo navegador sem TLS, defina `ALLOW_INSECURE_LOCAL_NETWORK=true`;
  sem isso, o cookie JWT é `Secure` e o navegador não o devolve por HTTP.
- `/api/healthcheck/database` é público; em falha, a resposta omite detalhes
  internos e a API registra esses detalhes no log.
- A interface controla a navegação por perfil, mas não substitui a autorização
  independente da API. Consulte a matriz em [API.md](API.md#endpoints).
- A autenticação pressupõe front-end e API no mesmo site. Uma implantação em
  sites diferentes exige reavaliar `SameSite`, CORS e proteção CSRF.
- O widget VLibras depende de recursos externos e permissões concedidas pelo
  iframe do fornecedor; sua disponibilidade não é garantida pela aplicação.
- ⚠️ A CONFIRMAR: `DELETE /api/funcionario/{id}` define `STATUS_FUNCIONARIO =
  'INATIVO'`, mas nenhum dos dois logins verifica esse status; a conta inativa
  continua autenticando e só deixa de receber notificações. Confirme se esse é
  o comportamento desejado.
- ⚠️ A CONFIRMAR: `GET /api/faturamento` (resumo do dia) calcula o intervalo
  com `DateTime.UtcNow.Date`, enquanto `DATA_FECHADA` e `DATA_PAGAMENTO` são
  gravadas em horário de Brasília (trigger e `AppDbContext`). Perto da meia-noite,
  o "dia" do resumo pode divergir do dia local.
- Não há rotina de retenção: as pastas e os ZIPs de backup em `BACKUP_PATH`
  permanecem até serem removidos manualmente.
