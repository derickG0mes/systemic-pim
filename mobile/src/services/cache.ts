import * as SQLite from "expo-sqlite";

let databasePromise: Promise<SQLite.SQLiteDatabase> | undefined;

async function getDatabase() {
  databasePromise ??= SQLite.openDatabaseAsync("systemic-mobile.db");
  const database = await databasePromise;
  await database.execAsync(
    `CREATE TABLE IF NOT EXISTS mobile_cache (
      cache_key TEXT PRIMARY KEY NOT NULL,
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS mobile_preferences (
      preference_key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    )`,
  );
  return database;
}

export async function readCache<T>(key: string): Promise<T | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ payload: string }>(
    "SELECT payload FROM mobile_cache WHERE cache_key = ?",
    key,
  );
  return row ? (JSON.parse(row.payload) as T) : null;
}

export async function writeCache<T>(key: string, value: T): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    "INSERT OR REPLACE INTO mobile_cache (cache_key, payload, updated_at) VALUES (?, ?, ?)",
    key,
    JSON.stringify(value),
    new Date().toISOString(),
  );
}

export async function readPreference<T>(key: string): Promise<T | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ value: string }>(
    "SELECT value FROM mobile_preferences WHERE preference_key = ?",
    key,
  );
  return row ? (JSON.parse(row.value) as T) : null;
}

export async function writePreference<T>(key: string, value: T): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    "INSERT OR REPLACE INTO mobile_preferences (preference_key, value) VALUES (?, ?)",
    key,
    JSON.stringify(value),
  );
}

export async function clearCache(): Promise<void> {
  const database = await getDatabase();
  await database.runAsync("DELETE FROM mobile_cache");
}
