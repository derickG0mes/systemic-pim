using Microsoft.AspNetCore.Http;

namespace PIM3.API.Controllers.Backup;

/// <summary>
/// DTO usado para upload de arquivo de backup a ser restaurado.
/// </summary>
public class RestoreRequest
{
    /// <summary>
    /// Arquivo de backup enviado via multipart/form-data.
    /// </summary>
    public IFormFile Arquivo { get; set; } = null!;
}
