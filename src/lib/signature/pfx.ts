const STORAGE_KEY = "signature:pfx";

const toBase64 = (data: ArrayBuffer | Uint8Array) => {
  const buffer = data instanceof Uint8Array ? data : new Uint8Array(data);
  let binary = "";
  buffer.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

const fromBase64 = (value: string) => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

const deriveAesKey = async (password: string, salt: Uint8Array) => {
  const encoder = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 120000,
      hash: "SHA-256",
    },
    baseKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt", "decrypt"]
  );
};

export const hasStoredCertificate = () => {
  if (typeof localStorage === "undefined") return false;
  return !!localStorage.getItem(STORAGE_KEY);
};

export const storePfxCertificate = async (file: File, password: string) => {
  const arrayBuffer = await file.arrayBuffer();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveAesKey(password, salt);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, arrayBuffer);

  const payload = {
    iv: toBase64(iv),
    salt: toBase64(salt),
    data: toBase64(encrypted),
    createdAt: Date.now(),
    name: file.name,
    size: file.size,
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
};

const loadStoredPayload = () => {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as {
      iv: string;
      salt: string;
      data: string;
      createdAt: number;
      name: string;
      size: number;
    };
  } catch {
    return null;
  }
};

export const getStoredCertificateInfo = () => {
  const payload = loadStoredPayload();
  if (!payload) return null;

  return {
    name: payload.name,
    size: payload.size,
    createdAt: payload.createdAt,
  };
};

export const unlockPfxCertificate = async (password: string) => {
  const payload = loadStoredPayload();
  if (!payload) {
    throw new Error("Nenhum certificado armazenado");
  }

  const iv = new Uint8Array(fromBase64(payload.iv));
  const salt = new Uint8Array(fromBase64(payload.salt));
  const encrypted = fromBase64(payload.data);
  const key = await deriveAesKey(password, salt);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, encrypted);

  return {
    certificate: decrypted,
    metadata: {
      name: payload.name,
      size: payload.size,
      createdAt: payload.createdAt,
    },
  };
};

export const signPdfWithPfx = async (pdf: Blob, password: string) => {
  const { certificate } = await unlockPfxCertificate(password);
  const pdfBuffer = await pdf.arrayBuffer();
  const encoder = new TextEncoder();
  const merged = new Uint8Array(pdfBuffer.byteLength + certificate.byteLength);
  merged.set(new Uint8Array(pdfBuffer), 0);
  merged.set(new Uint8Array(certificate), pdfBuffer.byteLength);

  const digest = await crypto.subtle.digest("SHA-256", merged);
  const digestArray = new Uint8Array(digest);
  const signature = Array.from(digestArray)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const stamp = encoder.encode(`\n%%Signed-PFX:${signature};${new Date().toISOString()}\n`);
  return new Blob([pdfBuffer, stamp], { type: "application/pdf" });
};
