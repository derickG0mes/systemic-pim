const fs = require("fs");
const path = require("path");

module.exports = ({ config }) => {
  const buildProfile = process.env.EAS_BUILD_PROFILE;
  const apiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

  if (buildProfile === "preview" || buildProfile === "production") {
    let parsedUrl;
    try {
      parsedUrl = new URL(apiUrl ?? "");
    } catch {
      throw new Error("Defina EXPO_PUBLIC_API_URL como uma URL válida terminada em /api.");
    }

    if (!parsedUrl.pathname.replace(/\/+$/, "").endsWith("/api")) {
      throw new Error("EXPO_PUBLIC_API_URL deve terminar em /api.");
    }
    if (buildProfile === "production" && parsedUrl.protocol !== "https:") {
      throw new Error("O perfil production exige EXPO_PUBLIC_API_URL com HTTPS.");
    }
  }

  const plugins = [...(config.plugins ?? [])];
  if (buildProfile === "preview") {
    // remover ao usar HTTPS
    plugins.push([
      "expo-build-properties",
      { android: { usesCleartextTraffic: true } },
    ]);
  }

  // Push remoto no Android exige o google-services.json do projeto Firebase (FCM).
  // Coloque o arquivo em mobile/google-services.json (pode ser versionado: contém apenas
  // identificadores públicos do projeto Firebase) ou, no EAS, defina a variável de ambiente do
  // tipo arquivo GOOGLE_SERVICES_JSON.
  const googleServicesFile =
    process.env.GOOGLE_SERVICES_JSON ??
    (fs.existsSync(path.resolve("google-services.json")) ? "./google-services.json" : undefined);

  if (!googleServicesFile && (buildProfile === "preview" || buildProfile === "production")) {
    console.warn(
      "[push] google-services.json não encontrado: o build Android sairá sem push remoto (FCM). " +
        "Veja docs/PUSH_NOTIFICATIONS.md.",
    );
  }

  const android = googleServicesFile ? { ...config.android, googleServicesFile } : config.android;

  return { ...config, android, plugins };
};
