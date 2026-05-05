# 📚 ÍNDICE GERAL - PIM3 Backend

Bem-vindo ao backend do **Sistema de Gerenciamento de Restaurante**! 

Este arquivo lista todos os recursos criados para ajudar você e seu grupo.

---

## 📖 Documentação

### 1. **[QUICK_START.md](QUICK_START.md)** ⚡
   - Setup em 5 minutos
   - Instalar, configurar, rodar
   - Testar login imediatamente

### 2. **[README.md](README.md)** 📖
   - Estrutura completa do projeto
   - Pré-requisitos e configuração
   - Todos os endpoints disponíveis
   - Como testar com Postman
   - Troubleshooting

### 3. **[PIM3.API/DOCUMENTACAO.md](PIM3.API/DOCUMENTACAO.md)** 📚
   - Explicação técnica detalhada
   - Como funciona autenticação JWT
   - Segurança de senhas
   - Estrutura do banco de dados
   - Cálculos de faturamento
   - **O que explicar para os professores**

### 4. **[CHECKLIST_APRESENTACAO.md](CHECKLIST_APRESENTACAO.md)** 🎓
   - Pontos-chave para apresentação
   - Respostas para perguntas comuns
   - Sugestões de demo prática
   - Checklist do dia da apresentação

---

## 💻 Código

### Estrutura do Projeto

```
PIM3.API/
├── Models/                    → Entidades do banco
│   ├── Funcionario.cs
│   ├── Cliente.cs
│   ├── Mesa.cs
│   ├── Comanda.cs
│   ├── ItemComanda.cs
│   ├── Produto.cs
│   ├── FormaPagamento.cs
│   ├── Reserva.cs
│   ├── DetalhePagamento.cs
│   ├── Despesa.cs
│   └── LogComanda.cs
│
├── Controllers/               → Endpoints HTTP
│   ├── FuncionarioController.cs     (Login, CRUD)
│   ├── ClienteController.cs         (CRUD clientes)
│   ├── MesaController.cs            (CRUD mesas)
│   ├── ComandaController.cs         (Pedidos completos)
│   ├── ProdutoController.cs         (CRUD produtos)
│   ├── FormaPagamentoController.cs  (CRUD formas)
│   └── FaturamentoController.cs     (Relatórios)
│
├── Data/
│   └── AppDbContext.cs              → Configuração do banco
│
├── Services/
│   ├── PasswordHashService.cs       → Hashing de senha
│   └── JwtService.cs                → Geração de token JWT
│
├── DTOs/
│   └── FuncionarioDto.cs            → Sem dados sensíveis
│
├── Hubs/
│   └── CozinhaHub.cs                → SignalR (tempo real)
│
├── appsettings.json                 → Config (banco, JWT)
├── Program.cs                       → Setup da aplicação
├── DOCUMENTACAO.md                  → Explicação técnica
└── .gitignore                       → Não commitar sensível
```

---

## 🔗 Integração React

### **[EXEMPLO_INTEGRACAO_REACT.ts](EXEMPLO_INTEGRACAO_REACT.ts)** 
Copie este arquivo para `src/services/api.ts` do seu React.

Inclui serviços prontos para:
- Login/Logout
- CRUD de Funcionários, Clientes, Mesas, Produtos
- Comandas (abrir, adicionar itens, fechar)
- Faturamento (relatórios)
- Exemplos de uso em componentes

---

## 🎯 Como Usar Este Material

### Cenário 1: Você está começando agora
1. Leia **QUICK_START.md** (5 min)
2. Configure o banco seguindo as instruções
3. Rode `dotnet run`
4. Teste no Postman

### Cenário 2: Você precisa explicar o código
1. Abra **DOCUMENTACAO.md**
2. Leia a seção sobre o componente específico
3. Abra o arquivo `.cs` correspondente
4. Leia linha-por-linha para entender

### Cenário 3: Você vai apresentar
1. Estude **CHECKLIST_APRESENTACAO.md**
2. Pratique as explicações
3. Prepare exemplos no Postman
4. Tenha respostas prontas para perguntas

### Cenário 4: Conectar com React
1. Copie **EXEMPLO_INTEGRACAO_REACT.ts** para seu projeto
2. Instale `axios` e `@microsoft/signalr`
3. Importe os serviços nos seus componentes
4. Consulte os comentários para ver como usar

---

## 🔑 Principais Features

### ✅ Autenticação
- Login com JWT
- Bloqueio após 5 tentativas falhadas
- Senhas criptografadas com PBKDF2 + SHA256
- Tokens com validade de 8 horas

### ✅ CRUD Completo
- Funcionários
- Clientes
- Mesas
- Produtos
- Formas de Pagamento

### ✅ Lógica de Negócio
- **Comandas**: Abrir → Adicionar Itens → Fechar → Pagar
- **Faturamento**: Receita - Despesa = Lucro
- **Relatórios**: Por data, forma de pagamento, categoria

### ✅ Tempo Real
- SignalR Hub para notificações da cozinha
- Eventos: PedidoNovo, PedidoEmPreparo, PedidoPronto

### ✅ Segurança
- CORS configurado
- JWT Bearer Authentication
- Dados sensíveis em DTOs
- Validações em todos os controllers

### ✅ Banco de Dados
- 11 tabelas relacionadas
- Entity Framework Core
- Migrations automáticas
- SQL Server

---

## 📊 Endpoints Resumidos

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/funcionario/login` | Fazer login |
| GET | `/api/funcionario` | Listar funcionários |
| POST | `/api/cliente` | Criar cliente |
| GET | `/api/comanda` | Listar comandas |
| POST | `/api/comanda` | Abrir comanda |
| POST | `/api/comanda/{id}/itens` | Adicionar item |
| PUT | `/api/comanda/{id}/fechar` | Fechar comanda |
| GET | `/api/faturamento/relatorio` | Relatório financeiro |

👉 Lista completa em **README.md**

---

## 🆘 Suporte Rápido

| Problema | Solução |
|----------|---------|
| API não inicia | Verifique `appsettings.json` - string de conexão |
| 401 Unauthorized | Adicione token: `Authorization: Bearer <TOKEN>` |
| CORS Error | Verifique URL do React em `Program.cs` |
| Banco não conecta | SQL Server está rodando? Usuário/senha corretos? |
| Migrations falharam | `dotnet ef database update` |

👉 Mais em **README.md** - Troubleshooting

---

## 📞 Contato com Documentação

- **Dúvida sobre autenticação?** → `DOCUMENTACAO.md` seção 🔐
- **Como conectar React?** → `EXEMPLO_INTEGRACAO_REACT.ts`
- **Erro ao rodar?** → `QUICK_START.md` ou `README.md` Troubleshooting
- **Preparar apresentação?** → `CHECKLIST_APRESENTACAO.md`
- **Entender banco de dados?** → `DOCUMENTACAO.md` seção 🗄️
- **Conhecer todos os endpoints?** → `README.md` seção 📡

---

## ✨ Resumo Final

Você tem:
- ✅ Backend completo em .NET 10.0
- ✅ Autenticação segura com JWT
- ✅ CRUD de 7 recursos principais
- ✅ Cálculos de faturamento precisos
- ✅ SignalR para tempo real
- ✅ Documentação completa e didática
- ✅ Exemplos prontos de integração React
- ✅ Checklist para apresentação

**Tudo pronto para uma apresentação de sucesso! 🎓🚀**

---

## 🎓 Para os Professores

Se estão lendo isto: Esse projeto foi desenvolvido com foco em:

1. **Clareza**: Cada linha de código é explicável
2. **Segurança**: Autenticação JWT, hashing de senha, CORS
3. **Boas práticas**: DTOs, validações, tratamento de erros
4. **Didática**: Documentação completa e exemplos
5. **Funcionalidade**: Sistema completo e operacional

O código não é enterprise/over-engineered. É simples, limpo e fácil de entender.

---

**Sucesso! 🚀**
