# Configuração e uso - Systemic - PIM IV

Este documento descreve a execução local e em Docker, os dados de
autenticação, a persistência e as rotas atuais dos controllers.

## Executar com Docker Compose

Na raiz:

```powershell
Copy-Item .env.example .env
```

Edite `.env`: defina uma senha SQL Server válida e substitua
`JWT_SECRET_KEY` por uma chave exclusiva com pelo menos 32 caracteres. Gere-a
com `openssl rand -base64 48`. O valor presente no `.env.example` é apenas um
placeholder (`SUBSTITUA_POR_CHAVE_GERADA_COM_OPENSSL`) e a API o rejeita fora
do ambiente `Development`. Chaves ausentes ou com menos de 32 caracteres também
impedem a inicialização. Não reutilize nem versione a chave real.

```sh
docker compose up --build
```

O Compose executa SQL Server, `db-init`, API e front-end. `db-init` aguarda o
SQL Server e executa `01-create-database-idempotent.sql` e
`02-procedures-views.sql` antes da API. Os volumes `sqlserver_data` e
`backup_data` persistem o banco e os arquivos de backup, respectivamente.
`BACKUP_PATH` usa `/app/backups` por padrão; se substituído, deve apontar para
um caminho absoluto dentro do container.

| Serviço | Endereço |
|---|---|
| Front-end | http://localhost:8080 |
| API | http://localhost:5050 |
| Swagger | http://localhost:5050/swagger, se habilitado pelo ambiente |
| Health da API | http://localhost:5050/api/healthcheck |
| SQL Server | `localhost:1433` |

Encerre com `docker compose down`. Para apagar deliberadamente os dados do
banco: `docker compose down --volumes`.

## Execução local

Requisitos: .NET SDK 10, Node.js/npm e SQL Server. Execute os scripts SQL
idempotentes listados acima antes de iniciar a API.

`Program.cs` monta a connection string com `DB_SERVER`, `DB_NAME`, `DB_USER` e
`DB_PASSWORD`. `DB_NAME` assume `DB_RESTAURANTE` quando ausente. `EnvLoader`
procura `.env` no diretório de trabalho atual; portanto, ao executar a API a
partir da pasta `back-end`, configure as variáveis no processo ou use um
`back-end/.env` local. O `.env` da raiz é lido automaticamente pelo Compose.
Não versione arquivos `.env`.

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

O Vite usa a porta 8080. O cliente HTTP forma a URL como
`<protocolo-da-página>://<host-do-navegador>:5050/api`; não lê `VITE_API_URL`.

## Swagger

O documento interno continua chamado `v1` e a URL é
`/swagger/v1/swagger.json`. A versão exibida é `2.0`, com título
`Systemic API - PIM IV`. A interface Swagger é configurada para o ambiente
Development. O Compose define `ASPNETCORE_ENVIRONMENT=Production`, por isso o
Swagger não fica disponível no container padrão; `dotnet run` local usa o
ambiente Development do perfil de execução.

## Autenticação, senha e bloqueio

### Login por email

`POST /api/autenticacao/login`, sem autenticação. Corpo JSON:

```json
{ "email": "usuario@example.com", "password": "senha" }
```

No sucesso, a API emite o JWT no cookie `systemic_auth` (`HttpOnly` e
`SameSite=Lax`). `Secure` é sempre definido fora de Development; em Development
também é definido quando a requisição usa HTTPS. O envelope JSON
contém somente dados não sensíveis do usuário, sem o token.

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
Antes do login, a aplicação obtém um request token em
`GET /api/autenticacao/csrf` (o cookie antiforgery é HttpOnly) e envia o token
no header `X-CSRF-TOKEN` em login e em toda requisição mutável (`POST`, `PUT`,
`PATCH` ou `DELETE`). A API valida esses tokens por um filtro global.
`POST /api/autenticacao/logout` também requer o header e apaga o cookie de
autenticação.

Depois do login, a aplicação renova o token CSRF antes de novas operações
mutáveis. Na inicialização, `GET /api/autenticacao/validar` valida a sessão e
retorna id, nome e role das claims. `AuthContext` usa a role retornada pelo
servidor para as rotas protegidas; a role salva em `restaurant_user` não é
considerada fonte de autorização.

O CORS com credenciais permite as origens locais conhecidas em Development. Em
outros ambientes, configure `CORS_ALLOWED_ORIGINS` com uma lista separada por
vírgulas de origens confiáveis no `.env`; o Compose usa
`http://localhost:8080` como padrão para execução local. A configuração de
cookie pressupõe front-end e API no mesmo site; hospedagem em sites distintos
exige revisar SameSite, CORS e CSRF.
O Compose local serve HTTP, mas a API roda fora de Development e sempre marca o
cookie JWT como `Secure`; por isso, o acesso local direto por HTTP não pode
autenticar cookies. Em produção, termine TLS no proxy e envie
`X-Forwarded-Proto: https`. Configure `FORWARDED_HEADERS_KNOWN_PROXIES` com os
IPs confiáveis separados por vírgulas; somente esses proxies podem informar o
protocolo encaminhado. A API processa um salto de `X-Forwarded-For` e
`X-Forwarded-Proto` antes da autenticação. Em ambiente diferente de
Development, a inicialização termina com código 1 e mensagem explícita se
`JWT_SECRET_KEY` estiver ausente, tiver menos de 32 caracteres ou for um
placeholder conhecido.

O Nginx define CSP com conexão para a API na porta 5050 e WebSocket do
SignalR, e permite scripts, frames e recursos do VLibras. Também envia
`X-Content-Type-Options: nosniff`, `Referrer-Policy`,
`X-Frame-Options: DENY` e `Permissions-Policy`. O documento permite
acelerômetro e giroscópio para a origem do VLibras, mas o iframe externo não
delegou essas permissões na verificação do navegador; sensores do widget
permanecem não verificados.

Novos hashes usam PBKDF2-SHA-256, salt aleatório de 16 bytes e 600.000
iterações, armazenados no formato versionado
`pbkdf2-sha256$v1$<iterações>$<salt-base64>$<hash-base64>`. Hashes legados
Base64 (10.000 iterações, saída de 20 bytes) continuam válidos; após login
bem-sucedido por email ou CPF, são substituídos pelo formato atual. O JWT tem
validade padrão de 480 minutos, ajustável por `JWT_EXPIRATION_MINUTES` (ou
`Jwt:ExpirationMinutes`).

- Login por email e por CPF: após 5 falhas, bloqueio por 15 minutos. Os dois
  controllers usam `LoginLockoutPolicy` como fonte única desses limites.
- O estado adicional de tentativas do `AuthContext` existe apenas em memória
  no navegador; o bloqueio por email é controlado também pelo servidor.

O seed SQL contém contas com hashes PBKDF2 legados e nenhuma senha em texto
claro. Um login válido atualiza o hash para PBKDF2-SHA-256 versionado com
600.000 iterações. Credenciais de teste não são publicadas.

## Regras de acesso

`JWT` significa que o endpoint exige uma sessão autenticada; no navegador, ela
é enviada pelo cookie HttpOnly `systemic_auth`. O perfil é indicado em cada
linha: quando a linha informa somente `JWT`, a API valida o token sem exigir
uma role específica. `Público` significa que o controller não exige
autenticação. Todas as requisições mutáveis, inclusive login e logout, exigem
`X-CSRF-TOKEN`. A matriz de páginas do front-end e as regras da API são
controles independentes.

O front-end usa React Router 7.18.5 pelo pacote `react-router`; `react-router-dom`
não está instalado. `ProtectedRoute` aguarda a validação do perfil no servidor
antes de renderizar uma rota protegida.

| Perfil do front-end | Páginas permitidas |
|---|---|
| `employee` | `/orders`, `/tabs`, `/reservations`, `/accessibility` |
| `admin` | Todas as páginas protegidas |
| `owner` | Todas as páginas protegidas |

Na API, `employee`, `admin` e `owner` podem executar as operações operacionais
de pedidos, comandas e reservas. `admin` e `owner` podem gerenciar produtos,
mesas, clientes, formas de pagamento, faturamento, logs, funcionários e
backups; as leituras de produtos, mesas e formas de pagamento também aceitam
`employee`. A criação ou promoção de outro `owner` exige que o ator também seja
`owner`. A tabela abaixo registra as regras efetivas de cada endpoint.

## Tabela completa de endpoints

A tabela registra as 69 ações HTTP expostas pelos 13 controllers.

Os nomes JSON são camelCase. `Envelope` representa `{sucesso, mensagem,
dados, codigoErro}`. Nem todos os endpoints usam esse envelope: as respostas
brutas e variações observadas estão indicadas abaixo. Os códigos de erro e
mensagens variam conforme a validação do controller.

| Método e rota | Autenticação / perfil | Corpo ou parâmetros | Resposta de sucesso |
|---|---|---|---|
| `GET /api/autenticacao/csrf` | Público | — | JSON `{requestToken}` e cookie antiforgery HttpOnly |
| `POST /api/autenticacao/login` | Público; requer CSRF | JSON `{email, password}` | Envelope; `dados` contém id, `nomeUsuario`, `role`; JWT em cookie HttpOnly |
| `GET /api/autenticacao/validar` | JWT | — | Envelope com `dados.id`, `dados.nome` e `dados.role`, lidos das claims |
| `POST /api/autenticacao/logout` | Público; requer CSRF | Header `X-CSRF-TOKEN` | Envelope; expira o cookie JWT |
| `POST /api/backup/gerar` | JWT; `admin` ou `owner` | — | JSON `{sucesso,mensagem,dados}` com nome, caminho e tamanho do ZIP |
| `GET /api/backup/baixar/{nomeArquivo}` | JWT; `admin` ou `owner` | `nomeArquivo` na rota | Arquivo ZIP (`application/octet-stream`) |
| `GET /api/backup/listar` | JWT; `admin` ou `owner` | — | JSON `{sucesso,dados}` com lista de backups |
| `POST /api/backup/restore` | JWT; `admin` ou `owner` | `multipart/form-data`, campo `Arquivo` com ZIP | Envelope de sucesso ou erro |
| `GET /api/cliente` | JWT; `admin` ou `owner` | — | Envelope; `dados` é lista de clientes |
| `GET /api/cliente/{id}` | JWT; `admin` ou `owner` | `id` na rota | Envelope; `dados` é cliente |
| `POST /api/cliente` | JWT; `admin` ou `owner` | JSON `Cliente`: `{nomeCliente, telefoneCliente, feedback}` | 201; Envelope com cliente |
| `PUT /api/cliente/{id}` | JWT; `admin` ou `owner` | `id` e JSON `Cliente` | Envelope com cliente atualizado |
| `DELETE /api/cliente/{id}` | JWT; `admin` ou `owner` | `id` na rota | Envelope com mensagem |
| `GET /api/comanda` | JWT; `employee`, `admin` ou `owner` | — | JSON `{sucesso,dados}` com comandas |
| `GET /api/comanda/{id}` | JWT; `employee`, `admin` ou `owner` | `id` na rota | JSON `{sucesso,dados}` com comanda |
| `GET /api/comanda/abertas/todas` | JWT; `employee`, `admin` ou `owner` | — | Envelope; `dados` contém comandas abertas e itens ativos |
| `GET /api/comanda/mesa/{tableNumber}` | JWT; `employee`, `admin` ou `owner` | Número da mesa na rota | Lista JSON de comandas |
| `PUT /api/comanda/{id}` | JWT; `employee`, `admin` ou `owner` | `id` e JSON `Comanda` (campos usados: `idCliente`, `idMesa`) | Entidade `Comanda` |
| `POST /api/comanda` | JWT; `employee`, `admin` ou `owner` | JSON `Comanda`; inclui `idMesa`, `idCliente` | 201; entidade criada |
| `POST /api/comanda/{id}/itens` | JWT; `employee`, `admin` ou `owner` | JSON `ItemComanda`: `idProduto`, `qtdProduto`, `precoUnitarioPago`; o servidor define o status inicial | JSON `{message,itemId,novoTotal}` |
| `PUT /api/comanda/{id}/pagar` | JWT; `employee`, `admin` ou `owner` | JSON `{idFormaPagamento,troco}`; o funcionário vem da claim `NameIdentifier` | Envelope com comanda paga |
| `PUT /api/comanda/{id}/fechar` | JWT; `employee`, `admin` ou `owner` | `id` na rota; sem corpo | Envelope com comanda fechada |
| `DELETE /api/comanda/{id}/itens/{itemId}` | JWT; `employee`, `admin` ou `owner` | IDs na rota | JSON `{message,novoTotal}` |
| `PUT /api/comanda/{id}/inadimplente` | JWT; `employee`, `admin` ou `owner` | `id` na rota; sem corpo | Envelope com resultado |
| `DELETE /api/comanda/{id}` | JWT; `employee`, `admin` ou `owner` | `id` na rota | JSON `{message}` |
| `GET /api/faturamento` | JWT; `admin` ou `owner` | — | Envelope com resumo do dia: datas, receita, despesas e lucro |
| `GET /api/faturamento/relatorio` | JWT; `admin` ou `owner` | Query `dataInicio`, `dataFim` | JSON `{dataInicio,dataFim,receita,despesas,lucro}` |
| `GET /api/faturamento/produtos-mais-vendidos` | JWT; `admin` ou `owner` | — | Lista JSON `{idProduto,nomeProduto,quantidadeVendida}` |
| `GET /api/faturamento/receita-por-forma` | JWT; `admin` ou `owner` | Query `dataInicio`, `dataFim` | Lista JSON `{formaPagemento,total}` |
| `GET /api/faturamento/despesa-por-categoria` | JWT; `admin` ou `owner` | Query `dataInicio`, `dataFim` | Lista JSON `{categoria,total}` |
| `POST /api/faturamento/despesa` | JWT; `admin` ou `owner` | JSON `Despesa` (descrição, valor, categoria, forma de pagamento) | 201; entidade `Despesa` |
| `GET /api/faturamento/despesas` | JWT; `admin` ou `owner` | Query `dataInicio`, `dataFim` | Lista JSON de despesas com forma de pagamento |
| `GET /api/formapagamento` | JWT; `employee`, `admin` ou `owner` | — | JSON `{sucesso,dados}` com formas de pagamento |
| `GET /api/formapagamento/{id}` | JWT; `employee`, `admin` ou `owner` | `id` na rota | JSON `{sucesso,dados}` |
| `POST /api/formapagamento` | JWT; `admin` ou `owner` | JSON `{nomeFormaPagamento}` | 201; entidade criada |
| `PUT /api/formapagamento/{id}` | JWT; `admin` ou `owner` | `id` e JSON `FormaPagamento` | Entidade atualizada |
| `DELETE /api/formapagamento/{id}` | JWT; `admin` ou `owner` | `id` na rota | JSON `{message}` |
| `POST /api/funcionario/login` | Público; requer CSRF | JSON `{cpfFuncionario, senha}` | JSON `{idFuncionario,nomeFuncionario}`; JWT em cookie HttpOnly |
| `GET /api/funcionario` | JWT; `admin` ou `owner` | — | Envelope; `dados` é lista de funcionários sem senha |
| `GET /api/funcionario/{id}` | JWT; `admin` ou `owner` | `id` na rota | Envelope; `dados` é funcionário sem senha |
| `POST /api/funcionario` | JWT; `admin` ou `owner` | JSON `{nomeFuncionario,cpfFuncionario,emailFuncionario,cargoFuncionario,role,telefoneFuncionario,senha}` | 201; Envelope com funcionário sem senha |
| `PUT /api/funcionario/{id}` | JWT; `admin` ou `owner` | `id` e JSON do DTO de funcionário; senha vazia não altera senha | Envelope com funcionário sem senha |
| `DELETE /api/funcionario/{id}` | JWT; `admin` ou `owner` | `id` na rota | Envelope; desativa funcionário |
| `GET /api/healthcheck` | Público | — | Envelope com status, timestamp e versão `2.0` |
| `GET /api/healthcheck/database` | Público | — | Envelope de status; em erro retorna mensagem genérica e registra detalhes no log |
| `GET /api/healthcheck/info` | Público | — | Envelope com nome, versão `2.0` e URL base `http://localhost:5050` |
| `GET /api/log/sistema` | JWT; `admin` ou `owner` | Query opcional `pagina` (padrão 1), `tamanho` (50), `filtro` | JSON `{sucesso,total,pagina,dados}` |
| `POST /api/log/registrar` | JWT; `admin` ou `owner` | JSON `{tipoLog,descricaoLog,usuarioLog,dadoAnterior,dadoNovo}` | Envelope com o ID criado |
| `GET /api/log/comanda/{idComanda}` | JWT; `admin` ou `owner` | `idComanda` na rota | JSON `{sucesso,dados}` com logs |
| `GET /api/mesa` | JWT; `employee`, `admin` ou `owner` | — | Envelope; `dados` é lista de mesas |
| `GET /api/mesa/{id}` | JWT; `employee`, `admin` ou `owner` | `id` na rota | Envelope; `dados` é mesa |
| `POST /api/mesa` | JWT; `admin` ou `owner` | JSON `Mesa`: `numeroMesa`, `capacidadeMesa`, opcional `statusMesa` | 201; Envelope com mesa |
| `PUT /api/mesa/{id}` | JWT; `admin` ou `owner` | `id` e JSON `Mesa` | Entidade `Mesa` atualizada |
| `DELETE /api/mesa/{id}` | JWT; `admin` ou `owner` | `id` na rota | JSON `{message}` |
| `GET /api/pedidos` | JWT; `employee`, `admin` ou `owner` | — | Envelope; `dados` contém comandas e itens |
| `GET /api/pedidos/{id}` | JWT; `employee`, `admin` ou `owner` | `id` na rota | Envelope; `dados` contém pedido |
| `POST /api/pedidos` | JWT; `employee`, `admin` ou `owner` | JSON `{idMesa,itens:[{idProduto,qtdProduto,precoUnitarioPago}]}` no fluxo com comanda aberta; o DTO também aceita `idCliente` para criar sem comanda | 201; Envelope com pedido |
| `PUT /api/pedidos/{id}` | JWT; `employee`, `admin` ou `owner` | `id` e o mesmo DTO de pedido | Envelope com pedido atualizado |
| `PUT /api/pedidos/{id}/status` | JWT; `employee`, `admin` ou `owner` | JSON `{status}` | Envelope com pedido atualizado |
| `DELETE /api/pedidos/{id}` | JWT; `employee`, `admin` ou `owner` | `id` na rota | Envelope com resultado |
| `GET /api/produto` | JWT; `employee`, `admin` ou `owner` | — | Envelope; `dados` é lista de produtos |
| `GET /api/produto/{id}` | JWT; `employee`, `admin` ou `owner` | `id` na rota | Envelope; `dados` é produto |
| `POST /api/produto` | JWT; `admin` ou `owner` | JSON `ProdutoDto`: `nomeProduto`, `descricaoProduto`, `precoProduto`, `qtdEstoque`, `estoqueMinimo`, `statusProduto`, `categoria` ou `categoriaProduto` | 201; Envelope com produto |
| `PUT /api/produto/{id}` | JWT; `admin` ou `owner` | `id` e JSON `ProdutoDto` | Envelope com produto atualizado |
| `DELETE /api/produto/{id}` | JWT; `admin` ou `owner` | `id` na rota | Envelope com mensagem |
| `PUT /api/produto/{id}/ajustar-estoque` | JWT; `admin` ou `owner` | JSON `{tipo:"ADICIONAR"|"REMOVER",quantidade,motivo}` | Envelope com quantidades e produto |
| `GET /api/reserva` | JWT; `employee`, `admin` ou `owner` | — | Envelope; `dados` é lista de reservas |
| `POST /api/reserva` | JWT; `employee`, `admin` ou `owner` | JSON `{nomeCliente,numeroMesa,dataReserva}` | Envelope com reserva |
| `DELETE /api/reserva/{id}` | JWT; `employee`, `admin` ou `owner` | `id` na rota | Envelope com resultado |

## Banco de dados e scripts

Banco: `DB_RESTAURANTE`. O script de schema define 12 tabelas:
`FUNCIONARIO`, `CLIENTE`, `MESA`, `FORMA_PAGAMENTO`, `PRODUTO`, `RESERVA`,
`COMANDA`, `ITEM_COMANDA`, `DETALHE_PAGAMENTO`, `DESPESAS`, `LOG_COMANDA` e
`LOG_SISTEMA`.

`01-create-database-idempotent.sql` cria/atualiza as tabelas, cinco índices,
três triggers e dados básicos. `02-procedures-views.sql` define três
procedures (`sp_fechar_comanda`, `sp_relatorio_faturamento`,
`sp_ajustar_estoque`) e duas views (`vw_comandas_abertas`,
`vw_produtos_mais_vendidos`). `init-database.sql` é um script SQL legado
separado; o Compose não o executa. Os quatro usuários encontrados nesse script
e no script idempotente têm hashes no banco, não senhas verificáveis em texto
claro. O índice `IDX_LOG_SISTEMA_DATA` também consta na migração histórica
`migration-logs-sistema.sql`; sua criação idempotente está incluída no script
executado pelo Compose.

`CriarPedidoDTO` contém `idMesa`, `idCliente` e `itens`. No fluxo da interface,
`RestaurantContext` envia a `POST /api/pedidos` apenas `idMesa` e `itens`, sem
`idCliente`; a tela exige uma comanda aberta e o servidor acrescenta os itens a
essa comanda. Se a API receber o pedido sem comanda aberta, valida o `idCliente`
do DTO: cliente inexistente resulta em HTTP 400 (`CLIENTE_INVALIDO`), e cliente
válido permite criar uma nova comanda. O endpoint separado `POST /api/comanda`
tem sua própria regra para resolver o cliente padrão.

## Backup e restauração

`BACKUP_PATH` pode ser definido como variável de ambiente ou configuração. Sem
ela, a API grava em `backups` sob `AppContext.BaseDirectory`. A geração inclui
SQL, JSON de logs e configuração, compactados em ZIP. A restauração aceita um
ZIP com exatamente um script `.sql`, aplica limites de tamanho e valida nomes
de entrada, cria primeiro um backup de segurança e executa o SQL em transação.
No Docker Compose, `BACKUP_PATH` aponta para `/app/backups`, persistido no
volume nomeado `backup_data`; uma substituição deve ser um caminho absoluto
dentro do container.

## SignalR

O front-end consome o hub autenticado `/hubs/cozinha`; eventos de pedido e
comanda são usados para atualizar a interface. O `RestaurantContext` mantém
sincronização periódica de contingência quando SignalR está habilitado, mas
desconectado.

## CI e testes

Em push e pull request, `.github/workflows/ci.yml` executa build e testes .NET,
`npm ci`, lint, `npm test -- --run` e build do front-end, nesta ordem. O YAML e
a ordem das etapas foram validados localmente; a execução remota no GitHub
Actions não foi observada. Na validação atual, 46 testes .NET e 14 testes
Vitest em 2 arquivos passaram. A cobertura V8 registrou 45,03% de statements,
27,10% de branches, 32,47% de funções e 46,75% de linhas. `npm audit` reportou
zero vulnerabilidades; o lint terminou sem erros e com 7 avisos. Para rodar os
testes do front-end:

```sh
cd front-end
npm test -- --run
npm test -- --run --coverage
```

## Limitações conhecidas verificadas

- Não existe aplicativo mobile nem configuração de deploy em nuvem.
- Não há senhas de teste verificadas/publicáveis para os usuários seed.
- A interface controla a navegação por perfil, e a API aplica autorização
  independentemente do front-end; consulte a matriz de acesso nesta tabela.
- `/api/healthcheck/database` continua público; erros retornam mensagem
  genérica, enquanto detalhes são registrados no log do servidor.
- O `db-init` foi executado duas vezes sem erro. O catálogo SQL Server confirmou
  12 tabelas, 3 triggers, 3 procedures, 2 views e 5 índices, incluindo
  `IDX_LOG_SISTEMA_DATA`. Os testes em transação confirmaram que abrir comanda
  ocupa a mesa, mudanças nos itens recalculam o total, pagamento fecha a
  comanda e libera a mesa, `sp_ajustar_estoque` altera o estoque, e
  `sp_relatorio_faturamento`/as duas views refletem os dados de exemplo.
- Um backup real foi gerado via API, um registro foi removido e restaurado com
  HTTP 200; a consulta confirmou o retorno do registro. O backup de segurança
  persistiu em `/app/backups` após reiniciar a API. Um ZIP com entrada `../` foi
  rejeitado com HTTP 400. Employee recebeu 403 nas operações de funcionário;
  admin não conseguiu criar ou promover owner, enquanto owner conseguiu.
- Cinco falhas reais bloquearam tanto login por email quanto por CPF por
  15 minutos; login válido resetou as tentativas. Com SQL Server parado,
  `/api/healthcheck/database` respondeu HTTP 503 com mensagem genérica e sem
  detalhes internos.
- O player VLibras depende de CDN externo: o painel abriu, mas o engine falhou
  com `ERR_CONNECTION_CLOSED`; não houve violação CSP observada. O carregamento
  completo permanece não confirmado.
- O lint passa sem erros; permanecem 7 avisos de Fast Refresh. A cobertura
  front-end ainda é parcial (45,03% de statements e 46,75% de linhas).
- O JWT usa cookie `HttpOnly`; os dados não sensíveis do perfil continuam em
  `localStorage`, mas a role é validada pelo servidor em cada inicialização.
  O cliente obtém e envia o token CSRF nos métodos mutáveis.
