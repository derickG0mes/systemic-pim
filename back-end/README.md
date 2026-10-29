# Back-end - Systemic - PIM IV

API REST em ASP.NET Core .NET 10, Entity Framework Core e SQL Server. A API usa
JWT, expõe documentação Swagger 2.0 em `/swagger` no ambiente Development e
escuta na porta 5050.

## Executar

Com o SQL Server iniciado e as variáveis `DB_SERVER`, `DB_NAME`,
`DB_USER`, `DB_PASSWORD` e `JWT_SECRET_KEY` configuradas:

```powershell
dotnet restore
dotnet build
dotnet run
```

O `EnvLoader` lê `.env` do diretório de trabalho atual se as variáveis ainda
não estiverem definidas no processo. Ao executar `dotnet run` nesta pasta,
configure um `back-end/.env` local ou defina as variáveis no ambiente. Não
versione segredos.

## Configuração e segurança

- Banco padrão: `DB_RESTAURANTE`; a conexão é montada em `Program.cs` a partir
  das variáveis de ambiente.
- A chave JWT deve conter no mínimo 32 caracteres. A validade padrão é
  480 minutos e pode ser substituída por `JWT_EXPIRATION_MINUTES`.
- Senhas são armazenadas com PBKDF2, SHA-256, salt aleatório de 16 bytes e
  10.000 iterações. Não é utilizado bcrypt.
- Os logins por email e CPF bloqueiam após 5 falhas por 15 minutos, conforme
  a política compartilhada em `Services/LoginLockoutPolicy.cs`.
- As ações de negócio exigem JWT e os controllers aplicam os perfis
  autorizados por recurso; consulte a tabela de endpoints e as limitações em
  [CONFIGURACAO.md](../docs/CONFIGURACAO.md).

## Estrutura principal

```text
back-end/
  Controllers/       Endpoints HTTP, incluindo o controlador de backup
  Data/              AppDbContext e mapeamentos do EF Core
  DTOs/              Modelos de entrada e saída da API
  Helpers/           EnvLoader e utilitário de fuso horário
  Hubs/              Hub SignalR da cozinha
  Models/             Entidades do banco
  Scripts/            Scripts de schema, seed, procedures, views e migrações
  Services/           JWT, hash de senha e backup
    Backup/            Validação e restauração de backups
  Program.cs          Inicialização, autenticação, Swagger e rotas
```

O projeto define 12 tabelas. O inventário de tabelas, triggers, índices,
procedures, views, rotas e respostas está em
[CONFIGURACAO.md](../docs/CONFIGURACAO.md). O serviço de backup usa
`BACKUP_PATH` quando configurado e, caso contrário, `backups` sob
`AppContext.BaseDirectory`. No Docker Compose, `BACKUP_PATH` aponta para
`/app/backups`, montado no volume nomeado persistente `backup_data`. O valor
pode ser substituído por outro caminho absoluto dentro do container.

## Validação

Na raiz do repositório:

```powershell
dotnet restore
dotnet build systemic-pim.sln
dotnet test tests/back-end.Tests.csproj
dotnet list back-end/back-end.csproj package --vulnerable --include-transitive
```

Consulte o [README principal](../README.md) para Docker Compose e
[CONFIGURACAO.md](../docs/CONFIGURACAO.md) para operação e exemplos.
