# Systemic - PIM IV

Sistema web de gerenciamento de restaurante. A aplicação contém uma API ASP.NET
Core .NET 10, uma interface React 18 com TypeScript/Vite e um banco SQL Server.

## Executar (forma principal)

Requisitos: Docker Desktop ou Docker Engine com Docker Compose.

1. Copie o arquivo de exemplo e substitua as senhas/segredos antes de executar:

   ```powershell
   Copy-Item .env.example .env
   ```

2. Na raiz do repositório, inicie os serviços:

   ```sh
   docker compose up --build
   ```

O Compose inicia o SQL Server com o volume `sqlserver_data`, executa o serviço
`db-init` com os scripts idempotentes e só então inicia a API e o front-end.
Os scripts usados pelo Compose são
[`01-create-database-idempotent.sql`](back-end/Scripts/01-create-database-idempotent.sql)
e [`02-procedures-views.sql`](back-end/Scripts/02-procedures-views.sql).

- Interface: http://localhost:8080
- API: http://localhost:5050
- Swagger: http://localhost:5050/swagger (disponível no ambiente Development)
- Health check: http://localhost:5050/api/healthcheck
- SQL Server: `localhost:1433`

O Compose executa a API em Production, onde o Swagger não é habilitado. Para
abrir o Swagger, execute a API localmente em Development.

Pare com `Ctrl+C`; `docker compose down` mantém os dados. Remova o volume
somente se quiser apagar os dados: `docker compose down --volumes`.

O arquivo `.env.example` contém valores demonstrativos. Troque `DB_PASSWORD` e
`JWT_SECRET_KEY` por valores próprios; a chave JWT deve ter ao menos 32
caracteres. Não use os valores de exemplo em produção.

## Executar localmente sem Docker

É necessário ter .NET SDK 10, Node.js/npm e SQL Server disponíveis. Inicialize
o banco com os dois scripts listados acima e configure `DB_SERVER`, `DB_NAME`,
`DB_USER`, `DB_PASSWORD` e `JWT_SECRET_KEY`. Para `dotnet run` iniciado dentro
de `back-end`, o carregador procura `.env` nessa pasta; o `.env` da raiz é
carregado automaticamente pelo Compose, não por esse comando.

```powershell
cd back-end
dotnet restore
dotnet run
```

Em outro terminal:

```powershell
cd front-end
npm ci
npm run dev
```

O Vite serve a interface em http://localhost:8080 e o cliente usa a API na
porta 5050 do mesmo host. Configure as variáveis no ambiente ou crie um
`back-end/.env` local; não versione arquivos `.env`.

## Verificações

```powershell
dotnet build systemic-pim.sln
dotnet test tests/back-end.Tests.csproj
cd front-end
npm ci
npm test -- --run
npm run lint
npm run build
```

O workflow de CI executa build e testes .NET, `npm ci`, lint e build do
front-end em push e pull request. Não há deploy em nuvem configurado.

## Documentação

- [Configuração, execução e endpoints](docs/CONFIGURACAO.md)
- [Arquitetura e estrutura do projeto](docs/ARQUITETURA.md)
- [Índice da documentação](docs/README.md)
- [Relatório de verificação da auditoria](docs/RELATORIO_VERIFICACAO.md)
- [Exemplo de integração React com fetch](docs/EXEMPLO_INTEGRACAO_REACT.ts)

## Limitações conhecidas

O repositório não contém aplicativo mobile nem integração/deploy em nuvem. As
credenciais das contas inseridas pelo seed não estão documentadas porque o SQL
contém hashes, não as senhas correspondentes. A RBAC das páginas é aplicada no
front-end; várias rotas da API exigem autenticação, mas não restringem o perfil.
Consulte o relatório de verificação para os demais problemas confirmados e os
resultados dos testes.
