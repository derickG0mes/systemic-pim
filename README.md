# 📱 PIM3 - Sistema de Gerenciamento de Restaurante

Projeto acadêmico completo com **Back-End (.NET)** e **Front-End (React)**, estruturado e documentado para ensino.

---

## 📂 Estrutura do Projeto

```
systemic-pim/
│
├── 📁 PIM3.API/              ← BACK-END (.NET)
│   ├── Controllers/          ← Rotas (Login, Pedidos, Health Check)
│   ├── Models/               ← Estruturas de dados
│   ├── DTOs/                 ← Padrões entrada/saída
│   ├── Services/             ← Lógica (JWT, Criptografia)
│   ├── Data/                 ← Banco de dados
│   └── Program.cs            ← Configuração
│
├── 📁 pim-3/                 ← FRONT-END (React)
│   ├── src/components/       ← Componentes
│   ├── src/pages/            ← Páginas
│   ├── src/services/         ← Chamadas à API
│   └── src/App.tsx
│
└── 📁 docs/                  ← DOCUMENTAÇÃO (LEIA AQUI!)
    ├── CONFIGURACAO.md       ← Setup e endpoints
    └── ARQUITETURA.md        ← Estrutura do código
```

---

## � Começar em 3 Passos

### 1️⃣ Terminal 1 - Rodar API

```bash
cd PIM3.API
dotnet run
```

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
