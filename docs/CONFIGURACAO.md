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
placeholder e a API o rejeita fora do ambiente `Development`; as chaves JWT
antigas dos arquivos de exemplo também são bloqueadas. Não reutilize nem
versione a chave real.

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
`http://<host-do-navegador>:5050/api`; não lê `VITE_API_URL`.

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

O sucesso usa o envelope `{ "sucesso": true, "mensagem": "...", "dados": {
"token": "...", "nomeUsuario": "...", "role": "..." } }`.

### Login por CPF

`POST /api/funcionario/login`, sem autenticação. Corpo:

```json
{ "cpfFuncionario": "12345678901", "senha": "senha" }
```

O sucesso retorna `idFuncionario`, `nomeFuncionario` e `token` no corpo JSON.

As senhas são verificadas com PBKDF2, SHA-256, salt aleatório de 16 bytes,
10.000 iterações e saída derivada de 20 bytes. Não se usa bcrypt. O JWT tem
validade padrão de 480 minutos, ajustável por `JWT_EXPIRATION_MINUTES` (ou
`Jwt:ExpirationMinutes`).

- Login por email e por CPF: após 5 falhas, bloqueio por 15 minutos. Os dois
  controllers usam `LoginLockoutPolicy` como fonte única desses limites.
- O estado adicional de tentativas do `AuthContext` existe apenas em memória
  no navegador; o bloqueio por email é controlado também pelo servidor.

Não há credenciais de teste publicadas aqui: o seed SQL contém contas e hashes
PBKDF2, mas não uma senha em texto claro cuja correspondência com esses hashes
tenha sido confirmada.

## Regras de acesso

`JWT` significa que o endpoint exige autenticação. A menos que indicado,
nenhum perfil específico é exigido pela API. `Público` significa que o
controller não exige autenticação. Isso é diferente da matriz de permissões de
página, que é aplicada no front-end.

| Perfil do front-end | Páginas permitidas |
|---|---|
| `employee` | `/orders`, `/tabs`, `/reservations`, `/accessibility` |
| `admin` | Todas as páginas protegidas |
| `owner` | Todas as páginas protegidas |

Na API, criar/atualizar/inativar funcionários e operações de backup exigem
`admin` ou `owner`. A criação ou promoção de outro `owner` exige que o ator
também seja `owner`. As demais restrições por perfil não são aplicadas de forma
geral nos controllers.

## Tabela completa de endpoints

Os nomes JSON são camelCase. `Envelope` representa `{sucesso, mensagem,
dados, codigoErro}`. Nem todos os endpoints usam esse envelope: as respostas
brutas e variações observadas estão indicadas abaixo. Os códigos de erro e
mensagens variam conforme a validação do controller.

| Método e rota | Autenticação / perfil | Corpo ou parâmetros | Resposta de sucesso |
|---|---|---|---|
| `POST /api/autenticacao/login` | Público | JSON `{email, password}` | Envelope; `dados` contém `token`, `nomeUsuario`, `role` |
| `GET /api/autenticacao/validar` | JWT | — | Envelope com `dados.id`, `dados.nome` e `dados.role`, lidos das claims |
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
| `PUT /api/comanda/{id}/pagar` | JWT; `employee`, `admin` ou `owner` | JSON `{idFormaPagamento,idFuncionario,troco}` | Envelope com comanda paga |
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
| `POST /api/funcionario/login` | Público | JSON `{cpfFuncionario, senha}` | JSON `{idFuncionario,nomeFuncionario,token}` |
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
| `POST /api/pedidos` | JWT; `employee`, `admin` ou `owner` | JSON `{idMesa,idCliente,itens:[{idProduto,qtdProduto,precoUnitarioPago}]}` | 201; Envelope com pedido |
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

`01-create-database-idempotent.sql` cria/atualiza as tabelas, quatro índices,
três triggers e dados básicos. `02-procedures-views.sql` define três
procedures (`sp_fechar_comanda`, `sp_relatorio_faturamento`,
`sp_ajustar_estoque`) e duas views (`vw_comandas_abertas`,
`vw_produtos_mais_vendidos`). `init-database.sql` é um script SQL legado
separado; o Compose não o executa. Os quatro usuários encontrados nesse script
e no script idempotente têm hashes no banco, não senhas verificáveis em texto
claro. `migration-logs-sistema.sql` declara também o índice
`IDX_LOG_SISTEMA_DATA`.

No fluxo de pedidos da interface, o log de depuração registra o mesmo objeto
enviado a `POST /api/pedidos`. O payload atual inclui `idMesa` e `itens`, sem
`idCliente`. A tela exige uma comanda aberta antes de permitir o envio; sem uma
comanda aberta, a API valida o cliente indicado no DTO.

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

Em push e pull request, `.github/workflows/ci.yml` executa `dotnet build`,
`dotnet test`, `npm ci`, `npm run lint` e `npm run build`. O workflow não
executa `npm test`. Para rodar os testes do front-end localmente:

```sh
cd front-end
npm test -- --run
```

## Limitações conhecidas verificadas

- Não existe aplicativo mobile nem configuração de deploy em nuvem.
- Não há senhas de teste verificadas/publicáveis para os usuários seed.
- A interface controla a navegação por perfil, e a API aplica autorização
  independentemente do front-end; consulte a matriz de acesso nesta tabela.
- `/api/healthcheck/database` continua público; erros retornam mensagem
  genérica, enquanto detalhes são registrados no log do servidor.
- A execução real do schema e dos triggers não foi validada: o SQL Server não
  estava acessível no ambiente de verificação.
- O lint passa sem erros; permanecem 7 avisos de Fast Refresh. O `npm audit fix`
  seguro reduziu os avisos de vulnerabilidade, mas 7 ainda exigem upgrades
  incompatíveis de versão principal em Vite, React Router e Vitest.
