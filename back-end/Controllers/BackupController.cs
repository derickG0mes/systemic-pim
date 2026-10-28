using System;
using System.IO;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PIM3.API.Services;
using PIM3.API.DTOs;
using PIM3.API.Controllers.Backup; // DTO
using PIM3.API.Services.Backup;    // BackupRestoreService

namespace PIM3.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "admin,owner")]
public class BackupController : ControllerBase
{
    private readonly BackupService _backupService;
    private readonly BackupRestoreService _restoreService;

    public BackupController(BackupService backupService, BackupRestoreService restoreService)
    {
        _backupService = backupService;
        _restoreService = restoreService;
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
            var zipPath = Path.Combine(_backupService.BackupDirectory, safeName);

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
    [Authorize(Roles = "admin,owner")]
    [HttpPost("restore")]
    [RequestSizeLimit(101 * 1024 * 1024)]
    [RequestFormLimits(MultipartBodyLengthLimit = 100L * 1024 * 1024)]
    public async Task<IActionResult> Restore([FromForm] RestoreRequest request, CancellationToken cancellationToken)
    {
        if (request?.Arquivo == null || request.Arquivo.Length == 0)
            return BadRequest(new RespostaPadraoDTO { Sucesso = false, Mensagem = "Arquivo de backup inválido." });

        try
        {
            var usuario = User.FindFirst(ClaimTypes.Name)?.Value
                ?? User.Identity?.Name
                ?? User.FindFirst("cpf")?.Value
                ?? "usuario_autenticado";
            await _restoreService.RestaurarAsync(request.Arquivo, usuario, cancellationToken);

            return Ok(new RespostaPadraoDTO { Sucesso = true, Mensagem = "Backup restaurado com sucesso." });
        }
        catch (BackupValidationException ex)
        {
            return BadRequest(new RespostaPadraoDTO { Sucesso = false, Mensagem = ex.Message });
        }
        catch (Exception)
        {
            return StatusCode(500, new RespostaPadraoDTO { Sucesso = false, Mensagem = "Falha ao restaurar o backup." });
        }
    }
}
