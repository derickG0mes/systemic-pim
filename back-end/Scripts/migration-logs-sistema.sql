-- ============================================================
-- MIGRAÇÃO: Adicionar tabelas de LOG com fuso horário Brasília
-- Data: 17 de maio de 2026
-- ============================================================

-- 1. Criar tabela LOG_SISTEMA se não existir
IF OBJECT_ID('LOG_SISTEMA', 'U') IS NULL
BEGIN
    CREATE TABLE LOG_SISTEMA (
        ID_LOG_SISTEMA INT PRIMARY KEY IDENTITY(1,1),
        DATA_LOG DATETIME2 NOT NULL DEFAULT (CAST(GETUTCDATE() AT TIME ZONE 'UTC' AT TIME ZONE 'E. South America Standard Time' AS DATETIME2)),
        TIPO_LOG VARCHAR(50) NOT NULL, -- 'ESTOQUE', 'USUARIO', 'PEDIDO', 'AUDITORIA'
        DESCRICAO_LOG VARCHAR(500) NOT NULL,
        USUARIO_LOG VARCHAR(100) NULL,
        DADO_ANTERIOR VARCHAR(MAX) NULL,
        DADO_NOVO VARCHAR(MAX) NULL
    );
    
    PRINT '✅ Tabela LOG_SISTEMA criada com sucesso';
END
ELSE
    PRINT '⚠️ Tabela LOG_SISTEMA já existe';

GO

-- 2. Criar índice para otimizar buscas por data se não existir
IF NOT EXISTS (SELECT 1 FROM SYS.INDEXES WHERE NAME = 'IDX_LOG_SISTEMA_DATA')
BEGIN
    CREATE NONCLUSTERED INDEX IDX_LOG_SISTEMA_DATA
    ON LOG_SISTEMA(DATA_LOG DESC);
    
    PRINT '✅ Índice IDX_LOG_SISTEMA_DATA criado com sucesso';
END
ELSE
    PRINT '⚠️ Índice IDX_LOG_SISTEMA_DATA já existe';

GO

-- 3. Corrigir DEFAULT em LOG_COMANDA se existir e não tiver configurado corretamente
IF OBJECT_ID('LOG_COMANDA', 'U') IS NOT NULL
BEGIN
    -- Verificar se já tem constraint
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
        WHERE TABLE_NAME = 'LOG_COMANDA' AND CONSTRAINT_NAME LIKE 'DF_%DATA_LOG%'
    )
    BEGIN
        ALTER TABLE LOG_COMANDA
        ADD CONSTRAINT DF_LOG_COMANDA_DATA_LOG 
        DEFAULT (CAST(GETUTCDATE() AT TIME ZONE 'UTC' AT TIME ZONE 'E. South America Standard Time' AS DATETIME2))
        FOR DATA_LOG;
        
        PRINT '✅ DEFAULT constraint adicionado a LOG_COMANDA.DATA_LOG';
    END
    ELSE
        PRINT '⚠️ DEFAULT constraint já existe em LOG_COMANDA';
END

GO

PRINT '================================';
PRINT '✅ Migração concluída com sucesso!';
PRINT '================================';
