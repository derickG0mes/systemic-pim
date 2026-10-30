# Arquitetura - Systemic - PIM IV

O sistema é composto por uma API ASP.NET Core .NET 10, um cliente React 18 com
TypeScript/Vite, React Router 7 (`react-router`) e SQL Server. O fluxo principal
é navegador -> API REST autenticada por JWT -> Entity Framework Core -> SQL
Server. Para atualizações da cozinha, a interface também se conecta ao hub
SignalR.

## Estrutura real

```text
back-end/
  Controllers/             13 controllers HTTP
  Controllers/Backup/      DTO do formulário de restauração
  Data/                    AppDbContext
  DTOs/                     DTOs de autenticação, pedidos e respostas
  Helpers/                  EnvLoader e TimeZoneHelper
  Hubs/                     CozinhaHub
  Models/                   Entidades persistidas
  Scripts/                  SQL de schema, seed e objetos do banco
  Services/
    Backup/                 Validação e restauração de ZIP
    BackupService.cs        Geração/listagem de backups
    JwtService.cs           Emissão e gerenciamento do cookie JWT
    PasswordHashService.cs  Hash e verificação de senha
  Program.cs                Configuração da API

front-end/src/
  components/               Layout, componentes compartilhados e UI
  contexts/                 AuthContext, RestaurantContext e acessibilidade
  hooks/                    Hooks de interface e useSignalR
  lib/                      RBAC, auditoria em memória e utilitários
  pages/                    Telas do sistema
  services/api.ts           Chamadas HTTP com fetch
  test/                     Testes Vitest e configuração de teste
  App.tsx                   Rotas e providers

docs/                        Guias, exemplo de integração e relatório
tests/                       Testes automatizados .NET
```

## API e persistência

Há 13 controllers e 69 ações HTTP. As rotas, métodos, regras de autenticação,
corpos e respostas estão listados em [CONFIGURACAO.md](CONFIGURACAO.md).
`AppDbContext` mapeia as entidades para o SQL Server. Os nomes físicos das
tabelas e colunas são os definidos nos scripts SQL; nomes de namespaces e
projetos não são nomes de tabela.

O banco `DB_RESTAURANTE` tem 12 tabelas:

`FUNCIONARIO`, `CLIENTE`, `MESA`, `FORMA_PAGAMENTO`, `PRODUTO`, `RESERVA`,
`COMANDA`, `ITEM_COMANDA`, `DETALHE_PAGAMENTO`, `DESPESAS`, `LOG_COMANDA` e
`LOG_SISTEMA`.

O script idempotente declara três triggers:

- `trg_abrir_comanda`: marca a mesa como ocupada ao inserir comanda aberta.
- `trg_atualizar_valor_total`: recalcula o total após mudanças em itens.
- `trg_fechar_comanda`: fecha a comanda e libera a mesa após inserir pagamento.

`02-procedures-views.sql` declara `sp_fechar_comanda`,
`sp_relatorio_faturamento`, `sp_ajustar_estoque`, `vw_comandas_abertas` e
`vw_produtos_mais_vendidos`. O script de schema cria cinco índices:
`IX_FUNCIONARIO_EMAIL`, `IX_ITEM_COMANDA_ID_COMANDA`,
`IX_COMANDA_STATUS_COMANDA`, `IX_DETALHE_PAGAMENTO_DATA_PAGAMENTO` e
`IDX_LOG_SISTEMA_DATA`, cuja definição histórica consta em
`migration-logs-sistema.sql`. O `db-init` executou duas vezes sem erro. O
catálogo confirmou as 12 tabelas, três triggers, três procedures, duas views e
cinco índices, incluindo `IDX_LOG_SISTEMA_DATA`.

Os efeitos também foram exercitados em transação revertida: abrir comanda
ocupou a mesa; inserir/alterar/remover itens recalculou o total; pagamento
fechou a comanda e liberou a mesa. `sp_ajustar_estoque` alterou a quantidade de
10 para 13, `sp_relatorio_faturamento` refletiu a receita da comanda e as views
mostraram a comanda aberta e os produtos vendidos conforme o estado antes e
depois do fechamento. A transação foi revertida e não deixou registros de
teste.

### Criação de pedidos

`CriarPedidoDTO` contém `idMesa`, `idCliente` e `itens`. A interface monta o
payload com `idMesa` e `itens`, sem `idCliente`, pois a tela só permite enviar
o pedido quando já existe uma comanda aberta para a mesa. Nesse caso, a API
adiciona os itens à comanda existente. Se não houver comanda aberta, a API
valida o `idCliente` recebido no DTO; se o cliente não existir, retorna erro
`CLIENTE_INVALIDO`, e, se existir, cria uma nova comanda. Esse fluxo não é o
endpoint de abertura de comanda (`POST /api/comanda`), que tem regra própria
para o cliente padrão.

## Front-end: páginas, rotas e permissões

As páginas existentes são `LoginPage`, `DashboardPage`, `OrdersPage`,
`TabsPage`, `InventoryPage`, `ReservationsPage`, `ReportsPage`, `UsersPage`,
`AuditPage`, `BackupPage`, `AccessibilityPage` e `NotFound`.

| Rota | Página | employee | admin | owner |
|---|---|---:|---:|---:|
| `/login` | LoginPage | Pública | Pública | Pública |
| `/dashboard` | DashboardPage | Não | Sim | Sim |
| `/orders` | OrdersPage | Sim | Sim | Sim |
| `/tabs` | TabsPage | Sim | Sim | Sim |
| `/inventory` | InventoryPage | Não | Sim | Sim |
| `/reservations` | ReservationsPage | Sim | Sim | Sim |
| `/reports` | ReportsPage | Não | Sim | Sim |
| `/users` | UsersPage | Não | Sim | Sim |
| `/audit` | AuditPage | Não | Sim | Sim |
| `/backup` | BackupPage | Não | Sim | Sim |
| `/accessibility` | AccessibilityPage | Sim | Sim | Sim |

`/` redireciona para `/dashboard` quando permitido ou `/orders`; rotas
desconhecidas exibem `NotFound`. A API aplica autorização por perfil,
independentemente da navegação: `employee` acessa operações de pedidos,
comandas e reservas; `admin` e `owner` também acessam gestão de produtos, mesas,
clientes e formas de pagamento, faturamento, logs, funcionários e backups.
Leituras de produtos, mesas e formas de pagamento permanecem disponíveis aos
três perfis para suportar as operações de atendimento.

## Autenticação, hash e estado

O login por email envia `email` e `password` a
`POST /api/autenticacao/login`; o endpoint de funcionário por CPF continua
disponível em `POST /api/funcionario/login`. Os dois verificam hashes
PBKDF2-SHA-256. Hashes novos usam salt aleatório de 16 bytes e 600.000
iterações, no formato versionado `pbkdf2-sha256$v1$...`. Hashes legados
Base64 (10.000 iterações, saída de 20 bytes) continuam válidos e são
substituídos pelo formato atual após login bem-sucedido. A emissão do JWT usa
validade padrão de 480 minutos. Os dois
controllers usam a política única `LoginLockoutPolicy`: bloqueio após 5
tentativas por 15 minutos. O `AuthContext` também mantém um bloqueio temporário
em memória no navegador; consulte [CONFIGURACAO.md](CONFIGURACAO.md).

O JWT é armazenado em cookie `systemic_auth`, `HttpOnly` e `SameSite=Lax`.
`Secure` é sempre definido fora de Development, mesmo quando a requisição
chega por HTTP ao proxy; em Development depende também de HTTPS. O navegador
mantém somente dados auxiliares não sensíveis do perfil em `localStorage`.
Na inicialização, `AuthContext` busca `GET /api/autenticacao/validar` e usa a
role das claims retornada pelo servidor como fonte de verdade para
`ProtectedRoute` e RBAC. Requisições mutáveis usam token antiforgery no header
`X-CSRF-TOKEN`; CORS aceita credenciais somente de origens configuradas.
SignalR autentica pelo cookie. O front-end e a API devem ser implantados no
mesmo site para que SameSite funcione como esperado. O log de auditoria do
`RestaurantContext` é mantido em uma lista em memória, não persistida no banco
nem em `localStorage`.

`Program.cs` processa `X-Forwarded-For` e `X-Forwarded-Proto` antes do
middleware de autenticação, com um salto de encaminhamento. Configure
`FORWARDED_HEADERS_KNOWN_PROXIES` com os IPs confiáveis do proxy TLS.
`front-end/nginx.conf` define CSP, `X-Content-Type-Options`,
`Referrer-Policy`, `X-Frame-Options` e `Permissions-Policy`. A CSP permite
conexão à API e ao WebSocket SignalR, além dos recursos do VLibras. A delegação
de acelerômetro/giroscópio ao iframe externo do widget não foi comprovada e
permanece uma limitação do fornecedor/iframe.

## Atualização da cozinha

O front-end consome o hub autenticado `/hubs/cozinha` usando o `useSignalR` e
o `RestaurantContext`. O cliente tenta reconectar quando a conexão cai. O
contexto também mantém sincronização periódica como contingência quando o hub
está habilitado, mas desconectado.

## Backup

`BackupService` gera um ZIP com script SQL, logs e configuração, e permite
listar os arquivos. O diretório é configurável por `BACKUP_PATH`; o padrão é
`backups` dentro de `AppContext.BaseDirectory`. No Docker Compose,
`/app/backups` fica no volume nomeado persistente `backup_data`. A restauração recebe ZIP,
valida entradas e limites, gera um backup de segurança e executa o script em
transação.

## Validação automatizada

Na validação mais recente, `dotnet test tests/back-end.Tests.csproj` aprovou
46 testes e `npm test -- --run` aprovou 14 testes em 2 arquivos. O front-end
registrou 45,03% de statements e 46,75% de linhas com cobertura V8; o lint
terminou com zero erros e 7 avisos. A cobertura front-end permanece parcial.

## Limitações conhecidas

- Não há aplicativo mobile nem infraestrutura/deploy em nuvem configurados.
- O carregamento completo do player VLibras não foi confirmado: o painel abriu,
  mas o engine externo apresentou `ERR_CONNECTION_CLOSED` ao buscar o recurso
  Unity/CDN. Não foi observada violação CSP; sensores no iframe continuam
  sujeitos à delegação do fornecedor.
- O workflow de CI foi inspecionado e os testes locais passaram; a execução
  remota no GitHub Actions não foi observada.
- As credenciais dos usuários seed não são conhecidas: o SQL contém hashes,
  não senhas em texto claro verificáveis.
- A navegação também é controlada no front-end, mas a API aplica autorização
  por perfil de forma independente.
- `GET /api/autenticacao/validar` exige JWT e retorna id, nome e perfil das claims.
- Os endpoints de health usam metadados compartilhados com Swagger para
  versão `2.0` e URL base na porta `5050`; falhas de conexão não expõem detalhes
  da exceção na resposta.
- O log do fluxo de criação de pedido registra o mesmo payload enviado. O campo
  `idCliente` continua omitido pela interface; as diferenças entre o DTO e o
  fluxo sem comanda aberta estão descritas acima, sem alteração das regras de
  negócio.
- O cookie de autenticação é `HttpOnly`, mas uma implantação em sites distintos
  exige reavaliar `SameSite`, CORS e proteção CSRF antes de ser habilitada.
