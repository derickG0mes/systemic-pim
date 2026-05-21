using System;
using System.IO;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PIM3.API.Services;
using PIM3.API.Controllers.Backup; // DTO
using PIM3.API.Services.Backup;    // BackupRestoreService

namespace PIM3.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "admin,owner")]
public class BackupController : ControllerBase
{
    private readonly BackupService _backupService;

    public BackupController(BackupService backupService)
    {
        _backupService = backupService;
    }

    [HttpPost("gerar")]
    public IActionResult GerarBackup()
    {
        try
        {
            string zipPath;
            string folderPath;
            long zipSize;
            string backupName = _backupService.GerarBackupCompleto(out zipPath, out folderPath, out zipSize);

            return Ok(new
            {
                sucesso = true,
                mensagem = "Backup gerado com sucesso!",
                dados = new
                {
                    nomeArquivo = $"{backupName}.zip",
                    caminho = zipPath,
                    tamanhoBytes = zipSize,
                    tamanhoExibicao = $"{(zipSize / 1024.0 / 1024.0):F2} MB",
                    dataCriacao = DateTime.Now
                }
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                sucesso = false,
                mensagem = $"Falha ao gerar backup: {ex.Message}"
            });
        }
    }

    [HttpGet("baixar/{nomeArquivo}")]
    public IActionResult BaixarBackup(string nomeArquivo)
    {
        try
        {
            // Sanitizar nome do arquivo para evitar Path Traversal
            var safeName = Path.GetFileName(nomeArquivo);
            var zipPath = Path.Combine(@"C:\Backups\Systemic", safeName);

            if (!System.IO.File.Exists(zipPath))
            {
                return NotFound(new { sucesso = false, mensagem = "Arquivo de backup não encontrado." });
            }

            var bytes = System.IO.File.ReadAllBytes(zipPath);
            return base.File(bytes, "application/octet-stream", safeName);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { sucesso = false, mensagem = $"Erro ao baixar backup: {ex.Message}" });
        }
    }

    [HttpGet("listar")]
    public IActionResult ListarBackups()
    {
        try
        {
            var backups = _backupService.ListarBackups();
            return Ok(new
            {
                sucesso = true,
                dados = backups
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { sucesso = false, mensagem = $"Erro ao listar backups: {ex.Message}" });
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 🔄 NOVO ENDPOINT: Restauração de Backup (aditivo, sem alterar rotas acima)
    // ═══════════════════════════════════════════════════════════════════════════
    [AllowAnonymous]
[HttpPost("restore")]
    public async Task<IActionResult> Restore([FromForm] RestoreRequest request)
    {
        if (request?.Arquivo == null || request.Arquivo.Length == 0)
            return BadRequest(new { sucesso = false, mensagem = "Arquivo de backup inválido." });

        try
        {
            var restoreService = HttpContext.RequestServices
                .GetRequiredService<BackupRestoreService>();

            await restoreService.RestaurarAsync(request.Arquivo);

            return Ok(new { sucesso = true, mensagem = "Backup restaurado com sucesso." });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { sucesso = false, mensagem = $"Falha ao restaurar backup: {ex.Message}" });
        }
    }
}
