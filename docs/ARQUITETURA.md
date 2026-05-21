# Arquitetura do Projeto

Este documento descreve como o código do Systemic está organizado e como as diferentes partes do sistema se comunicam.

## Estrutura Geral do Projeto

O Systemic é dividido em duas partes principais que trabalham juntas:

back-end/ (API em C# .NET)
  Controllers/ - Define as rotas e endpoints da API
  Models/ - Estrutura dos dados no banco (Funcionario, Produto, Comanda, etc)
  DTOs/ - Definem o formato de entrada e saída de dados
  Services/ - Lógica reutilizável (JWT, criptografia de senha)
  Data/ - Conexão com SQL Server, definição das tabelas
  Program.cs - Configuração principal da API

front-end/ (Interface em React)
  src/components/ - Pequenos componentes reutilizáveis
  src/pages/ - Páginas completas (Login, Dashboard, Produtos, etc)
  src/services/ - Arquivo que comunica com a API
  src/contexts/ - Gerenciamento de estado global (Autenticação)
  src/App.tsx - Componente raiz que define as rotas

docs/ - Documentação técnica

---

## Back-End (C# .NET)

O back-end é responsável por:
- Receber requisições do front-end
- Validar dados
- Acessar SQL Server
- Responder com dados JSON

### Controllers (Rotas da API)

Cada Controller define um conjunto de endpoints relacionados:

- AutenticacaoController: Login e validação de tokens
- ComandaController: CRUD de comandas (mesas e pedidos)
- ProdutoController: CRUD de produtos
- ClienteController: CRUD de clientes
- FuncionarioController: CRUD de funcionários
- MesaController: CRUD de mesas
- ReservaController: CRUD de reservas
- PedidosController: CRUD de pedidos e atualização de status
- FormaPagamentoController: CRUD de formas de pagamento
- BackupController: Gerenciamento de backups
- FaturamentoController: Relatórios e faturamento
- LogController: Consulta de logs de auditoria
- HealthCheckController: Verificação de saúde da API

Todas as respostas seguem o padrão RespostaPadraoDTO:

Sucesso: true/false
Mensagem: Texto explicativo
Dados: Informações retornadas

### Models (Estrutura do Banco)

Os Models representam as tabelas no SQL Server:

- Funcionario: Dados de usuários (nome, email, senha, cargo)
- Mesa: Mesas do restaurante (número, capacidade, status)
- Produto: Cardápio (nome, preço de custo, preço de venda, estoque)
- Comanda: Pedidos (data, status, total, mesa)
- ItemComanda: Itens dentro de uma comanda
- Cliente: Clientes do restaurante
- Reserva: Agendamentos
- FormaPagamento: Tipos de pagamento (dinheiro, pix, crédito, débito)
- DetalhePagamento: Registros de pagamentos
- Despesa: Custos operacionais
- LogComanda: Histórico de ações em comandas
- LogSistema: Auditoria de mudanças no sistema

### DTOs (Formato de Dados)

Os DTOs definem exatamente quais dados entram e saem da API:

- LoginDTO: Email e senha do usuário
- CriarPedidoDTO: Dados para criar um novo pedido
- RespostaPadraoDTO: Formato padrão de todas as respostas
- FuncionarioDto: Dados de um funcionário

Isso é importante porque permite que front-end saiba exatamente quais dados enviar e esperar receber.

### Services (Lógica Reutilizável)

Os Services contêm lógica que pode ser usada por vários Controllers:

- JwtService: Gera e valida tokens JWT
- PasswordHashService: Criptografa senhas com bcrypt
- BackupService: Faz backup do banco de dados

### Data (Conexão com Banco)

- AppDbContext: Conecta com SQL Server, define todas as tabelas (DbSet)
- Entity Framework Core: Biblioteca que facilita trabalhar com banco de dados

### Program.cs (Configuração Principal)

Arquivo que inicia tudo:
- Configura a conexão com SQL Server
- Ativa CORS para aceitar requisições do React
- Configura JWT
- Define qual porta a API vai usar (5130)

---

## Front-End (React com TypeScript)

O front-end é a interface que o usuário vê e interage:
- Mostra telas, formulários, dados
- Envia dados para a API
- Recebe dados da API e exibe

### Components (Componentes Reutilizáveis)

São pequenos blocos de interface que aparecem em várias páginas:

- Botões
- Campos de entrada (input)
- Cards
- Headers
- Barras de navegação
- Modais (janelas pop-up)

Cada componente faz uma coisa bem definida e pode ser reutilizado.

### Pages (Páginas Completas)

Cada página é uma tela completa que o usuário acessa:

- LoginPage: Tela de login (email e senha)
- DashboardPage: Painel principal com resumo de vendas
- ProdutosPage: Lista de produtos, criar, editar, deletar
- ComandaPage: Visualizar mesas, criar comandas
- PedidosPage: Visualizar e atualizar status de pedidos
- FuncionariosPage: Gerenciar usuários
- ReservasPage: Gerenciar agendamentos
- ClientesPage: Gerenciar clientes
- AuditoriaPage: Visualizar logs de mudanças

Cada página usa componentes menores para montar a interface.

### Services (Comunicação com API)

- api.ts: Arquivo central que configura como falar com a API
  Ele adiciona automaticamente o token JWT a cada requisição
  Define a URL base (http://localhost:5130/api)

Você não precisa se preocupar com detalhes de HTTP. Pode usar assim:

```
const resposta = await api.get("/comanda")
const resposta = await api.post("/comanda", dados)
```

### Contexts (Estado Global)

Contexts são usados para compartilhar informações entre componentes sem passar propriedades:

- AuthContext: Informações do usuário logado, token, permissões
- RestaurantContext: Dados do restaurante (produtos, mesas, pedidos)
- AccessibilityContext: Configurações de acessibilidade

### App.tsx (Componente Raíz)

É o componente principal que:
- Define todas as rotas (URLs que o usuário pode acessar)
- Envolve a aplicação com Contexts para compartilhar dados
- Verifica se usuário está logado antes de acessar páginas protegidas

---

## Como Uma Requisição Funciona (Fluxo Completo)

Vamos acompanhar o que acontece quando um usuário faz login:

Passo 1: Usuário digita email e senha e clica em "Entrar"
- O front-end (React) coleta os dados do formulário
- Chama a API: POST /api/autenticacao/login

Passo 2: A requisião chega na API (back-end)
- O AutenticacaoController recebe a requisião
- Valida se email existe no banco
- Valida se senha está correta
- Se tudo OK, gera um token JWT

Passo 3: API envia resposta
- Retorna em formato RespostaPadraoDTO:
  sucesso: true
  mensagem: "Login realizado com sucesso"
  dados:
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    nomeUsuario: "Chef João"

Passo 4: Front-end recebe token e guarda
- Salva o token no localStorage do navegador
- Usa esse token em todas as próximas requisições
- Redireciona para o Dashboard

Passo 5: Próximas requisições
- Toda requisição inclui automaticamente: Authorization: Bearer token_aqui
- A API verifica se o token é válido
- Se válido, processa a requisição
- Se inválido, retorna erro 401 (não autorizado)

Este fluxo garante que apenas usuários autenticados possam acessar dados sensveis.

---

## Padrões que Todo Dev Deve Seguir

### Formato de Resposta

Todas as respostas do back-end devem usar RespostaPadraoDTO:

Correto:
```
return Ok(new RespostaPadraoDTO {
    Sucesso = true,
    Mensagem = "Sucesso!",
    Dados = objeto
});
```

Errado:
```
return Ok(objeto);
```

Isso garante que o front-end sempre receba dados no mesmo formato.

### Códigos HTTP Certos

Use os códigos HTTP corretos:
- 200 OK: Requisição funcionou
- 201 Created: Recurso criado com sucesso
- 400 Bad Request: Dados inválidos
- 401 Unauthorized: Sem token ou token inválido
- 403 Forbidden: Sem permissão para acessar
- 404 Not Found: Recurso não encontrado
- 500 Internal Server Error: Erro no servidor

### Mensagens em Português

Todas as mensagens devem ser em português e amigáveis:

Correto: "Ops! Esse pedido não existe."
Errado: "Entity not found"

Isso ajuda o usuário final (que pode não ser dev) entender o que aconteceu.

### Logs no Console

Use Console.WriteLine para deixar rastro do que está acontecendo:

```
Console.WriteLine($"--> Buscando funcionário ID: {id}");
Console.WriteLine($"--> Login bem-sucedido para: {email}");
```

Isso ajuda muito no debug quando algo dá errado.

---

## Segurança

### JWT (JSON Web Token)

JWT é um token que prova quem você é. Funciona assim:
- Usuário faz login
- API gera um token único com informações do usuário
- Front-end guarda o token
- Em toda requisição, envia o token no header Authorization
- API valida o token antes de processar
- Token expira em 1 hora (usuário precisa fazer login de novo)

### CORS (Controle de Origem)

CORS previne que websites maliciosos acessem sua API:
- React (http://localhost:8080) consegue acessar API (http://localhost:5130)
- Outros websites não conseguem
- Está configurado em Program.cs

### Validações

O back-end valida sempre:
- Email é obrigatório e tem formato válido
- Senha é obrigatória
- Não permite dois usuários com mesmo email
- Bloqueia após 5 tentativas de login incorretas

---

## Banco de Dados (SQL Server)

O SQL Server é onde todos os dados são armazenados permanentemente.

### Connection String

Em back-end/appsettings.Development.json:

```json
"ConnectionStrings": {
  "DefaultConnection": "Server=.;Database=PIM3;Integrated Security=true;"
}
```

Isso significa:
- Server=. : Conectar ao SQL Server local
- Database=PIM3 : Usar banco chamado PIM3
- Integrated Security=true : Usar credenciais do Windows

### Tabelas Principais

Cada Model em C# representa uma tabela no banco:
- Funcionarios: Usuários do sistema
- Mesas: Mesas do restaurante
- Produtos: Cardápio
- Comandas: Pedidos (venda)
- ItemComanda: Itens de cada comanda
- Clientes: Clientes do restaurante
- Reservas: Agendamentos
- FormaPagamento: Tipos de pagamento
- DetalhePagamento: Registros de pagamentos
- Despesas: Custos
- LogComanda: Histórico de ações
- LogSistema: Auditoria geral

### Como Acessar o Banco

O back-end usa:
- Entity Framework Core: Biblioteca que facilita trabalhar com banco
- AppDbContext: Classe que gerencia conexão e tabelas

Você não escreve SQL. Escreve assim:

```csharp
var usuario = await _context.Funcionarios.FindAsync(id);
```

O Entity Framework converte para SQL automaticamente.

---

## Como Adicionar Novas Funcionalidades

### Adicionar um Novo Endpoint na API

Vamos supor que você quer criar um endpoint para listar categorias de produtos.

Passo 1: Criar o Controller
```csharp
// back-end/Controllers/CategoriaController.cs
[ApiController]
[Route("api/[controller]")]
public class CategoriaController : ControllerBase
{
    // Métodos aqui
}
```

Passo 2: Criar o DTO (se necessário)
```csharp
// back-end/DTOs/CategoriaDTO.cs
public class CategoriaDTO
{
    public int Id { get; set; }
    public string Nome { get; set; }
}
```

Passo 3: Implementar o método
```csharp
[HttpGet]
public async Task<IActionResult> ListarCategorias()
{
    var categorias = await _context.Categorias.ToListAsync();
    
    return Ok(new RespostaPadraoDTO
    {
        Sucesso = true,
        Mensagem = "Categorias listadas com sucesso",
        Dados = categorias
    });
}
```

Passo 4: Testar em http://localhost:5130/api/categoria

### Adicionar uma Nova Página no React

Vamos criar uma página para listar categorias.

Passo 1: Criar a página
```typescript
// front-end/src/pages/CategoriasPage.tsx
export default function CategoriasPage() {
    const [categorias, setCategorias] = useState([]);
    
    useEffect(() => {
        carregarCategorias();
    }, []);
    
    const carregarCategorias = async () => {
        const resposta = await api.get("/categoria");
        setCategorias(resposta.data.dados);
    };
    
    return (
        <div>
            <h1>Categorias</h1>
            {categorias.map(cat => (
                <div key={cat.id}>{cat.nome}</div>
            ))}
        </div>
    );
}
```

Passo 2: Adicionar a rota no App.tsx
```typescript
// front-end/src/App.tsx
import CategoriasPage from "./pages/CategoriasPage";

// Dentro do Router:
<Route path="/categorias" element={<CategoriasPage />} />
```

Passo 3: Acessar em http://localhost:8080/categorias

Pronto! Você adicionou uma nova funcionalidade do zero.

---

## Debug e Troubleshooting

### Ver Logs da API

Abra o terminal onde você rodou "dotnet run":

Você verá mensagens como:
- "--> Alguém tentou fazer login com email: chef@email.com"
- "--> Login bem-sucedido para: chef@email.com"
- "--> Erro: Funcionário não encontrado"

Esses logs ajudam a entender o que a API está fazendo.

### Ver Requisições de Rede no React

Abra as ferramentas do navegador (F12 ou Ctrl+Shift+I):
- Vá em "Network"
- Faça uma ação (como clicar em um botão)
- Você verá as requisições HTTP:
  - POST /api/autenticacao/login
  - GET /api/comanda
  - etc

Clique em cada uma para ver:
- Status (200 = OK, 404 = Não encontrado, 500 = Erro)
- Headers
- Response (dados que voltaram)

Isso é muito útil para debugar.

---

## Resumo das Responsabilidades

| Pasta | O que faz |
|-------|----------|
| Controllers | Recebe requisições HTTP e responde |
| Models | Define a estrutura das tabelas do banco |
| DTOs | Define o formato de dados que entra e sai |
| Services | Lógica que pode ser usada por vários Controllers |
| Data | Gerencia conexão com SQL Server |
| components (React) | Pequenos blocos de interface reutilizáveis |
| pages (React) | Páginas completas que o usuário vê |
| services (React) | Comunicação com a API |

---

Próximo: Leia CONFIGURACAO.md para aprender como iniciar o projeto
