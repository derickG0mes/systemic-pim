# Arquitetura - Systemic - PIM IV

O sistema é composto por uma API ASP.NET Core .NET 10, um cliente React 18 com
TypeScript/Vite e SQL Server. O fluxo principal é navegador -> API REST
autenticada por JWT -> Entity Framework Core -> SQL Server. Para atualizações
da cozinha, a interface também se conecta ao hub SignalR.

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

Há 13 controllers e 67 ações HTTP. As rotas, métodos, regras de autenticação,
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
`vw_produtos_mais_vendidos`. O script de schema cria os índices
`IX_FUNCIONARIO_EMAIL`, `IX_ITEM_COMANDA_ID_COMANDA`,
`IX_COMANDA_STATUS_COMANDA` e `IX_DETALHE_PAGAMENTO_DATA_PAGAMENTO`.
`migration-logs-sistema.sql` também declara o índice `IDX_LOG_SISTEMA_DATA`.
O resultado da execução dos scripts, idempotência e verificação dos objetos no
SQL Server está pendente de registro: [PREENCHER: resultado da validação].

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
disponível em `POST /api/funcionario/login`. Os dois verificam hashes PBKDF2
com SHA-256. A emissão do JWT usa validade padrão de 480 minutos. Os dois
controllers usam a política única `LoginLockoutPolicy`: bloqueio após 5
tentativas por 15 minutos. O `AuthContext` também mantém um bloqueio temporário
em memória no navegador; consulte [CONFIGURACAO.md](CONFIGURACAO.md).

O JWT é armazenado em cookie `HttpOnly`, `SameSite=Lax` e `Secure` em conexões
HTTPS; o JavaScript não consegue ler o token. O navegador mantém somente
dados não sensíveis do usuário em `localStorage`. Requisições mutáveis usam
token antiforgery no header `X-CSRF-TOKEN`; CORS aceita credenciais somente de
origens configuradas. SignalR também autentica pelo cookie, sem token na query
string. O front-end e a API devem ser implantados no mesmo site para que as
políticas SameSite funcionem como esperado. O log de auditoria do
`RestaurantContext` é mantido em uma lista em memória, não persistida no banco
nem em `localStorage`.

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

## Limitações conhecidas

- Não há aplicativo mobile nem infraestrutura/deploy em nuvem configurados.
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
- A validação operacional no SQL Server está pendente de registro:
  [PREENCHER: resultado da validação]. Os pontos a preencher estão no fim de
  [RELATORIO_VERIFICACAO.md](RELATORIO_VERIFICACAO.md).
- O cookie de autenticação é `HttpOnly`, mas uma implantação em sites distintos
  exige reavaliar `SameSite`, CORS e proteção CSRF antes de ser habilitada.
