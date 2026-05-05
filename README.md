# PIM3 - Sistema de Gerenciamento de Restaurante

## 📂 Estrutura do Projeto

```
systemic-pim/
├── pim-3/                  → Front-end (React + Vite + TypeScript)
└── PIM3.API/               → Back-end (.NET 10.0 + SQL Server)
    ├── Models/             → Entidades do banco
    ├── Controllers/        → Endpoints da API
    ├── Data/               → DbContext (configuração do banco)
    ├── Services/           → Lógica de autenticação (JWT, senha)
    ├── DTOs/               → Objetos de transferência (sem dados sensíveis)
    ├── Hubs/               → SignalR (cozinha em tempo real)
    ├── appsettings.json    → Configuração da API (banco, JWT)
    ├── Program.cs          → Setup da aplicação
    └── DOCUMENTACAO.md     → Explicação técnica detalhada
```

---

## 🔧 Pré-requisitos

Antes de rodar a API, você precisa ter instalado:

- **.NET 10.0 SDK** → [Baixar aqui](https://dotnet.microsoft.com/download)
- **SQL Server** → Já deve estar configurado no seu PC
- **Visual Studio Community 2026** (opcional, pode usar VS Code)

---

## ⚙️ Configuração Inicial

### **1. Configurar String de Conexão**

Abra o arquivo `PIM3.API/appsettings.json` e ajuste a string de conexão:

```json
"ConnectionStrings": {
  "DefaultConnection": "Server=localhost;Database=PIM3_DB;User Id=sa;Password=sua_senha_aqui;TrustServerCertificate=True;"
}
```

**Substitua:**
- `Server=localhost` → IP do seu SQL Server (normalmente `localhost` ou `.`)
- `Database=PIM3_DB` → Nome do seu banco de dados
- `User Id=sa` → Seu usuário SQL Server
- `Password=sua_senha_aqui` → Sua senha SQL Server

### **2. Criar o Banco de Dados**

Execute o script SQL fornecido no seu SQL Server Management Studio:

```sql
-- Executar os CREATEs fornecidos inicialmente
CREATE TABLE FUNCIONARIO (...)
CREATE TABLE CLIENTE (...)
-- ... etc
```

### **3. Gerar as Migrations do Entity Framework**

No terminal (na pasta `PIM3.API`):

```bash
dotnet ef migrations add InitialCreate
dotnet ef database update
```

Isso criará as tabelas no banco automaticamente.

---

## ▶️ Rodando a API

### **Opção 1: Terminal (Recomendado)**

```bash
cd PIM3.API
dotnet run
```

A API iniciará em:
- **HTTP**: `http://localhost:5000`
- **HTTPS**: `https://localhost:5001`

### **Opção 2: Visual Studio Community**

1. Abra `PIM3.API.csproj` em Visual Studio
2. Pressione **F5** ou clique em **▶ Iniciar**

---

## 🧪 Testando a API

### **Usando Postman ou REST Client (VS Code)**

#### **Login:**
```http
POST http://localhost:5000/api/funcionario/login
Content-Type: application/json

{
  "cpfFuncionario": "12345678901",
  "senha": "senha123"
}
```

**Resposta:**
```json
{
  "idFuncionario": 1,
  "nomeFuncionario": "João Silva",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### **Criar Cliente (com token):**
```http
POST http://localhost:5000/api/cliente
Authorization: Bearer <TOKEN_COPIADO_DO_LOGIN>
Content-Type: application/json

{
  "nomeCliente": "Maria Silva",
  "telefoneCliente": "11987654321"
}
```

---

## 📡 Endpoints Disponíveis

### **Autenticação**
- `POST /api/funcionario/login` → Login

### **Funcionários**
- `GET /api/funcionario` → Lista todos
- `GET /api/funcionario/{id}` → Detalhes
- `POST /api/funcionario` → Criar novo
- `PUT /api/funcionario/{id}` → Atualizar
- `DELETE /api/funcionario/{id}` → Deletar

### **Clientes**
- `GET /api/cliente` → Lista
- `POST /api/cliente` → Criar
- `PUT /api/cliente/{id}` → Atualizar
- `DELETE /api/cliente/{id}` → Deletar

### **Mesas**
- `GET /api/mesa` → Lista
- `POST /api/mesa` → Criar
- `PUT /api/mesa/{id}` → Atualizar
- `DELETE /api/mesa/{id}` → Deletar

### **Produtos**
- `GET /api/produto` → Lista
- `POST /api/produto` → Criar
- `PUT /api/produto/{id}` → Atualizar
- `DELETE /api/produto/{id}` → Deletar

### **Comandas**
- `GET /api/comanda` → Lista todas
- `GET /api/comanda/{id}` → Detalhe completo
- `POST /api/comanda` → Abre nova
- `POST /api/comanda/{id}/itens` → Adiciona item
- `PUT /api/comanda/{id}/fechar` → Fecha comanda
- `GET /api/comanda/{id}/total` → Calcula total

### **Faturamento**
- `GET /api/faturamento/relatorio?dataInicio=2025-01-01&dataFim=2025-01-31` → Receita/Despesas/Lucro
- `GET /api/faturamento/receita-por-forma` → Receita por forma de pagamento
- `GET /api/faturamento/despesa-por-categoria` → Despesas por categoria
- `POST /api/faturamento/despesa` → Adiciona despesa

---

## 🔄 SignalR (Cozinha em Tempo Real)

### **Conectar do React:**

```bash
npm install @microsoft/signalr
```

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
```

---

## 📚 Documentação Completa

Veja o arquivo `DOCUMENTACAO.md` para:
- Explicação linha-por-linha de cada component
- Como a autenticação funciona
- Cálculos de faturamento
- Estrutura do banco de dados
- Explicação para os professores

---

## 🚨 Troubleshooting

### **Erro: "Could not connect to SQL Server"**

✅ Solução:
1. Verifique se SQL Server está rodando
2. Ajuste `Server` em `appsettings.json` (tente `(local)` ou `localhost`)
3. Verifique usuário e senha

### **Erro: "Migration 'InitialCreate' has not been applied"**

✅ Solução:
```bash
dotnet ef database update
```

### **CORS Error no React**

✅ Solução: O `appsettings.json` já tem CORS configurado para `localhost:5173` (Vite padrão). Se usar outro port, adicione em `Program.cs`:

```csharp
policy.WithOrigins(
    "http://localhost:5173",
    "http://localhost:3000",    // Seu port React
    "http://localhost:5174"
)
```

---

## 📖 Para Explicar aos Professores

Quando fizer a apresentação, explique assim:

### **Arquitetura**
> "Usamos a arquitetura simples de 3 camadas: Models (dados), Controllers (lógica), Data (banco). Sem complexidade desnecessária."

### **Segurança**
> "Senhas são criptografadas com PBKDF2 (10.000 iterações + salt aleatório). Após 5 tentativas falhadas, bloqueamos por 15 minutos."

### **Autenticação**
> "Usamos JWT. O cliente faz login, recebe um token e envia em toda requisição. O servidor valida o token."

### **Tempo Real**
> "SignalR conecta a cozinha ao back-end. Quando um pedido muda de status, todos os clientes recebem a notificação instantaneamente sem polling."

### **Faturamento**
> "Usamos `decimal` (não `double`) para precisão financeira. Receita = soma de itens de comandas fechadas. Lucro = Receita - Despesas."

---

## ✅ Checklist Antes da Apresentação

- [ ] API rodando em `localhost:5000`
- [ ] React rodando em `localhost:5173`
- [ ] Login funcionando e gerando token
- [ ] Criar/listar clientes funcionando
- [ ] SignalR recebendo notificações
- [ ] Cálculos de faturamento corretos
- [ ] Todos conseguem explicar o código linha-por-linha

---

**Boa sorte na apresentação! 🚀**

Qualquer dúvida, consulte `DOCUMENTACAO.md` para entender cada parte em detalhes.
