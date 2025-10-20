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

const collectRequestBody = async (req: IncomingMessage): Promise<Buffer> => {
  const chunks: Uint8Array[] = [];
  for await (const chunk of req) {
    if (typeof chunk === 'string') {
      chunks.push(Buffer.from(chunk));
    } else {
      chunks.push(chunk);
    }
  }
  return Buffer.concat(chunks);
};

const parseJsonBody = async (req: IncomingMessage): Promise<unknown> => {
  const buffer = await collectRequestBody(req);
  if (buffer.length === 0) {
    return {};
  }
  const raw = buffer.toString();
  if (!raw) {
    return {};
  }
  return JSON.parse(raw);
};

const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024;

const extractBoundary = (contentType: string) => {
  const match = /boundary=(?:"?)([^";]+)(?:"?)/i.exec(contentType);
  if (!match) {
    throw new Error('Boundary inválido');
  }
  return match[1];
};

const parseMultipartBody = async (req: IncomingMessage, contentType: string): Promise<SendEmailRequest> => {
  const boundary = extractBoundary(contentType);
  const rawBuffer = await collectRequestBody(req);
  if (rawBuffer.length === 0) {
    return {} as SendEmailRequest;
  }

  const rawString = rawBuffer.toString('binary');
  const boundaryToken = `--${boundary}`;
  const sections = rawString.split(boundaryToken);
  const fields: Record<string, string> = {};
  const attachments: NonNullable<SendEmailRequest['attachments']> = [];

  for (const section of sections) {
    if (!section || section === '--' || section === '--\r\n') {
      continue;
    }

    let cleaned = section;
    if (cleaned.startsWith('\r\n')) {
      cleaned = cleaned.slice(2);
    }
    if (cleaned.endsWith('\r\n')) {
      cleaned = cleaned.slice(0, -2);
    }
    if (cleaned === '--') {
      continue;
    }

    const headerEndIndex = cleaned.indexOf('\r\n\r\n');
    if (headerEndIndex === -1) {
      continue;
    }

    const headersPart = cleaned.slice(0, headerEndIndex);
    const bodyPart = cleaned.slice(headerEndIndex + 4);

    const dispositionMatch = /name="([^"]+)"/i.exec(headersPart);
    if (!dispositionMatch) {
      continue;
    }
    const fieldName = dispositionMatch[1];
    const filenameMatch = /filename="([^"]*)"/i.exec(headersPart);

    if (filenameMatch && filenameMatch[1]) {
      const filename = filenameMatch[1];
      const contentBuffer = Buffer.from(bodyPart, 'binary');
      if (contentBuffer.length > MAX_ATTACHMENT_SIZE) {
        const error = new Error(`Anexo ${filename} excede o limite de 5MB`);
        (error as any).statusCode = 413;
        throw error;
      }
      attachments.push({ filename, content: contentBuffer.toString('base64') });
    } else {
      fields[fieldName] = Buffer.from(bodyPart, 'binary').toString('utf8');
    }
  }

  return {
    from: fields['from'],
    to: fields['to'],
    subject: fields['subject'],
    html: fields['html'],
    attachments: attachments.length > 0 ? attachments : undefined,
  } as SendEmailRequest;
};

export const parseSendEmailRequest = async (req: IncomingMessage): Promise<SendEmailRequest> => {
  const contentType = req.headers['content-type'];
  if (contentType && contentType.toLowerCase().includes('multipart/form-data')) {
    return parseMultipartBody(req, contentType);
  }
  const body = (await parseJsonBody(req)) as SendEmailRequest;
  if (body.attachments && body.attachments.length === 0) {
    delete (body as any).attachments;
  }
  return body;
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

export const matchesSendEmailRoute = (path: string) => {
  if (!path) {
    return false;
  }
  return path === '/emails/send' || path.endsWith('/emails/send');
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

  if (req.method === 'POST' && matchesSendEmailRoute(path)) {
    try {
      const body = await parseSendEmailRequest(req);
      const result = await sendEmailHandler(body, req.headers);
      res.statusCode = result.status;
      for (const [key, value] of Object.entries(result.headers)) {
        res.setHeader(key, value);
      }
      res.end(JSON.stringify(result.body));
      return;
    } catch (error: any) {
      if (error?.statusCode === 413) {
        res.statusCode = 413;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: false, error: error.message }));
        return;
      }
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
