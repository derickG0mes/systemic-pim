# ⚡ QUICK START - 5 Minutos para Rodar

## 1️⃣ Instalar Dependências (se não tiver .NET 10)

```bash
# Windows - no terminal como administrador
# Baixe e instale: https://dotnet.microsoft.com/download
```

## 2️⃣ Configurar Banco de Dados

Abra `PIM3.API/appsettings.json` e ajuste:

```json
"ConnectionStrings": {
  "DefaultConnection": "Server=localhost;Database=PIM3_DB;User Id=sa;Password=sua_senha;"
}
```

## 3️⃣ Executar Migrations (Criar Tabelas)

```bash
cd PIM3.API
dotnet ef database update
```

## 4️⃣ Rodar a API

```bash
dotnet run
```

✅ API estará em `http://localhost:5000`

## 5️⃣ Testar Login

**Postman / REST Client:**

```http
POST http://localhost:5000/api/funcionario/login
Content-Type: application/json

{
  "cpfFuncionario": "12345678901",
  "senha": "senha123"
}
```

---

## 📱 Conectar React

No seu projeto React, copie o arquivo `EXEMPLO_INTEGRACAO_REACT.ts` para sua pasta `src/services/`:

```bash
npm install axios @microsoft/signalr
```

Importe e use:

```typescript
import { authService, clienteService } from "./services/api";

// Login
const usuario = await authService.login("12345678901", "senha123");

// Listar clientes
const clientes = await clienteService.getAll();
```

---

## 🆘 Erros Comuns

| Erro | Solução |
|------|---------|
| "Could not connect to database" | Verifique SQL Server está rodando |
| "No connection string 'DefaultConnection'" | Ajuste `appsettings.json` |
| "CORS Error" | Verifique URL do React no `Program.cs` |
| "Unauthorized (401)" | Adicione token no header `Authorization: Bearer <TOKEN>` |

---

## 📚 Documentação Completa

- `README.md` → Setup e endpoints
- `DOCUMENTACAO.md` → Explicação técnica detalhada
- `EXEMPLO_INTEGRACAO_REACT.ts` → Como conectar React

---

**Pronto! Sua API está rodando! 🚀**
