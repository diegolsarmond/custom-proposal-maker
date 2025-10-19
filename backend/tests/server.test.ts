import assert from 'node:assert/strict';
import { test } from 'node:test';

process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://localhost';
process.env.SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'service-role-key';
process.env.RESEND_API_KEY = process.env.RESEND_API_KEY ?? 'resend-key';

let serverModulePromise: Promise<typeof import('../src/server.js')> | null = null;

const loadServerModule = () => {
  if (!serverModulePromise) {
    serverModulePromise = import('../src/server.js');
  }
  return serverModulePromise;
};

test('normaliza removendo barra final da rota de envio', async () => {
  const { normalizePath } = await loadServerModule();
  assert.equal(normalizePath('/emails/send/'), '/emails/send');
});

test('normaliza removendo query string da rota de envio', async () => {
  const { normalizePath } = await loadServerModule();
  assert.equal(normalizePath('/emails/send?foo=bar'), '/emails/send');
});

test('mantem a raiz quando apenas barra é enviada', async () => {
  const { normalizePath } = await loadServerModule();
  assert.equal(normalizePath('/'), '/');
});
