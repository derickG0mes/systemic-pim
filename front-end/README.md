# Front-end - Systemic PIM

Interface web do Systemic PIM: React 18, TypeScript, Vite, React Router 7
(pacote `react-router`), TanStack Query, Tailwind CSS e componentes baseados em
Radix/shadcn. Funciona como PWA e recebe atualizações em tempo real da API por
SignalR.

## Requisitos

Node.js 22.12 ou superior (campo `engines` do `package.json`) e npm. A API e o
SQL Server precisam estar no ar; veja o [README principal](../README.md).

## Executar

```powershell
Set-Location front-end
npm ci
npm run dev
```

O Vite sobe em http://localhost:8080 (`host: true`, acessível na rede local) e
encaminha `/api` e `/hubs` (inclusive WebSocket) para `http://localhost:5050`.
O cliente HTTP usa sempre `window.location.origin + "/api"`; **não há variáveis
de ambiente `VITE_*` em uso**. O arquivo `.env.example` desta pasta lista
`VITE_PORT`, `VITE_API_URL`, `VITE_SIGNALR_HUB_URL` e `VITE_APP_ENV`, mas o
código não as lê (veja [VARIAVEIS_AMBIENTE.md](../docs/VARIAVEIS_AMBIENTE.md)).

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento (porta 8080) |
| `npm run dev:fast` | Igual, mas escutando apenas em `127.0.0.1` |
| `npm run build` | `tsc -b` seguido de `vite build` (saída em `dist/`) |
| `npm run preview` | Serve o build de `dist/` |
| `npm run lint` | ESLint (inclui regras `jsx-a11y`) |
| `npm test` | Vitest em modo watch; use `npm test -- --run` para uma execução única |

## Estrutura

```text
front-end/
  public/              favicon, ícones do PWA e offline.html
  src/
    App.tsx            Rotas (carregadas sob demanda) e providers
    main.tsx           Ponto de entrada
    sw.ts              Service worker (Workbox, via vite-plugin-pwa)
    components/        Layout, rota protegida, sino de notificações, VLibras, ui/
    contexts/          AuthContext, RestaurantContext, AccessibilityContext
    hooks/             useSignalR, use-toast, use-mobile
    lib/               rbac.ts (permissões por perfil), utils, audit
    pages/             Uma página por rota
    services/api.ts    Todas as chamadas HTTP à API
    types/             Tipos compartilhados (notificações)
    test/              Testes Vitest
  nginx.conf           Configuração do Nginx usada no contêiner
  Dockerfile           Build em node:22-alpine, runtime em nginx:alpine
```

O alias `@` aponta para `src/`.

## Páginas e permissões

As rotas e os perfis autorizados estão em
[ARQUITETURA.md](../docs/ARQUITETURA.md#módulos-da-interface-web). A matriz usada
pela interface fica em `src/lib/rbac.ts`; ela só controla a navegação, e a API
aplica a autorização efetiva.

## Autenticação e dados

- O JWT fica em cookie HttpOnly; o front-end não o lê. Antes de qualquer
  requisição mutável, `services/api.ts` obtém o token CSRF em
  `/api/autenticacao/csrf` e o envia em `X-CSRF-TOKEN`.
- Ao iniciar, `AuthContext` chama `/api/autenticacao/validar`; a role vem do
  servidor. A chave `restaurant_user` do `localStorage` guarda apenas dados não
  sensíveis do perfil (id, nome, e-mail, role e cargo) e não é fonte de
  autorização.
- Uma resposta 401 de qualquer chamada dispara logout e redireciona para
  `/login`.
- `RestaurantContext` sincroniza comandas, produtos, reservas, mesas e logs; recebe
  eventos do hub `/hubs/cozinha` e, se o hub estiver desconectado, consulta as
  comandas a cada 60 s. O sino (`NotificationsBell`) usa `/hubs/notificacoes` e
  consulta `GET /api/notificacoes` a cada 30 s.

## PWA

O `vite-plugin-pwa` usa a estratégia `injectManifest` com o service worker
`src/sw.ts` e `registerType: "autoUpdate"`. O manifesto se chama "Systemic"
(`pt-BR`, modo `standalone`). O service worker pré-armazena os recursos estáticos
(`html`, `js`, `css`, `svg`, `png`, `woff2`, `ico`) e, sem rede, responde às
navegações com `offline.html`. Chamadas a `/api` não são armazenadas em cache.

## Testes

Os testes ficam em `src/test` e usam Vitest com `jsdom` e Testing Library
(configuração em `vitest.config.ts` e `src/test/setup.ts`). Cobrem erros de API,
CSRF, contextos de autenticação e restaurante (inclusive reversão otimista e
SignalR), sino de notificações, páginas financeiras, fluxos principais, VLibras e
acessibilidade por teclado.

```powershell
npm test -- --run
```

## Docker

O `Dockerfile` (contexto na raiz do repositório) compila o projeto e entrega
`dist/` ao Nginx, com `nginx.conf`: proxy de `/api/` e `/hubs/` para `api:5050`,
fallback de SPA para `index.html` e cabeçalhos de segurança (CSP, `X-Frame-Options`
e outros). Detalhes em [CONFIGURACAO.md](../docs/CONFIGURACAO.md#proxy-cors-limites-e-cabeçalhos-de-segurança).
