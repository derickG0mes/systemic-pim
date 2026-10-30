using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using System.IO.Compression;
using System.Text;
using PIM3.API.Controllers;
using PIM3.API.Data;
using PIM3.API.Services;

namespace PIM3.API.Services.Backup;

/// <summary>
/// Serviço isolado para restauração de backups.
/// Não altera nenhuma lógica existente do BackupService original.
/// </summary>
public sealed class BackupValidationException : Exception
{
    public BackupValidationException(string message) : base(message) { }
    public BackupValidationException(string message, Exception innerException) : base(message, innerException) { }
}

public class BackupRestoreService
{
    private const long MaxArchiveBytes = 100L * 1024 * 1024;
    private const long MaxExpandedBytes = 512L * 1024 * 1024;
    private const long MaxSqlBytes = 256L * 1024 * 1024;
    private const int MaxEntries = 10_000;

    private readonly AppDbContext _context;
    private readonly BackupService _backupService;
    private readonly IConfiguration _configuration;

    public BackupRestoreService(
        AppDbContext context,
        BackupService backupService,
        IConfiguration configuration)
    {
        _context = context;
        _backupService = backupService;
        _configuration = configuration;
    }

    /// <summary>
    /// Valida o arquivo, salva um backup de segurança e executa o script SQL restaurado.
    /// </summary>
    public async Task<string> RestaurarAsync(IFormFile zipFile, string usuario, CancellationToken cancellationToken = default)
    {
        if (zipFile.Length == 0 || zipFile.Length > MaxArchiveBytes)
            throw new BackupValidationException("O arquivo está vazio ou excede o limite de 100 MB.");

        if (!string.Equals(Path.GetExtension(zipFile.FileName), ".zip", StringComparison.OrdinalIgnoreCase))
            throw new BackupValidationException("O arquivo deve ter extensão .zip.");

        Directory.CreateDirectory(_backupService.BackupDirectory);
        var tempPath = Path.Combine(Path.GetTempPath(), $"{Guid.NewGuid():N}.zip");

        try
        {
            await using (var stream = new FileStream(
                tempPath,
                FileMode.CreateNew,
                FileAccess.Write,
                FileShare.None,
                81920,
                FileOptions.Asynchronous | FileOptions.SequentialScan))
            {
                await zipFile.CopyToAsync(stream, cancellationToken);
            }

            string sqlScript;
            try
            {
                using var archive = ZipFile.OpenRead(tempPath);
                if (archive.Entries.Count == 0 || archive.Entries.Count > MaxEntries)
                    throw new BackupValidationException("O ZIP não contém arquivos ou excede o limite de entradas.");

                long expandedBytes = 0;
                ZipArchiveEntry? sqlEntry = null;

                foreach (var entry in archive.Entries)
                {
                    ValidarCaminhoEntrada(entry);
                    if (entry.FullName.EndsWith('/') || entry.FullName.EndsWith('\\'))
                        continue;

                    expandedBytes = checked(expandedBytes + entry.Length);
                    if (expandedBytes > MaxExpandedBytes)
                        throw new BackupValidationException("O conteúdo descompactado excede o limite de 512 MB.");

                    if (string.Equals(Path.GetExtension(entry.FullName), ".sql", StringComparison.OrdinalIgnoreCase))
                    {
                        if (sqlEntry != null)
                            throw new BackupValidationException("O ZIP deve conter exatamente um script SQL.");
                        sqlEntry = entry;
                    }
                }

                if (sqlEntry == null || sqlEntry.Length == 0 || sqlEntry.Length > MaxSqlBytes)
                    throw new BackupValidationException("O ZIP deve conter um script SQL válido de até 256 MB.");

                BackupIntegrity.ValidateSignature(
                    archive,
                    BackupIntegrity.GetKey(_configuration));

                await using var sqlStream = sqlEntry.Open();
                using var reader = new StreamReader(sqlStream, Encoding.UTF8, detectEncodingFromByteOrderMarks: true);
                sqlScript = await reader.ReadToEndAsync(cancellationToken);
                if (string.IsNullOrWhiteSpace(sqlScript))
                    throw new BackupValidationException("O script SQL está vazio.");
            }
            catch (InvalidDataException exception)
            {
                throw new BackupValidationException("O arquivo não é um ZIP válido ou está corrompido.", exception);
            }
            catch (OverflowException exception)
            {
                throw new BackupValidationException("O conteúdo do ZIP excede o tamanho permitido.", exception);
            }

            _backupService.GerarBackupCompleto(out _, out _, out _);

            await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
            try
            {
                await _context.Database.ExecuteSqlRawAsync(sqlScript, cancellationToken);
                LogSistemaHelper.Registrar(
                    _context,
                    "BACKUP",
                    $"Restauração realizada a partir do arquivo {Path.GetFileName(zipFile.FileName)}",
                    usuario);
                await _context.SaveChangesAsync(cancellationToken);
                await transaction.CommitAsync(cancellationToken);
            }
            catch
            {
                await transaction.RollbackAsync(cancellationToken);
                throw;
            }

            return "Backup de segurança criado e restauração concluída.";
        }
        finally
        {
            if (File.Exists(tempPath))
                File.Delete(tempPath);
        }
    }

    private void ValidarCaminhoEntrada(ZipArchiveEntry entry)
    {
        var entryName = entry.FullName;
        var normalizedName = entryName.Replace('\\', '/');

        if (string.IsNullOrWhiteSpace(entryName)
            || entryName.Contains('\0')
            || normalizedName.StartsWith('/')
            || Path.IsPathRooted(entryName)
            || (normalizedName.Length >= 2 && char.IsLetter(normalizedName[0]) && normalizedName[1] == ':')
            || normalizedName.Split('/').Any(segment => segment == ".."))
        {
            throw new BackupValidationException("O ZIP contém um caminho de arquivo inválido.");
        }

        var unixFileType = (entry.ExternalAttributes >> 16) & 0xF000;
        if (unixFileType == 0xA000)
            throw new BackupValidationException("O ZIP não pode conter links simbólicos.");

        var root = Path.GetFullPath(_backupService.BackupDirectory) + Path.DirectorySeparatorChar;
        var destination = Path.GetFullPath(Path.Combine(
            root,
            normalizedName.Replace('/', Path.DirectorySeparatorChar)));
        var comparison = OperatingSystem.IsWindows() ? StringComparison.OrdinalIgnoreCase : StringComparison.Ordinal;
        if (!destination.StartsWith(root, comparison))
            throw new BackupValidationException("O ZIP contém um caminho fora da pasta de backup.");
    }
}
