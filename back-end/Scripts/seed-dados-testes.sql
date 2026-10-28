USE [DB_RESTAURANTE];
GO

SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    IF OBJECT_ID(N'dbo.FUNCIONARIO', N'U') IS NULL
       OR OBJECT_ID(N'dbo.CLIENTE', N'U') IS NULL
       OR OBJECT_ID(N'dbo.MESA', N'U') IS NULL
       OR OBJECT_ID(N'dbo.FORMA_PAGAMENTO', N'U') IS NULL
       OR OBJECT_ID(N'dbo.PRODUTO', N'U') IS NULL
       OR OBJECT_ID(N'dbo.RESERVA', N'U') IS NULL
       OR OBJECT_ID(N'dbo.COMANDA', N'U') IS NULL
       OR OBJECT_ID(N'dbo.ITEM_COMANDA', N'U') IS NULL
       OR OBJECT_ID(N'dbo.DETALHE_PAGAMENTO', N'U') IS NULL
       OR OBJECT_ID(N'dbo.DESPESAS', N'U') IS NULL
       OR OBJECT_ID(N'dbo.LOG_COMANDA', N'U') IS NULL
       OR OBJECT_ID(N'dbo.LOG_SISTEMA', N'U') IS NULL
        THROW 51000, 'O schema DB_RESTAURANTE está incompleto. Execute primeiro o script de criação do banco.', 1;

    IF EXISTS (
        SELECT 1
        FROM dbo.FUNCIONARIO
        WHERE EMAIL_FUNCIONARIO IN (
            'mariana@restaurante.com',
            'rafael@restaurante.com',
            'caixa@restaurante.com',
            'bruno@restaurante.com',
            'camila@restaurante.com',
            'diego@restaurante.com'
        )
    )
        THROW 51001, 'O seed de teste já foi aplicado. Recrie o banco antes de executá-lo novamente.', 1;

    IF (SELECT COUNT(*) FROM dbo.MESA WHERE NUMERO_MESA BETWEEN 1 AND 20) < 20
        THROW 51002, 'O banco precisa ter as mesas de número 1 a 20 para este seed.', 1;

    IF NOT EXISTS (SELECT 1 FROM dbo.PRODUTO)
        THROW 51003, 'Cadastre os produtos iniciais antes de executar este seed.', 1;

    IF NOT EXISTS (SELECT 1 FROM dbo.FORMA_PAGAMENTO WHERE NOME_FORMA_PAGAMENTO = 'PIX')
       OR NOT EXISTS (SELECT 1 FROM dbo.FORMA_PAGAMENTO WHERE NOME_FORMA_PAGAMENTO = 'Cartão de Crédito')
       OR NOT EXISTS (SELECT 1 FROM dbo.FORMA_PAGAMENTO WHERE NOME_FORMA_PAGAMENTO = 'Cartão de Débito')
       OR NOT EXISTS (SELECT 1 FROM dbo.FORMA_PAGAMENTO WHERE NOME_FORMA_PAGAMENTO = 'Dinheiro')
        THROW 51004, 'Cadastre as quatro formas de pagamento iniciais antes de executar este seed.', 1;

    IF EXISTS (
        SELECT Seed.NOME_CLIENTE
        FROM (VALUES
            ('Fernanda Oliveira'), ('Ricardo Almeida'), ('Patrícia Gomes'), ('Lucas Ferreira'),
            ('Beatriz Rocha'), ('Gustavo Pereira'), ('Larissa Barbosa'), ('Thiago Nascimento'),
            ('Aline Cardoso'), ('Marcelo Dias'), ('Juliano Teixeira'), ('Vanessa Moreira'),
            ('Rodrigo Araújo'), ('Isabela Freitas'), ('Felipe Castro'), ('Camila Ramos'),
            ('Eduardo Monteiro'), ('Natália Correia'), ('Henrique Lopes'), ('Priscila Nunes'),
            ('André Batista'), ('Tatiane Pinto'), ('Leonardo Vieira'), ('Carolina Duarte'),
            ('Vinícius Campos'), ('Renata Melo'), ('Daniel Cunha'), ('Bianca Fogaça'),
            ('Matheus Siqueira'), ('Débora Azevedo')
        ) AS Seed(NOME_CLIENTE)
        INNER JOIN dbo.CLIENTE AS C ON C.NOME_CLIENTE = Seed.NOME_CLIENTE
    )
        THROW 51005, 'Já existem clientes deste seed. Confira os dados ou recrie o banco antes de executá-lo.', 1;

    IF EXISTS (
        SELECT Seed.NOME_PRODUTO
        FROM (VALUES
            ('Tábua de Frios'), ('Picanha na Brasa'), ('Cerveja'), ('Pudim'),
            ('Bruschetta'), ('Pizza Margherita'), ('Massa Carbonara'),
            ('Refrigerante Coca-Cola'), ('Hambúrguer'), ('Frango Grelhado'),
            ('Suco Natural'), ('Pão de Alho'), ('Caipirinha')
        ) AS Seed(NOME_PRODUTO)
        LEFT JOIN dbo.PRODUTO AS P ON P.NOME_PRODUTO = Seed.NOME_PRODUTO
        GROUP BY Seed.NOME_PRODUTO
        HAVING COUNT(P.ID_PRODUTO) <> 1
    )
        THROW 51006, 'Faltam produtos do cardápio inicial ou há nomes duplicados. Execute o script de criação do banco e confira os produtos.', 1;

    DECLARE @hoje DATETIME = CAST(CAST(GETDATE() AS DATE) AS DATETIME);
    DECLARE @h DATETIME = @hoje;

    INSERT INTO dbo.FUNCIONARIO
        (NOME_FUNCIONARIO, EMAIL_FUNCIONARIO, CPF_FUNCIONARIO, TELEFONE_FUNCIONARIO, PASSWORD_FUNCIONARIO, CARGO_FUNCIONARIO, STATUS_FUNCIONARIO, ROLE)
    VALUES
        ('Mariana Alves',   'mariana@restaurante.com', '22233344455', '11911110001', 'CGp2HzQssQ8F4pQmJOWcEYaspK9tMbPHKlSEg4FxFdu0yWoK', 'Garçom',  'ATIVO',   'employee'),
        ('Rafael Mendes',   'rafael@restaurante.com',  '33344455566', '11911110002', 'CGp2HzQssQ8F4pQmJOWcEYaspK9tMbPHKlSEg4FxFdu0yWoK', 'Garçom',  'ATIVO',   'employee'),
        ('Juliana Ribeiro', 'caixa@restaurante.com',   '44455566677', '11911110003', 'CGp2HzQssQ8F4pQmJOWcEYaspK9tMbPHKlSEg4FxFdu0yWoK', 'Caixa',   'ATIVO',   'employee'),
        ('Bruno Carvalho',  'bruno@restaurante.com',    '55566677788', '11911110004', 'CGp2HzQssQ8F4pQmJOWcEYaspK9tMbPHKlSEg4FxFdu0yWoK', 'Cozinha', 'ATIVO',   'employee'),
        ('Camila Torres',   'camila@restaurante.com',   '66677788899', '11911110005', 'CGp2HzQssQ8F4pQmJOWcEYaspK9tMbPHKlSEg4FxFdu0yWoK', 'Garçom',  'ATIVO',   'employee'),
        ('Diego Martins',   'diego@restaurante.com',    '77788899900', '11911110006', 'CGp2HzQssQ8F4pQmJOWcEYaspK9tMbPHKlSEg4FxFdu0yWoK', 'Garçom',  'INATIVO', 'employee');

    INSERT INTO dbo.CLIENTE (NOME_CLIENTE, TELEFONE_CLIENTE, FEEDBACK)
    VALUES
        ('Fernanda Oliveira', '11981230001', 'OTIMO'),
        ('Ricardo Almeida',   '11981230002', 'BOM'),
        ('Patrícia Gomes',    '11981230003', 'OTIMO'),
        ('Lucas Ferreira',    '11981230004', NULL),
        ('Beatriz Rocha',     '11981230005', 'BOM'),
        ('Gustavo Pereira',   '11981230006', 'REGULAR'),
        ('Larissa Barbosa',   '11981230007', 'OTIMO'),
        ('Thiago Nascimento', '11981230008', NULL),
        ('Aline Cardoso',     '11981230009', 'BOM'),
        ('Marcelo Dias',      '11981230010', 'OTIMO'),
        ('Juliano Teixeira',  '11981230011', NULL),
        ('Vanessa Moreira',   '11981230012', 'BOM'),
        ('Rodrigo Araújo',    '11981230013', 'OTIMO'),
        ('Isabela Freitas',   '11981230014', NULL),
        ('Felipe Castro',     '11981230015', 'BOM'),
        ('Camila Ramos',      '11981230016', 'OTIMO'),
        ('Eduardo Monteiro',  '11981230017', NULL),
        ('Natália Correia',   '11981230018', 'REGULAR'),
        ('Henrique Lopes',    '11981230019', 'BOM'),
        ('Priscila Nunes',    '11981230020', 'OTIMO'),
        ('André Batista',     '11981230021', NULL),
        ('Tatiane Pinto',     '11981230022', 'BOM'),
        ('Leonardo Vieira',   '11981230023', 'OTIMO'),
        ('Carolina Duarte',   '11981230024', NULL),
        ('Vinícius Campos',   '11981230025', 'BOM'),
        ('Renata Melo',       '11981230026', 'OTIMO'),
        ('Daniel Cunha',      '11981230027', NULL),
        ('Bianca Fogaça',     '11981230028', 'BOM'),
        ('Matheus Siqueira',  '11981230029', 'OTIMO'),
        ('Débora Azevedo',    '11981230030', NULL);

    INSERT INTO dbo.RESERVA (ID_CLIENTE, ID_MESA, DATA_RESERVA, STATUS_RESERVA)
    SELECT C.ID_CLIENTE, M.ID_MESA, R.DATA_RESERVA, R.STATUS_RESERVA
    FROM (VALUES
        ('Fernanda Oliveira', 5,  DATEADD(HOUR, 19, DATEADD(DAY, -10, @hoje)), 'CONCLUIDA'),
        ('Ricardo Almeida',   8,  DATEADD(HOUR, 20, DATEADD(DAY, -9,  @hoje)), 'CONCLUIDA'),
        ('Patrícia Gomes',    12, DATEADD(HOUR, 12, DATEADD(DAY, -8,  @hoje)), 'CANCELADA'),
        ('Lucas Ferreira',    3,  DATEADD(HOUR, 21, DATEADD(DAY, -7,  @hoje)), 'CONCLUIDA'),
        ('Beatriz Rocha',     15, DATEADD(HOUR, 13, DATEADD(DAY, -6,  @hoje)), 'CONCLUIDA'),
        ('Gustavo Pereira',   10, DATEADD(HOUR, 19, DATEADD(DAY, -5,  @hoje)), 'CANCELADA'),
        ('Larissa Barbosa',   6,  DATEADD(HOUR, 20, DATEADD(DAY, -4,  @hoje)), 'CONCLUIDA'),
        ('Thiago Nascimento', 18, DATEADD(HOUR, 12, DATEADD(DAY, -3,  @hoje)), 'CONCLUIDA'),
        ('Aline Cardoso',     2,  DATEADD(HOUR, 21, DATEADD(DAY, -2,  @hoje)), 'CONCLUIDA'),
        ('Marcelo Dias',      14, DATEADD(HOUR, 19, DATEADD(DAY, -1,  @hoje)), 'CONCLUIDA'),
        ('Juliano Teixeira',  7,  DATEADD(HOUR, 20, @hoje),                    'CONFIRMADA'),
        ('Vanessa Moreira',   9,  DATEADD(HOUR, 21, @hoje),                    'CONFIRMADA'),
        ('Rodrigo Araújo',    16, DATEADD(HOUR, 19, DATEADD(DAY, 1, @hoje)),   'CONFIRMADA'),
        ('Isabela Freitas',   11, DATEADD(HOUR, 20, DATEADD(DAY, 1, @hoje)),   'CONFIRMADA'),
        ('Felipe Castro',    4,  DATEADD(HOUR, 12, DATEADD(DAY, 2, @hoje)),   'CONFIRMADA'),
        ('Camila Ramos',     13, DATEADD(HOUR, 13, DATEADD(DAY, 2, @hoje)),   'PENDENTE'),
        ('Eduardo Monteiro', 17, DATEADD(HOUR, 20, DATEADD(DAY, 3, @hoje)),   'CONFIRMADA'),
        ('Natália Correia',  19, DATEADD(HOUR, 21, DATEADD(DAY, 4, @hoje)),   'PENDENTE'),
        ('Henrique Lopes',   1,  DATEADD(HOUR, 19, DATEADD(DAY, 5, @hoje)),   'CONFIRMADA'),
        ('Priscila Nunes',   20, DATEADD(HOUR, 20, DATEADD(DAY, 6, @hoje)),   'CONFIRMADA')
    ) AS R(NOME_CLIENTE, NUMERO_MESA, DATA_RESERVA, STATUS_RESERVA)
    INNER JOIN dbo.CLIENTE AS C ON C.NOME_CLIENTE = R.NOME_CLIENTE
    INNER JOIN dbo.MESA AS M ON M.NUMERO_MESA = R.NUMERO_MESA;

    INSERT INTO dbo.DESPESAS
        (DESCRICAO_DESPESA, VALOR_DESPESA, CATEGORIA_DESPESA, DATA_DESPESA, ID_FORMA_PAGAMENTO)
    SELECT D.DESCRICAO_DESPESA, D.VALOR_DESPESA, D.CATEGORIA_DESPESA, D.DATA_DESPESA, F.ID_FORMA_PAGAMENTO
    FROM (VALUES
        ('Aluguel do imóvel - mês atual',        8500.00, 'ALUGUEL',        DATEADD(DAY, -25, @h), 'PIX'),
        ('Aluguel do imóvel - mês anterior',     8500.00, 'ALUGUEL',        DATEADD(DAY, -55, @h), 'PIX'),
        ('Conta de energia elétrica',            2340.75, 'UTILIDADES',     DATEADD(DAY, -20, @h), 'PIX'),
        ('Conta de energia elétrica (anterior)', 2198.40, 'UTILIDADES',     DATEADD(DAY, -50, @h), 'PIX'),
        ('Conta de água',                         680.30, 'UTILIDADES',     DATEADD(DAY, -18, @h), 'PIX'),
        ('Conta de água (anterior)',              652.10, 'UTILIDADES',     DATEADD(DAY, -48, @h), 'PIX'),
        ('Gás de cozinha (botijões)',             950.00, 'UTILIDADES',     DATEADD(DAY, -15, @h), 'Dinheiro'),
        ('Internet e telefone',                   299.90, 'UTILIDADES',     DATEADD(DAY, -22, @h), 'Cartão de Débito'),
        ('Compra de carnes - açougue',           4120.00, 'INSUMOS',        DATEADD(DAY, -3,  @h), 'PIX'),
        ('Compra de carnes - açougue',           3890.50, 'INSUMOS',        DATEADD(DAY, -10, @h), 'PIX'),
        ('Compra de carnes - açougue',           4300.00, 'INSUMOS',        DATEADD(DAY, -17, @h), 'PIX'),
        ('Compra de carnes - açougue',           3760.00, 'INSUMOS',        DATEADD(DAY, -24, @h), 'PIX'),
        ('Hortifruti - CEAGESP',                 1250.00, 'INSUMOS',        DATEADD(DAY, -2,  @h), 'Dinheiro'),
        ('Hortifruti - CEAGESP',                 1180.00, 'INSUMOS',        DATEADD(DAY, -9,  @h), 'Dinheiro'),
        ('Hortifruti - CEAGESP',                 1320.00, 'INSUMOS',        DATEADD(DAY, -16, @h), 'Dinheiro'),
        ('Bebidas - distribuidora',              3450.00, 'INSUMOS',        DATEADD(DAY, -6,  @h), 'PIX'),
        ('Bebidas - distribuidora',              3120.00, 'INSUMOS',        DATEADD(DAY, -21, @h), 'PIX'),
        ('Laticínios e frios',                   1890.00, 'INSUMOS',        DATEADD(DAY, -8,  @h), 'Cartão de Débito'),
        ('Folha de pagamento - mês atual',      18400.00, 'FOLHA',          DATEADD(DAY, -5,  @h), 'PIX'),
        ('Folha de pagamento - mês anterior',   18400.00, 'FOLHA',          DATEADD(DAY, -35, @h), 'PIX'),
        ('Manutenção do fogão industrial',        780.00, 'MANUTENCAO',     DATEADD(DAY, -12, @h), 'Cartão de Crédito'),
        ('Reparo do ar-condicionado',            1150.00, 'MANUTENCAO',     DATEADD(DAY, -30, @h), 'Cartão de Crédito'),
        ('Dedetização',                           420.00, 'MANUTENCAO',     DATEADD(DAY, -40, @h), 'PIX'),
        ('Anúncios Instagram/Google',            1500.00, 'MARKETING',      DATEADD(DAY, -14, @h), 'Cartão de Crédito'),
        ('Impulsionamento de posts',              600.00, 'MARKETING',      DATEADD(DAY, -44, @h), 'Cartão de Crédito'),
        ('Material de limpeza',                   540.00, 'LIMPEZA',        DATEADD(DAY, -7,  @h), 'Cartão de Débito'),
        ('Descartáveis e embalagens',             390.00, 'LIMPEZA',        DATEADD(DAY, -28, @h), 'Dinheiro'),
        ('Contador - honorários',                1200.00, 'ADMINISTRATIVO', DATEADD(DAY, -26, @h), 'PIX'),
        ('Licença de funcionamento / taxas',      850.00, 'ADMINISTRATIVO', DATEADD(DAY, -45, @h), 'PIX'),
        ('Uniformes da equipe',                   960.00, 'ADMINISTRATIVO', DATEADD(DAY, -38, @h), 'Cartão de Crédito')
    ) AS D(DESCRICAO_DESPESA, VALOR_DESPESA, CATEGORIA_DESPESA, DATA_DESPESA, FORMA_PAGAMENTO)
    INNER JOIN dbo.FORMA_PAGAMENTO AS F ON F.NOME_FORMA_PAGAMENTO = D.FORMA_PAGAMENTO;

    DECLARE @i INT = 1;
    DECLARE @total_comandas INT = 120;
    DECLARE @mesa INT;
    DECLARE @cliente INT;
    DECLARE @dias INT;
    DECLARE @hora INT;
    DECLARE @min INT;
    DECLARE @abertura DATETIME;
    DECLARE @garcom INT;
    DECLARE @qtdItens INT;
    DECLARE @j INT;
    DECLARE @idComanda INT;
    DECLARE @valor DECIMAL(18,2);
    DECLARE @forma INT;
    DECLARE @pago DECIMAL(10,2);
    DECLARE @fechamento DATETIME;

    DECLARE @caixa INT = (SELECT ID_FUNCIONARIO FROM dbo.FUNCIONARIO WHERE EMAIL_FUNCIONARIO = 'caixa@restaurante.com');
    DECLARE @gar1 INT = (SELECT ID_FUNCIONARIO FROM dbo.FUNCIONARIO WHERE EMAIL_FUNCIONARIO = 'mariana@restaurante.com');
    DECLARE @gar2 INT = (SELECT ID_FUNCIONARIO FROM dbo.FUNCIONARIO WHERE EMAIL_FUNCIONARIO = 'rafael@restaurante.com');
    DECLARE @gar3 INT = (SELECT ID_FUNCIONARIO FROM dbo.FUNCIONARIO WHERE EMAIL_FUNCIONARIO = 'camila@restaurante.com');

    WHILE @i <= @total_comandas
    BEGIN
        SELECT TOP (1) @mesa = ID_MESA FROM dbo.MESA ORDER BY NEWID();
        SELECT TOP (1) @cliente = ID_CLIENTE FROM dbo.CLIENTE ORDER BY NEWID();
        SET @dias = 1 + CONVERT(INT, ABS(CONVERT(BIGINT, CHECKSUM(NEWID()))) % 60);
        SET @hora = 11 + CONVERT(INT, ABS(CONVERT(BIGINT, CHECKSUM(NEWID()))) % 12);
        SET @min = CONVERT(INT, ABS(CONVERT(BIGINT, CHECKSUM(NEWID()))) % 60);
        SET @abertura = DATEADD(MINUTE, @hora * 60 + @min, DATEADD(DAY, -@dias, @hoje));
        SET @garcom = CASE CONVERT(INT, ABS(CONVERT(BIGINT, CHECKSUM(NEWID()))) % 3)
            WHEN 0 THEN @gar1 WHEN 1 THEN @gar2 ELSE @gar3 END;

        INSERT INTO dbo.COMANDA (DATA_ABERTA, STATUS_COMANDA, ID_MESA, ID_CLIENTE)
        VALUES (@abertura, 'ABERTA', @mesa, @cliente);

        SET @idComanda = SCOPE_IDENTITY();
        SET @qtdItens = 1 + CONVERT(INT, ABS(CONVERT(BIGINT, CHECKSUM(NEWID()))) % 5);
        SET @j = 1;

        WHILE @j <= @qtdItens
        BEGIN
            INSERT INTO dbo.ITEM_COMANDA (QTD_PRODUTO, PRECO_UNITARIO_PAGO, STATUS_ITEM, ID_PRODUTO, ID_COMANDA)
            SELECT TOP (1)
                1 + CONVERT(INT, ABS(CONVERT(BIGINT, CHECKSUM(NEWID()))) % 3),
                P.PRECO_PRODUTO,
                'ENTREGUE',
                P.ID_PRODUTO,
                @idComanda
            FROM dbo.PRODUTO AS P
            ORDER BY NEWID();

            SET @j += 1;
        END;

        SELECT @valor = VALOR_TOTAL FROM dbo.COMANDA WHERE ID_COMANDA = @idComanda;
        SELECT TOP (1) @forma = ID_FORMA_PAGAMENTO FROM dbo.FORMA_PAGAMENTO ORDER BY NEWID();
        SET @pago = CASE
            WHEN (SELECT NOME_FORMA_PAGAMENTO FROM dbo.FORMA_PAGAMENTO WHERE ID_FORMA_PAGAMENTO = @forma) = 'Dinheiro'
                THEN CEILING(@valor / 10.0) * 10
            ELSE @valor
        END;

        INSERT INTO dbo.DETALHE_PAGAMENTO
            (VALOR_PAGO, TROCO, STATUS_PAGAMENTO, ID_COMANDA, ID_FORMA_PAGAMENTO, ID_FUNCIONARIO)
        VALUES (@pago, @pago - @valor, 'PAGO', @idComanda, @forma, @caixa);

        SET @fechamento = DATEADD(MINUTE, 35 + CONVERT(INT, ABS(CONVERT(BIGINT, CHECKSUM(NEWID()))) % 70), @abertura);
        UPDATE dbo.COMANDA SET DATA_FECHADA = @fechamento WHERE ID_COMANDA = @idComanda;
        UPDATE dbo.DETALHE_PAGAMENTO SET DATA_PAGAMENTO = @fechamento WHERE ID_COMANDA = @idComanda;

        INSERT INTO dbo.LOG_COMANDA (DATA_LOG, ACAO_LOG, ID_COMANDA, ID_FUNCIONARIO)
        VALUES
            (@abertura, 'ABERTURA', @idComanda, @garcom),
            (@fechamento, 'FECHAMENTO', @idComanda, @caixa);

        SET @i += 1;
    END;

    DECLARE @ComandasAbertas TABLE (ID_MESA INT NOT NULL, ID_COMANDA INT NOT NULL);
    INSERT INTO dbo.COMANDA (DATA_ABERTA, STATUS_COMANDA, ID_MESA, ID_CLIENTE)
        OUTPUT inserted.ID_MESA, inserted.ID_COMANDA INTO @ComandasAbertas (ID_MESA, ID_COMANDA)
    SELECT DATEADD(MINUTE, R.MINUTOS_ABERTA, GETDATE()), 'ABERTA', M.ID_MESA, C.ID_CLIENTE
    FROM (VALUES
        (1, 'Fernanda Oliveira', -75),
        (2, 'Ricardo Almeida', -50),
        (3, 'Patrícia Gomes', -30),
        (4, 'Lucas Ferreira', -10)
    ) AS R(NUMERO_MESA, NOME_CLIENTE, MINUTOS_ABERTA)
    INNER JOIN dbo.MESA AS M ON M.NUMERO_MESA = R.NUMERO_MESA
    INNER JOIN dbo.CLIENTE AS C ON C.NOME_CLIENTE = R.NOME_CLIENTE;

    DECLARE @c1 INT = (SELECT O.ID_COMANDA FROM @ComandasAbertas AS O INNER JOIN dbo.MESA AS M ON M.ID_MESA = O.ID_MESA WHERE M.NUMERO_MESA = 1);
    DECLARE @c2 INT = (SELECT O.ID_COMANDA FROM @ComandasAbertas AS O INNER JOIN dbo.MESA AS M ON M.ID_MESA = O.ID_MESA WHERE M.NUMERO_MESA = 2);
    DECLARE @c3 INT = (SELECT O.ID_COMANDA FROM @ComandasAbertas AS O INNER JOIN dbo.MESA AS M ON M.ID_MESA = O.ID_MESA WHERE M.NUMERO_MESA = 3);
    DECLARE @c4 INT = (SELECT O.ID_COMANDA FROM @ComandasAbertas AS O INNER JOIN dbo.MESA AS M ON M.ID_MESA = O.ID_MESA WHERE M.NUMERO_MESA = 4);

    INSERT INTO dbo.ITEM_COMANDA (QTD_PRODUTO, PRECO_UNITARIO_PAGO, STATUS_ITEM, ID_PRODUTO, ID_COMANDA)
    SELECT I.QTD_PRODUTO, P.PRECO_PRODUTO, I.STATUS_ITEM, P.ID_PRODUTO, I.ID_COMANDA
    FROM (VALUES
        (1, 'ENTREGUE', 'Tábua de Frios', @c1),
        (2, 'ENTREGUE', 'Picanha na Brasa', @c1),
        (4, 'ENTREGUE', 'Cerveja', @c1),
        (2, 'PREPARAR', 'Pudim', @c1),
        (1, 'ENTREGUE', 'Bruschetta', @c2),
        (2, 'PRONTO', 'Pizza Margherita', @c2),
        (1, 'PREPARANDO', 'Massa Carbonara', @c2),
        (3, 'ENTREGUE', 'Refrigerante Coca-Cola', @c2),
        (2, 'PREPARANDO', 'Hambúrguer', @c3),
        (1, 'PREPARAR', 'Frango Grelhado', @c3),
        (2, 'ENTREGUE', 'Suco Natural', @c3),
        (1, 'PREPARAR', 'Pão de Alho', @c4),
        (2, 'PREPARAR', 'Caipirinha', @c4)
    ) AS I(QTD_PRODUTO, STATUS_ITEM, NOME_PRODUTO, ID_COMANDA)
    INNER JOIN dbo.PRODUTO AS P ON P.NOME_PRODUTO = I.NOME_PRODUTO;

    INSERT INTO dbo.LOG_COMANDA (DATA_LOG, ACAO_LOG, ID_COMANDA, ID_FUNCIONARIO)
    SELECT C.DATA_ABERTA, 'ABERTURA', C.ID_COMANDA, F.ID_FUNCIONARIO
    FROM dbo.COMANDA AS C
    INNER JOIN @ComandasAbertas AS O ON O.ID_COMANDA = C.ID_COMANDA
    CROSS JOIN dbo.FUNCIONARIO AS F
    WHERE F.EMAIL_FUNCIONARIO = 'mariana@restaurante.com';

    INSERT INTO dbo.LOG_SISTEMA (TIPO_LOG, DESCRICAO_LOG, USUARIO_LOG, DADO_ANTERIOR, DADO_NOVO)
    VALUES
        ('LOGIN',          'Login realizado com sucesso',            'admin@restaurante.com',   NULL, NULL),
        ('LOGIN',          'Login realizado com sucesso',            'mariana@restaurante.com', NULL, NULL),
        ('LOGIN_FALHA',    'Tentativa de login com senha incorreta', 'cozinha@restaurante.com', NULL, NULL),
        ('PRODUTO_UPDATE', 'Preço do produto alterado',              'admin@restaurante.com',   '{"PRECO_PRODUTO":75.90}', '{"PRECO_PRODUTO":79.90}'),
        ('PRODUTO_UPDATE', 'Estoque ajustado manualmente',            'owner@restaurante.com',   '{"QTD_ESTOQUE":15}',      '{"QTD_ESTOQUE":20}'),
        ('FUNCIONARIO',    'Funcionário inativado',                   'admin@restaurante.com',   '{"STATUS":"ATIVO"}',      '{"STATUS":"INATIVO"}'),
        ('DESPESA',        'Despesa cadastrada: Aluguel',             'owner@restaurante.com',   NULL, '{"VALOR":8500.00}'),
        ('MESA',           'Mesa 1 marcada como OCUPADA',             'mariana@restaurante.com', '{"STATUS":"DISPONIVEL"}', '{"STATUS":"OCUPADA"}');

    COMMIT TRANSACTION;

    SELECT 'FUNCIONARIO' AS Tabela, COUNT(*) AS Total FROM dbo.FUNCIONARIO
    UNION ALL SELECT 'CLIENTE', COUNT(*) FROM dbo.CLIENTE
    UNION ALL SELECT 'RESERVA', COUNT(*) FROM dbo.RESERVA
    UNION ALL SELECT 'DESPESAS', COUNT(*) FROM dbo.DESPESAS
    UNION ALL SELECT 'COMANDA', COUNT(*) FROM dbo.COMANDA
    UNION ALL SELECT 'ITEM_COMANDA', COUNT(*) FROM dbo.ITEM_COMANDA
    UNION ALL SELECT 'DETALHE_PAGAMENTO', COUNT(*) FROM dbo.DETALHE_PAGAMENTO
    UNION ALL SELECT 'LOG_COMANDA', COUNT(*) FROM dbo.LOG_COMANDA
    UNION ALL SELECT 'LOG_SISTEMA', COUNT(*) FROM dbo.LOG_SISTEMA;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0
        ROLLBACK TRANSACTION;
    THROW;
END CATCH;
