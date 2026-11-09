# Systemic PIM Mobile

Aplicativo Expo para Android e iOS, com React Native, TypeScript, Expo Router e
SQLite para cache local. A interface é em português e usa Inter e a marca
Systemic existentes no front-end.

## Executar

Requisitos: Node.js e npm. Instale as dependências e configure a URL da API:

```powershell
cd mobile
npm install
Copy-Item .env.example .env
```

Edite `mobile/.env` e defina `EXPO_PUBLIC_API_URL` com a URL base completa da
API terminando em `/api`, por exemplo:

```dotenv
EXPO_PUBLIC_API_URL=http://IP_DO_COMPUTADOR_NA_REDE:8080/api
```

O Nginx do front-end encaminha as chamadas para a API dentro do Docker. Assim,
o telefone e o computador só precisam alcançar a porta 8080 na rede local.
`localhost` apontaria para o próprio telefone. Em produção, use HTTPS.

Se o app exibir “Não foi possível validar a sessão”, confirme que a API está
em execução no Docker, que o front-end responde no endereço configurado e que
o IP informado ainda é o endereço Wi-Fi atual do computador; confirme também
que o telefone e o computador estão na mesma rede.
Após alterar `mobile/.env`, reinicie o Expo para carregar a nova URL.

Inicie o Metro:

```powershell
npx expo start
```

### Usar o Expo CLI pelo WSL

Se `node` for Linux, mas `npm` ou `npx` apontarem para `/mnt/c/Program Files/nodejs`,
não use `npx expo` para autenticar: ele inicia o CLI pelo runtime do Windows e pode
falhar ao abrir o navegador. No WSL, execute o CLI diretamente com o Node Linux e
use o login sem navegador:

```bash
cd /mnt/c/Users/<usuario-Windows>/Desktop/systemic-pim/mobile
/usr/bin/node ./node_modules/expo/bin/cli login --no-browser
/usr/bin/node ./node_modules/expo/bin/cli whoami
```

Informe suas credenciais somente no terminal local. `whoami` deve mostrar a conta
Expo autenticada. Substitua o caminho do `cd` pelo caminho real do projeto no WSL.

Abra o projeto com Expo Go ou um development build. Para Android, também é
possível usar `npm run android` com um emulador Android configurado. No Windows,
o build/simulador iOS local não está disponível; para validar iOS, use Expo Go
ou um development build em um iPhone físico.

## Autenticação e sessão

O cliente usa `fetch` com `credentials: "include"` e não lê nem persiste o JWT.
Obtém CSRF antes de operações mutáveis, envia `X-CSRF-TOKEN` e renova o token
após login. Ao iniciar, chama `/autenticacao/validar`; um HTTP 401 retorna ao
login. HTTP 429 exibe a mensagem e o tempo de espera informado pela API.

A persistência do cookie `systemic_auth` precisa ser validada no runtime nativo
do Expo em um Android e um iPhone. O fato de `credentials: "include"` constar
nas chamadas não comprova que o cookie persistiu entre requisições. Após
autenticar, feche e reabra o app: se a API devolver 401 à validação inicial,
considere o teste de sessão reprovado e não contorne isso alterando o back-end.

## Acessibilidade

A tela Acessibilidade pode ser aberta pelo ícone no cabeçalho, inclusive depois
de dispensar a dica inicial. Ela informa se um leitor de tela está ativo e
oferece um atalho para os ajustes de Acessibilidade no Android. No iPhone, siga
Ajustes > Acessibilidade > VoiceOver; o iOS não permite que um app ative o
VoiceOver diretamente. Nem o Android permite que o app ative o TalkBack sem
confirmação da pessoa nas configurações do sistema. O app também oferece
rótulos para leitores de tela, um botão acessível para atualizar listas e
respeita o tamanho de texto configurado no Android ou iOS. Na primeira abertura
do app, antes mesmo do login, aparece uma dica de acessibilidade uma única vez
se nenhum leitor de tela estiver ativo; ela pode ser dispensada e consultada
novamente na tela Acessibilidade.

As telas de login, carregamento, acessibilidade, pedido e detalhe da comanda
respeitam as áreas seguras do iOS e Android. Nas abas, o cabeçalho mostra o
nome da pessoa autenticada e mantém os nomes das telas nos itens da navegação
inferior.

## Telas e endpoints

Todos os caminhos abaixo são relativos a `/api`; as chamadas mutáveis enviam
`X-CSRF-TOKEN`.

| Tela | Acesso | Endpoints |
|---|---|---|
| Login e sessão | Todos | `GET /autenticacao/csrf`, `POST /autenticacao/login`, `GET /autenticacao/validar`, `POST /autenticacao/logout` |
| Mesas e comandas | Todos | `GET /mesa`, `GET /comanda`, `GET /comanda/abertas/todas`, `GET /comanda/{id}`, `POST /comanda` |
| Detalhe da comanda | Todos | `POST /comanda/{id}/itens`, `DELETE /comanda/{id}/itens/{itemId}`, `GET /formapagamento`, `PUT /comanda/{id}/pagar`, `PUT /comanda/{id}/fechar` |
| Pedidos e status | Todos | `GET /pedidos`, `GET /comanda/abertas/todas`, `GET /produto`, `POST /pedidos`, `PUT /pedidos/{id}/status` |
| Reservas | Todos | `GET /reserva`, `POST /reserva`, `DELETE /reserva/{id}`, `GET /mesa` |
| Notificações | Todos | `GET /notificacoes`, `PATCH /notificacoes/{id}/lida`, `POST /notificacoes/marcar-todas-lidas` |
| Resumo financeiro | `admin`, `owner` | `GET /faturamento`, `GET /faturamento/receita-por-forma?dataInicio=…&dataFim=…`, `GET /faturamento/produtos-mais-vendidos` |
| Produtos e estoque | `admin`, `owner` | `GET /produto` |

O endpoint de pagamento fecha a comanda e libera a mesa. A ação de fechamento
separada chama `PUT /comanda/{id}/fechar`; a API registra esse caminho com a
forma de pagamento cujo ID é `1`, por isso o app pede confirmação explícita.
Abrir uma comanda usa `idCliente: 0`, valor que o serviço da API trata como
solicitação do cliente padrão “Consumidor”. Criar pedidos exige comanda aberta;
o app não cria pedidos sem comanda.

Mesas, produtos, comandas abertas e reservas têm cache SQLite e atualização ao
abrir a tela ou puxar a lista para atualizar. O cache é limpo ao sair da conta.
