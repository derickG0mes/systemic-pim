-- =========================================================================
-- migration-cliente-consumidor.sql
-- Insere o cliente padrao "Consumidor" usado para comandas sem cliente
-- identificado. Idempotente: so insere se nao existir.
-- =========================================================================
USE DB_RESTAURANTE;
GO

IF NOT EXISTS (SELECT 1 FROM CLIENTE WHERE NOME_CLIENTE = 'Consumidor')
BEGIN
    INSERT INTO CLIENTE (NOME_CLIENTE, TELEFONE_CLIENTE, FEEDBACK)
    VALUES ('Consumidor', NULL, NULL);
    PRINT 'Cliente Consumidor inserido com sucesso.';
END
ELSE
BEGIN
    PRINT 'Cliente Consumidor ja existe - nenhuma acao necessaria.';
END
GO
