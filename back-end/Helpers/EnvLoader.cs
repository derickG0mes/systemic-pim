using System;
using System.IO;

namespace PIM3.API.Helpers;

/// <summary>
/// Carrega variáveis de ambiente do arquivo .env
/// </summary>
public static class EnvLoader
{
    public static void Load(string envFilePath = ".env")
    {
        if (!File.Exists(envFilePath))
        {
            return;
        }

        var lines = File.ReadAllLines(envFilePath);
        foreach (var line in lines)
        {
            // Ignorar linhas vazias e comentários
            if (string.IsNullOrWhiteSpace(line) || line.StartsWith("#"))
                continue;

            // Parsear formato KEY=VALUE
            var parts = line.Split(new[] { '=' }, 2);
            if (parts.Length != 2)
                continue;

            var key = parts[0].Trim();
            var value = parts[1].Trim();

            // Remover aspas se presentes
            if ((value.StartsWith("\"") && value.EndsWith("\"")) ||
                (value.StartsWith("'") && value.EndsWith("'")))
            {
                value = value.Substring(1, value.Length - 2);
            }

            // Definir a variável de ambiente (sobrescreve apenas se não existir)
            if (string.IsNullOrEmpty(Environment.GetEnvironmentVariable(key)))
            {
                Environment.SetEnvironmentVariable(key, value);
            }
        }
    }
}
