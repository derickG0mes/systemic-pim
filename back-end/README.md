# API - Systemic PIM

API REST em ASP.NET Core/.NET 10, Entity Framework Core e SQL Server. A API
escuta na porta 5050, usa JWT em cookie HttpOnly no fluxo de navegador e expõe
Swagger em `/swagger` no ambiente Development.

## Executar

Configure o SQL Server e as variáveis `DB_SERVER`, `DB_NAME`, `DB_USER`,
`DB_PASSWORD`, `JWT_SECRET_KEY` e `BACKUP_HMAC_KEY`. `DB_NAME` assume
`DB_RESTAURANTE` quando ausente. As chaves JWT e HMAC devem ter, no mínimo,
32 caracteres/bytes, respectivamente.

`EnvLoader` lê `.env` do diretório de trabalho atual se as variáveis ainda não
estiverem definidas no processo. Ao executar `dotnet run` nesta pasta, use um
`back-end/.env` local ou defina as variáveis no ambiente. Não versione
segredos.

```powershell
dotnet restore
dotnet run
```

O perfil local inicia a API em Development. Para iniciar a interface,
consulte o [README principal](../README.md); para CORS, cookies, CSRF, proxy e
demais opções, consulte [CONFIGURACAO.md](../docs/CONFIGURACAO.md).

## Segurança e autenticação

- `JWT_SECRET_KEY` é obrigatória fora de Development e deve ter ao menos 32
  caracteres. O tempo padrão do JWT é 480 minutos; configure
  `JWT_EXPIRATION_MINUTES` para alterá-lo.
- O JWT é entregue em cookie `systemic_auth` HttpOnly. As requisições mutáveis,
  inclusive login e logout, exigem o token CSRF no header `X-CSRF-TOKEN`.
- Novas senhas usam PBKDF2-SHA256 com salt aleatório e 600.000 iterações;
  hashes legados continuam aceitos e são atualizados após login bem-sucedido.
- Login por email e CPF bloqueia após 5 falhas durante 15 minutos. Os limites de
  requisições da API são configuráveis por `LOGIN_RATE_LIMIT_PER_MINUTE` e
  `GLOBAL_RATE_LIMIT_PER_MINUTE`.
- Controllers aplicam autorização por perfil independentemente das rotas da
  interface. A matriz completa está em
  [CONFIGURACAO.md](../docs/CONFIGURACAO.md).
- Backups são assinados e verificados com `BACKUP_HMAC_KEY`; configure uma chave
  exclusiva de pelo menos 32 bytes para gerar ou restaurar backups.

## Estrutura principal

```text
back-end/
  Controllers/       Endpoints HTTP
  Data/              AppDbContext e mapeamentos do EF Core
  DTOs/              Modelos de entrada e saída
  Helpers/           Carregamento de ambiente e fuso horário
  Hubs/              Hub SignalR da cozinha
  Models/            Entidades do banco
  Scripts/           Criação e evolução do schema SQL
  Services/           Regras de negócio, autenticação e backup
  Program.cs          Inicialização, middleware e rotas
```

O esquema é gerenciado por scripts SQL versionados; o projeto não usa
migrations do Entity Framework Core. Execute os scripts em ordem conforme
documentado no [guia de configuração](../docs/CONFIGURACAO.md).

## Validação

Na raiz do repositório:

```powershell
dotnet build systemic-pim.sln
dotnet test tests/back-end.Tests.csproj
dotnet list back-end/back-end.csproj package --vulnerable --include-transitive
```
