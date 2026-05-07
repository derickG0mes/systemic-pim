# 🏗️ Arquitetura do Projeto - Estrutura e Organização

## 📁 Estrutura Geral

```
systemic-pim/
├── 📁 PIM3.API/              ← BACK-END (.NET)
│   ├── Controllers/           ← Rotas da API
│   ├── Models/               ← Estruturas de dados
│   ├── DTOs/                 ← Padrões de entrada/saída
│   ├── Services/             ← Lógica compartilhada
│   ├── Data/                 ← Conexão com banco
│   └── Program.cs            ← Configuração principal
│
├── 📁 pim-3/                 ← FRONT-END (React)
│   ├── src/
│   │   ├── components/       ← Componentes React
│   │   ├── pages/            ← Páginas
│   │   ├── services/         ← Chamadas à API
│   │   └── App.tsx           ← App principal
│   └── package.json
│
└── 📁 docs/                  ← DOCUMENTAÇÃO
    ├── CONFIGURACAO.md       ← Setup e endpoints
    └── ARQUITETURA.md        ← Este arquivo
```

---

## 🔧 Back-End (PIM3.API)

### 📂 Pastas Principais

**`/Controllers`** - Rotas da API
- `AutenticacaoController.cs` - Login e tokens
- `PedidosController.cs` - CRUD de pedidos
- `HealthCheckController.cs` - Monitoramento
- Cada endpoint retorna `RespostaPadraoDTO`
- Todos têm `Console.WriteLine` para debug

**`/Models`** - Estruturas de dados (Banco)
- `Funcionario.cs` - Usuários
- `Mesa.cs` - Mesas do restaurante
- `Produto.cs` - Produtos/cardápio
- `Comanda.cs` - Pedidos
- `Cliente.cs` - Clientes

**`/DTOs`** - Padrões de dados
- `LoginDTO.cs` - Email + senha
- `RespostaPadraoDTO.cs` - Resposta padrão
- Define o que entra e sai da API

**`/Services`** - Lógica reutilizável
- `JwtService.cs` - Gera tokens
- `PasswordHashService.cs` - Criptografa senhas

**`/Data`** - Banco de dados
- `AppDbContext.cs` - Conexão com SQL Server
- Define os `DbSet` (tabelas)

**`Program.cs`** - Configuração principal
- Inicia banco de dados
- Configura JWT
- Ativa CORS
- Mapeia controllers

---

## 💻 Front-End (pim-3)

### 📂 Pastas Principais

**`/src/components`** - Componentes reutilizáveis
- Inputs, botões, cards, etc
- Componentes pequenos e simples

**`/src/pages`** - Páginas completas
- `LoginPage.tsx` - Tela de login
- `DashboardPage.tsx` - Dashboard principal
- `PedidosPage.tsx` - Gerenciar pedidos
- Cada página usa múltiplos componentes

**`/src/services`** - Chamadas à API
- `api.js` - Configuração do axios
- `authService.js` - Login/logout
- `pedidoService.js` - CRUD de pedidos

**`/src/contexts`** - Contextos globais
- `AuthContext.tsx` - Autenticação
- `PedidoContext.tsx` - Estado de pedidos

**`/src/App.tsx`** - Componente raiz
- Define rotas principais
- Provider de contextos

---

## 🔄 Fluxo de uma Requisição

### 1️⃣ User faz login no React

```javascript
// pim-3/src/components/LoginForm.tsx
const handleLogin = async () => {
  const result = await api.post("/api/autenticacao/login", { email, senha });
};
```

### 2️⃣ Request vai para API

```
POST http://localhost:5000/api/autenticacao/login
Body: { email: "chef@email.com", senha: "123" }
```

### 3️⃣ API processa

```csharp
// PIM3.API/Controllers/AutenticacaoController.cs
[HttpPost("login")]
public async Task<IActionResult> Login([FromBody] LoginDTO loginDTO)
{
    Console.WriteLine("--> Alguém tentou fazer login");
    
    // Valida e busca no banco
    var funcionario = await _context.Funcionarios
        .FirstOrDefaultAsync(f => f.NomeFuncionario == loginDTO.Email);
    
    // Gera token
    var token = _jwtService.GenerateToken(...);
    
    // Retorna RespostaPadraoDTO
    return Ok(new RespostaPadraoDTO { ... });
}
```

### 4️⃣ React recebe resposta

```javascript
// Guardando token
localStorage.setItem("token", data.dados.token);

// Usa em requisições futuras
api.defaults.headers.common.Authorization = `Bearer ${token}`;
```

---

## 📊 Padrões Importantes

### ✅ Sempre Usar RespostaPadraoDTO

```csharp
// ✅ CORRETO
return Ok(new RespostaPadraoDTO {
    Sucesso = true,
    Mensagem = "Sucesso!",
    Dados = objeto
});

// ❌ ERRADO (não usar)
return Ok(objeto);
```

### ✅ Comentários em Português

```csharp
// ✅ CORRETO
// Aqui buscamos o funcionário no banco de dados
var func = await _context.Funcionarios.FindAsync(id);

// ❌ ERRADO
// Find employee
```

### ✅ Console.WriteLine para Debug

```csharp
// ✅ CORRETO
Console.WriteLine($"--> Buscando funcionário ID: {id}");

// ❌ ERRADO
// Sem log
```

### ✅ Mensagens Amigáveis

```csharp
// ✅ CORRETO
return NotFound("Ops! Esse pedido não existe.");

// ❌ ERRADO
return NotFound("Entity not found");
```

---

## 🔐 Segurança

### JWT (JSON Web Token)
- Usuário faz login → Recebe token
- Token guardado em localStorage
- Token enviado em cada requisição
- Token expira em 1 hora

### CORS
- React (localhost:5173) consegue acessar API (localhost:5000)
- Configurado em `Program.cs`

### Validações
- Email e senha obrigatórios
- Checagem de duplicatas
- Tentativas de login limitadas

---

## 💾 Banco de Dados

### Connection String
```json
// appsettings.json
"ConnectionStrings": {
  "DefaultConnection": "Server=.;Database=PIM3;Integrated Security=true;"
}
```

### Tabelas (Models)
- Funcionarios
- Mesas
- Produtos
- Comandas
- Clientes
- Etc

### Acesso
- Tudo via `AppDbContext`
- Entity Framework Core
- Migrations automáticas

---

## 🧪 Como Expandir

### Adicionar Novo Endpoint

1. **Criar Controller**
```csharp
// PIM3.API/Controllers/ProdutosController.cs
[ApiController]
[Route("api/[controller]")]
public class ProdutosController : ControllerBase { ... }
```

2. **Criar DTO se necessário**
```csharp
// PIM3.API/DTOs/ProdutoDTO.cs
public class ProdutoDTO { ... }
```

3. **Implementar método**
```csharp
[HttpGet]
public async Task<IActionResult> ListarProdutos() { ... }
```

### Adicionar Página React

1. **Criar componente**
```typescript
// pim-3/src/pages/ProdutosPage.tsx
export default function ProdutosPage() { ... }
```

2. **Criar serviço**
```javascript
// pim-3/src/services/produtoService.js
export async function listarProdutos() { ... }
```

3. **Integrar nas rotas**
```typescript
// pim-3/src/App.tsx
<Route path="/produtos" element={<ProdutosPage />} />
```

---

## 🔍 Debug

### Ver Console da API
```bash
# Terminal onde você rodou "dotnet run"
--> Alguém tentou fazer login com email: chef@email.com
--> Login bem-sucedido para: chef@email.com
```

### Ver Network no React
```bash
# F12 → Network → ver requisições
POST /api/autenticacao/login
GET /api/pedidos
```

### Swagger da API
```
http://localhost:5000/swagger
```

---

## 📝 Estrutura de Pastas por Responsabilidade

| Pasta | Responsabilidade | Exemplo |
|-------|-----------------|---------|
| Controllers | Receber e responder requisições | Login, CRUD pedidos |
| Models | Definir estrutura do banco | Funcionario, Comanda |
| DTOs | Padrão entrada/saída | LoginDTO, RespostaPadraoDTO |
| Services | Lógica compartilhada | JWT, criptografia |
| Data | Acesso ao banco | AppDbContext |
| components | Pequenos componentes | Buttons, Inputs |
| pages | Páginas completas | Login, Dashboard |
| services | Chamadas à API | api.js, authService.js |

---

**Próximo:** Leia CONFIGURACAO.md para setup e endpoints
