# Testes E2E

Os testes usam Playwright contra o Docker Compose. O admin de desenvolvimento
existente é reutilizado; em um projeto Compose descartável, o seed opcional
atualiza sua senha somente quando `E2E_SEED=1`. A senha é gerada localmente e
seu hash PBKDF2 é enviado ao seed; não salve nem use essa senha em outro ambiente.

No PowerShell, use o valor de `E2E_ADMIN_EMAIL` em `.env.example` ou `.env`.
Não substitua um `.env` existente. Defina e gere as variáveis E2E na mesma
janela em que executará os testes:

```powershell
$env:E2E_SEED = "1"
$env:SQL_SERVER_PORT = "1434"
$env:FRONTEND_PORT = "8081"
$env:E2E_API_URL = "http://localhost:5050/api"
$env:E2E_BASE_URL = "http://localhost:8081"
$env:CORS_ALLOWED_ORIGINS = "http://localhost:8081"
$emailLine = Get-Content .env -ErrorAction SilentlyContinue | Where-Object { $_ -like 'E2E_ADMIN_EMAIL=*' } | Select-Object -First 1
if (-not $emailLine) {
  $emailLine = Get-Content .env.example | Where-Object { $_ -like 'E2E_ADMIN_EMAIL=*' } | Select-Object -First 1
}
$env:E2E_ADMIN_EMAIL = $emailLine.Substring('E2E_ADMIN_EMAIL='.Length).Trim()
$passwordBytes = New-Object byte[] 32
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($passwordBytes)
$env:E2E_ADMIN_PASSWORD = [Convert]::ToBase64String($passwordBytes)
$salt = New-Object byte[] 16
$rng.GetBytes($salt)
$rng.Dispose()
$kdf = [Security.Cryptography.Rfc2898DeriveBytes]::new(
  $env:E2E_ADMIN_PASSWORD,
  $salt,
  600000,
  [Security.Cryptography.HashAlgorithmName]::SHA256
)
$derivedKey = [Convert]::ToBase64String($kdf.GetBytes(32))
$kdf.Dispose()
$passwordHash = 'pbkdf2-sha256$v1$600000$' + [Convert]::ToBase64String($salt) + '$' + $derivedKey
$env:E2E_ADMIN_PASSWORD_HASH_HEX = [BitConverter]::ToString([Text.Encoding]::ASCII.GetBytes($passwordHash)).Replace('-', '')
$defaultApiWasRunning = [bool](docker compose ps --status running -q api)
if ($defaultApiWasRunning) { docker compose stop api }
try {
  docker compose -p systemic-e2e up -d --build --wait
  Push-Location front-end
  try {
    npm.cmd ci
    npx.cmd playwright install chromium
    npm.cmd run test:e2e
  } finally {
    Pop-Location
  }
} finally {
  docker compose -p systemic-e2e down
  if ($defaultApiWasRunning) { docker compose start api }
}
```

O `E2E_SEED` padrão é `0`; sem ativá-lo, o seed de teste não é executado.
O nome de projeto `systemic-e2e` mantém o banco separado dos volumes de
desenvolvimento. A porta da API (5050) é fixa no front-end; se o Compose normal
estiver ativo, o bloco para temporariamente apenas a API e a reinicia ao final.
O comando `down` preserva os volumes E2E para uma execução posterior. Opcionalmente, configure
`E2E_BASE_URL` (padrão `http://localhost:8080`) e `E2E_API_URL` (padrão
`http://localhost:5050/api`).

O fluxo de backup gera, lista e baixa um ZIP; também testa somente a abertura
da confirmação de restauração. O teste de cozinha cria dados temporários pela
API e remove os registros no `finally`; confirma que o pedido chega via SignalR
sem navegação da página. Os testes VLibras verificam carregamento real e o aviso
quando a rota do script é bloqueada.

Os testes ficam marcados como ignorados quando as duas variáveis de credenciais
não estão configuradas. A geração do backup mantém o arquivo no volume de
backups do Compose, como qualquer backup gerado pela aplicação.

## PWA

O teste `pwa.spec.ts` valida o manifesto instalável, o fallback offline e que
nenhuma URL da API entra no Cache Storage:

```powershell
npm.cmd run test:e2e -- --grep "instala o PWA"
```

O service worker pré-armazena somente os arquivos estáticos gerados pelo build;
requisições `/api` não são armazenadas. Sem rede, navegações recebem
`/offline.html`.

Para validar instalabilidade com Lighthouse, mantenha o Compose no ar e execute:

```powershell
npx.cmd --yes lighthouse@11.7.1 http://localhost:8080 --only-categories=pwa
```
