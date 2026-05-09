# 💻 Front-End - React + Vite + TypeScript

## 📋 Visão Geral

Interface web desenvolvida com **React 18**, **TypeScript**, **Vite** e **Tailwind CSS** para gerenciamento de restaurante.

---

## 🚀 Como Executar

### **Pré-requisitos**

- Node.js 16+
- npm (ou yarn)

### **Rodar Frontend**

```bash
cd front-end
npm install          # Instalar dependências (primeira vez)
npm run dev          # Executar em modo desenvolvimento
```

**Frontend disponível em:** `http://localhost:8080`

---

## 📁 Estrutura

```
front-end/
├── src/
│   ├── contexts/              # Context API
│   │   ├── AuthContext.tsx    # Autenticação
│   │   ├── RestaurantContext.tsx  # Dados do restaurante
│   │   └── AccessibilityContext.tsx
│   │
│   ├── services/              # Serviços HTTP
│   │   └── api.ts            # 20+ funções de API
│   │
│   ├── pages/                # Páginas React
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── ProdutosPage.tsx
│   │   ├── PedidosPage.tsx
│   │   ├── FuncionariosPage.tsx
│   │   └── ...
│   │
│   ├── components/            # Componentes Reutilizáveis
│   │   ├── AppLayout.tsx
│   │   ├── NavLink.tsx
│   │   └── ui/               # UI Components (Radix)
│   │
│   ├── lib/                   # Utilitários
│   │   ├── utils.ts
│   │   ├── rbac.ts           # Control de Acesso
│   │   └── audit.ts          # Auditoria
│   │
│   ├── hooks/                # Custom Hooks
│   │   ├── use-mobile.tsx
│   │   └── use-toast.ts
│   │
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
│
├── public/                    # Arquivos estáticos
├── package.json              # Dependências npm
├── vite.config.ts            # Configuração Vite
├── tailwind.config.ts        # Tailwind CSS
├── tsconfig.json             # TypeScript
└── README.md                 # Este arquivo
```

---

## 🔐 Autenticação

### **Fluxo de Login**

1. Usuário acessa `http://localhost:8080`
2. É redirecionado para página de login
3. Digita email e senha
4. AuthContext chama `loginAPI(email, password)`
5. API retorna token JWT
6. Token armazenado em `localStorage`
7. Usuário redirecionado para Dashboard

### **Credenciais de Teste**

```
Email: admin@restaurante.com
Senha: admin123
```

---

## 🔄 Integração com API

### **Como funciona:**

1. **AuthContext** faz login na API
2. **RestaurantContext** carrega dados:
   - Produtos (`GET /api/produto`)
   - Comandas (`GET /api/comanda`)
   - Funcionários (`GET /api/funcionario`)
3. Componentes usam `useAuth()` e `useRestaurant()`

### **Exemplo de Uso:**

```typescript
import { useRestaurant } from "@/contexts/RestaurantContext";

export function ProdutosList() {
  const { products, addProduct } = useRestaurant();

  return (
    <div>
      <h2>Produtos ({products.length})</h2>
      {products.map(p => (
        <div key={p.id}>{p.name} - R$ {p.price}</div>
      ))}
    </div>
  );
}
```

---

## 📊 Funcionalidades

| Página           | Funcionalidade             |
| ---------------- | -------------------------- |
| **Login**        | Autenticação com JWT       |
| **Dashboard**    | Gráficos e resumo          |
| **Produtos**     | CRUD de produtos           |
| **Comandas**     | Gerenciar mesas e comandas |
| **Pedidos**      | Criar e acompanhar pedidos |
| **Funcionários** | Gerenciar usuários         |
| **Clientes**     | Cadastro de clientes       |
| **Reservas**     | Agendamentos               |
| **Auditoria**    | Log de ações               |

---

## 🎨 Design

- **UI Framework:** Radix UI
- **Estilos:** Tailwind CSS
- **Ícones:** Lucide React
- **Gráficos:** Recharts
- **Tema:** Claro/Escuro suportado

---

## ⚙️ Configuração

### **Conexão com API**

Arquivo: `src/services/api.ts`

```typescript
const API_URL = "http://localhost:5130/api";

// Requisições automáticas enviam:
// - Header: Authorization: Bearer TOKEN
// - Content-Type: application/json
```

### **Ambiente**

No `vite.config.ts`:

```typescript
server: {
  host: "0.0.0.0",
  port: 8080,
}
```

---

## 🔄 React Hooks Customizados

### **useAuth()**

```typescript
const { user, login, logout, isAuthenticated } = useAuth();

if (!isAuthenticated) {
  return <LoginPage />;
}
```

### **useRestaurant()**

```typescript
const { products, orders, addProduct } = useRestaurant();
```

---

## 🚨 Tratamento de Erros

### **Fallback Automático**

Se a API não responder:

- ❌ API offline → ✅ Sistema continua com dados locais
- Login direto com usuários mock
- Mensagem "(Modo offline)" no UI

---

## 📱 Responsividade

- ✅ Mobile First
- ✅ Tailwind CSS
- ✅ Hook customizado: `use-mobile.tsx`

---

## ♿ Acessibilidade

- ✅ WCAG 2.1 AA
- ✅ VLibras Widget
- ✅ Contrast ratio adequado
- ✅ Textos descritivos
- ✅ Keyboard navigation

---

## 🧪 Scripts Disponíveis

```bash
npm run dev       # Modo desenvolvimento (Vite)
npm run build     # Build para produção
npm run preview   # Preview do build
npm run lint      # ESLint
npm run test      # Vitest
```

---

## 📚 Dependências Principais

- React 18
- React Router DOM
- TypeScript
- Vite
- Tailwind CSS
- Radix UI
- Recharts
- React Query

---

## 🎓 Conceitos Implementados

- ✅ React Hooks
- ✅ Context API
- ✅ Custom Hooks
- ✅ Async/Await
- ✅ Fetch API
- ✅ JWT Token Handling
- ✅ Error Boundaries
- ✅ Component Composition

Depois abra a URL mostrada no terminal (por padrao, algo como `http://localhost:8080`).

## Scripts disponiveis

- `npm run dev`: inicia ambiente de desenvolvimento
- `npm run build`: gera build de producao
- `npm run preview`: sobe build local para validacao
- `npm run lint`: roda verificacoes de lint
- `npm test -- --run`: roda testes automatizados uma vez

## Fluxo recomendado de validacao

Antes de subir alteracoes:

```bash
npm run lint
npm test -- --run
npm run build
```

## Observacoes

- Caso de erro por dependencias corrompidas, rode:

```bash
rm -rf node_modules package-lock.json
npm install
```

No Windows PowerShell, use:

```powershell
Remove-Item -Recurse -Force node_modules, package-lock.json
npm install
```
