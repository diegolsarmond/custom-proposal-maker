import { createServer, type IncomingMessage } from 'node:http';
import { sendEmailHandler, corsHeaders } from './routes/email.js';
import type { SendEmailRequest } from './routes/email.js';

const requiredEnv = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`${key} não configurada`);
  }
}

if (!process.env.RESEND_API_KEY && !process.env.SMTP_PASSWORD) {
  throw new Error('RESEND_API_KEY ou SMTP_PASSWORD não configurada');
}

const parseJsonBody = async (req: IncomingMessage): Promise<unknown> => {
  const chunks: Uint8Array[] = [];
  for await (const chunk of req) {
    if (typeof chunk === 'string') {
      chunks.push(Buffer.from(chunk));
    } else {
      chunks.push(chunk);
    }
  }
  if (chunks.length === 0) {
    return {};
  }
  const raw = Buffer.concat(chunks).toString();
  if (!raw) {
    return {};
  }
  return JSON.parse(raw);
};

export const normalizePath = (url?: string | null) => {
  if (!url) {
    return '';
  }
  const [path] = url.split('?');
  if (!path) {
    return '';
  }
  if (path === '/') {
    return path;
  }
  return path.replace(/\/+$/, '');
};

const server = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', corsHeaders['Access-Control-Allow-Origin']);
  res.setHeader('Access-Control-Allow-Headers', corsHeaders['Access-Control-Allow-Headers']);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const path = normalizePath(req.url);

  if (req.method === 'POST' && path === '/emails/send') {
    try {
      const body = (await parseJsonBody(req)) as SendEmailRequest;
      const result = await sendEmailHandler(body, req.headers);
      res.statusCode = result.status;
      for (const [key, value] of Object.entries(result.headers)) {
        res.setHeader(key, value);
      }
      res.end(JSON.stringify(result.body));
      return;
    } catch (error: any) {
      if (error?.name === 'SyntaxError') {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: false, error: 'JSON inválido' }));
        return;
      }
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, error: error?.message ?? 'Erro interno' }));
      return;
    }
  }

  res.statusCode = 404;
  res.end();
});

if (process.env.NODE_ENV !== 'test') {
  const port = Number(process.env.PORT) || 3001;
  server.listen(port, () => {
    console.log(`Servidor iniciado na porta ${port}`);
  });
}

export default server;
