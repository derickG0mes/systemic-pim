import Constants from "expo-constants";
import { getExpoPushTokenAsync } from "expo-notifications";
import { Platform } from "react-native";
import { registerPushDevice, unregisterPushDevice } from "./api";
import { readPreference, writePreference } from "./cache";
import { setupNotificationChannelsAsync } from "./notifications";

const PUSH_TOKEN_KEY = "systemic:push:token";

let registered = false;

/** Indica se este aparelho está registrado na API para receber push remoto nesta sessão. */
export function isPushRegistered() {
  return registered;
}

function resolveProjectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

/**
 * Pede permissão, obtém o token do Expo e o registra na API para o funcionário autenticado.
 * Pode ser chamada a cada abertura do app: o registro é idempotente.
 * Lança erro quando o ambiente não suporta push remoto (por exemplo, Expo Go no Android ou
 * build sem as credenciais do FCM); o chamador deve apenas registrar o aviso.
 */
export async function registerPushNotificationsAsync(): Promise<void> {
  if (Platform.OS !== "android" && Platform.OS !== "ios") return;

  const granted = await setupNotificationChannelsAsync();
  if (!granted) return;

  const projectId = resolveProjectId();
  if (!projectId) {
    throw new Error("projectId do EAS não encontrado em app.json (extra.eas.projectId).");
  }

  const { data: token } = await getExpoPushTokenAsync({ projectId });
  await registerPushDevice(token, Platform.OS);
  await writePreference<string | null>(PUSH_TOKEN_KEY, token);
  registered = true;
}

/**
 * Remove o token deste aparelho da API. Deve ser chamada ANTES de encerrar a sessão no servidor,
 * pois o endpoint exige o cookie de autenticação.
 */
export async function unregisterPushNotificationsAsync(): Promise<void> {
  registered = false;
  const token = await readPreference<string | null>(PUSH_TOKEN_KEY);
  if (!token) return;

  await unregisterPushDevice(token);
  await writePreference<string | null>(PUSH_TOKEN_KEY, null);
}
