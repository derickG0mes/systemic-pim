# Systemic - Sistema de Gerenciamento de Restaurante

Systemic é um sistema web completo para gerenciar restaurantes, lanchonetes, padarias e pequenos negócios alimentícios. O projeto foi desenvolvido como Projeto Integrado Multidisciplinar (PIM IV) na UNIP.

## O que é Systemic?

O sistema é dividido em duas partes que trabalham juntas:

- **Back-end (API em C# .NET)** - O cérebro que processa dados e lógica de negócio
- **Front-end (React + TypeScript)** - A interface visual que o usuário interage
- **Banco de Dados (SQL Server)** - Armazena todos os dados

Juntos, formam uma aplicação web responsiva que funciona em celular, tablet e desktop.

## Começar Rápido (3 Passos)

### 1. Abra Dois Terminais

Use VS Code (Ctrl+`) para abrir 2 terminais lado a lado.

### 2. Terminal 1 - Rodar a API

```bash
cd back-end
dotnet run
```

Quando aparecer uma mensagem sobre a API estar pronta, quer dizer que está funcionando. A API estará em:
```
http://localhost:/api
```

### 3. Terminal 2 - Rodar a Interface

```bash
cd front-end
npm install
npm run dev
```

Quando aparecer uma mensagem do Vite, abra no navegador:
```
http://localhost:8080
```

### Credenciais de Teste

Para entrar no sistema use:
- Email: admin@restaurante.com
- Senha: admin123

## Estrutura do Projeto

```
systemic-pim/
├── back-end/                    (API em C# .NET)
│   ├── Controllers/             Endpoints da API
│   ├── Models/                  Estrutura dos dados
│   ├── Services/                Lógica compartilhada
│   ├── Data/                    Conexão com banco
│   └── Program.cs               Configuração principal
│
├── front-end/                   (Interface em React)
│   ├── src/
│   │   ├── contexts/            Dados compartilhados
│   │   ├── services/            Comunicação com API
│   │   ├── pages/               Telas do sistema
│   │   └── components/          Blocos de interface
│   ├── package.json             Dependências
│   └── vite.config.ts           Configuração
│
├── docs/                        (Documentação técnica)
│   ├── CONFIGURACAO.md          Setup e endpoints
│   └── ARQUITETURA.md           Estrutura do código
│
└── README.md                    Este arquivo
```

## O que o Sistema Faz?

O Systemic permite que você:

- Cadastre e gerencie seu cardápio de produtos
- Controle mesas e comandas (pedidos)
- Acompanhe pedidos em tempo real
- Gerencie funcionários e suas permissões
- Registre clientes e reservas
- Veja relatórios e dashboards com vendas
- Rastreie todas as ações (auditoria)
- Use em qualquer tamanho de tela (responsivo)
- Acesse com leitores de tela (acessível)

## Tecnologias Usadas

**Back-end:**
- C# com .NET Core 10
- Entity Framework Core (para banco de dados)
- JWT (para autenticação segura)
- SQL Server

**Front-end:**
- React 18 com TypeScript
- Vite (ferramenta de desenvolvimento)
- Tailwind CSS (estilos)
- React Context API (gerenciamento de dados)
- Radix UI (componentes prontos)

**Banco de Dados:**
- SQL Server
- 12 tabelas relacionadas

## Pré-requisitos

Antes de rodar o projeto, você precisa ter instalado:

- .NET SDK 10 ou superior (https://dotnet.microsoft.com/)
- Node.js 16+ e npm (https://nodejs.org/)
- SQL Server (deve estar rodando localmente)

Se você não sabe se tem estas ferramentas, execute no terminal:

```bash
dotnet --version
node --version
npm --version
```

## Documentação Completa

Para entender melhor o projeto, leia:

1. **[docs/CONFIGURACAO.md](docs/CONFIGURACAO.md)** - Como rodar e conectar tudo
   - Instruções passo a passo
   - Como o front-end se comunica com a API
   - Lista completa de endpoints
   - Como resolver problemas comuns

2. **[docs/ARQUITETURA.md](docs/ARQUITETURA.md)** - Como o código está organizado
   - Explicação de cada pasta
   - Como uma requisição funciona
   - Padrões de código que o projeto segue
   - Como adicionar novas funcionalidades

## Principais Endpoints da API

Aqui estão os endpoints mais usados. Todos exigem autenticação com JWT token:

| Caminho | O que faz |
| --- | --- |
| POST /api/autenticacao/login | Faz login no sistema |
| GET /api/produto | Lista todos os produtos |
| POST /api/produto | Cria um novo produto |
| GET /api/comanda | Lista todas as comandas |
| POST /api/comanda | Cria uma nova comanda |
| GET /api/funcionario | Lista funcionários |
| GET /api/pedidos | Lista pedidos |
| POST /api/pedidos | Cria um novo pedido |
| GET /api/mesa | Lista mesas |
| GET /api/healthcheck | Verifica se a API está viva |

Para ver a lista completa de endpoints, leia [docs/CONFIGURACAO.md](docs/CONFIGURACAO.md).

## Conceitos Implementados

Este projeto é um excelente lugar para aprender:

- Autenticação com JWT (segurança)
- CORS (comunicação entre front e back)
- REST API (como design APIs)
- Entity Framework (comunicar com banco de dados)
- React Hooks (useState, useEffect, useContext)
- Context API (compartilhar dados)
- TypeScript (programação segura)
- Componentes reutilizáveis
- Error handling (tratar erros)

## Como Contribuir ou Expandir

Se você quer adicionar uma nova funcionalidade:

1. Leia [docs/ARQUITETURA.md](docs/ARQUITETURA.md) na seção "Como Adicionar Novas Funcionalidades"
2. Crie um novo Controller no back-end
3. Crie uma nova página no front-end
4. Teste com credenciais de teste

## Estrutura de Pastas Importante

- **back-end/Controllers/** - Endpoints da API (login, produtos, etc)
- **back-end/Models/** - Estrutura das tabelas do banco (Funcionario, Produto, Comanda, etc)
- **back-end/Services/** - Lógica reutilizável (JWT, criptografia)
- **front-end/src/pages/** - Telas principais (Login, Dashboard, Produtos, etc)
- **front-end/src/contexts/** - Dados compartilhados entre componentes
- **front-end/src/services/** - Como falar com a API
- **docs/** - Documentação técnica

## Problemas Comuns

**Erro: "Connection refused" ao rodar dotnet run**
- SQL Server não está rodando. Inicie o SQL Server.

**Erro: "Cannot GET /api/..." no navegador**
- A API back-end não está rodando. Execute `dotnet run` no terminal 1.

**Erro: "CORS policy" no navegador**
- Front-end e back-end precisam estar rodando. Verifique as portas ( para API, 8080 para React).

**Erro: Dependências corrompidas no npm**
No Windows PowerShell:
```powershell
Remove-Item -Recurse -Force node_modules, package-lock.json
npm install
```

No Mac/Linux:
```bash
rm -rf node_modules package-lock.json
npm install
```

## Próximas Leituras

Depois de entender o básico:

1. Leia **docs/CONFIGURACAO.md** para setup detalhado
2. Leia **docs/ARQUITETURA.md** para entender o código
3. Tente adicionar uma nova funcionalidade
4. Explore o código nos Controllers e Pages

## Autores

Projeto desenvolvido como PIM IV (Projeto Integrado Multidisciplinar IV) - UNIP 2026

## Licença

Este projeto está sob licença MIT. Veja arquivo LICENSE para detalhes.
