# Systemic PIM Mobile

Aplicativo Expo para Android e iOS, com React Native, TypeScript, Expo Router e
SQLite para cache local. A interface é em português e usa Inter e a marca
Systemic existentes no front-end.

## Executar

Requisitos: Node.js e npm. Instale as dependências e configure a URL da API:

```powershell
cd mobile
npm ci
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

## Gerar e instalar o APK Android

O perfil `preview` gera um APK de distribuição interna. Ele aponta para o
ambiente `preview` do Expo Services (`"environment": "preview"` em `eas.json`) e
**não traz mais a URL da API**: `EXPO_PUBLIC_API_URL` precisa existir como
variável desse ambiente, e `app.config.js` aborta o build se ela estiver
ausente, inválida ou não terminar em `/api`. Arquivos `.env` locais não são
enviados ao build remoto. Crie a variável uma vez (e atualize-a quando o IP
mudar), com o IPv4 do computador na rede Wi-Fi:

```powershell
npx eas-cli@latest env:set --name EXPO_PUBLIC_API_URL --value "http://IP_DO_COMPUTADOR_NA_REDE:8080/api" --environment preview --visibility plaintext
```

Também é possível gerenciá-la no painel do projeto em expo.dev (Project
settings > Environment variables). Veja a
[documentação do Expo](https://docs.expo.dev/build-reference/variables/).

⚠️ A CONFIRMAR: o commit que removeu a URL de `eas.json` fala em "arquivo .env
da preview". Confirme se a variável do ambiente `preview` está criada no projeto
Expo (`npx eas-cli@latest env:list --environment preview`); sem ela, o build do
perfil `preview` falha.

O celular precisa alcançar o IP configurado e a porta 8080; não use `localhost`,
que aponta para o próprio celular. A URL é incorporada ao APK durante o build.

Para testar na rede local por HTTP, deixe a API e o Nginx do Docker Compose em
execução e configure `ALLOW_INSECURE_LOCAL_NETWORK=true` no `.env` da raiz
antes de iniciar os containers. Use essa opção somente em uma rede privada de
teste. O perfil `preview` habilita tráfego HTTP para Android; o perfil
`production` não o habilita.

Instale/autentique o EAS CLI e gere o APK:

```powershell
npx eas-cli@latest login
npx eas-cli@latest build --platform android --profile preview
```

Na primeira execução, aceite a configuração/associação do projeto Expo se o
CLI solicitar. Quando o build terminar, baixe o APK pelo link exibido pelo EAS.
Transfira-o para o Android, abra o arquivo e autorize a instalação dessa fonte
quando o sistema solicitar. O perfil `production` exige uma URL HTTPS real:
substitua `https://api.example.invalid/api` em `eas.json` após publicar a API.
O `versionCode` em `app.json` deve ser incrementado nos próximos APKs.

## Sessão no APK standalone

As chamadas de login, CSRF e API usam `credentials: "include"`. Depois do
login, o app descarta o token CSRF anterior, obtém um novo e valida a sessão.
O token CSRF fica apenas em memória; após reabrir o app, a sessão é validada
com o cookie e um novo token CSRF é obtido antes da próxima operação mutável.
Um HTTP 401 limpa a sessão e retorna ao login. Falhas de rede mostram uma
mensagem para conferir a conexão e `EXPO_PUBLIC_API_URL`; telas de espera
exibem indicador de carregamento.

O suporte a cookies persistentes pode variar no runtime nativo e não é
comprovado por um bundle/export. Antes de considerar o APK funcional, teste em
um Android físico:

1. Acesse a API pela URL configurada e faça login; confirme que telas
   autenticadas e operações protegidas por CSRF funcionam.
2. Feche o app completamente e reabra-o; confirme que a sessão continua
   autenticada e que a primeira operação mutável obtém/usa CSRF corretamente.
3. Faça logout, ou invalide/expire a sessão no servidor; confirme que um 401
   retorna ao login e limpa o cache.
4. Desative a rede ou use uma URL inacessível; confirme a mensagem de falha,
   o indicador durante a tentativa e que a tela continua recuperável ao
   restaurar a conexão.
5. Repita login e reabertura usando HTTPS no ambiente publicado antes de gerar
   uma versão de produção.

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

### Temas

Na tela Acessibilidade, a seção **Tema** oferece **Claro**, **Escuro** e **Alto
contraste**. A escolha vale para todas as telas e fica salva no dispositivo
(SQLite local, chave `systemic:accessibility:theme`); o tema inicial é o Claro.

## Notificações em tempo real

O aplicativo possui integração com o **SignalR** (`/hubs/notificacoes`) e **Expo Notifications** (`expo-notifications`):

- **Conexão enquanto o app está em execução:** ao abrir as telas autenticadas, o cliente conecta ao Hub de Notificações (`withCredentials`, mesmo cookie da sessão) e escuta o evento `NotificationCreated`. Cada evento recebido vira uma notificação **local** do dispositivo e entra na central do app.
- **Sem push remoto:** o app não usa FCM/APNs nem token de push. A notificação do sistema só é disparada quando o JavaScript do app está ativo e conectado. ⚠️ A CONFIRMAR: a entrega com o app totalmente fechado ou suspenso pelo sistema não é garantida pelo código e deve ser testada em aparelho físico.
- **Canal de Alta Importância no Android:** as notificações são exibidas nativamente na barra de status do Android através do canal `systemic-default`, com som e vibração habilitados e permissão `POST_NOTIFICATIONS` (Android 13+).
- **Abertura da tela ao tocar:** ao clicar em qualquer notificação no sistema, o app realiza o roteamento automático:
  - Pedidos (`pedido_*`) direcionam para a aba **Pedidos**.
  - Reservas (`reserva_*`) direcionam para a aba **Reservas**.
  - Estoque baixo (`estoque_baixo`) direciona para a aba **Produtos e Estoque**; um link que contenha `inventory` (como em `estoque_reabastecido`) também leva a essa aba, e `orders`/`reservations` levam às respectivas abas.
- **Resiliência e Reconexão:** o cliente SignalR implementa reconexão automática (`[0, 2s, 5s, 10s, 30s]`). Caso a conexão caia, a central de notificações mantém uma sincronização periódica (polling) a cada 30 segundos (com o app em primeiro plano) e ao retornar ao aplicativo. O cabeçalho da central mostra "Tempo real conectado" ou "Modo periódico".

Os tipos de notificação e seus destinatários estão em [docs/API.md](../docs/API.md#notificações).

## Navegação e perfis

Após o login, `employee` abre em **Mesas**; `admin` e `owner` abrem em **Resumo**.
A barra inferior mostra **Mesas**, **Pedidos** e **Reservas** para todos os
perfis, e **Resumo** e **Produtos** somente para `admin` e `owner`. Relatórios,
Usuários e Auditoria são abertos por botões na tela Resumo. Ocultar telas por
perfil é só conveniência da interface: a API aplica a autorização (veja
[docs/API.md](../docs/API.md#perfis-e-permissões)).

A tela **Pedidos** se atualiza sozinha a cada 15 segundos enquanto está em foco.
Mesas, produtos, comandas, pedidos e reservas ficam em cache SQLite local.

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
| Notificações | Todos | `GET /notificacoes`, `PATCH /notificacoes/{id}/lida`, `POST /notificacoes/marcar-todas-lidas`, `WS /hubs/notificacoes` |
| Resumo financeiro | `admin`, `owner` | `GET /faturamento`, `GET /faturamento/receita-por-forma?dataInicio=…&dataFim=…`, `GET /faturamento/produtos-mais-vendidos` |
| Relatórios detalhados | `admin`, `owner` | `GET /faturamento/relatorio?dataInicio=…&dataFim=…`, `GET /faturamento/receita-por-forma?dataInicio=…&dataFim=…` |
| Produtos e estoque | `admin`, `owner` | `GET /produto`, `POST /produto`, `PUT /produto/{id}/ajustar-estoque` |
| Logs de auditoria | `admin`, `owner` | `GET /log/sistema?pagina=…&tamanho=…&filtro=…` |
| Usuários (Funcionários) | `admin`, `owner` | `GET /funcionario`, `POST /funcionario`, `PUT /funcionario/{id}`, `DELETE /funcionario/{id}` |

O endpoint de pagamento fecha a comanda e libera a mesa. A ação de fechamento
separada chama `PUT /comanda/{id}/fechar`; a API registra esse caminho com a
forma de pagamento cujo ID é `1`, por isso o app pede confirmação explícita.
Abrir uma comanda usa `idCliente: 0`, valor que o serviço da API trata como
solicitação do cliente padrão “Consumidor”. Criar pedidos exige comanda aberta;
o app não cria pedidos sem comanda.

Mesas, produtos, comandas abertas e reservas têm cache SQLite e atualização ao
abrir a tela ou puxar a lista para atualizar. O cache é limpo ao sair da conta.

## Verificações e estrutura

O CI do repositório não cobre o mobile. Antes de abrir um pull request, rode a
partir de `mobile/`:

```powershell
npm run typecheck
npm run lint
```

```text
mobile/
  app/             Rotas do Expo Router: login, (tabs), comanda/[id], pedido/novo,
                   reports, users, audit, accessibility
  src/components/  Componentes de tela (AuthGate, NotificationsCenter, Panel...)
  src/contexts/    AuthContext e ThemeContext
  src/hooks/       useCachedResource e useSignalRNotifications
  src/services/    api, http (CSRF, cookies, erros), cache SQLite e notificações
  src/theme/       Cores dos três temas e estilos
  app.config.js    Validação de EXPO_PUBLIC_API_URL nos builds EAS
  app.json         Identificação do app (Android: com.systemicpim.app) e permissões
  eas.json         Perfis de build: preview (APK) e production
```
