# 📖 Configuração de Setup - Backend e Frontend

## 🚀 Começar Rápido

### 1️⃣ Back-End (API .NET)

```bash
cd backend
dotnet run
```

**Resultado esperado:**

- Terminal mostra: `API ESTÁ PRONTA PARA RECEBER REQUISIÇÕES!`
- URL: http://localhost:5000
- Health Check: http://localhost:5000/api/healthcheck

### 2️⃣ Front-End (React)

```bash
cd pim-3
npm install
npm run dev
```

**Resultado esperado:**

- Terminal mostra: `VITE v... ready in ... ms`
- URL: http://localhost:5173

---

## 🔗 Conectar React na API

### Criar arquivo: `pim-3/src/services/api.js`

```javascript
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000",
});

// Adicionar token automaticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

### Usar no Componente React

```javascript
import api from "../services/api";

async function fazerLogin(email, senha) {
  try {
    const { data } = await api.post("/api/autenticacao/login", {
      email,
      senha,
    });

    if (data.sucesso) {
      localStorage.setItem("token", data.dados.token);
      console.log("✅ Login bem-sucedido!");
    } else {
      console.error("❌ " + data.mensagem);
    }
  } catch (erro) {
    console.error("Erro:", erro);
  }
}
```

---

## 🔐 Autenticação JWT

### Login

```bash
POST http://localhost:5000/api/autenticacao/login
Content-Type: application/json

{
  "email": "chef@restaurante.com",
  "senha": "123456"
}
```

**Resposta (sucesso):**

```json
{
  "sucesso": true,
  "mensagem": "Login realizado com sucesso!",
  "dados": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "nomeUsuario": "Chef João"
  }
}
```

### Guardar Token

```javascript
localStorage.setItem("token", data.dados.token);
```

### Usar em Requisições Autenticadas

```javascript
const token = localStorage.getItem("token");
fetch("http://localhost:5000/api/pedidos", {
  headers: { Authorization: `Bearer ${token}` },
});
```

---

## 🔗 Endpoints Disponíveis

### 🔐 Autenticação

- `POST /api/autenticacao/login` - Fazer login
- `GET /api/autenticacao/validar` - Validar token

### 📦 Pedidos

- `GET /api/pedidos` - Listar
- `GET /api/pedidos/{id}` - Obter um
- `POST /api/pedidos` - Criar
- `PUT /api/pedidos/{id}/status` - Atualizar status
- `DELETE /api/pedidos/{id}` - Deletar

### 🏥 Saúde

- `GET /api/healthcheck` - Status da API
- `GET /api/healthcheck/database` - Status do banco
- `GET /api/healthcheck/info` - Informações

---

## ⚠️ Problemas Comuns

### Erro: "CORS policy"

**Solução:** Confirme que React está em `http://localhost:5173` e API em `http://localhost:5000`

### Erro: "Connection refused"

**Solução:** A API não está rodando. Execute `dotnet run` na pasta `PIM3.API`

### Erro: "401 Unauthorized"

**Solução:** Token não foi enviado ou expirou. Faça login novamente

### Erro: "Database connection failed"

**Solução:** Verifique SQL Server está rodando e connection string em `appsettings.json`

---

## 📊 Estrutura de Resposta

**Todas as respostas seguem este padrão:**

```json
{
  "sucesso": true, // boolean
  "mensagem": "Texto amigável",
  "dados": {
    /* dados */
  },
  "codigoErro": null // ou código de erro
}
```

---

## 🎯 URLs Rápidas

| O Quê        | URL                                   |
| ------------ | ------------------------------------- |
| API          | http://localhost:5000                 |
| Health Check | http://localhost:5000/api/healthcheck |
| Swagger      | http://localhost:5000/swagger         |
| React        | http://localhost:5173                 |

---

## ✅ Checklist de Setup

- [ ] .NET 10+ instalado
- [ ] Node.js + npm instalado
- [ ] SQL Server rodando
- [ ] `dotnet run` na pasta PIM3.API
- [ ] Acessar http://localhost:5000/api/healthcheck (sucesso)
- [ ] `npm run dev` na pasta pim-3
- [ ] Acessar http://localhost:5173
- [ ] Teste login no React
- [ ] Listar pedidos funcionando

---

**Próximo:** Leia ARQUITETURA.md para entender a estrutura do código
