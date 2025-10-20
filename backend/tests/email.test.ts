import assert from 'node:assert/strict';
import { test, mock, after } from 'node:test';
import type { IncomingHttpHeaders } from 'node:http';
import { createSendEmailHandler } from '../src/routes/email.js';

const consoleErrorMock = mock.method(console, 'error', () => {});

after(() => {
  consoleErrorMock.mock.restore();
});

test('envio bem-sucedido retorna 200 e registra histórico como enviado', async () => {
  const insertCalls: any[] = [];
  const supabaseMock = {
    auth: {
      getUser: mock.fn(async () => ({ data: { user: { id: 'user-1' } } })),
    },
    from: mock.fn(() => ({
      insert: mock.fn(async (payload: any) => {
        insertCalls.push(payload);
        return { error: null };
      }),
    })),
  };

  const fetchMock = mock.fn(async () => ({
    ok: true,
    text: async () => JSON.stringify({ id: 'resend-123' }),
  }));

  const handler = createSendEmailHandler({
    createSupabaseClient: () => supabaseMock as any,
    fetchImpl: fetchMock as any,
    resendApiKey: 'resend-test-key',
  });

  const headers: IncomingHttpHeaders = { authorization: 'Bearer token-abc' };

  const result = await handler(
    {
      from: 'origem@exemplo.com',
      to: 'destino@exemplo.com',
      subject: 'Assunto',
      html: '<p>Corpo</p>',
      attachments: [{ filename: 'arquivo.pdf', content: 'dGVzdA==' }],
    },
    headers,
  );

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { success: true, id: 'resend-123' });
  assert.equal(fetchMock.mock.calls.length, 1);
  assert.equal(supabaseMock.from.mock.calls.length, 1);
  assert.equal(insertCalls.length, 1);
  assert.equal(insertCalls[0].status, 'sent');
  assert.equal(insertCalls[0].attachments_count, 1);
  assert.equal(insertCalls[0].sent_by, 'user-1');
});

test('falha ao enviar retorna 500 e registra histórico de erro', async () => {
  const insertCalls: any[] = [];
  const supabaseMock = {
    auth: {
      getUser: mock.fn(async () => ({ data: { user: { id: 'user-2' } } })),
    },
    from: mock.fn(() => ({
      insert: mock.fn(async (payload: any) => {
        insertCalls.push(payload);
        return { error: null };
      }),
    })),
  };

  const fetchMock = mock.fn(async () => ({
    ok: false,
    text: async () => JSON.stringify({ message: 'Erro Resend' }),
  }));

  const handler = createSendEmailHandler({
    createSupabaseClient: () => supabaseMock as any,
    fetchImpl: fetchMock as any,
    resendApiKey: 'resend-test-key',
  });

  const headers: IncomingHttpHeaders = { authorization: 'Bearer token-def' };

  const result = await handler(
    {
      from: 'origem@exemplo.com',
      to: 'destino@exemplo.com',
      subject: 'Assunto',
      html: '<p>Corpo</p>',
    },
    headers,
  );

  assert.equal(result.status, 500);
  assert.equal((result.body as any).success, false);
  assert.equal((result.body as any).error, 'Erro Resend');
  assert.equal(fetchMock.mock.calls.length, 1);
  assert.equal(supabaseMock.from.mock.calls.length, 1);
  assert.equal(insertCalls.length, 1);
  assert.equal(insertCalls[0].status, 'failed');
  assert.equal(insertCalls[0].sent_by, 'user-2');
});

test('falha com resposta html retorna mensagem sanitizada', async () => {
  const insertCalls: any[] = [];
  const supabaseMock = {
    auth: {
      getUser: mock.fn(async () => ({ data: { user: { id: 'user-3' } } })),
    },
    from: mock.fn(() => ({
      insert: mock.fn(async (payload: any) => {
        insertCalls.push(payload);
        return { error: null };
      }),
    })),
  };

  const fetchMock = mock.fn(async () => ({
    ok: false,
    text: async () =>
      '<html><body><h1>404 Not Found</h1><p>nginx/1.29.2</p></body></html>',
  }));

  const handler = createSendEmailHandler({
    createSupabaseClient: () => supabaseMock as any,
    fetchImpl: fetchMock as any,
    resendApiKey: 'resend-test-key',
  });

  const headers: IncomingHttpHeaders = { authorization: 'Bearer token-ghi' };

  const result = await handler(
    {
      from: 'origem@exemplo.com',
      to: 'destino@exemplo.com',
      subject: 'Assunto',
      html: '<p>Corpo</p>',
    },
    headers,
  );

  assert.equal(result.status, 500);
  assert.equal((result.body as any).success, false);
  assert.equal((result.body as any).error, '404 Not Found nginx/1.29.2');
  assert.equal(fetchMock.mock.calls.length, 1);
  assert.equal(supabaseMock.from.mock.calls.length, 1);
  assert.equal(insertCalls.length, 1);
  assert.equal(insertCalls[0].status, 'failed');
  assert.equal(insertCalls[0].error_message, '404 Not Found nginx/1.29.2');
  assert.equal(insertCalls[0].sent_by, 'user-3');
});

test('envio continua mesmo sem cliente do supabase', async () => {
  const fetchMock = mock.fn(async () => ({
    ok: true,
    text: async () => JSON.stringify({ id: 'resend-456' }),
  }));

  const handler = createSendEmailHandler({
    createSupabaseClient: mock.fn(() => {
      throw new Error('indisponível');
    }) as any,
    fetchImpl: fetchMock as any,
    resendApiKey: 'resend-test-key',
  });

  const result = await handler(
    {
      from: 'origem@exemplo.com',
      to: 'destino@exemplo.com',
      subject: 'Assunto',
      html: '<p>Corpo</p>',
    },
    {},
  );

  assert.equal(result.status, 200);
  assert.equal(fetchMock.mock.calls.length, 1);
});

test('retorna erro claro quando serviço de email não está configurado', async () => {
  const supabaseFactory = mock.fn(() => {
    throw new Error('não deve ser chamado');
  });

  const fetchMock = mock.fn(async () => ({
    ok: true,
    text: async () => JSON.stringify({ id: 'resend-789' }),
  }));

  const handler = createSendEmailHandler({
    createSupabaseClient: supabaseFactory as any,
    fetchImpl: fetchMock as any,
    resendApiKey: '',
  });

  const result = await handler(
    {
      from: 'origem@exemplo.com',
      to: 'destino@exemplo.com',
      subject: 'Assunto',
      html: '<p>Corpo</p>',
    },
    {},
  );

  assert.equal(result.status, 500);
  assert.equal((result.body as any).success, false);
  assert.equal((result.body as any).error, 'Serviço de email não configurado');
  assert.equal(fetchMock.mock.calls.length, 0);
  assert.equal(supabaseFactory.mock.calls.length, 0);
});
