USE DB_RESTAURANTE;
GO

CREATE OR ALTER PROCEDURE dbo.sp_fechar_comanda
    @IdComanda INT,
    @IdFormaPagamento INT,
    @IdFuncionario INT,
    @Troco DECIMAL(10,2) = 0
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @StatusComanda VARCHAR(10);
        DECLARE @ValorComanda DECIMAL(18,2);
        DECLARE @QuantidadeItens INT;
        DECLARE @ValorItens DECIMAL(18,2);

        SELECT
            @StatusComanda = STATUS_COMANDA,
            @ValorComanda = VALOR_TOTAL
        FROM dbo.COMANDA WITH (UPDLOCK, HOLDLOCK)
        WHERE ID_COMANDA = @IdComanda;

        IF @StatusComanda IS NULL
            THROW 50001, 'Comanda nao encontrada.', 1;
        IF @StatusComanda <> 'ABERTA'
            THROW 50002, 'A comanda nao esta aberta.', 1;
        IF @Troco < 0
            THROW 50003, 'O troco nao pode ser negativo.', 1;
        IF NOT EXISTS (SELECT 1 FROM dbo.FORMA_PAGAMENTO WHERE ID_FORMA_PAGAMENTO = @IdFormaPagamento)
            THROW 50004, 'Forma de pagamento nao encontrada.', 1;
        IF NOT EXISTS (SELECT 1 FROM dbo.FUNCIONARIO WHERE ID_FUNCIONARIO = @IdFuncionario)
            THROW 50005, 'Funcionario nao encontrado.', 1;

        SELECT
            @QuantidadeItens = COUNT(*),
            @ValorItens = SUM(CONVERT(DECIMAL(18,2), QTD_PRODUTO * PRECO_UNITARIO_PAGO))
        FROM dbo.ITEM_COMANDA WITH (HOLDLOCK)
        WHERE ID_COMANDA = @IdComanda;

        IF ISNULL(@QuantidadeItens, 0) = 0
            THROW 50006, 'A comanda nao possui itens.', 1;
        IF EXISTS (
            SELECT 1
            FROM dbo.ITEM_COMANDA
            WHERE ID_COMANDA = @IdComanda
              AND (QTD_PRODUTO <= 0 OR PRECO_UNITARIO_PAGO < 0)
        )
            THROW 50007, 'A comanda possui itens com quantidade ou valor invalido.', 1;
        IF @ValorItens <= 0 OR ABS(@ValorItens - @ValorComanda) > 0.01
            THROW 50008, 'O valor da comanda diverge da soma dos itens.', 1;

        INSERT INTO dbo.DETALHE_PAGAMENTO
            (VALOR_PAGO, TROCO, DATA_PAGAMENTO, STATUS_PAGAMENTO,
             ID_COMANDA, ID_FORMA_PAGAMENTO, ID_FUNCIONARIO)
        VALUES
            (@ValorItens, @Troco, GETUTCDATE(), 'PAGO',
             @IdComanda, @IdFormaPagamento, @IdFuncionario);

        COMMIT TRANSACTION;

        SELECT @ValorItens AS ValorPago, @Troco AS Troco;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0
            ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_relatorio_faturamento
    @DataInicio DATETIME2,
    @DataFim DATETIME2
AS
BEGIN
    SET NOCOUNT ON;

    IF @DataInicio IS NULL OR @DataFim IS NULL OR @DataFim < @DataInicio
        THROW 50011, 'Intervalo de datas invalido.', 1;

    DECLARE @Receita DECIMAL(18,2);
    DECLARE @Despesas DECIMAL(18,2);

    SELECT @Receita = ISNULL(SUM(CONVERT(DECIMAL(18,2), IC.QTD_PRODUTO * IC.PRECO_UNITARIO_PAGO)), 0)
    FROM dbo.ITEM_COMANDA AS IC
    INNER JOIN dbo.COMANDA AS C ON C.ID_COMANDA = IC.ID_COMANDA
    WHERE C.STATUS_COMANDA = 'FECHADA'
      AND C.DATA_FECHADA >= @DataInicio
      AND C.DATA_FECHADA <= @DataFim;

    SELECT @Despesas = ISNULL(SUM(CONVERT(DECIMAL(18,2), D.VALOR_DESPESA)), 0)
    FROM dbo.DESPESAS AS D
    WHERE D.DATA_DESPESA >= @DataInicio
      AND D.DATA_DESPESA <= @DataFim;

    SELECT @Receita AS Receita, @Despesas AS Despesas, @Receita - @Despesas AS Lucro;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_ajustar_estoque
    @IdProduto INT,
    @Tipo VARCHAR(10),
    @Quantidade INT,
    @Motivo VARCHAR(500),
    @Usuario VARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @Tipo NOT IN ('ADICIONAR', 'REMOVER')
        THROW 50021, 'Tipo de ajuste invalido.', 1;
    IF @Quantidade <= 0
        THROW 50022, 'A quantidade deve ser maior que zero.', 1;
    IF NULLIF(LTRIM(RTRIM(@Motivo)), '') IS NULL
        THROW 50023, 'O motivo do ajuste e obrigatorio.', 1;

    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @QuantidadeAnterior INT;
        DECLARE @QuantidadeNova INT;
        DECLARE @NomeProduto VARCHAR(45);

        SELECT
            @QuantidadeAnterior = QTD_ESTOQUE,
            @NomeProduto = NOME_PRODUTO
        FROM dbo.PRODUTO WITH (UPDLOCK, HOLDLOCK)
        WHERE ID_PRODUTO = @IdProduto;

        IF @QuantidadeAnterior IS NULL
            THROW 50024, 'Produto nao encontrado.', 1;

        SET @QuantidadeNova = CASE
            WHEN @Tipo = 'ADICIONAR' THEN @QuantidadeAnterior + @Quantidade
            ELSE @QuantidadeAnterior - @Quantidade
        END;

        IF @QuantidadeNova < 0
            THROW 50025, 'Estoque insuficiente para realizar a baixa.', 1;

        UPDATE dbo.PRODUTO
        SET QTD_ESTOQUE = @QuantidadeNova
        WHERE ID_PRODUTO = @IdProduto;

        INSERT INTO dbo.LOG_SISTEMA (DATA_LOG, TIPO_LOG, DESCRICAO_LOG, USUARIO_LOG)
        VALUES (
            GETUTCDATE(),
            'ESTOQUE',
            LEFT(CONCAT('Ajuste ', @NomeProduto, ': ', @QuantidadeAnterior, ' -> ', @QuantidadeNova, ' (', LTRIM(RTRIM(@Motivo)), ')'), 500),
            NULLIF(LTRIM(RTRIM(@Usuario)), '')
        );

        COMMIT TRANSACTION;
        SELECT @QuantidadeAnterior AS QuantidadeAnterior, @QuantidadeNova AS QuantidadeNova;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0
            ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

CREATE OR ALTER VIEW dbo.vw_comandas_abertas
AS
    SELECT
        C.ID_COMANDA AS IdComanda,
        M.NUMERO_MESA AS NumeroMesa,
        C.VALOR_TOTAL AS ValorTotal
    FROM dbo.COMANDA AS C
    INNER JOIN dbo.MESA AS M ON M.ID_MESA = C.ID_MESA
    WHERE C.STATUS_COMANDA = 'ABERTA';
GO

CREATE OR ALTER VIEW dbo.vw_produtos_mais_vendidos
AS
    SELECT
        P.ID_PRODUTO AS IdProduto,
        P.NOME_PRODUTO AS NomeProduto,
        SUM(IC.QTD_PRODUTO) AS QuantidadeVendida
    FROM dbo.PRODUTO AS P
    INNER JOIN dbo.ITEM_COMANDA AS IC ON IC.ID_PRODUTO = P.ID_PRODUTO
    INNER JOIN dbo.COMANDA AS C ON C.ID_COMANDA = IC.ID_COMANDA
    WHERE C.STATUS_COMANDA = 'FECHADA'
    GROUP BY P.ID_PRODUTO, P.NOME_PRODUTO;
GO
