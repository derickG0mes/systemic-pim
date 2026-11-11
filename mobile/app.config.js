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

  return { ...config, plugins };
};
