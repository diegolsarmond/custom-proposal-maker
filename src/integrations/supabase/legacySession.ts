const LEGACY_KEYS = [
  "sb-supabase-crm-quantumtecnologia-com-br-auth-token",
  "sb-supabase-crm-quantumtecnologia-com-br-persist-session"
];

type StorageLike = {
  getItem: (key: string) => string | null;
  removeItem: (key: string) => void;
};

export const clearLegacySupabaseSessions = (storage?: StorageLike) => {
  if (!storage) {
    return;
  }
  for (const key of LEGACY_KEYS) {
    if (storage.getItem(key)) {
      storage.removeItem(key);
    }
  }
};
