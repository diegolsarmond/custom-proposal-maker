import test from "node:test";
import assert from "node:assert/strict";
import { clearLegacySupabaseSessions } from "./legacySession.js";

interface StorageLike {
  getItem: (key: string) => string | null;
  removeItem: (key: string) => void;
  setItem: (key: string, value: string) => void;
}

const createMockStorage = (): StorageLike => {
  const store = new Map<string, string>();
  return {
    getItem: (key) => (store.has(key) ? store.get(key)! : null),
    removeItem: (key) => {
      store.delete(key);
    },
    setItem: (key, value) => {
      store.set(key, value);
    }
  };
};

test("remove chaves antigas e preserva outras entradas", () => {
  const storage = createMockStorage();
  storage.setItem("sb-supabase-crm-quantumtecnologia-com-br-auth-token", "legacy");
  storage.setItem("sb-supabase-crm-quantumtecnologia-com-br-persist-session", "legacy");
  storage.setItem("outro-registro", "valor");

  clearLegacySupabaseSessions(storage);

  assert.equal(storage.getItem("sb-supabase-crm-quantumtecnologia-com-br-auth-token"), null);
  assert.equal(storage.getItem("sb-supabase-crm-quantumtecnologia-com-br-persist-session"), null);
  assert.equal(storage.getItem("outro-registro"), "valor");
});

test("ignora quando o storage nao esta disponivel", () => {
  clearLegacySupabaseSessions(undefined);
});
