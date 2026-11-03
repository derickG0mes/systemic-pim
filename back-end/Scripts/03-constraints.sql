USE [DB_RESTAURANTE];
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
