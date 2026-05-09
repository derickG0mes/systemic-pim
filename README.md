# 🍽️ SYSTEMIC PIM - Sistema de Gerenciamento de Restaurante

## 📋 Projeto Integrado Multidisciplinar

Sistema completo para gerenciamento de restaurante com Frontend (React), Backend (.NET Core) e Database (SQL Server).

---

## 🚀 Como Executar

### **Pré-requisitos**

- ✅ .NET Core 10
- ✅ Node.js + npm
- ✅ SQL Server

### **Execução Simultânea (VS Code - RECOMENDADO)**

1. Abra a pasta em VS Code
2. Abra 2 terminais (Ctrl+`)

**Terminal 1 - Backend:**

```bash
cd back-end
dotnet run
```

✅ API rodará em: **http://localhost:5130**

**Terminal 2 - Frontend:**

```bash
cd front-end
npm run dev
```

✅ Frontend rodará em: **http://localhost:8080**

### **Abra no Navegador**

```
http://localhost:8080
```

**Credenciais de Teste:**

- Email: `admin@restaurante.com`
- Senha: `admin123`

---

## 📁 Estrutura do Projeto

```
systemic-pim/
├── back-end/               # API .NET Core
│   ├── Controllers/        # 10 Controllers REST
│   ├── Models/            # 12 Models de dados
│   ├── Services/          # JWT, Password Hash
│   ├── Data/              # DbContext
│   ├── Program.cs         # Configuração
│   └── README.md          # Instruções backend
│
├── front-end/             # React + Vite + TypeScript
│   ├── src/
│   │   ├── contexts/      # AuthContext, RestaurantContext
│   │   ├── services/      # api.ts (20+ funções)
│   │   ├── pages/         # Dashboard, Login, etc
│   │   └── components/    # UI Components
│   ├── package.json       # Dependências npm
│   ├── vite.config.ts     # Configuração Vite
│   └── README.md          # Instruções frontend
│
└── README.md              # Este arquivo
```

---

## 🔗 Fluxo de Comunicação

```
┌─────────────────────┐
│  React Frontend     │
│  localhost:8080     │
└──────────┬──────────┘
           │
      fetch() HTTP
    com JWT Token
           │
┌──────────▼──────────┐
│  .NET Core Backend  │
│  localhost:5130     │
└──────────┬──────────┘
           │
    Entity Framework
           │
┌──────────▼──────────┐
│  SQL Server DB      │
│  localhost          │
└─────────────────────┘
```

---

## ✅ Funcionalidades Implementadas

- ✅ Autenticação com JWT
- ✅ Gerenciamento de Produtos
- ✅ Comandas de Mesas
- ✅ Pedidos e Itens
- ✅ Funcionários/Usuários
- ✅ Clientes
- ✅ Reservas
- ✅ Dashboard com Gráficos
- ✅ Auditoria de Ações
- ✅ Accessibilidade (WCAG)

---

## 📚 Documentação Específica

- **[Backend - README.md](back-end/README.md)** - Configuração e endpoints da API
- **[Frontend - README.md](front-end/README.md)** - Setup e componentes React

---

## 🛠️ Tecnologias Utilizadas

**Backend:**

- .NET Core 10
- Entity Framework Core
- JWT Authentication
- CORS Configuration
- SQL Server

**Frontend:**

- React 18
- TypeScript
- Vite (Build Tool)
- Tailwind CSS
- React Router
- React Context API
- Radix UI Components

**Database:**

- SQL Server 2019+
- 12 Tabelas com Relacionamentos

---

## 📊 API Endpoints Principais

| Método | Endpoint                  | Descrição           |
| ------ | ------------------------- | ------------------- |
| POST   | `/api/autenticacao/login` | Login com JWT       |
| GET    | `/api/produto`            | Listar produtos     |
| POST   | `/api/produto`            | Criar produto       |
| GET    | `/api/comanda`            | Listar comandas     |
| POST   | `/api/comanda`            | Criar comanda       |
| GET    | `/api/funcionario`        | Listar funcionários |
| GET    | `/api/pedidos`            | Listar pedidos      |
| POST   | `/api/pedidos`            | Criar pedido        |
| GET    | `/api/mesa`               | Listar mesas        |
| GET    | `/api/cliente`            | Listar clientes     |

---

## 🎓 Conceitos Demonstrados

- Autenticação e Autorização (JWT)
- CORS (Cross-Origin Resource Sharing)
- REST API Design
- Entity Framework ORM
- React Hooks e Context API
- Async/Await e Promises
- Error Handling
- Componentes Reutilizáveis

---

## 💡 Notas para Avaliadores

O projeto foi desenvolvido com didática em mente:

- ✅ Código bem estruturado e comentado
- ✅ Sem abstrações excessivas
- ✅ Boas práticas essenciais implementadas
- ✅ Fácil para estudantes entenderem e mantiverem
- ✅ Documentação clara e objetiva

│ ├── src/components/ ← Componentes
│ ├── src/pages/ ← Páginas
│ ├── src/services/ ← Chamadas à API
│ └── src/App.tsx
│
└── 📁 docs/ ← DOCUMENTAÇÃO (LEIA AQUI!)
├── CONFIGURACAO.md ← Setup e endpoints
└── ARQUITETURA.md ← Estrutura do código

````

---

## � Começar em 3 Passos

### 1️⃣ Terminal 1 - Rodar API

```bash
cd PIM3.API
dotnet run
````

Quando aparecer: `API ESTÁ PRONTA PARA RECEBER REQUISIÇÕES!` ✅

### 2️⃣ Terminal 2 - Rodar React

```bash
cd pim-3
npm install
npm run dev
```

Quando aparecer o link do Vite, acesse: http://localhost:5173

### 3️⃣ Testar

```
http://localhost:5000/api/healthcheck
```

Se retornar JSON com `"sucesso": true` ✅

---

## 📚 DOCUMENTAÇÃO

### ⭐ **LEIA PRIMEIRO:**

1. **[`docs/CONFIGURACAO.md`](docs/CONFIGURACAO.md)** (Setup e endpoints)
   - Como rodar API e React
   - Como conectar React na API
   - Todos os endpoints disponíveis
   - Problemas comuns e soluções

2. **[`docs/ARQUITETURA.md`](docs/ARQUITETURA.md)** (Entender o código)
   - Estrutura de pastas
   - O que cada pasta faz
   - Padrões de código usados
   - Como expandir o projeto

---

## 🔧 Pré-requisitos

- **.NET 10.0 SDK** → [Baixar](https://dotnet.microsoft.com/download)
- **SQL Server** → (Já configurado no PC)
- **Node.js + npm** → (Para React)
