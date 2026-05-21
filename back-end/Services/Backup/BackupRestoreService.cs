using Microsoft.AspNetCore.Http;
using System.IO.Compression;

namespace PIM3.API.Services.Backup;

/// <summary>
/// Serviço isolado para restauração de backups.
/// Não altera nenhuma lógica existente do BackupService original.
/// </summary>
public class BackupRestoreService
{
    private readonly string _backupFolder = @"C:\Backups\Systemic";

    /// <summary>
    /// Recebe um arquivo .zip de backup e extrai seu conteúdo no diretório de backups.
    /// </summary>
    public async Task<bool> RestaurarAsync(IFormFile zipFile)
    {
        var tempPath = Path.GetTempFileName();

        await using (var stream = new FileStream(tempPath, FileMode.Create))
        {
            await zipFile.CopyToAsync(stream);
        }

        ZipFile.ExtractToDirectory(tempPath, _backupFolder, overwriteFiles: true);
        File.Delete(tempPath);

        return true;
    }
}
