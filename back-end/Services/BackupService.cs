using System;
using System.Collections.Generic;
using System.Data;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using PIM3.API.Data;
using PIM3.API.Services.Backup;

namespace PIM3.API.Services;

public class BackupService
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;
    public string BackupDirectory { get; }

    public BackupService(AppDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
        var configuredPath = Environment.GetEnvironmentVariable("BACKUP_PATH")
            ?? configuration["BACKUP_PATH"];
        BackupDirectory = Path.GetFullPath(string.IsNullOrWhiteSpace(configuredPath)
            ? Path.Combine(AppContext.BaseDirectory, "backups")
            : configuredPath);
    }

    public string GerarScriptSQL()
    {
        var sqlBuilder = new StringBuilder();
        sqlBuilder.AppendLine("-- ==================================================");
        sqlBuilder.AppendLine($"-- SYSTEMIC DATABASE BACKUP - {DateTime.Now:dd/MM/yyyy HH:mm:ss}");
        sqlBuilder.AppendLine("-- ==================================================\n");

        sqlBuilder.AppendLine("EXEC sp_MSforeachtable 'ALTER TABLE ? NOCHECK CONSTRAINT ALL';\n");
        sqlBuilder.AppendLine("EXEC sp_MSforeachtable 'DELETE FROM ?';\n");

        var connection = _context.Database.GetDbConnection();
        var wasClosed = connection.State == ConnectionState.Closed;

        try
        {
            if (wasClosed)
                connection.Open();

            var entityTypes = _context.Model.GetEntityTypes().ToList();

            foreach (var entityType in entityTypes)
            {
                var tableName = entityType.GetTableName();
                if (string.IsNullOrEmpty(tableName)) continue;

                var properties = entityType.GetProperties().ToList();
                var columns = properties.Select(p => $"[{p.GetColumnName()}]").ToList();
                var columnsJoined = string.Join(", ", columns);

                // Verificamos se a tabela tem alguma coluna Identity
                var hasIdentity = properties.Any(p => p.ValueGenerated == Microsoft.EntityFrameworkCore.Metadata.ValueGenerated.OnAdd);

                using var command = connection.CreateCommand();
                command.CommandText = $"SELECT {string.Join(", ", properties.Select(p => $"[{p.GetColumnName()}]"))} FROM [{tableName}]";

                using var reader = command.ExecuteReader();
                if (reader.HasRows)
                {
                    if (hasIdentity)
                    {
                        sqlBuilder.AppendLine($"SET IDENTITY_INSERT [{tableName}] ON;");
                    }

                    while (reader.Read())
                    {
                        var values = new List<string>();
                        for (int i = 0; i < reader.FieldCount; i++)
                        {
                            var val = reader.GetValue(i);
                            if (val == null || val == DBNull.Value)
                            {
                                values.Add("NULL");
                            }
                            else if (val is string || val is DateTime || val is Guid || val is char)
                            {
                                var escaped = val.ToString()!.Replace("'", "''");
                                values.Add($"'{escaped}'");
                            }
                            else if (val is bool b)
                            {
                                values.Add(b ? "1" : "0");
                            }
                            else if (val is byte[] bytes)
                            {
                                var hex = BitConverter.ToString(bytes).Replace("-", "");
                                values.Add($"0x{hex}");
                            }
                            else
                            {
                                values.Add(val.ToString()!.Replace(",", "."));
                            }
                        }

                        sqlBuilder.AppendLine($"INSERT INTO [{tableName}] ({columnsJoined}) VALUES ({string.Join(", ", values)});");
                    }

                    if (hasIdentity)
                    {
                        sqlBuilder.AppendLine($"SET IDENTITY_INSERT [{tableName}] OFF;");
                    }
                    sqlBuilder.AppendLine();
                }
            }
        }
        finally
        {
            if (wasClosed && connection.State == ConnectionState.Open)
                connection.Close();
        }

        sqlBuilder.AppendLine("EXEC sp_MSforeachtable 'ALTER TABLE ? WITH CHECK CHECK CONSTRAINT ALL';");
        return sqlBuilder.ToString();
    }

    public string ExportarLogs()
    {
        var logsSistema = _context.LogsSistema.ToList();
        var logsComanda = _context.LogsComanda.ToList();

        var logs = new
        {
            LogsSistema = logsSistema,
            LogsComanda = logsComanda
        };

        return JsonSerializer.Serialize(logs, new JsonSerializerOptions { WriteIndented = true });
    }

    public string ExportarConfiguracoes()
    {
        string configPath = Path.Combine(Directory.GetCurrentDirectory(), "appsettings.json");
        if (!File.Exists(configPath))
        {
            return "{}";
        }

        try
        {
            string configJson = File.ReadAllText(configPath);
            var node = JsonNode.Parse(configJson);
            if (node != null)
            {
                var connStrings = node["ConnectionStrings"]?.AsObject();
                if (connStrings != null)
                {
                    foreach (var prop in connStrings.ToList())
                    {
                        if (prop.Value != null)
                        {
                            var connStr = prop.Value.ToString();
                            var redacted = Regex.Replace(connStr, @"Password=[^;]+", "Password=REDACTED");
                            connStrings[prop.Key] = redacted;
                        }
                    }
                }

                var jwt = node["Jwt"]?.AsObject();
                if (jwt != null && jwt["SecretKey"] != null)
                {
                    jwt["SecretKey"] = "REDACTED";
                }

                return node.ToJsonString(new JsonSerializerOptions { WriteIndented = true });
            }
        }
        catch (Exception ex)
        {
            return $"{{\"erro\": \"Falha ao ler configuracoes: {ex.Message}\"}}";
        }

        return "{}";
    }

    public string GerarBackupCompleto(out string zipPath, out string folderPath, out long zipSize)
    {
        var hmacKey = BackupIntegrity.GetKey(_configuration);
        string dataFormatada = DateTime.Now.ToString("ddMMyyyy");
        string horaFormatada = DateTime.Now.ToString("HHmmss");
        string backupName = $"backup_{dataFormatada}_{horaFormatada}";

        folderPath = Path.Combine(BackupDirectory, backupName);
        zipPath = Path.Combine(BackupDirectory, $"{backupName}.zip");

        // Criar diretório
        if (!Directory.Exists(folderPath))
        {
            Directory.CreateDirectory(folderPath);
        }

        // 1. Banco de dados SQL
        string sqlContent = GerarScriptSQL();
        string sqlPath = Path.Combine(folderPath, $"backup_banco_{dataFormatada}.sql");
        File.WriteAllText(sqlPath, sqlContent, Encoding.UTF8);

        // 2. Logs
        string logsContent = ExportarLogs();
        string logsPath = Path.Combine(folderPath, $"backup_logs_{dataFormatada}.json");
        File.WriteAllText(logsPath, logsContent, Encoding.UTF8);

        // 3. Configurações
        string configContent = ExportarConfiguracoes();
        string configPath = Path.Combine(folderPath, $"backup_config_{dataFormatada}.json");
        File.WriteAllText(configPath, configContent, Encoding.UTF8);

        var stagingZipPath = Path.Combine(
            BackupDirectory,
            $"{backupName}_{Guid.NewGuid():N}.tmp");
        try
        {
            ZipFile.CreateFromDirectory(folderPath, stagingZipPath);
            byte[] signature;
            using (var archive = ZipFile.OpenRead(stagingZipPath))
            {
                signature = BackupIntegrity.ComputeSignature(
                    archive.Entries,
                    hmacKey);
            }
            File.WriteAllText(
                Path.Combine(folderPath, BackupIntegrity.SignatureEntryName),
                Convert.ToHexString(signature),
                new UTF8Encoding(encoderShouldEmitUTF8Identifier: false));

            File.Delete(stagingZipPath);
            ZipFile.CreateFromDirectory(folderPath, stagingZipPath);
            File.Move(stagingZipPath, zipPath, overwrite: true);
        }
        finally
        {
            if (File.Exists(stagingZipPath))
                File.Delete(stagingZipPath);
        }

        zipSize = new FileInfo(zipPath).Length;

        return backupName;
    }

    public List<BackupItemDTO> ListarBackups()
    {
        var items = new List<BackupItemDTO>();
        if (!Directory.Exists(BackupDirectory))
        {
            return items;
        }

        var zipFiles = Directory.GetFiles(BackupDirectory, "*.zip");
        foreach (var file in zipFiles)
        {
            var fileInfo = new FileInfo(file);

            items.Add(new BackupItemDTO
            {
                NomeArquivo = fileInfo.Name,
                Caminho = file,
                TamanhoBytes = fileInfo.Length,
                TamanhoExibicao = $"{(fileInfo.Length / 1024.0 / 1024.0):F2} MB",
                DataCriacao = fileInfo.CreationTime
            });
        }

        return items.OrderByDescending(b => b.DataCriacao).ToList();
    }
}

public class BackupItemDTO
{
    public string NomeArquivo { get; set; } = string.Empty;
    public string Caminho { get; set; } = string.Empty;
    public long TamanhoBytes { get; set; }
    public string TamanhoExibicao { get; set; } = string.Empty;
    public DateTime DataCriacao { get; set; }
}
