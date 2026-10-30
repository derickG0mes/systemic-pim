# Relatório de verificação da auditoria PIM IV

Verificação do arquivo `auditoria_pim_iv_v2.md` anexado, confrontado originalmente
com o código presente no repositório em 28/10/2026 e atualizado em 29/10/2026 após
as fases de follow-up. A classificação considera a afirmação tal como está escrita
no relatório original; não implica que um teste estático prove o comportamento em
um SQL Server.

## 1. Resumo

Foram avaliados 49 grupos de afirmações das seções 2 a 7:

| Classificação | Quantidade |
|---|---:|
| CONFIRMADO | 11 |
| DESATUALIZADO | 24 |
| INCORRETO | 11 |
| NÃO VERIFICÁVEL | 3 |

O relatório anexado contém vários achados que já não correspondem ao código atual,
inclusive a restauração anônima, as operações de funcionários, o fallback de login
simulado, a integração SignalR, os caminhos de backup e a configuração de Swagger.
Os follow-ups corrigiram os problemas de validação de token, exposição de erro no
health, metadados da API, divergência do log de pedidos, bloqueio de login,
persistência de backup e erros do lint. React Router v7 eliminou as vulnerabilidades
reportadas pelo `npm audit`; os testes de fluxo do front-end e a etapa de testes no CI
também foram adicionados. Na Fase 7, o JWT passou a ser emitido em cookie HttpOnly,
com proteção antiforgery e CORS com credenciais. Os scripts e objetos SQL foram
executados e validados em Docker/SQL Server; o `db-init` passou em duas
execuções e os objetos foram exercitados em transação revertida. A cobertura
total do front-end permanece parcial.

## 2. Verificação item a item

| # | Item do relatório original | Status | Evidência atual | Observação |
|---:|---|---|---|---|
| 1 | Seção 2: total de 136 arquivos e inventário por diretório | DESATUALIZADO | `git ls-files` conta 155 arquivos; `back-end/Controllers/` contém 13 controllers; `back-end/Models/` contém 12 modelos; `back-end/Scripts/` contém 6 scripts SQL; `front-end/src/pages/` contém 12 arquivos. | A contagem e a estrutura descritas não são o estado atual. A quantidade inclui documentos/configurações que não existiam na auditoria. |
| 2 | Seção 2: números de linhas dos arquivos auditados | DESATUALIZADO | `Program.cs`, `AppDbContext.cs`, controllers e páginas foram alterados desde as contagens informadas. | As linhas citadas no arquivo anexado não devem ser usadas como referência atual. |
| 3 | Seção 2: lista de arquivos que o auditor afirma ter lido integralmente | NÃO VERIFICÁVEL | Evidência de leitura histórica não pode ser recuperada do código-fonte. | Não é possível confirmar o processo realizado pelo autor do relatório. |
| 4 | Seções 3 e 4A: arquitetura em camadas, controllers acessam DbContext diretamente e não há repositório | CONFIRMADO | `back-end/Controllers/*.cs` injeta `AppDbContext`; `back-end/Program.cs` registra os serviços; não há camada Repository no projeto. | A observação arquitetural continua válida. |
| 5 | Seções 3 e 4B: 15 rotas/telas e telas duplicadas de estoque/funcionários | DESATUALIZADO | `front-end/src/App.tsx` declara as rotas atuais; `front-end/src/pages/` contém `InventoryPage.tsx` e `UsersPage.tsx`, sem as antigas páginas duplicadas citadas. | Existem 10 rotas de páginas protegidas, além de login, redirecionamentos e rota de fallback. |
| 6 | Seções 3 e 4B: matriz de permissões do front-end | CONFIRMADO | `front-end/src/lib/rbac.ts` define `employee`, `admin` e `owner`; `front-end/src/App.tsx` aplica `ProtectedRoute`. O back-end agora aplica os perfis correspondentes nos controllers. | A matriz de navegação está alinhada com os controles de autorização do servidor. |
| 7 | Seções 3 e 4C: somente 33 endpoints e tabela de rotas como completa | INCORRETO | Os atributos HTTP nos 13 controllers definem 69 ações/rotas; a tabela em [CONFIGURACAO.md](./CONFIGURACAO.md) tem 69 linhas de endpoints. | A tabela do relatório original não contém todos os endpoints e contém rotas/perfis já superados. |
| 8 | Seção 4C: operações de criação/alteração de funcionário permitem qualquer perfil autenticado | DESATUALIZADO | `FuncionarioController.cs` exige `admin,owner` para listar, consultar, criar, atualizar e excluir funcionários. | O acesso às consultas também foi restringido a `admin,owner` no follow-up. Um administrador não pode criar perfil `owner`; essa ação exige que o ator também seja `owner`. |
| 9 | Seções 3, 4C e 7: o front-end não consome SignalR | DESATUALIZADO | `RestaurantContext.tsx:312-319` usa `useSignalR`; o pacote está em `front-end/package.json`; o servidor publica os eventos em `back-end/Hubs/CozinhaHub.cs`. | O cliente ainda mantém polling de contingência a cada 60 segundos quando o hub está habilitado, mas desconectado. |
| 10 | Seções 3 e 4D: não existe aplicativo mobile nativo, híbrido ou PWA | CONFIRMADO | Não há projeto mobile, manifest PWA ou service worker; a aplicação é React web responsiva. | O layout responsivo não equivale a um aplicativo mobile/PWA. |
| 11 | Seções 3 e 4E: o banco tem 12 tabelas e 3 triggers | CONFIRMADO | `AppDbContext.cs:12-23` declara 12 DbSets; scripts e catálogo SQL Server confirmaram as 12 tabelas e 3 triggers. | `docker compose run --rm db-init` passou duas vezes. As três triggers foram exercitadas em transação revertida: abriu/ocupou mesa, recalculou total de itens e fechou comanda/liberou mesa após pagamento. |
| 12 | Seções 3 e 4E: não existem procedures nem views | INCORRETO | `02-procedures-views.sql` declara 3 procedures e 2 views. | Objetos encontrados: `sp_fechar_comanda`, `sp_relatorio_faturamento`, `sp_ajustar_estoque`, `vw_comandas_abertas` e `vw_produtos_mais_vendidos`. |
| 13 | Seções 3, 4F e 7: não há Docker nem CI | DESATUALIZADO | `docker-compose.yml`, `back-end/Dockerfile`, `front-end/Dockerfile` e `.github/workflows/ci.yml` existem; serviços Docker foram usados e `db-init` executou duas vezes sem erro. | CI está configurado. A execução remota no GitHub Actions não foi observada nesta auditoria. |
| 14 | Seção 4F: caminho de backup é fixo em `C:\Backups\Systemic` | DESATUALIZADO | `BackupService.cs` usa `BACKUP_PATH` ou `AppContext.BaseDirectory/backups`; o Compose configura `/app/backups` em `backup_data`. | A configuração é ajustável e o Compose persiste o diretório configurado em volume nomeado. |
| 15 | Seção 4G: há somente 3 testes de back-end e 1 teste dummy no front-end | DESATUALIZADO | A execução em Docker de `dotnet test tests/back-end.Tests.csproj` aprovou 46 testes; `npm test -- --run --coverage` aprovou 14 testes em 2 arquivos. | A cobertura front-end total ainda é parcial: 45,03% de statements e 46,75% de linhas. |
| 16 | Seção 4G/H: não há `.gitignore` e binários de `tests/bin` estão versionados | INCORRETO | `.gitignore`, `back-end/.gitignore` e `front-end/.gitignore` existem; `git ls-files tests/bin tests/obj` não retorna arquivos. | Os arquivos de build são ignorados; não encontrei binários de testes rastreados pelo Git. |
| 17 | Seções 4H e 6: `POST /api/backup/restore` é anônimo | DESATUALIZADO | `BackupController.cs:15,105` exige `[Authorize(Roles = "admin,owner")]`; chamadas reais confirmaram autorização e restore por owner. | Restore real respondeu HTTP 200; sem autenticação o teste de integração verifica 401 e employee recebe 403. |
| 18 | Seções 4H e 6: restore extrai arquivos arbitrários com risco de Zip Slip | DESATUALIZADO | `BackupRestoreService.cs:45-80` lê um único `.sql` do ZIP sem extrair a árvore; `:132-167` rejeita caminhos absolutos, `..` e links simbólicos. | A alegação sobre escrita de arquivos arbitrários não corresponde ao serviço atual. O endpoint ainda executa SQL de backup, por design, sob perfil privilegiado. |
| 19 | Seções 4H, 4K e 7: o restore não executa SQL | DESATUALIZADO | `BackupRestoreService.cs:92-107` cria backup de segurança e executa o script com `ExecuteSqlRawAsync`, dentro de transação. | Backup real foi restaurado com HTTP 200; registro removido voltou ao banco, backup de segurança persistiu em `/app/backups` após restart da API e ZIP com `../` recebeu HTTP 400. |
| 20 | Seções 4K e 7: a interface não oferece restauração | INCORRETO | `BackupPage.tsx` tem seleção de ZIP, confirmação e chama `restaurarBackup`; `api.ts` envia `Arquivo` como multipart. | A interface de restauração existe. |
| 21 | Seções 4H e 6: usuário employee pode criar/alterar/excluir funcionários ou promover-se a admin | DESATUALIZADO | `FuncionarioController.cs` exige `admin,owner` para consultas e escritas; criação de perfil `owner` exige ator `owner`. | O risco descrito foi corrigido; nenhum dos endpoints de funcionário está disponível ao perfil `employee`. |
| 22 | Seções 4H e 6: `POST /api/log/registrar` é anônimo | INCORRETO | `LogController.cs:13` exige `[Authorize(Roles = "admin,owner")]` para o controller. | A rota não é anônima e agora também está limitada a `admin` ou `owner`. |
| 23 | Seções 4H e 6: `MOCK_USERS` e senhas em texto puro no `localStorage` | DESATUALIZADO | `AuthContext.tsx` autentica via API e grava dados auxiliares do perfil em `restaurant_user`; a role é validada por `GET /api/autenticacao/validar` na inicialização. | O JWT está em cookie HttpOnly, não acessível ao JavaScript; senha não é persistida nem há credenciais de demonstração na tela de login/documentação. |
| 24 | Seções 4H e 6: fallback literal de segredo JWT no código/appsettings | DESATUALIZADO | `Program.cs:37-42` e `JwtService.cs:16-22` exigem chave de ambiente/configuração com pelo menos 32 caracteres e falham sem ela; `appsettings.json` não contém segredo. | Não há fallback literal; os `.env.example` usam placeholder explícito, rejeitado fora de `Development`, e instruem como gerar uma chave exclusiva. |
| 25 | Seção 4E: connection string usa autenticação integrada do Windows | INCORRETO | `Program.cs:21-35` monta a connection string com `DB_SERVER`, `DB_NAME`, `DB_USER` e `DB_PASSWORD`. | O caminho executado usa credenciais SQL; o `DefaultConnection` do appsettings não é usado por essa montagem. |
| 26 | Seção 4E e 5: `PRECO_CUSTO` e `PRECO_VENDA` existem no SQL, mas não no modelo Produto | INCORRETO | `Produto.cs:19,22` declara as duas propriedades mapeadas; `01-create-database-idempotent.sql` cria as colunas. | A divergência apontada para essas duas colunas já não existe. |
| 27 | Seção 4E: telefone do cliente e cargo do funcionário divergem em nulabilidade | INCORRETO | `Cliente.cs:15` declara `string?`; `Funcionario.cs:22` declara `string` não anulável; SQL declara telefone nullable e cargo NOT NULL. | As definições atuais correspondem nesses dois pontos. |
| 28 | Seções 4E e 5: nome do banco é `DB_RESTAURANTE` | CONFIRMADO | `Program.cs:22`, `.env.example` e scripts SQL usam `DB_RESTAURANTE`. | O relatório identifica corretamente o nome usado pela aplicação, embora alguns documentos antigos tenham outro nome. |
| 29 | Seções 4I: há limitações de acessibilidade | CONFIRMADO | Há widget VLibras, `lang="pt-BR"` e componentes Radix; não identifiquei suporte geral de alto contraste nem regiões `aria-live` para os fluxos auditados. | A avaliação é estática e não substitui teste com leitor de tela. |
| 30 | Seções 4J e 5: existem discrepâncias em documentação, porta, payload e algoritmo | CONFIRMADO | Antes das alterações desta tarefa, `docs/CONFIGURACAO.md` e `docs/ARQUITETURA.md` continham instruções antigas de porta, senha, bcrypt e connection string; o exemplo usava Axios. | Documentação atualizada na tarefa 2; o exemplo agora usa `fetch`. |
| 31 | Seção 4K: `idCliente` de pedido é fixo em 1 | INCORRETO | `RestaurantContext.tsx` registra o objeto de payload que também envia a `POST /api/pedidos`; o DTO contém `idMesa`, `idCliente` e `itens`. | A interface envia `idMesa` e `itens`, sem `idCliente`. A divergência entre log e request foi corrigida sem alterar o payload nem a regra de negócio. |
| 32 | Seção 4K: `idFuncionario` do pagamento é fixo em 1 | DESATUALIZADO | `RestaurantContext.tsx` envia forma e troco; `ComandaController.cs` extrai o funcionário autenticado das claims do JWT. | O identificador fixo foi removido do fluxo atual de pagamento. |
| 33 | Seções 4B e 4K: marcar comanda como não paga só altera estado local | DESATUALIZADO | `RestaurantContext.tsx:760-775` chama o endpoint de inadimplência e sincroniza comandas. | A ação persiste no back-end; o UI atualiza após resposta/sincronização. |
| 34 | Seções 4B e 4K: cancelar reserva só altera estado local | DESATUALIZADO | `RestaurantContext.tsx:847-864` chama a exclusão de reserva e sincroniza. | O controller expõe `DELETE /api/reserva/{id}`. |
| 35 | Seções 4B e 4K: incremento de estoque altera somente estado local | DESATUALIZADO | `RestaurantContext.tsx` chama `updateProduto` na atualização e oferece `adjustProductStock` via `PUT /api/produto/{id}/ajustar-estoque`. | O fluxo antigo de somente memória não corresponde ao atual. A tela de incremento rápido usa atualização de produto; o fluxo de ajuste dedicado é o que envia motivo ao back-end. |
| 36 | Seções 4B e 4K: cadastro/edição de funcionário apenas altera estado e localStorage | DESATUALIZADO | `UsersPage.tsx` chama API; `RestaurantContext.tsx:866-930` chama `createFuncionario` e `updateFuncionario`. | Dados de senha não são guardados no estado persistido de funcionário. |
| 37 | Seção 4K: falta integração de restauração e endpoint só extrai ZIP | INCORRETO | `BackupPage.tsx`, `api.ts` e `BackupRestoreService.cs:92-107` implementam upload, confirmação e execução SQL. | O fluxo real de backup/remoção/restore foi executado e o registro retornou ao banco; ZIP com caminho `../` foi rejeitado com HTTP 400. |
| 38 | Seção 5: hash de senha é bcrypt | CONFIRMADO como discrepância documental | `PasswordHashService.cs` grava PBKDF2-SHA-256 v1 com 600.000 iterações, salt de 16 bytes e saída de 32 bytes; ainda verifica hash legado de 10.000 iterações/20 bytes. | Hashes antigos válidos são regravados no formato atual após login bem-sucedido; os docs antigos afirmavam bcrypt. |
| 39 | Seção 5: JWT dura 1 hora e a documentação cita configuração em appsettings | CONFIRMADO como discrepância documental | `JwtService.cs:25-26` usa `JWT_EXPIRATION_MINUTES` ou configuração e padrão 480; `.env.example` informa 480. | A duração efetiva padrão é 480 minutos. |
| 40 | Seção 5: o exemplo React usa Axios e rota inexistente | CONFIRMADO | O exemplo citado foi substituído por `docs/EXEMPLO_INTEGRACAO_REACT.ts`, que usa `fetch` e foi compilado como TypeScript. | O exemplo foi reescrito e compilado como TypeScript. |
| 41 | Seções 5 e 6: documentação antiga ainda cita PIM III, URL/porta e credenciais de teste | DESATUALIZADO | Os documentos antigos não refletiam por completo a versão/porta atuais; o seed contém hashes, não senhas em texto claro verificáveis. | Documentos atualizados para PIM IV e portas 5050/8080. Nenhuma senha presumida foi publicada. |
| 42 | Seções 5 e 6: referência antiga a issuer/audience PIM3 | DESATUALIZADO | `Program.cs:52-54` e `JwtService.cs` usam issuer `PIM4.API` e audience `PIM4.API.Users`. | Os namespaces de código `PIM3.API.*` permanecem nomes internos; não são identidade exibida do produto. |
| 43 | Seção 6: falta `.gitignore` na raiz | INCORRETO | `.gitignore` raiz e regras para bin/obj/node_modules estão presentes. | As saídas de build não são rastreadas. |
| 44 | Seção 7: falta Docker Compose e CI | DESATUALIZADO | `docker-compose.yml` e `.github/workflows/ci.yml` já existem. | O workflow inclui build/test .NET, `npm ci`, lint, `npm test -- --run` e build do front-end, nesta ordem. |
| 45 | Seção 7: falta integrar SignalR | DESATUALIZADO | `RestaurantContext.tsx:312-319` registra handlers dos eventos do hub. | Existe polling de contingência; SignalR não é o único mecanismo de atualização. |
| 46 | Seção 7: falta eliminar IDs de cliente/funcionário fixos | DESATUALIZADO | O log e o corpo enviado a `POST /api/pedidos` agora usam o mesmo payload (`idMesa` e `itens`, sem `idCliente`; ver item 31 e item 8 da seção 3). O pagamento não envia `idFuncionario`; a API lê essa claim do JWT. | Não há IDs fixos nos requests atuais. A ausência de `idCliente` no payload da interface é intencional quando a tela exige comanda aberta; sem comanda, a API valida o cliente exigido pelo DTO. |
| 47 | Seção 4 e 7: contagem de histórico Git e autoria informada | NÃO VERIFICÁVEL | A cópia atual do histórico contém commits posteriores a maio de 2026; o relatório não define se usa branch ou snapshot específico. | A contagem e a autoria não são propriedades estáveis do código e não podem ser comparadas sem o commit-base da auditoria. |
| 48 | Seções 4 e 7: triggers estão operacionalmente ativas e script init executa corretamente | CONFIRMADO | `db-init` foi executado duas vezes sem erro; catálogo SQL Server mostrou 12 tabelas, 3 triggers, 3 procedures, 2 views e 5 índices, inclusive `IDX_LOG_SISTEMA_DATA`. | Efeitos das três triggers, três procedures e duas views foram conferidos com dados de exemplo em transação revertida. |
| 49 | Credenciais de teste em documentação | PARCIAL | Os scripts de seed armazenam hashes nas colunas de senha; este relatório omite nomes de conta e valores de senha. | A existência e validade de credenciais de seed não é inferida a partir dos hashes. |

### Fluxos e diferenças de comportamento que permanecem

- O front-end guarda somente dados não sensíveis do perfil em `localStorage`; o
  JWT fica em cookie HttpOnly. A senha não é persistida e não há lista `MOCK_USERS`.
- O front-end envia as requisições reais de pedidos, funcionários, reservas e
  pagamentos, mas algumas atualizações de estado são otimistas. Por exemplo,
  `RestaurantContext.tsx` atualiza a fila de pedidos antes da conclusão da chamada API;
  em falha, registra erro no console, sem restaurar o estado anterior.
- `log()` da aplicação front-end grava eventos somente em uma lista em memória
  (`front-end/src/lib/audit.ts`); os logs do endpoint de back-end são uma operação
  separada.
- Os logins por email e CPF bloqueiam após 5 falhas por 15 minutos. O bloqueio do
  servidor é persistido em `LOCKED_UNTIL`;
  o bloqueio extra do `AuthContext` é estado temporário em memória do navegador.
- A `API_URL` do cliente é formada com o hostname da página e porta 5050; a variável
  `VITE_API_URL` do exemplo não é usada pelo módulo atual.

## 3. Problemas reais encontrados e estado após follow-up

Prioridade alta:

1. **RESOLVIDO — RBAC incompleto no back-end.** A autorização agora aplica a matriz
   de perfis também nos endpoints: `employee` pode operar pedidos, comandas e reservas;
   gestão de produtos, mesas, clientes, formas de pagamento, faturamento, logs,
   funcionários e backups exige `admin` ou `owner` conforme o recurso. Leituras de
   produtos, mesas e formas de pagamento permanecem disponíveis aos três perfis.
   A nova suíte `RbacIntegrationTests.cs` verifica que um token `employee` recebe 403
   nos endpoints administrativos.
2. **RESOLVIDO — chave fixa nos arquivos de exemplo.** Os `.env.example` agora usam
   placeholder explícito com instrução `openssl rand -base64 48`; `JwtService`
   rejeita esse valor fora de `Development`, além de rejeitar chaves curtas.
3. **RESOLVIDO — `/api/autenticacao/validar` exigia autenticação e não inspecionava
   claims.** O endpoint agora exige `[Authorize]` e retorna id, nome e role das claims.
   Testes de integração confirmam 401 sem token e o conteúdo da resposta com token válido.

Prioridade média:

4. **RESOLVIDO — health check expunha detalhes internos de exceções.** O endpoint
   continua público, mas a resposta de falha agora é genérica; a exceção é registrada
   no log e não há mensagem, connection string ou stack trace no JSON.
5. **RESOLVIDO — versão/URL dos endpoints de health divergiam.** Versão `2.0` e
   porta `5050` agora vêm de `ApiMetadata`, compartilhado com Swagger.
6. **RESOLVIDO — auditoria npm.** Após migrar para React Router 7.18.5 e remover
   `react-router-dom`, `npm audit` reporta zero vulnerabilidades.
7. **RESOLVIDO — lint front-end tinha 28 erros.** Os erros de `no-explicit-any` foram
   corrigidos com tipos, sem desativar regras; `npm run lint` termina com 0 erros e
   mantém 7 avisos de Fast Refresh.
8. **RESOLVIDO — payload de pedido e log divergiam.** O contexto registra e envia o
   mesmo objeto (`idMesa` e `itens`, sem `idCliente`); o DTO e a regra de negócio não
   foram alterados.

Prioridade operacional/qualidade:

9. **RESOLVIDO — backups dentro do Docker não tinham volume persistente.** O Compose
   agora passa `BACKUP_PATH` e monta o volume nomeado `backup_data` nesse caminho.
10. **Cobertura front-end ampliada, ainda parcial.** A última execução aprovou
   14 testes em 2 arquivos para fluxos de login, bloqueio, RBAC/ProtectedRoute,
   criação de pedido e pagamento. A cobertura medida é 45,03% de statements e
   46,75% de linhas no projeto.
11. **RESOLVIDO — paridade dos bloqueios de login.** Os dois controllers usam a
    política única de 5 tentativas e 15 minutos, coberta por teste. O estado adicional
    de bloqueio do React continua volátil em memória.

12. **RESOLVIDO — testes de front-end no CI.** O workflow executa `npm test -- --run`
    após o lint e antes do build.

O startup da API em Production foi validado com chave JWT ausente, curta e
placeholder: os três cenários encerram com código 1 e mensagem explícita, sem
stack trace. A role das rotas protegidas é obtida em `/api/autenticacao/validar`;
o role adulterado em `restaurant_user` não substitui a resposta do servidor.
A tela de login e este relatório não publicam credenciais demonstrativas.

Na validação visual do VLibras não houve violação CSP observada e o player
carregou em uma execução. O console mostrou sensores bloqueados no iframe
externo, que não recebe atributo `allow`; o serviço externo também apresentou
requisições abortadas. O item permanece parcial, sem alteração adicional no
Nginx.

As validações operacionais de SQL Server estão registradas na seção 7. A
cobertura front-end permanece parcial. A decisão da Fase 7 foi implementada:
JWT em cookie HttpOnly, com antiforgery, CORS com credenciais e SignalR por
cookie. O `npm audit` final está limpo. A execução remota do CI não foi
observada. A remoção de pictogramas abaixo não altera valores usados como
status, identificadores, chaves, nomes SQL ou enums.

## 4. Comandos e resultados

| Comando | Resultado |
|---|---|
| `dotnet restore` em `back-end/` | Concluído. |
| `dotnet build systemic-pim.sln` | Sucesso, 0 avisos e 0 erros. |
| `dotnet restore` em `tests/` | Concluído. |
| `dotnet test tests/back-end.Tests.csproj` em container .NET 10 | Sucesso: 46 aprovados, 0 falhas. |
| `dotnet list package --vulnerable --include-transitive` em `back-end/` | Nenhum pacote vulnerável informado pelas fontes NuGet consultadas. |
| `dotnet list package --vulnerable --include-transitive` em `tests/` | Nenhum pacote vulnerável informado pelas fontes NuGet consultadas. |
| `npm audit` em `front-end/` | Baseline da Fase 0: 2 vulnerabilidades moderadas em `react-router`; após React Router 7.18.5: 0 vulnerabilidades. |
| Migração React Router | `react-router-dom` não está instalado; dependência `react-router@7.18.5`; imports usam o pacote `react-router`. |
| `npm run lint` em `front-end/` | Sucesso: 0 erros e 7 avisos de Fast Refresh. |
| `npm run build` em `front-end/` | Sucesso; TypeScript e Vite concluíram. Restam avisos de anotações PURE e chunk acima de 500 kB. |
| `npm test -- --run --coverage` em `front-end/` | Sucesso: 2 arquivos, 14 testes aprovados; 45,03% statements, 27,10% branches, 32,47% funções e 46,75% linhas. |
| `docker compose build front-end` | Sucesso; imagem frontend construída, Vite 8.3.5 e zero vulnerabilidades no `npm ci` da imagem. |
| Validação de `.github/workflows/ci.yml` | Etapas conferidas localmente; incluem build/test .NET, `npm ci`, lint, `npm test -- --run` e build. A execução remota no GitHub Actions não foi observada nesta auditoria. |
| `docker compose config --quiet` | Sucesso com o `.env` local existente; o comando não imprime os valores e não inicia containers. |
| TypeScript isolado de `docs/EXEMPLO_INTEGRACAO_REACT.ts` | Sucesso com `tsc --noEmit --target ES2020 --module ESNext --moduleResolution bundler --lib ES2020,DOM --strict --skipLibCheck`. |
| `docker compose run --rm db-init` (duas execuções) | Ambas terminaram sem erro; o catálogo confirmou 12 tabelas, 3 triggers, 3 procedures, 2 views e 5 índices, inclusive `IDX_LOG_SISTEMA_DATA`. |
| Fluxo operacional SQL/API | Backup restaurado via owner com HTTP 200; registro reapareceu no banco; backup de segurança persistiu após restart da API; ZIP com `../` recebeu HTTP 400. Lockout email/CPF e health 503 com banco parado também foram confirmados. |
| Fase 7: autenticação com cookie e CSRF | Build .NET e 46 testes aprovados; inclui atributos do cookie, autenticação por cookie, logout, exigência de antiforgery e restore protegido. |

## 5. Ocorrências pictográficas antes da remoção

A varredura inicial dos arquivos-fonte, documentação e configuração encontrou 126
code points pictográficos/seletores em 15 arquivos. As ocorrências eram comentários,
títulos, mensagens de console, mensagem de saúde, prints SQL e comentários de `.env`;
nenhuma fazia parte de status, chaves, identificadores ou nomes usados em lógica.
Uma varredura ampla também encontrou um bundle antigo em `front-end/dist` com
pictogramas da versão anterior da interface. `npm run build` regenerou o bundle a
partir das fontes atualizadas.

| Arquivo | Linhas iniciais | Contexto e code points |
|---|---|---|
| `back-end/Controllers/BackupController.cs` | 103 | Comentário sobre restauração; U+1F504. |
| `back-end/Controllers/ClienteController.cs` | 25, 35 | Comentários de padronização; U+2705. |
| `back-end/Controllers/ComandaController.cs` | 41, 57, 65 | Comentários de estrutura/autorização; U+2705. |
| `back-end/Controllers/FormaPagamentoController.cs` | 24, 34 | Comentários de retorno; U+2705. |
| `back-end/Controllers/HealthCheckController.cs` | 36 | Mensagem de saúde; U+1F680. |
| `back-end/Controllers/MesaController.cs` | 25, 35 | Comentários de padronização; U+2705. |
| `back-end/Controllers/PedidosController.cs` | 42, 43, 44, 205, 289, 303 | Comentários de fluxo; U+2705. |
| `back-end/Data/AppDbContext.cs` | 66, 107, 137, 143, 165 | Comentários de mapeamento EF; U+2705. |
| `back-end/Program.cs` | 103, 122, 148, 151, 157, 160, 164, 185 | Comentários de inicialização; U+FE0F, U+1F680, U+1F537, U+1F5C4. |
| `back-end/README.md` | 1, 3, 9, 29, 81, 95, 149, 174, 203, 214, 229, 248, 259, 261-269 | Títulos e marcadores decorativos; U+1F527, U+1F4CB, U+1F680, U+1F4C1, U+1F510, U+1F4CA, U+2699, U+1F5C4, U+1F50D, U+1F4DD, U+1F6A8, U+1F4DA, U+1F393, U+2705. |
| `back-end/Scripts/migration-logs-sistema.sql` | 19, 22, 32, 35, 53, 56, 62 | Mensagens PRINT; U+2705, U+26A0, U+FE0F. |
| `front-end/.env` | 14, 18 | Comentários de configuração SignalR/ambiente; U+1F4E1, U+1F6E0, U+FE0F. Arquivo local ignorado pelo Git; somente comentários foram editados. |
| `front-end/src/contexts/RestaurantContext.tsx` | 154, 159, 162, 170, 173, 181, 247, 253, 257, 262, 279, 282, 287, 305, 307, 334, 341, 346, 348, 351, 358, 373, 375, 378, 386, 394, 402, 409, 428, 430, 433, 448, 455, 462, 570, 576, 579, 601, 607, 610, 617, 684 | Comentários e logs de sincronização/pedidos; U+2705, U+1F50D, U+26A0, U+FE0F, U+274C, U+1F525, U+1F4E1, U+1F6D2. |
| `front-end/src/pages/OrdersPage.tsx` | 43, 142, 167, 186, 242 | Comentários de pedidos; U+2705. |
| `front-end/src/services/api.ts` | 200, 205, 240, 242 | Logs de requisição; U+1F4E1. |
| `front-end/dist/assets/index-C4efOC4R.js` | 312 | Bundle obsoleto removido pela recompilação; continha U+1F4E1, U+1F50D, U+26A0, U+FE0F, U+2705, U+274C e U+1F6D2. |

Após recompilar, a busca final percorreu os arquivos de texto do repositório,
incluindo `.vs` e `front-end/dist`, ignorando somente `.git`, `node_modules`,
`bin`, `obj` e `package-lock.json`: **zero ocorrências residuais**.

## 6. Referências da documentação atualizada

- [README principal](../README.md)
- [Guia de configuração, rotas e API](./CONFIGURACAO.md)
- [Arquitetura e estrutura do projeto](./ARQUITETURA.md)
- [Exemplo TypeScript usando fetch](./EXEMPLO_INTEGRACAO_REACT.ts)
- [README do back-end](../back-end/README.md)

## 7. Resultados operacionais SQL Server e API

Os comandos foram executados com Docker Compose e SQL Server ativos. O
`db-init` executou `01-create-database-idempotent.sql` e
`02-procedures-views.sql` duas vezes, ambas sem erro. O catálogo confirmou
**12 tabelas, 3 triggers, 3 procedures, 2 views e 5 índices**. Após incluir
`IDX_LOG_SISTEMA_DATA` no script do `db-init`, nova execução duas vezes passou
e `sys.indexes` retornou exatamente um índice com esse nome na tabela
`LOG_SISTEMA`. `init-database.sql` é legado e não é executado pelo Compose.

Os efeitos foram testados com dados de exemplo dentro de transação revertida:

| Objeto | Antes | Depois |
|---|---|---|
| `trg_abrir_comanda` | Mesa disponível | Mesa ocupada após inserir comanda aberta |
| `trg_atualizar_valor_total` | Comanda sem os itens de teste | Total recalculado para 20,00 após inserir os itens |
| `trg_fechar_comanda` | Comanda aberta e mesa ocupada | Pagamento inserido, comanda fechada e mesa disponível |
| `sp_ajustar_estoque` | Estoque 10 | Estoque 13 após adicionar 3 |
| `sp_fechar_comanda` | Comanda aberta com itens, sem pagamento | Pagamento gravado; comanda fechada pela trigger |
| `sp_relatorio_faturamento` | Receita de exemplo 66,60 | Receita de exemplo 86,60 após contabilizar a comanda |
| `vw_comandas_abertas` | Comanda de exemplo aberta visível | Comanda deixa de aparecer após fechamento |
| `vw_produtos_mais_vendidos` | Sem venda de teste encerrada | Itens aparecem após fechamento da comanda |

O rollback da transação confirmou que não restaram os dados usados nesses
ensaios. A inicialização repetida foi executada por:

```sh
docker compose run --rm db-init
docker compose run --rm db-init
```

### Fluxo de backup e restore

Owner autenticado gerou backup real via `POST /api/backup/gerar`. Um registro
temporário foi apagado e restaurado via `POST /api/backup/restore` com o cookie
`systemic_auth` e `X-CSRF-TOKEN`; a resposta foi HTTP 200 e a consulta SQL
confirmou o registro restaurado. O backup de segurança foi criado e seus
arquivos continuaram em `/app/backups` após `docker compose restart api`.

Um ZIP contendo uma entrada `../` foi rejeitado com HTTP 400. Corpo retornado:

```json
{"sucesso":false,"mensagem":"O ZIP contém um caminho de arquivo inválido.","dados":null,"codigoErro":null}
```

Os registros temporários foram removidos ao final.

### Lockout e health check

Com contas temporárias distintas, cinco falhas no login por email e cinco no
login por CPF acionaram o bloqueio de 15 minutos. Login válido resetou as
tentativas; após as falhas, a consulta SQL mostrou 5 tentativas e cerca de 899
segundos restantes. As contas de teste foram removidas.

Com SQL Server parado temporariamente,
`GET /api/healthcheck/database` respondeu HTTP 503 com mensagem genérica, sem
exceção, connection string ou stack trace. O SQL Server foi reiniciado e
`SELECT 1` confirmou recuperação.

### CI e VLibras

`.github/workflows/ci.yml` foi inspecionado e contém build/test .NET, `npm ci`,
lint, testes front-end e build. **A execução remota no GitHub Actions não foi
observada.**

No navegador, aplicação e login funcionaram e o widget VLibras abriu o painel.
Não houve violação CSP observada, mas o engine Unity/CDN externo retornou
`ERR_CONNECTION_CLOSED`; sensores também não foram delegados pelo iframe. O
carregamento completo do player permanece não confirmado e depende do serviço/
iframe externo.
