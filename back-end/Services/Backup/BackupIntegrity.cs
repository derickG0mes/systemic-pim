using System.Buffers.Binary;
using System.IO.Compression;
using System.Security.Cryptography;
using System.Text;

namespace PIM3.API.Services.Backup;

internal static class BackupIntegrity
{
    internal const string SignatureEntryName = "backup_hmac.sha256";
    private const int MinimumKeyBytes = 32;

    internal static string GetKey(IConfiguration configuration)
    {
        var key = configuration["BACKUP_HMAC_KEY"];
        if (string.IsNullOrWhiteSpace(key) || Encoding.UTF8.GetByteCount(key) < MinimumKeyBytes)
        {
            throw new InvalidOperationException(
                "BACKUP_HMAC_KEY deve estar configurada com pelo menos 32 bytes.");
        }

        return key;
    }

    internal static byte[] ComputeSignature(
        IEnumerable<ZipArchiveEntry> entries,
        string key)
    {
        using var hash = IncrementalHash.CreateHMAC(
            HashAlgorithmName.SHA256,
            Encoding.UTF8.GetBytes(key));
        var nameLength = new byte[sizeof(int)];
        var contentLength = new byte[sizeof(long)];

        foreach (var entry in entries
                     .Where(entry => !entry.FullName.EndsWith('/') && !entry.FullName.EndsWith('\\'))
                     .Where(entry => !string.Equals(
                         entry.FullName,
                         SignatureEntryName,
                         StringComparison.Ordinal))
                     .OrderBy(entry => entry.FullName, StringComparer.Ordinal))
        {
            var name = Encoding.UTF8.GetBytes(entry.FullName);
            BinaryPrimitives.WriteInt32BigEndian(nameLength, name.Length);
            hash.AppendData(nameLength);
            hash.AppendData(name);

            BinaryPrimitives.WriteInt64BigEndian(contentLength, entry.Length);
            hash.AppendData(contentLength);

            using var input = entry.Open();
            var buffer = new byte[81920];
            int bytesRead;
            long totalBytesRead = 0;
            while ((bytesRead = input.Read(buffer, 0, buffer.Length)) > 0)
            {
                hash.AppendData(buffer.AsSpan(0, bytesRead));
                totalBytesRead += bytesRead;
            }

            if (totalBytesRead != entry.Length)
                throw new InvalidDataException("O tamanho de uma entrada do ZIP não corresponde ao conteúdo.");
        }

        return hash.GetHashAndReset();
    }

    internal static void ValidateSignature(ZipArchive archive, string key)
    {
        var signatureEntries = archive.Entries
            .Where(entry => string.Equals(
                entry.FullName,
                SignatureEntryName,
                StringComparison.Ordinal))
            .ToArray();
        if (signatureEntries.Length != 1)
            throw new BackupValidationException("O ZIP deve conter uma assinatura HMAC válida.");

        using var signatureStream = signatureEntries[0].Open();
        using var reader = new StreamReader(signatureStream, Encoding.UTF8, detectEncodingFromByteOrderMarks: false);
        var suppliedSignature = reader.ReadToEnd();
        byte[] suppliedBytes;
        try
        {
            suppliedBytes = Convert.FromHexString(suppliedSignature);
        }
        catch (FormatException exception)
        {
            throw new BackupValidationException("A assinatura HMAC do backup é inválida.", exception);
        }

        if (suppliedBytes.Length != 32)
            throw new BackupValidationException("A assinatura HMAC do backup é inválida.");

        var expectedBytes = ComputeSignature(archive.Entries, key);
        if (!CryptographicOperations.FixedTimeEquals(suppliedBytes, expectedBytes))
            throw new BackupValidationException("A assinatura HMAC não corresponde ao conteúdo do backup.");
    }
}
