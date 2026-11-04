# Arquitetura - Systemic PIM

Sistema de gerenciamento de restaurante composto por uma interface web, uma API
REST e SQL Server. A comunicação principal é navegador -> API ASP.NET Core ->
Entity Framework Core -> SQL Server. O navegador também usa SignalR para
atualizações da cozinha.

## Tecnologias e componentes

| Componente | Tecnologia |
|---|---|
| Interface | React 18, TypeScript, Vite, React Router 7 |
| API | ASP.NET Core/.NET 10, Entity Framework Core |
| Banco de dados | SQL Server 2022 |
| Atualizações em tempo real | SignalR |
| Execução em contêineres | Docker Compose e Nginx |
| Aplicação web instalável | PWA com service worker |

O Compose da raiz coordena SQL Server, inicialização do banco, API e interface.
O `db-init` executa os scripts SQL antes da API. O front-end é servido pelo
Nginx e acessa a API na porta 5050.

## Organização do código

```text
back-end/
  Controllers/       Endpoints HTTP por domínio
  Data/              AppDbContext e mapeamentos do EF Core
  DTOs/              Modelos de entrada e saída
  Helpers/           Configuração de ambiente e fuso horário
  Hubs/              Hub SignalR da cozinha
  Models/            Entidades persistidas
  Scripts/           Schema, dados e objetos SQL
  Services/           Regras de negócio, autenticação e backup
  Program.cs          Inicialização e configuração HTTP

front-end/src/
  components/        Componentes compartilhados e layout
  contexts/          Autenticação, dados do restaurante e acessibilidade
  hooks/             Hooks de interface, incluindo SignalR
  lib/               RBAC e utilitários
  pages/             Telas da aplicação
  services/          Comunicação HTTP com a API
  App.tsx            Rotas e providers

tests/                Testes automatizados .NET
docs/                 Guias e exemplo de integração
```

## Módulos da interface

| Rota | Área | Acesso |
|---|---|---|
| `/login` | Autenticação | Pública |
| `/dashboard` | Visão geral | `admin`, `owner` |
| `/orders` | Pedidos | `employee`, `admin`, `owner` |
| `/tabs` | Comandas | `employee`, `admin`, `owner` |
| `/inventory` | Estoque e produtos | `admin`, `owner` |
| `/reservations` | Reservas | `employee`, `admin`, `owner` |
| `/reports` | Faturamento e relatórios | `admin`, `owner` |
| `/users` | Funcionários | `admin`, `owner` |
| `/audit` | Auditoria | `admin`, `owner` |
| `/backup` | Backup e restauração | `admin`, `owner` |
| `/accessibility` | Acessibilidade | `employee`, `admin`, `owner` |

As páginas protegidas aguardam a validação da sessão no servidor. A interface
controla a navegação, mas a autorização efetiva também é aplicada pela API.
A matriz de acesso por endpoint está em
[CONFIGURACAO.md](CONFIGURACAO.md).

## API e persistência

Os controllers organizam autenticação, backups, clientes, comandas,
faturamento, formas de pagamento, funcionários, health checks, logs, mesas,
pedidos, produtos e reservas. A lista de rotas, métodos, parâmetros e respostas
está em [CONFIGURACAO.md](CONFIGURACAO.md).

O banco `DB_RESTAURANTE` tem 12 tabelas:
`FUNCIONARIO`, `CLIENTE`, `MESA`, `FORMA_PAGAMENTO`, `PRODUTO`, `RESERVA`,
`COMANDA`, `ITEM_COMANDA`, `DETALHE_PAGAMENTO`, `DESPESAS`, `LOG_COMANDA` e
`LOG_SISTEMA`.

Os scripts SQL também definem:

- Triggers para marcar a mesa ao abrir comanda, recalcular o total quando os
  itens mudam e fechar a comanda/liberar a mesa após pagamento.
- Procedures `sp_fechar_comanda`, `sp_relatorio_faturamento` e
  `sp_ajustar_estoque`.
- Views `vw_comandas_abertas` e `vw_produtos_mais_vendidos`.

O esquema é evoluído pelos scripts SQL versionados; migrations do Entity
Framework Core não são usadas. A ordem de inicialização e os nomes dos scripts
estão no guia de [configuração](CONFIGURACAO.md).

### Fluxo de criação de pedidos

`POST /api/pedidos` recebe `idMesa` e `itens`. Quando há uma comanda aberta
para a mesa, os itens são adicionados a ela. Para criar um pedido sem comanda
aberta, o DTO também aceita `idCliente`, que precisa identificar um cliente
válido. A tela de pedidos exige uma comanda aberta; a abertura de comanda é
uma operação separada em `POST /api/comanda`.

## Sessão e atualizações em tempo real

O login aceita email ou CPF. A API entrega o JWT em cookie HttpOnly
`systemic_auth`; a interface usa antiforgery por `X-CSRF-TOKEN` nas
requisições mutáveis. A sessão e o perfil são revalidados no servidor ao
inicializar o cliente. CORS permite credenciais apenas para as origens
configuradas.

Novos hashes de senha usam PBKDF2-SHA256 com salt aleatório e 600.000
iterações; hashes legados continuam aceitos e são atualizados após login
bem-sucedido. Os fluxos de login por email e CPF usam a mesma política de
bloqueio. Detalhes de configuração estão em
[CONFIGURACAO.md](CONFIGURACAO.md).

O hub autenticado `/hubs/cozinha` publica atualizações de pedidos/comandas.
O cliente tenta reconectar e o contexto do restaurante mantém sincronização
periódica como contingência quando SignalR está habilitado, mas desconectado.

## PWA, backup e implantação

O service worker pré-armazena recursos estáticos do front-end; chamadas à API
não são armazenadas em cache. Sem rede, as navegações recebem a página offline.

Os backups são ZIPs assinados com HMAC e guardados no caminho configurado por
`BACKUP_PATH`. No Compose, o caminho padrão `/app/backups` usa o volume
persistente `backup_data`. Restaurar exige uma assinatura válida, valida as
entradas do arquivo e cria um backup de segurança antes de aplicar os dados.

O repositório não configura implantação em nuvem. Em produção, use TLS,
configure CORS para origens confiáveis e informe somente IPs de proxy
confiáveis em `FORWARDED_HEADERS_KNOWN_PROXIES`. A configuração atual do cookie
pressupõe que a interface e a API sejam servidas pelo mesmo site.
