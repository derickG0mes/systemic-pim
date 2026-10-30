# Testes E2E

Os testes usam Playwright contra o Docker Compose já iniciado e exigem uma conta
admin de teste fornecida por variáveis de ambiente. Nenhuma credencial é salva
no repositório.

No PowerShell, defina `E2E_ADMIN_EMAIL` e `E2E_ADMIN_PASSWORD`. Opcionalmente,
configure `E2E_BASE_URL` (padrão `http://localhost:8080`) e `E2E_API_URL`
(padrão `http://localhost:5050/api`). Em seguida:

```powershell
docker compose up -d --build --wait
cd front-end
npm.cmd ci
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

O fluxo de backup gera, lista e baixa um ZIP; também testa somente a abertura
da confirmação de restauração. O teste de cozinha cria dados temporários pela
API e remove os registros no `finally`; confirma que o pedido chega via SignalR
sem navegação da página. Os testes VLibras verificam carregamento real e o aviso
quando a rota do script é bloqueada.

Os testes ficam marcados como ignorados quando as duas variáveis de credenciais
não estão configuradas. A geração do backup mantém o arquivo no volume de
backups do Compose, como qualquer backup gerado pela aplicação.
