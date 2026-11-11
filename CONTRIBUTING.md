# Guia de contribuição - Systemic PIM

Obrigado por contribuir. Este guia resume como preparar o ambiente, validar uma
mudança e abri-la para revisão. Ele descreve as práticas já presentes no
repositório (scripts, CI e histórico de commits).

## Antes de começar

Leia o [README](README.md) e a [arquitetura](docs/ARQUITETURA.md). Para
mudanças na API, consulte também a [referência da API](docs/API.md).

Ferramentas:

| Ferramenta | Versão | Para quê |
|---|---|---|
| .NET SDK | 10 | API e testes (`back-end/`, `tests/`) |
| Node.js | 22.12 ou superior | Front-end (`front-end/`) e mobile (`mobile/`) |
| SQL Server | 2022 (o Compose fornece) | Banco de dados |
| Docker Compose | recente | Execução completa e testes de integração locais |

## Preparar o ambiente

1. Clone o repositório e copie `.env.example` para `.env`, trocando todos os
   valores `TROQUE_*` (veja [VARIAVEIS_AMBIENTE.md](docs/VARIAVEIS_AMBIENTE.md)).
2. Crie o volume externo do Compose e suba tudo:

   ```sh
   docker volume create systemic-pim_aspnet_data_protection_keys
   docker compose up --build
   ```

3. Para desenvolver com recarga automática, rode apenas o SQL Server pelo
   Compose (ou use um SQL Server próprio com os scripts de `back-end/Scripts`)
   e siga "Execução local" em [CONFIGURACAO.md](docs/CONFIGURACAO.md#execução-local):
   `dotnet run` em `back-end/` e `npm run dev` em `front-end/`.
4. Mobile: veja [mobile/README.md](mobile/README.md).

## Fluxo de trabalho

- A branch principal é `main`. Trabalhe em uma branch própria (por exemplo,
  `mobile`, `melhorias-conformidade`) e abra um pull request para `main`.
- Mantenha cada pull request focado em um assunto.
- O CI roda em todo push e pull request; confira se ele passou antes de pedir
  a revisão.
- Depois que o CI passa em `main`, o CD testa o Compose e publica as imagens
  (veja [DEPLOY.md](docs/DEPLOY.md#cicd)).

### Mensagens de commit

O histórico segue o estilo Conventional Commits, em português, com escopo
opcional:

```text
feat(mobile): adiciona tela de logs de auditoria com filtro e paginacao
fix(api): ajusta regras de comandas e pedidos
docs(infra): atualiza configuracao e compose
test: cobre seguranca, fluxos e notificacoes
```

Tipos usados no histórico: `feat`, `fix`, `docs`, `test`, `chore`, `ci`,
`build` e `security`. Escopos recorrentes: `api`, `frontend`, `mobile`,
`notificacoes`, `seguranca`, `infra`.

## Validar antes de abrir o pull request

Execute as mesmas verificações do CI:

```powershell
# API
dotnet build systemic-pim.sln --configuration Release
dotnet test tests/back-end.Tests.csproj --configuration Release

# Front-end
Set-Location front-end
npm ci
npm audit --omit=dev --audit-level=high
npm run lint
npm test -- --run
npm run build
```

Se você mexeu em `mobile/` (o CI não o cobre):

```powershell
Set-Location mobile
npm ci
npm run typecheck
npm run lint
```

Se você mexeu em scripts SQL, regras de negócio de comandas/backup ou
autorização, rode também os testes de integração contra um SQL Server **local
descartável** (eles criam e removem bancos temporários):

```powershell
$env:RUN_INTEGRATION_TESTS = "1"
$env:INTEGRATION_TEST_SQL_CONNECTION_STRING = "<conexão com o catálogo master do SQL Server local>"
$env:BACKUP_TEST_CONNECTION_STRING = $env:INTEGRATION_TEST_SQL_CONNECTION_STRING
dotnet test tests/back-end.Tests.csproj
```

O exemplo completo de montagem da string de conexão está no
[README](README.md#testes-e-verificações).

## Convenções do projeto

### Segredos e configuração

- Nunca versione `.env`, senhas, chaves ou tokens. Nos exemplos e na
  documentação, use placeholders (`TROQUE_*`, `<SENHA>`).
- O CI roda o gitleaks no histórico inteiro. Um alerta falso positivo só deve
  entrar em `.gitleaksignore` com um comentário que o justifique.
- Ao criar uma variável nova, documente-a em
  [VARIAVEIS_AMBIENTE.md](docs/VARIAVEIS_AMBIENTE.md) e no `.env.example`
  correspondente.

### Banco de dados

- O esquema é gerenciado por scripts SQL idempotentes em `back-end/Scripts`
  (`NN-descricao.sql`); o projeto não usa migrations do EF Core. Um script novo
  deve poder rodar mais de uma vez sem perder dados.
- Scripts novos que a API precisa para iniciar devem ser adicionados ao `db-init`
  do `docker-compose.yml` e descritos em [CONFIGURACAO.md](docs/CONFIGURACAO.md#banco-de-dados-e-scripts).
- Ao alterar uma entidade, ajuste o model, o `AppDbContext` e o script SQL no
  mesmo pull request.

### API

- Regras de negócio ficam em `back-end/Services` (com interface `I*Service`);
  o controller apenas declara rota, autorização e delega.
- Declare a autorização por role em cada ação (`[Authorize(Roles = "...")]`) e
  mantenha a matriz de [API.md](docs/API.md) em dia.
- Requisições mutáveis passam por validação CSRF; não crie exceções sem
  justificativa.
- Acrescente ou atualize testes em `tests/` para o comportamento alterado.

### Front-end e mobile

- A web usa a mesma origem para a API (`/api`); não introduza URLs absolutas.
- O mobile lê a URL base de `EXPO_PUBLIC_API_URL` (deve terminar em `/api`).
- O ESLint do front-end inclui regras de acessibilidade (`jsx-a11y`); corrija
  os avisos em vez de desativá-las. Mantenha rótulos acessíveis nas telas do
  app, como já ocorre no código existente.
- Testes do front-end ficam em `front-end/src/test` (Vitest).

### Documentação

Atualize a documentação no mesmo pull request que muda o comportamento:

| Mudança | Documento |
|---|---|
| Endpoint, payload, permissão, evento SignalR | [docs/API.md](docs/API.md) |
| Variável de ambiente | [docs/VARIAVEIS_AMBIENTE.md](docs/VARIAVEIS_AMBIENTE.md) |
| Tabela, script, módulo, fluxo | [docs/ARQUITETURA.md](docs/ARQUITETURA.md) |
| Execução, segurança, backup | [docs/CONFIGURACAO.md](docs/CONFIGURACAO.md) |
| Docker, CI/CD, produção | [docs/DEPLOY.md](docs/DEPLOY.md) |
| App mobile | [mobile/README.md](mobile/README.md) |

Escreva em português. Só documente o que é verificável no código; se algo for
incerto, marque como "A CONFIRMAR".

## Licença

O projeto usa a licença MIT (arquivo [LICENSE](LICENSE)).
