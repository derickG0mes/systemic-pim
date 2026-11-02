# Plano de implantação em nuvem

## Provedor e componentes

Usar Azure Container Apps para API e front-end, com Azure SQL Database para os
dados. Após o CI passar na `main`, o CD publica as imagens no GHCR; as
Container Apps recebem essas imagens por uma identidade de pull do registry e
uma nova revisão é criada por tag de commit. O esquema é aplicado com os
scripts SQL versionados antes de apontar a API para o banco.

## Configuração operacional

Configurar `DB_SERVER`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET_KEY`,
`BACKUP_HMAC_KEY`, `CORS_ALLOWED_ORIGINS`, `BACKUP_PATH` e
`FORWARDED_HEADERS_KNOWN_PROXIES` como segredos/configuração do ambiente. Usar
HTTPS/TLS gerenciado no ingress do Azure Container Apps; manter a API acessível
somente pela origem do front-end e restringir a rede do banco.

Manter backups automatizados do Azure SQL e cópias periódicas dos arquivos de
backup da aplicação em armazenamento privado, com retenção e teste de
restauração definidos. A chave HMAC deve ser armazenada em Key Vault e
rotacionada conforme política operacional.

## Estimativa mensal indicativa

- Container Apps com baixo tráfego: aproximadamente US$ 10–40, variável por uso.
- Azure SQL em camada de entrada: aproximadamente US$ 5–30, conforme região e capacidade.
- Armazenamento de backup/tráfego: aproximadamente US$ 1–10; validar preços na região escolhida.
