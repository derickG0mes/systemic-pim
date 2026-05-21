# 🔧 Back-End - API .NET Core

## 📋 Visão Geral

API REST desenvolvida em **.NET Core 10** com autenticação JWT, CORS e integração com SQL Server.

---

## 🚀 Como Executar

### **Pré-requisitos**

- .NET Core 10
- SQL Server

### **Rodar Backend**

```bash
cd back-end
dotnet restore      # Instalar dependências
dotnet build        # Compilar
dotnet run          # Executar
```

**API disponível em:** `http://localhost:5050`

---

## 📁 Estrutura

```
back-end/
├── Controllers/         # 10 Controllers REST
│   ├── AutenticacaoController.cs
│   ├── ProdutoController.cs
│   ├── ComandaController.cs
│   ├── PedidosController.cs
│   ├── FuncionarioController.cs
│   ├── ClienteController.cs
│   ├── MesaController.cs
│   ├── HealthCheckController.cs
│   ├── FormaPagamentoController.cs
│   └── FaturamentoController.cs
│
├── Models/              # 12 Models de Dados
│   ├── Funcionario.cs
│   ├── Comanda.cs
│   ├── Pedidos.cs
│   ├── ItemComanda.cs
│   ├── Produto.cs
│   ├── Mesa.cs
│   ├── Cliente.cs
│   ├── Reserva.cs
│   ├── FormaPagamento.cs
│   ├── Despesa.cs
│   ├── DetalhePagamento.cs
│   └── LogComanda.cs
│
├── Data/                # Entity Framework
│   └── AppDbContext.cs
│
├── Services/            # Lógica de Negócio
│   ├── JwtService.cs    # Geração de tokens JWT
│   └── PasswordHashService.cs  # Criptografia de senhas
│
├── DTOs/               # Data Transfer Objects
│   ├── LoginDTO.cs
│   ├── FuncionarioDto.cs
│   └── RespostaPadraoDTO.cs
│
├── Hubs/               # SignalR (Tempo Real)
│   └── CozinhaHub.cs
│
├── Program.cs          # Configuração Principal
├── appsettings.json    # Configurações
└── back-end.csproj     # Dependências
```

---

## 🔐 Autenticação JWT

**Fluxo:**

1. Usuário faz POST em `/api/autenticacao/login` com email e senha
2. Backend valida credenciais no banco de dados
3. Se válido, gera token JWT
4. Frontend armazena token no localStorage
5. Próximas requisições usam: `Authorization: Bearer TOKEN`

**Token válido por:** 480 minutos (configurável em appsettings.json)

---

## 📊 Endpoints Principais

### **Autenticação**

```
POST /api/autenticacao/login
Body: { "email": "admin@restaurante.com", "senha": "admin123" }
Response: { "token": "eyJhbGciOi...", "nomeUsuario": "Carlos Silva" }
```

### **Produtos**

```
GET    /api/produto              # Listar todos
POST   /api/produto              # Criar novo
PUT    /api/produto/{id}         # Atualizar
DELETE /api/produto/{id}         # Deletar
```

### **Comandas**

```
GET    /api/comanda              # Listar todas
POST   /api/comanda              # Criar nova
PUT    /api/comanda/{id}         # Atualizar
GET    /api/comanda/mesa/{mesa}  # Por mesa
```

### **Pedidos**

```
GET    /api/pedidos              # Listar
POST   /api/pedidos              # Criar
PUT    /api/pedidos/{id}         # Atualizar status
```

### **Funcionários**

```
GET    /api/funcionario          # Listar
POST   /api/funcionario          # Criar
PUT    /api/funcionario/{id}     # Atualizar
```

### **Mesas**

```
GET    /api/mesa                 # Listar
POST   /api/mesa                 # Criar
PUT    /api/mesa/{id}            # Atualizar
```

---

## ⚙️ Configuração

### **appsettings.json**

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=PIM3_DB;User Id=sa;Password=sua_senha;"
  },
  "Jwt": {
    "SecretKey": "sua_chave_secreta_com_32_caracteres",
    "ExpirationMinutes": 480
  }
}
```

### **CORS Configurado**

- `http://localhost:5173` (Vite)
- `http://localhost:3000` (Fallback)
- `http://localhost:5174` (Fallback)
- `http://localhost:8080` (Frontend)

---

## 🗄️ Database

**Nome:** `PIM3_DB`  
**Engine:** SQL Server  
**Tabelas:** 12  
**Relacionamentos:** Estruturados com Foreign Keys

### **Tabelas Principais**

- Funcionarios
- Produtos
- Mesas
- Comandas
- ItemComanda
- Pedidos
- Clientes
- Reservas

---

## 🔍 Status da API

**Health Check:**

```
GET /api/healthcheck
Response: { "status": "online" }
```

---

## 📝 Tratamento de Erros

Todas as respostas seguem o padrão:

```json
{
  "sucesso": true/false,
  "mensagem": "Descrição do resultado",
  "dados": {},
  "codigoErro": "ERRO_ESPECIFICO"
}
```

---

## 🚨 Troubleshooting

### **"Connection refused"**

- Verifique se SQL Server está rodando
- Verifique string de conexão em appsettings.json

### **"JWT inválido"**

- Verifique se token está no header Authorization
- Formato correto: `Authorization: Bearer <token>`

### **"CORS Error"**

- Verifique se frontend está em uma das URLs permitidas
- Adicione em Program.cs se necessário

---

## 📚 Dependências Principais

```xml
<PackageReference Include="Microsoft.AspNetCore.Authentication.JwtBearer" Version="10.0.7" />
<PackageReference Include="Microsoft.EntityFrameworkCore.SqlServer" Version="10.0.7" />
<PackageReference Include="Microsoft.AspNetCore.SignalR" Version="1.2.9" />
</PackageReference>
```

---

## 🎓 Conceitos Implementados

- ✅ REST API Design
- ✅ JWT Authentication
- ✅ CORS Policy
- ✅ Entity Framework ORM
- ✅ Dependency Injection
- ✅ Async/Await
- ✅ Error Handling
- ✅ Data Validation
- ✅ SignalR (Real-time)
