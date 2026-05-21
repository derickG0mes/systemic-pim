# Configuração de Setup - Backend e Frontend

Este documento descreve como configurar e executar o sistema Systemic em seu ambiente local.

## Começar Rápido

### Back-End (API .NET)

Primeiro, inicie a API que fornece os dados para o front-end:

```bash
cd back-end
dotnet run
```

Se tudo funcionar corretamente, você verá no terminal mensagens informando que a API está pronta. A API estará disponível em:

- Endereço principal: http://localhost:5130/api
- Verificação de saúde: http://localhost:5130/api/healthcheck

### Front-End (React)

Em outro terminal, inicie a interface do usuário:

```bash
cd front-end
npm install
npm run dev
```

Após alguns segundos, você verá uma mensagem indicando que a interface está pronta. Acesse:

- URL: http://localhost:8080

---

## Conectar React na API

### Como o front-end se comunica com a API

O arquivo que faz essa comunicação já existe em `front-end/src/services/api.ts`. Este arquivo:

- Define a URL base da API (http://localhost:5130/api)
- Adiciona automaticamente o token JWT em cada requisição
- Define headers padrão (Content-Type, Authorization)
- Trata respostas e erros

Não é necessário criar este arquivo. Ele já está no projeto.



---

## Autenticação com JWT

Todos os acessos ao sistema começam com login. Aqui está como funciona:

### Fazer Login

Você pode testar o login fazendo uma requisição para:

```
POST http://localhost:5130/api/autenticacao/login
```

Com o corpo (body) em JSON:

```json
{
  "email": "admin@restaurante.com",
  "senha": "admin123"
}
```

Se funcionar, a API responde com um token JWT que você usa em todas as próximas requisições.

### Como o Front-End Usa o Token

Depois do login, o token é guardado no localStorage do navegador. Cada requisição posterior inclui automaticamente o token no header:

```
Authorization: Bearer seu_token_jwt_aqui
```

Você não precisa fazer isso manualmente. O arquivo `api.ts` já faz isso por você.

---

## Principais Endpoints da API

Este é um resumo dos endpoints (rotas) mais importantes. Cada um deles exige que você esteja autenticado (com o token JWT).

Autenticação:
- POST /api/autenticacao/login - Fazer login no sistema
- GET /api/autenticacao/validar - Verificar se token ainda é válido

Pedidos e Comandas:
- GET /api/comanda - Listar todas as comandas
- GET /api/comanda/{id} - Pegar detalhes de uma comanda
- POST /api/comanda - Criar nova comanda
- PUT /api/comanda/{id} - Atualizar comanda
- DELETE /api/comanda/{id} - Deletar comanda

Produtos:
- GET /api/produto - Listar todos os produtos
- POST /api/produto - Criar novo produto
- PUT /api/produto/{id} - Atualizar produto
- DELETE /api/produto/{id} - Deletar produto

Verificação de Saúde:
- GET /api/healthcheck - Verificar se a API está funcionando
- GET /api/healthcheck/database - Verificar se o banco de dados está conectado

---

## Resolvendo Problemas Comuns

Erro: "CORS policy" ou "cross-origin"
- O navegador está bloqueando a requisição porque front-end e API estão em portas diferentes
- Confirme: React em http://localhost:8080 e API em http://localhost:5130
- A API deve permitir CORS (está configurado em Program.cs)

Erro: "Connection refused" ou "não conseguiu conectar"
- A API não está rodando ou está em porta diferente
- Verifique: execute dotnet run na pasta back-end
- Verifique se aparece mensagem de sucesso no terminal

Erro: "401 Unauthorized"
- Você fez uma requisição sem token ou com token inválido
- Faça login novamente para pegar um token válido
- Verifique se o token está sendo guardado no localStorage

Erro: "Database connection failed" ou erro de conexão com banco
- SQL Server não está rodando em sua máquina
- Verifique a connection string em back-end/appsettings.Development.json
- Certifique-se que SQL Server está instalado e iniciado

---

## Como a API Responde

Todas as respostas vêm neste formato padrão:

```json
{
  "sucesso": true,
  "mensagem": "Texto explicando o que aconteceu",
  "dados": {
    "campo1": "valor1",
    "campo2": "valor2"
  },
  "codigoErro": null
}
```

Você sempre recebe:
- sucesso: true ou false (indicando se funcionou)
- mensagem: Texto em português explicando o resultado
- dados: Informações (se houver)
- codigoErro: Código de erro (se falhar)

Isso facilita saber exatamente o que aconteceu em cada requisição.

---

## URLs para Testar Rapidamente

Aqui estão os endereços que você precisa para testar o sistema:

| Serviço | URL |
| --- | --- |
| Front-end (Interface) | http://localhost:8080 |
| API (Backend) | http://localhost:5130/api |
| Verificar se API está viva | http://localhost:5130/api/healthcheck |
| Banco de dados (SQL Server) | Configurado em appsettings.Development.json |

---

## Checklist para Verificar se Tudo Está Funcionando

Before you start, make sure:
- .NET SDK 10 ou superior está instalado
- Node.js e npm estão instalados
- SQL Server está instalado e em execução

Depois de iniciar:
- Back-end: Execute dotnet run na pasta back-end
- Verifique se http://localhost:5130/api/healthcheck responde (deve mostrar status OK)
- Front-end: Execute npm run dev na pasta front-end
- Acesse http://localhost:8080 no navegador
- Tente fazer login com: admin@restaurante.com / admin123
- Se conseguir acessar o dashboard, está tudo funcionando

---

Próximo: Leia ARQUITETURA.md para entender como o código está organizado
