using Microsoft.EntityFrameworkCore;
using PIM3.API.Models;

namespace PIM3.API.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Funcionario> Funcionarios { get; set; }
    public DbSet<Cliente> Clientes { get; set; }
    public DbSet<Mesa> Mesas { get; set; }
    public DbSet<FormaPagamento> FormasPagamento { get; set; }
    public DbSet<Produto> Produtos { get; set; }
    public DbSet<Reserva> Reservas { get; set; }
    public DbSet<Comanda> Comandas { get; set; }
    public DbSet<ItemComanda> ItensComanda { get; set; }
    public DbSet<DetalhePagamento> DetalhesPagamento { get; set; }
    public DbSet<Despesa> Despesas { get; set; }
    public DbSet<LogComanda> LogsComanda { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configurar chaves primárias e constraints
        modelBuilder.Entity<Funcionario>()
            .HasKey(f => f.IdFuncionario);

        modelBuilder.Entity<Cliente>()
            .HasKey(c => c.IdCliente);

        modelBuilder.Entity<Mesa>()
            .HasKey(m => m.IdMesa);

        modelBuilder.Entity<FormaPagamento>()
            .HasKey(fp => fp.IdFormaPagamento);

        modelBuilder.Entity<Produto>()
            .HasKey(p => p.IdProduto);

        modelBuilder.Entity<Reserva>()
            .HasKey(r => r.IdReserva);

        modelBuilder.Entity<Comanda>()
            .HasKey(c => c.IdComanda);

        modelBuilder.Entity<Comanda>()
            .ToTable("COMANDA"); // ✅ Nome correto da tabela no banco

        // Configurar nomes das colunas da tabela COMANDA
        modelBuilder.Entity<Comanda>()
            .Property(c => c.IdComanda)
            .HasColumnName("ID_COMANDA");

        modelBuilder.Entity<Comanda>()
            .Property(c => c.DataAberta)
            .HasColumnName("DATA_ABERTA");

        modelBuilder.Entity<Comanda>()
            .Property(c => c.DataFechada)
            .HasColumnName("DATA_FECHADA");

        modelBuilder.Entity<Comanda>()
            .Property(c => c.StatusComanda)
            .HasColumnName("STATUS_COMANDA");

        modelBuilder.Entity<Comanda>()
            .Property(c => c.IdMesa)
            .HasColumnName("ID_MESA");

        modelBuilder.Entity<Comanda>()
            .Property(c => c.IdCliente)
            .HasColumnName("ID_CLIENTE");

        modelBuilder.Entity<Comanda>()
            .Property(c => c.ValorTotal)
            .HasColumnName("VALOR_TOTAL")
            .HasColumnType("decimal(18,2)"); // ✅ Configurar precisão decimal

        modelBuilder.Entity<ItemComanda>()
            .HasKey(ic => ic.IdItemComanda);

        modelBuilder.Entity<ItemComanda>()
            .ToTable("ITEM_COMANDA"); // ✅ Nome correto da tabela no banco

        // Configurar nomes das colunas da tabela ITEM_COMANDA
        modelBuilder.Entity<ItemComanda>()
            .Property(ic => ic.IdItemComanda)
            .HasColumnName("ID_ITEM_COMANDA");

        modelBuilder.Entity<ItemComanda>()
            .Property(ic => ic.IdComanda)
            .HasColumnName("ID_COMANDA");

        modelBuilder.Entity<ItemComanda>()
            .Property(ic => ic.IdProduto)
            .HasColumnName("ID_PRODUTO");

        modelBuilder.Entity<ItemComanda>()
            .Property(ic => ic.QtdProduto)
            .HasColumnName("QTD_PRODUTO");

        modelBuilder.Entity<ItemComanda>()
            .Property(ic => ic.PrecoUnitarioPago)
            .HasColumnName("PRECO_UNITARIO_PAGO")
            .HasColumnType("decimal(18,2)"); // ✅ Configurar precisão decimal

        modelBuilder.Entity<DetalhePagamento>()
            .HasKey(dp => dp.IdDetalhePagamento);

        modelBuilder.Entity<Despesa>()
            .HasKey(d => d.IdDespesa);

        modelBuilder.Entity<LogComanda>()
            .HasKey(lc => lc.IdLogComanda);

        // Configurar relacionamentos
        modelBuilder.Entity<Reserva>()
            .HasOne(r => r.Cliente)
            .WithMany()
            .HasForeignKey(r => r.IdCliente);

        modelBuilder.Entity<Reserva>()
            .HasOne(r => r.Mesa)
            .WithMany()
            .HasForeignKey(r => r.IdMesa);

        modelBuilder.Entity<Comanda>()
            .HasOne(c => c.Mesa)
            .WithMany()
            .HasForeignKey(c => c.IdMesa);

        modelBuilder.Entity<Comanda>()
            .HasOne(c => c.Cliente)
            .WithMany()
            .HasForeignKey(c => c.IdCliente);

        modelBuilder.Entity<ItemComanda>()
            .HasOne(ic => ic.Produto)
            .WithMany()
            .HasForeignKey(ic => ic.IdProduto);

        modelBuilder.Entity<ItemComanda>()
            .HasOne(ic => ic.Comanda)
            .WithMany(c => c.ItensComanda)
            .HasForeignKey(ic => ic.IdComanda);

        modelBuilder.Entity<DetalhePagamento>()
            .HasOne(dp => dp.Comanda)
            .WithMany()
            .HasForeignKey(dp => dp.IdComanda);

        modelBuilder.Entity<DetalhePagamento>()
            .HasOne(dp => dp.FormaPagamento)
            .WithMany()
            .HasForeignKey(dp => dp.IdFormaPagamento);

        modelBuilder.Entity<DetalhePagamento>()
            .HasOne(dp => dp.Funcionario)
            .WithMany()
            .HasForeignKey(dp => dp.IdFuncionario);

        modelBuilder.Entity<Despesa>()
            .HasOne(d => d.FormaPagamento)
            .WithMany()
            .HasForeignKey(d => d.IdFormaPagamento);

        modelBuilder.Entity<LogComanda>()
            .HasOne(lc => lc.Comanda)
            .WithMany()
            .HasForeignKey(lc => lc.IdComanda);

        modelBuilder.Entity<LogComanda>()
            .HasOne(lc => lc.Funcionario)
            .WithMany()
            .HasForeignKey(lc => lc.IdFuncionario);
    }
}
