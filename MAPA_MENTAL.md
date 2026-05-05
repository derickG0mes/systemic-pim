```
PIM3 - SISTEMA DE GERENCIAMENTO DE RESTAURANTE
│
├─ 🎯 OBJETIVO
│  └─ Backend .NET 10.0 para gerenciar restaurante
│     (Login → Comanda → Pagamento → Faturamento)
│
├─ 📂 ESTRUTURA DO PROJETO
│  ├─ MODELS (Entidades do Banco)
│  │  ├─ Funcionario (CPF, Senha, LoginAttempts, LockedUntil)
│  │  ├─ Cliente (Nome, Telefone, Feedback)
│  │  ├─ Mesa (Número, Capacidade, Status)
│  │  ├─ Produto (Nome, Descrição, Estoque)
│  │  ├─ FormaPagamento (Dinheiro, Cartão, Pix)
│  │  ├─ Comanda (Pedido: Mesa + Cliente + Status)
│  │  ├─ ItemComanda (Produto + Quantidade + Preço)
│  │  ├─ Reserva (Agendamento: Cliente + Mesa)
│  │  ├─ DetalhePagamento (Transação: Comanda + Forma + Funcionario)
│  │  ├─ Despesa (Custos: Aluguel, Fornecedor, etc)
│  │  └─ LogComanda (Auditoria: Histórico de ações)
│  │
│  ├─ CONTROLLERS (7 Controllers = 42 Endpoints)
│  │  ├─ FuncionarioController
│  │  │  ├─ POST /login (sem autenticação)
│  │  │  ├─ GET / (listar todos)
│  │  │  ├─ GET /{id} (detalhe)
│  │  │  ├─ POST / (criar novo)
│  │  │  ├─ PUT /{id} (atualizar)
│  │  │  └─ DELETE /{id} (deletar)
│  │  │
│  │  ├─ ClienteController
│  │  │  ├─ GET /
│  │  │  ├─ GET /{id}
│  │  │  ├─ POST /
│  │  │  ├─ PUT /{id}
│  │  │  └─ DELETE /{id}
│  │  │
│  │  ├─ MesaController (Mesmo padrão CRUD)
│  │  ├─ ProdutoController (Mesmo padrão CRUD)
│  │  ├─ FormaPagamentoController (Mesmo padrão CRUD)
│  │  │
│  │  ├─ ComandaController (Lógica especial)
│  │  │  ├─ GET / (lista todas)
│  │  │  ├─ GET /{id} (com itens, cliente, mesa)
│  │  │  ├─ POST / (abrir nova)
│  │  │  ├─ POST /{id}/itens (adicionar item)
│  │  │  ├─ PUT /{id}/fechar (fechar comanda)
│  │  │  ├─ GET /{id}/total (calcula soma)
│  │  │  └─ DELETE /{id} (remover)
│  │  │
│  │  └─ FaturamentoController (Relatórios)
│  │     ├─ GET /relatorio (Receita - Despesa = Lucro)
│  │     ├─ GET /receita-por-forma (por forma pagto)
│  │     ├─ GET /despesa-por-categoria (por categoria)
│  │     ├─ POST /despesa (registrar novo gasto)
│  │     └─ GET /despesas (listar gastos)
│  │
│  ├─ SERVICES (Lógica Reutilizável)
│  │  ├─ PasswordHashService
│  │  │  ├─ HashPassword(string) → string com salt + hash
│  │  │  └─ VerifyPassword(string, string) → bool
│  │  │     (PBKDF2 + SHA256, 10.000 iterações)
│  │  │
│  │  └─ JwtService
│  │     └─ GenerateToken(id, nome, cpf) → JWT válido 8h
│  │
│  ├─ DATA (Banco de Dados)
│  │  └─ AppDbContext
│  │     ├─ DbSet<Funcionario>
│  │     ├─ DbSet<Cliente>
│  │     ├─ DbSet<Mesa>
│  │     ├─ DbSet<Produto>
│  │     ├─ DbSet<FormaPagamento>
│  │     ├─ DbSet<Comanda>
│  │     ├─ DbSet<ItemComanda>
│  │     ├─ DbSet<Reserva>
│  │     ├─ DbSet<DetalhePagamento>
│  │     ├─ DbSet<Despesa>
│  │     └─ DbSet<LogComanda>
│  │     (Fluent API com relacionamentos)
│  │
│  ├─ DTOs (Transferência Segura)
│  │  └─ FuncionarioDto
│  │     ├─ LoginRequest
│  │     ├─ LoginResponse (com token)
│  │     ├─ FuncionarioDto (sem senha)
│  │     └─ CreateFuncionarioRequest
│  │
│  ├─ HUBS (SignalR em Tempo Real)
│  │  └─ CozinhaHub
│  │     ├─ OnConnectedAsync (usuário conecta)
│  │     ├─ OnDisconnectedAsync (usuário sai)
│  │     ├─ NotificarPedidoNovo (novo pedido)
│  │     ├─ NotificarPedidoEmPreparo (preparando)
│  │     ├─ NotificarPedidoPronto (pronto!)
│  │     └─ AtualizarStatusComanda (mudança de status)
│  │
│  ├─ Program.cs (Configuração)
│  │  ├─ DbContext
│  │  ├─ JWT Bearer Auth
│  │  ├─ CORS (localhost:5173)
│  │  ├─ SignalR Hub
│  │  └─ Controllers
│  │
│  └─ appsettings.json
│     ├─ ConnectionString (SQL Server)
│     ├─ JWT Secret (chave secreta)
│     └─ JWT ExpirationMinutes (8h)
│
├─ 🔐 AUTENTICAÇÃO & SEGURANÇA
│  │
│  ├─ FLUXO DE LOGIN
│  │  1. Usuário envia CPF + Senha → POST /api/funcionario/login
│  │  2. Backend busca funcionário no banco
│  │  3. Verifica se conta está bloqueada (LockedUntil)
│  │  4. Valida senha com VerifyPassword()
│  │  5. Se errado:
│  │     - LoginAttempts++
│  │     - Se == 5 → LockedUntil = agora + 15min → Erro
│  │  6. Se correto:
│  │     - LoginAttempts = 0
│  │     - LockedUntil = null
│  │     - Gera JWT Token (8h válido)
│  │     - Retorna: { id, nome, token }
│  │
│  ├─ HASH DE SENHA
│  │  1. Salt aleatório (16 bytes) gerado
│  │  2. PBKDF2 aplicado 10.000 vezes com SHA256
│  │  3. Resultado: salt + hash armazenado
│  │  4. Comparação: VerifyPassword() repete o processo
│  │
│  ├─ TOKEN JWT
│  │  1. Header: { "alg": "HS256" }
│  │  2. Payload: { idFuncionario, nome, cpf }
│  │  3. Signature: HMAC-SHA256(secret)
│  │  4. Validade: 8 horas
│  │  5. Uso: Authorization: Bearer <TOKEN>
│  │
│  ├─ CORS
│  │  - Permitir: localhost:5173, localhost:3000, localhost:5174
│  │  - Métodos: GET, POST, PUT, DELETE
│  │  - Headers: Content-Type, Authorization
│  │  - Credentials: true
│  │
│  └─ DTOs (Não vazar dados!)
│     - LoginResponse: sem senha
│     - FuncionarioDto: sem senha
│     - Sempre filtrar dados sensíveis
│
├─ 💾 BANCO DE DADOS (SQL Server)
│  │
│  ├─ 11 TABELAS (Relacionadas)
│  │  FUNCIONARIO (id, nome, cpf, telefone, password, status, loginAttempts, lockedUntil)
│  │      ↓
│  │  DETALHE_PAGAMENTO (id, valor, troco, data, status, idComanda, idForma, idFunc)
│  │      ↓
│  │  COMANDA (id, dataAberta, dataFechada, status, idMesa, idCliente)
│  │      ↓
│  │  MESA (id, numero, status, capacidade)
│  │  CLIENTE (id, nome, telefone, feedback)
│  │  RESERVA (id, idCliente, idMesa, dataReserva, status)
│  │      ↓
│  │  ITEM_COMANDA (id, qtd, preco, idProduto, idComanda)
│  │      ↓
│  │  PRODUTO (id, nome, descricao, qtdEstoque, status)
│  │
│  │  FORMA_PAGAMENTO (id, nome)
│  │  DESPESA (id, descricao, valor, categoria, data, idForma)
│  │  LOG_COMANDA (id, data, acao, idComanda, idFunc)
│  │
│  ├─ CONSTRAINTS
│  │  - FK: DETALHE_PAGAMENTO → COMANDA, FORMA, FUNCIONARIO
│  │  - FK: COMANDA → MESA, CLIENTE
│  │  - FK: ITEM_COMANDA → COMANDA, PRODUTO
│  │  - FK: RESERVA → CLIENTE, MESA
│  │  - FK: DESPESA → FORMA_PAGAMENTO
│  │  - FK: LOG_COMANDA → COMANDA, FUNCIONARIO
│  │
│  └─ TIPOS DE DADOS
│     - ID: INT IDENTITY(1,1)
│     - Strings: VARCHAR()
│     - Valores: DECIMAL(10,2) ← Precisão financeira!
│     - Datas: DATETIME
│
├─ 💰 CÁLCULOS FINANCEIROS
│  │
│  ├─ RECEITA
│  │  SELECT SUM(QtdProduto * PrecoUnitarioPago)
│  │  FROM ItemComanda
│  │  WHERE Comanda.DataFechada BETWEEN @dataInicio AND @dataFim
│  │
│  ├─ DESPESA
│  │  SELECT SUM(ValorDespesa)
│  │  FROM Despesa
│  │  WHERE DataDespesa BETWEEN @dataInicio AND @dataFim
│  │
│  ├─ LUCRO
│  │  Lucro = Receita - Despesa
│  │
│  ├─ TIPO: DECIMAL
│  │  - Precisão: 28-29 casas decimais
│  │  - Ideal para dinheiro
│  │  - Evita erros de arredondamento
│  │
│  └─ AGRUPAMENTOS
│     - Por forma de pagamento (recebeu em dinheiro? cartão? pix?)
│     - Por categoria despesa (aluguel? fornecedor? energia?)
│     - Por período (diário, mensal, anual)
│
├─ 📱 INTEGRAÇÃO REACT
│  │
│  ├─ INTERCEPTOR AXIOS
│  │  - Adiciona token automaticamente em todas requisições
│  │  - Header: Authorization: Bearer <TOKEN>
│  │
│  ├─ SERVIÇOS PRONTOS
│  │  - authService.login()
│  │  - funcionarioService.*()
│  │  - clienteService.*()
│  │  - mesaService.*()
│  │  - produtoService.*()
│  │  - comandaService.*()
│  │  - faturamentoService.*()
│  │
│  ├─ EXEMPLO DE USO
│  │  const { token } = await authService.login(cpf, senha)
│  │  const clientes = await clienteService.getAll()
│  │  const comanda = await comandaService.create(mesaId, clienteId)
│  │
│  ├─ SIGNALR CONEXÃO
│  │  const connection = new HubConnectionBuilder()
│  │    .withUrl("/hubs/cozinha", { accessTokenFactory: () => token })
│  │    .build()
│  │  connection.on("PedidoPronto", (data) => { ... })
│  │
│  └─ ARQUIVO: EXEMPLO_INTEGRACAO_REACT.ts
│     - Copiar para src/services/api.ts
│     - Instalar: npm install axios @microsoft/signalr
│     - Pronto para usar!
│
├─ 📚 DOCUMENTAÇÃO
│  │
│  ├─ INDICE.md ← Comece aqui! Mapa de tudo
│  ├─ QUICK_START.md ← 5 minutos para rodar
│  ├─ README.md ← Documentação técnica
│  ├─ PIM3.API/DOCUMENTACAO.md ← Explicação profunda
│  ├─ CHECKLIST_APRESENTACAO.md ← Como apresentar
│  ├─ RESUMO_EXECUTIVO.md ← Overview do projeto
│  ├─ GUIA_COMMITS.md ← Boas práticas Git
│  └─ EXEMPLO_INTEGRACAO_REACT.ts ← Código pronto
│
└─ 🎯 PRÓXIMOS PASSOS
   1. Ler QUICK_START.md
   2. Rodar: dotnet run
   3. Testar no Postman
   4. Integrar React
   5. Estudar CHECKLIST_APRESENTACAO.md
   6. Apresentar para professores! 🎓
```

---

## 🗺️ Navegação Rápida

| Preciso... | Vejo... |
|-----------|---------|
| ...entender a estrutura? | `INDICE.md` ou este arquivo |
| ...rodar a API? | `QUICK_START.md` |
| ...conhecer todos endpoints? | `README.md` |
| ...explicar autenticação? | `PIM3.API/DOCUMENTACAO.md` seção 🔐 |
| ...conectar React? | `EXEMPLO_INTEGRACAO_REACT.ts` |
| ...apresentar? | `CHECKLIST_APRESENTACAO.md` |
| ...fazer commits bons? | `GUIA_COMMITS.md` |
| ...overview completo? | `RESUMO_EXECUTIVO.md` |

---

**Boa sorte! 🚀**
