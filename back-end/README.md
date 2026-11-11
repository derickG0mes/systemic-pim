# API - Systemic PIM

API REST em ASP.NET Core/.NET 10, Entity Framework Core e SQL Server. A API
escuta em `0.0.0.0:5050`, usa JWT em cookie HttpOnly no fluxo de navegador e
expõe Swagger em `/swagger` no ambiente Development. Também hospeda dois hubs
SignalR: `/hubs/cozinha` e `/hubs/notificacoes`.

## Executar

Configure o SQL Server (aplique os scripts de `Scripts/`, em ordem: `01`, `02`,
`03` e `04`) e as variáveis `DB_SERVER`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`,
`JWT_SECRET_KEY` e `BACKUP_HMAC_KEY`. `DB_NAME` assume `DB_RESTAURANTE` quando
ausente, mas os scripts criam e usam o banco `DB_RESTAURANTE`. As chaves JWT e
HMAC devem ter, no mínimo, 32 caracteres/bytes, respectivamente.

`EnvLoader` lê `.env` do diretório de trabalho atual se as variáveis ainda não
estiverem definidas no processo. Ao executar `dotnet run` nesta pasta, use um
`back-end/.env` local (modelo em `.env.example`) ou defina as variáveis no
ambiente. Não versione segredos. A porta é fixa em 5050; a variável `API_PORT`
do `.env.example` não é lida pelo código.

```powershell
dotnet restore
dotnet run
```

O perfil local (`Properties/launchSettings.json`) inicia a API em Development.
Para iniciar a interface, consulte o [README principal](../README.md); para CORS,
cookies, CSRF, proxy e demais opções, consulte
[CONFIGURACAO.md](../docs/CONFIGURACAO.md). Todas as variáveis estão em
[VARIAVEIS_AMBIENTE.md](../docs/VARIAVEIS_AMBIENTE.md).

## Segurança e autenticação

- `JWT_SECRET_KEY` é obrigatória fora de Development e deve ter ao menos 32
  caracteres. O tempo padrão do JWT é 480 minutos; configure
  `JWT_EXPIRATION_MINUTES` para alterá-lo.
- O JWT é entregue em cookie `systemic_auth` HttpOnly. As requisições mutáveis,
  inclusive login e logout, exigem o token CSRF no header `X-CSRF-TOKEN`
  (obtido em `GET /api/autenticacao/csrf`).
- Novas senhas usam PBKDF2-SHA256 com salt aleatório e 600.000 iterações;
  hashes legados continuam aceitos e são atualizados após login bem-sucedido.
- Login por email e CPF bloqueia após 5 falhas durante 15 minutos. Os limites de
  requisições da API são configuráveis por `LOGIN_RATE_LIMIT_PER_MINUTE` e
  `GLOBAL_RATE_LIMIT_PER_MINUTE`.
- Controllers aplicam autorização por perfil independentemente das rotas da
  interface. A matriz completa está em [API.md](../docs/API.md#endpoints).
- Backups são assinados e verificados com `BACKUP_HMAC_KEY`; configure uma chave
  exclusiva de pelo menos 32 bytes para gerar ou restaurar backups.

## Recursos transversais

- **Paginação opcional** nas listas de clientes, comandas, comandas abertas,
  funcionários, mesas, pedidos, produtos e reservas (`pagina`, `tamanho` até 200
  e header `X-Total-Count`). Veja [API.md](../docs/API.md#paginação).
- **Notificações:** a API grava uma notificação por funcionário ativo (tabela
  `NOTIFICACAO`) e a entrega pelo hub `/hubs/notificacoes`. Rotas em
  `/api/notificacoes`.
- **Fuso horário:** `TimeZoneHelper` usa o fuso `E. South America Standard Time`
  (Brasília) para datas de abertura e fechamento de comandas.
- **Respostas:** muitas ações usam o envelope `RespostaPadraoDTO`
  (`sucesso`, `mensagem`, `dados`, `codigoErro`); algumas retornam a entidade ou
  `{ "message": "..." }`.

## Estrutura principal

```text
back-end/
  Controllers/       Endpoints HTTP (14 controllers)
    Backup/          DTO de upload da restauração
  Data/              AppDbContext e mapeamentos do EF Core
  DTOs/              Modelos de entrada e saída
  Helpers/           Carregamento de ambiente (EnvLoader) e fuso horário
  Hubs/              CozinhaHub e NotificationsHub (SignalR)
  Models/            Entidades do banco
  Properties/        launchSettings.json
  Scripts/           Criação e evolução do schema SQL, seed e migrações
  Services/          Regras de negócio, autenticação, notificações e paginação
    Backup/          Restauração e assinatura HMAC
  Program.cs         Inicialização, middleware e rotas
  Dockerfile         Imagem da API (contexto: raiz do repositório)
```

### Scripts SQL

| Arquivo | Uso |
|---|---|
| `01-create-database-idempotent.sql` | Banco, 12 tabelas, índices, triggers e dados básicos |
| `02-procedures-views.sql` | Procedures e views |
| `03-constraints.sql` | Índices únicos (comanda aberta por mesa, telefone de cliente, número de mesa) |
| `04-create-notifications.sql` | Tabela `NOTIFICACAO` |
| `seed-dados-testes.sql` | Dados de exemplo (execução manual, uma vez) |
| `migration-cliente-consumidor.sql`, `migration-logs-sistema.sql` | Migrações para bancos antigos (já cobertas pelo script 01) |

O esquema é gerenciado por scripts SQL versionados; o projeto não usa
migrations do Entity Framework Core. Execute os scripts em ordem conforme
documentado no [guia de configuração](../docs/CONFIGURACAO.md#banco-de-dados-e-scripts).

## Validação

Na raiz do repositório:

```powershell
dotnet build systemic-pim.sln
dotnet test tests/back-end.Tests.csproj
dotnet list back-end/back-end.csproj package --vulnerable --include-transitive
```

Os testes de integração exigem SQL Server e `RUN_INTEGRATION_TESTS=1`; veja
[VARIAVEIS_AMBIENTE.md](../docs/VARIAVEIS_AMBIENTE.md#testes-automatizados).

O arquivo `back-end.http` traz requisições de exemplo para o cliente HTTP do
editor (relatório de faturamento e produtos mais vendidos). Ele usa o header
`Authorization: Bearer` com um JWT colado manualmente (os testes de integração
também enviam o token assim); o fluxo de navegador e do app usa o cookie
`systemic_auth`.
