import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
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

test('reconhece rota de envio mesmo com prefixo', async () => {
  const { matchesSendEmailRoute } = await loadServerModule();
  assert.ok(matchesSendEmailRoute('/api/emails/send'));
});

test('nao considera outras rotas como envio', async () => {
  const { matchesSendEmailRoute } = await loadServerModule();
  assert.equal(matchesSendEmailRoute('/emails/status'), false);
});

test('parseia multipart convertendo anexos para base64', async () => {
  const { parseSendEmailRequest } = await loadServerModule();
  const boundary = '----test-boundary';
  const fileContent = 'conteudo de teste';
  const body =
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="from"\r\n\r\n` +
    `origem@exemplo.com\r\n` +
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="to"\r\n\r\n` +
    `destino@exemplo.com\r\n` +
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="subject"\r\n\r\n` +
    `Assunto teste\r\n` +
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="html"\r\n\r\n` +
    `<p>Corpo</p>\r\n` +
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="attachments"; filename="arquivo.txt"\r\n` +
    `Content-Type: text/plain\r\n\r\n` +
    `${fileContent}\r\n` +
    `--${boundary}--\r\n`;

  const req = new PassThrough();
  (req as any).headers = {
    'content-type': `multipart/form-data; boundary=${boundary}`,
  };

  const parsePromise = parseSendEmailRequest(req as any);
  req.end(Buffer.from(body, 'utf8'));
  const result = await parsePromise;

  assert.equal(result.from, 'origem@exemplo.com');
  assert.equal(result.to, 'destino@exemplo.com');
  assert.equal(result.subject, 'Assunto teste');
  assert.equal(result.html, '<p>Corpo</p>');
  assert.equal(result.attachments?.length, 1);
  assert.equal(result.attachments?.[0].filename, 'arquivo.txt');
  assert.equal(
    result.attachments?.[0].content,
    Buffer.from(fileContent, 'utf8').toString('base64'),
  );
});

test('retorna erro quando anexo ultrapassa limite', async () => {
  const { parseSendEmailRequest } = await loadServerModule();
  const boundary = '----big-boundary';
  const bigBuffer = Buffer.alloc(5 * 1024 * 1024 + 1, 0);
  const bodyBuffer = Buffer.concat([
    Buffer.from(`--${boundary}\r\n`),
    Buffer.from(
      'Content-Disposition: form-data; name="attachments"; filename="grande.bin"\r\n' +
        'Content-Type: application/octet-stream\r\n\r\n',
      'utf8',
    ),
    bigBuffer,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  const req = new PassThrough();
  (req as any).headers = {
    'content-type': `multipart/form-data; boundary=${boundary}`,
  };

  const parsePromise = parseSendEmailRequest(req as any);
  req.end(bodyBuffer);

  await assert.rejects(parsePromise, (error: any) => {
    assert.equal(error.statusCode, 413);
    assert.ok(String(error.message).includes('excede o limite'));
    return true;
  });
});
