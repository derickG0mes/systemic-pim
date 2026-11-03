USE [DB_RESTAURANTE];
GO

SET ANSI_NULLS ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET QUOTED_IDENTIFIER ON;
SET NUMERIC_ROUNDABORT OFF;
GO

IF OBJECT_ID(N'dbo.COMANDA', N'U') IS NULL
    THROW 51000, 'A tabela dbo.COMANDA não existe; não é possível aplicar as constraints.', 1;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.COMANDA')
      AND name = N'UX_COMANDA_MESA_ABERTA'
)
BEGIN
    IF EXISTS (
        SELECT ID_MESA
        FROM dbo.COMANDA
        WHERE STATUS_COMANDA = 'ABERTA'
        GROUP BY ID_MESA
        HAVING COUNT(*) > 1
    )
    BEGIN
        SELECT ID_MESA, COUNT(*) AS QUANTIDADE_COMANDAS_ABERTAS
        FROM dbo.COMANDA
        WHERE STATUS_COMANDA = 'ABERTA'
        GROUP BY ID_MESA
        HAVING COUNT(*) > 1;

        THROW 51001, 'Há mesas com múltiplas comandas abertas. Resolva as duplicatas sem excluir dados antes de criar UX_COMANDA_MESA_ABERTA.', 1;
    END;

    CREATE UNIQUE INDEX UX_COMANDA_MESA_ABERTA
        ON dbo.COMANDA(ID_MESA)
        WHERE STATUS_COMANDA = 'ABERTA';
END;
GO

IF OBJECT_ID(N'dbo.CLIENTE', N'U') IS NULL
    THROW 51002, 'A tabela dbo.CLIENTE não existe; não é possível aplicar as constraints.', 1;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.CLIENTE')
      AND name = N'UX_CLIENTE_TELEFONE'
)
BEGIN
    IF EXISTS (
        SELECT TELEFONE_CLIENTE
        FROM dbo.CLIENTE
        WHERE TELEFONE_CLIENTE IS NOT NULL
        GROUP BY TELEFONE_CLIENTE
        HAVING COUNT(*) > 1
    )
    BEGIN
        SELECT TELEFONE_CLIENTE, COUNT(*) AS QUANTIDADE_CLIENTES
        FROM dbo.CLIENTE
        WHERE TELEFONE_CLIENTE IS NOT NULL
        GROUP BY TELEFONE_CLIENTE
        HAVING COUNT(*) > 1;

        THROW 51003, 'Há clientes com telefones duplicados. Resolva as duplicatas sem excluir dados antes de criar UX_CLIENTE_TELEFONE.', 1;
    END;

    CREATE UNIQUE INDEX UX_CLIENTE_TELEFONE
        ON dbo.CLIENTE(TELEFONE_CLIENTE)
        WHERE TELEFONE_CLIENTE IS NOT NULL;
END;
GO

IF OBJECT_ID(N'dbo.MESA', N'U') IS NULL
    THROW 51004, 'A tabela dbo.MESA não existe; não é possível aplicar as constraints.', 1;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.MESA')
      AND name = N'UX_MESA_NUMERO'
)
BEGIN
    IF EXISTS (
        SELECT NUMERO_MESA
        FROM dbo.MESA
        GROUP BY NUMERO_MESA
        HAVING COUNT(*) > 1
    )
    BEGIN
        SELECT NUMERO_MESA, COUNT(*) AS QUANTIDADE_MESAS
        FROM dbo.MESA
        GROUP BY NUMERO_MESA
        HAVING COUNT(*) > 1;

        THROW 51005, 'Há mesas com números duplicados. Resolva as duplicatas sem excluir dados antes de criar UX_MESA_NUMERO.', 1;
    END;

    CREATE UNIQUE INDEX UX_MESA_NUMERO
        ON dbo.MESA(NUMERO_MESA);
END;
GO
