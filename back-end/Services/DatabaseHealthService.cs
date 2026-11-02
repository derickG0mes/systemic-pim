using Microsoft.EntityFrameworkCore;
using PIM3.API.Data;

namespace PIM3.API.Services;

public sealed class DatabaseHealthService : IDatabaseHealthService
{
    private readonly AppDbContext _context;

    public DatabaseHealthService(AppDbContext context)
    {
        _context = context;
    }

    public Task CanConnectAsync() =>
        _context.Database.ExecuteSqlRawAsync("SELECT 1");
}
