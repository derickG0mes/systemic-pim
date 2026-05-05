# PIM3.API - Backend - Documentação Técnica

## 📋 Visão Geral

Este é o backend de um **Sistema de Gerenciamento de Restaurante** desenvolvido em **C# com .NET 10.0** e **Entity Framework Core**, conectado a um **SQL Server**.

A estrutura é simples e didática, focada em um projeto acadêmico onde você e seu grupo precisam **explicar linha por linha** do código.

---

## 🏗️ Arquitetura do Projeto

O projeto segue uma arquitetura simples de **3 camadas**:

```
PIM3.API/
├── Models/          → Entidades (POCO classes que representam as tabelas do banco)
├── Controllers/     → Recebem requisições HTTP e retornam respostas
├── Data/            → DbContext (conexão e mapeamento com o banco de dados)
├── Services/        → Lógica reutilizável (JWT, hashing de senha)
├── DTOs/            → Data Transfer Objects (não vaza dados sensíveis para o front-end)
├── Hubs/            → SignalR (comunicação em tempo real com a cozinha)
└── Program.cs       → Configuração da aplicação (CORS, JWT, DbContext, etc.)
```

---

## 🔐 Autenticação e Segurança

### **Como funciona o Login?**

1. **Endpoint**: `POST /api/funcionario/login`

2. **Requisição** (React enviará isso):
```json
{
  "cpfFuncionario": "12345678901",
  "senha": "sua_senha_aqui"
}
```

3. **Processamento no `FuncionarioController.Login()`**:
   - Busca o funcionário no banco pelo CPF
   - Verifica se a conta está **bloqueada** (após 5 tentativas falhadas por 15 minutos)
   - Compara a senha enviada com o hash armazenado usando `PasswordHashService.VerifyPassword()`
   - Se errar a senha, incrementa `LoginAttempts` e bloqueia se atingir 5
   - Se acertar, reseta tentativas e gera um **JWT Token**

4. **Resposta** (o React recebe):
```json
{
  "idFuncionario": 1,
  "nomeFuncionario": "João Silva",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

5. **Como o front-end usa o token?**
   - Armazena em `localStorage` ou `sessionStorage`
   - Envia em **toda requisição** no header: `Authorization: Bearer <TOKEN>`

### **Hashing de Senha**

No `PasswordHashService`:
- **HashPassword()**: Cria um salt aleatório + aplica PBKDF2 com SHA256 10.000 vezes
- **VerifyPassword()**: Compara a senha enviada com o hash armazenado

Isso garante que **nem você tem acesso à senha original** (só o hash).

---

## 🗄️ Estrutura do Banco de Dados

Todas essas tabelas já existem no seu SQL Server:

- **FUNCIONARIO**: Funcionários (com CPF, senha, status)
- **CLIENTE**: Clientes do restaurante
- **MESA**: Mesas disponíveis
- **PRODUTO**: Itens do cardápio
- **FORMA_PAGAMENTO**: Dinheiro, Cartão, Pix, etc.
- **COMANDA**: Pedido aberto em uma mesa
- **ITEM_COMANDA**: Itens dentro de cada comanda
- **RESERVA**: Reservas de mesas
- **DETALHE_PAGAMENTO**: Registro de pagamentos
- **DESPESA**: Gastos operacionais (aluguel, fornecedor, etc.)
- **LOG_COMANDA**: Histórico de ações em cada comanda

---

## 📡 Controllers e Endpoints

### **1. FuncionarioController** (`/api/funcionario`)

```csharp
POST   /login                 → Login (sem autenticação necessária)
GET    /                      → Lista todos os funcionários
GET    /{id}                  → Retorna um funcionário específico
POST   /                      → Cria novo funcionário
PUT    /{id}                  → Atualiza funcionário
DELETE /{id}                  → Marca como INATIVO
```

> Todos exceto `/login` **requerem token JWT** no header `Authorization: Bearer <TOKEN>`

### **2. ClienteController** (`/api/cliente`)

```csharp
GET    /                      → Lista clientes
GET    /{id}                  → Detalhe de um cliente
POST   /                      → Cria cliente
PUT    /{id}                  → Atualiza cliente
DELETE /{id}                  → Remove cliente
```

### **3. MesaController** (`/api/mesa`)

```csharp
GET    /                      → Lista mesas
GET    /{id}                  → Detalhe de uma mesa
POST   /                      → Cria mesa
PUT    /{id}                  → Atualiza mesa
DELETE /{id}                  → Remove mesa
```

### **4. ProdutoController** (`/api/produto`)

```csharp
GET    /                      → Lista produtos
GET    /{id}                  → Detalhe de produto
POST   /                      → Cria produto
PUT    /{id}                  → Atualiza produto
DELETE /{id}                  → Remove produto
```

### **5. FormaPagamentoController** (`/api/formapagamento`)

```csharp
GET    /                      → Lista formas de pagamento
GET    /{id}                  → Detalhe
POST   /                      → Cria forma
PUT    /{id}                  → Atualiza forma
DELETE /{id}                  → Remove forma
```

### **6. ComandaController** (`/api/comanda`)

```csharp
GET    /                      → Lista todas as comandas
GET    /{id}                  → Detalhe completo (com itens, cliente, mesa)
POST   /                      → Abre nova comanda
POST   /{id}/itens            → Adiciona item à comanda
PUT    /{id}/fechar           → Fecha a comanda
GET    /{id}/total            → Calcula total da comanda
DELETE /{id}                  → Remove comanda
```

### **7. FaturamentoController** (`/api/faturamento`)

```csharp
GET    /relatorio             → Receita, despesas e lucro entre duas datas
GET    /receita-por-forma     → Quanto foi arrecadado por forma de pagamento
GET    /despesa-por-categoria → Gastos agrupados por categoria
POST   /despesa               → Registra nova despesa
GET    /despesas              → Lista despesas entre datas
```

**Exemplo de chamada**:
```
GET /api/faturamento/relatorio?dataInicio=2025-01-01&dataFim=2025-01-31
```

---

## 💻 Como Testar a API

### **1. No Postman ou VS Code (REST Client)**

#### Login:
```
POST http://localhost:5000/api/funcionario/login
Content-Type: application/json

{
  "cpfFuncionario": "12345678901",
  "senha": "senha123"
}
```

Copie o `token` da resposta.

#### Criar Cliente (usando o token):
```
POST http://localhost:5000/api/cliente
Authorization: Bearer <TOKEN_AQUI>
Content-Type: application/json

{
  "nomeCliente": "João da Silva",
  "telefoneCliente": "11987654321",
  "feedback": null
}
```

---

## 🔄 Comunicação em Tempo Real (SignalR)

O **CozinhaHub** em `/hubs/cozinha` permite notificações em tempo real.

### **Como funciona?**

1. O **front-end se conecta** via WebSocket a `/hubs/cozinha` com o JWT no `access_token`
2. Quando um novo pedido é criado, a API chama:
   ```csharp
   await Clients.All.SendAsync("PedidoNovo", new { idComanda, idMesa, itens });
   ```
3. Todos os clientes conectados recebem a notificação **em tempo real**

### **Eventos disponíveis no Hub**:

- `PedidoNovo` → Novo pedido chegou na cozinha
- `PedidoEmPreparo` → Pedido começou a ser preparado
- `PedidoPronto` → Pedido saiu da cozinha
- `ComandaAtualizada` → Status da comanda mudou

### **No React, você faria assim** (usando `@microsoft/signalr`):

```typescript
import * as signalR from "@microsoft/signalr";

const connection = new signalR.HubConnectionBuilder()
  .withUrl("http://localhost:5000/hubs/cozinha", {
    accessTokenFactory: () => localStorage.getItem("token") || "",
    withCredentials: true,
  })
  .withAutomaticReconnect()
  .build();

connection.start();

connection.on("PedidoNovo", (data) => {
  console.log("Novo pedido:", data);
});

connection.on("PedidoPronto", (data) => {
  console.log("Pedido pronto:", data);
});
```

---

## 💰 Cálculos de Faturamento

### **Receita**
```csharp
var receita = _context.ItensComanda
    .Where(item => item.Comanda != null && 
                  item.Comanda.DataFechada.HasValue &&
                  item.Comanda.DataFechada.Value >= dataInicio &&
                  item.Comanda.DataFechada.Value <= dataFim)
    .Sum(item => (decimal?)item.QtdProduto * item.PrecoUnitarioPago) ?? 0m;
```

**O que acontece:**
- Pega todos os itens de **comandas fechadas**
- Multiplica quantidade × preço unitário pago
- Soma tudo (usando `decimal` para precisão financeira)

### **Despesas**
```csharp
var despesas = _context.Despesas
    .Where(d => d.DataDespesa >= dataInicio && d.DataDespesa <= dataFim)
    .Sum(d => d.ValorDespesa);
```

### **Lucro**
```csharp
var lucro = receita - despesas;
```

---

## 🔌 Conexão com o Banco de Dados

No `appsettings.json`:

```json
"ConnectionStrings": {
  "DefaultConnection": "Server=localhost;Database=PIM3_DB;User Id=sa;Password=sua_senha_aqui;TrustServerCertificate=True;"
}
```

**Você precisa ajustar:**
- `Server` → IP ou nome do SQL Server
- `Database` → Nome do seu banco
- `User Id` → Login do SQL Server
- `Password` → Senha

---

## 📦 Como Rodar a API

### **1. No terminal (Visual Studio Code ou PowerShell):**

```bash
cd PIM3.API
dotnet run
```

A API iniciará em `http://localhost:5000` (ou `http://localhost:5001` se usar HTTPS).

### **2. No Visual Studio Community:**

- Clique em **▶ Iniciar** ou pressione **F5**

---

## 🎯 O que Explicar para os Professores

1. **Models**: "Estas classes representam as tabelas do banco de dados"
2. **DbContext**: "Aqui configuramos como cada Model se relaciona no banco"
3. **Controllers**: "Recebem requisições HTTP do React e retornam JSON"
4. **Autenticação**: "O login bloqueia a conta após 5 tentativas falhadas por segurança"
5. **DTOs**: "Nunca enviamos a senha para o front-end, usamos DTOs para filtrar dados"
6. **SignalR**: "Notificações em tempo real da cozinha sem precisar que o React fique consultando a API"
7. **Faturamento**: "Usamos `decimal` para cálculos monetários (não `double`)"

---

## ⚠️ Pontos Importantes

- ✅ **CORS configurado** para aceitar requisições do React em `localhost:5173`
- ✅ **JWT token** com validade de 8 horas (configurável no `appsettings.json`)
- ✅ **Senhas com hash seguro** (PBKDF2 + SHA256)
- ✅ **Bloqueio de conta** após 5 tentativas de login falhadas
- ✅ **SignalR** para cozinha em tempo real
- ✅ **Cálculos monetários** com `decimal` (precisão financeira)

---

## 🚀 Próximos Passos

1. **Criar migrations** do Entity Framework para o banco:
   ```bash
   dotnet ef migrations add InitialCreate
   dotnet ef database update
   ```

2. **Conectar o React com a API**:
   - Instalar `axios` ou `fetch` para requisições
   - Instalar `@microsoft/signalr` para WebSocket

3. **Integrar com o front-end React**

---

**Boa sorte na apresentação! 🎓**
