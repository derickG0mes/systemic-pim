# Changelog

Todas as mudanças relevantes deste projeto são registradas aqui.

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).
O projeto ainda não publica versões com tag git; as entradas abaixo são
organizadas por data. A API reporta a versão `2.0` em `ApiMetadata` e o app
mobile a versão `1.0.0` em `app.json`.

## [Não lançado]

### Corrigido

- Login passa a recusar funcionários com `STATUS_FUNCIONARIO` diferente de
  `ATIVO`, tanto no login por e-mail (`AutenticacaoService`) quanto no login por
  CPF (`FuncionarioService`). Antes, uma conta inativada continuava autenticando.
- `GET /api/faturamento` (resumo do dia) passa a calcular o dia no fuso de
  Brasília, coerente com as datas de fechamento e de despesa gravadas pelo
  banco. Antes usava a data em UTC, o que podia divergir perto da meia-noite.
- CD (`cd.yml`): o volume externo `systemic-pim_aspnet_data_protection_keys` é
  criado antes de `docker compose up` e removido no teardown, evitando falha na
  subida do Compose.

### Adicionado

- **Push remoto no app mobile (notificação com o app fechado).** A API envia cada notificação também
  ao Expo Push Service (FCM/APNs) para os aparelhos cadastrados. Inclui o script
  `05-create-push-devices.sql` (tabela `DISPOSITIVO_PUSH`), os endpoints
  `PUT` e `DELETE /api/notificacoes/dispositivos`, o `ExpoPushSender` (envio em segundo plano, limpeza
  de tokens inválidos), o registro do token no app (login/logout), a anti-duplicidade com o SignalR e o
  suporte a abrir a tela ao tocar na notificação com o app fechado. Exige credenciais do Firebase/Apple
  no Expo; veja `docs/PUSH_NOTIFICATIONS.md`. A variável opcional `EXPO_ACCESS_TOKEN` habilita a
  segurança reforçada de push.
- Script `01-create-database-idempotent.sql`: as quatro contas iniciais passam
  a nascer com uma senha conhecida de desenvolvimento (`Systemic@2026`), com
  hash PBKDF2-SHA256 versionado validado contra o `PasswordHashService`. Bancos
  já criados não são alterados.
- `front-end/nginx.conf`: bloco HTTPS de produção pronto (Cenário A, Nginx como
  borda de TLS) com redirecionamento 80 → 443 e `X-Forwarded-Proto: https`.

### Alterado

- `back-end/back-end.http` passa a usar o fluxo real de autenticação (CSRF +
  cookie de sessão) em vez do header `Authorization: Bearer`.
- CI (`ci.yml`): novo job que roda `npm ci`, `npm run typecheck` e
  `npm run lint` no app mobile.
- `systemic-pim.sln` passa a incluir o projeto de testes
  (`tests/back-end.Tests.csproj`).
- `.env.example` (raiz e back-end) e `front-end/.env.example` revisados: valores
  padrão em campos numéricos, remoção da variável inexistente `API_PORT` e nota
  explícita de que o front-end não usa variáveis `VITE_*` em tempo de execução.

### Removido

- Arquivos obsoletos: `package-lock.json` vazio da raiz,
  `front-end/install.js`, `front-end/install.cjs` e o log versionado
  `front-end/build_output.txt`.

## Histórico anterior

O projeto foi desenvolvido entre abril e novembro de 2026 e reúne:

- API REST em ASP.NET Core/.NET 10 com SQL Server, autenticação por cookie JWT
  HttpOnly e proteção CSRF, limites de taxa, backup assinado por HMAC e
  notificações em tempo real por SignalR.
- Interface web React 18 + Vite (PWA) e aplicativo mobile Expo/React Native.
- Orquestração por Docker Compose e pipelines de CI e CD no GitHub Actions.

Consulte o histórico do Git para o detalhamento commit a commit.
