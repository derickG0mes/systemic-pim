USE [DB_RESTAURANTE];
GO

SET NOCOUNT ON;
SET XACT_ABORT ON;

IF N'$(E2E_SEED)' <> N'1'
BEGIN
    ;THROW 51010, 'O seed E2E exige E2E_SEED=1.', 1;
END;

DECLARE @Email VARCHAR(100) = N'$(E2E_ADMIN_EMAIL)';
DECLARE @PasswordHash VARCHAR(255) = N'$(E2E_ADMIN_PASSWORD_HASH)';

IF @Email <> 'admin@restaurante.com'
BEGIN
    ;THROW 51011, 'O seed E2E só pode reutilizar o admin padrão de desenvolvimento.', 1;
END;

IF @PasswordHash NOT LIKE 'pbkdf2-sha256$v1$600000$%$%'
BEGIN
    ;THROW 51012, 'O hash de senha E2E não está no formato PBKDF2 esperado.', 1;
END;

IF NOT EXISTS (
    SELECT 1
    FROM dbo.FUNCIONARIO
    WHERE EMAIL_FUNCIONARIO = @Email
      AND ROLE = 'admin'
)
BEGIN
    ;THROW 51013, 'O admin padrão de desenvolvimento não foi encontrado.', 1;
END;

UPDATE dbo.FUNCIONARIO
SET PASSWORD_FUNCIONARIO = @PasswordHash,
    STATUS_FUNCIONARIO = 'ATIVO',
    LOGIN_ATTEMPTS = 0,
    LOCKED_UNTIL = NULL
WHERE EMAIL_FUNCIONARIO = @Email
  AND ROLE = 'admin';
GO
