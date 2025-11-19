import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { IncomingHttpHeaders } from 'node:http';

export interface SendEmailRequest {
  from?: string;
  to?: string;
  subject?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: string;
  }>;
}

interface HandlerResult {
  status: number;
  body: unknown;
  headers: Record<string, string>;
}

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const defaultFetchImpl = globalThis.fetch.bind(globalThis);

const defaultCreateSupabaseClient = () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Configuração do Supabase ausente');
  }
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

const buildEmailPayload = (request: SendEmailRequest, fromName: string) => ({
  from: `${fromName} <${request.from}>`,
  to: [request.to],
  bcc: ['contato@quantumtecnologia.com.br'],
  subject: request.subject,
  html: request.html,
  attachments: request.attachments?.map((att) => ({
    filename: att.filename,
    content: att.content,
  })),
});

const parseResendResponse = async (response: { text: () => Promise<string> }) => {
  try {
    const raw = await response.text();
    if (!raw) {
      return null;
    }
    const trimmed = raw.trim();
    if (!trimmed) {
      return null;
    }
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  } catch {
    return null;
  }
};

const extractErrorMessage = (payload: unknown) => {
  if (!payload) {
    return 'Erro ao enviar email';
  }
  if (typeof payload === 'string') {
    const sanitized = payload.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return sanitized || 'Erro ao enviar email';
  }
  if (typeof payload === 'object') {
    const maybeMessage = (payload as any)?.message;
    if (typeof maybeMessage === 'string' && maybeMessage.trim()) {
      return maybeMessage;
    }
  }
  return 'Erro ao enviar email';
};

const parseAuthorization = (headers: IncomingHttpHeaders) => {
  const authHeader = headers['authorization'];
  if (!authHeader) {
    return undefined;
  }
  if (Array.isArray(authHeader)) {
    return authHeader[0]?.replace(/^Bearer\s+/i, '');
  }
  return authHeader.replace(/^Bearer\s+/i, '');
};

const validateRequest = (request: SendEmailRequest) => {
  if (!request.from || !request.to || !request.subject || !request.html) {
    return 'Campos obrigatórios faltando';
  }
  return null;
};

export const createSendEmailHandler = (
  overrides: Partial<{
    createSupabaseClient: () => SupabaseClient;
    fetchImpl: typeof fetch;
    resendApiKey: string;
    fromName: string;
  }> = {},
) => {
  const createSupabaseClient = overrides.createSupabaseClient ?? defaultCreateSupabaseClient;
  const fetchImpl = overrides.fetchImpl ?? defaultFetchImpl;
  const resendApiKey = overrides.resendApiKey ?? process.env.RESEND_API_KEY ?? '';
  const fromName = overrides.fromName ?? process.env.SMTP_FROM_NAME ?? 'Quantum Tecnologia';

  return async (body: SendEmailRequest, headers: IncomingHttpHeaders): Promise<HandlerResult> => {
    const validationError = validateRequest(body);
    if (validationError) {
      return {
        status: 400,
        body: { success: false, error: validationError },
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      };
    }

    if (!resendApiKey) {
      return {
        status: 500,
        body: { success: false, error: 'Serviço de email não configurado' },
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      };
    }

    let supabase: SupabaseClient | null = null;
    try {
      supabase = createSupabaseClient();
    } catch (error) {
      console.error('Erro ao criar cliente Supabase:', error);
    }

    const token = parseAuthorization(headers);
    let userId: string | null = null;

    if (token && supabase) {
      try {
        const { data } = await supabase.auth.getUser(token);
        userId = data.user?.id ?? null;
      } catch (error) {
        console.error('Erro ao obter usuário:', error);
      }
    }

    const emailPayload = buildEmailPayload(body, fromName);

    try {
      try {
        await fetchImpl('https://n8n.quantumtecnologia.com.br/webhook/email-crm-quantum', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: body.from,
            to: body.to,
            subject: body.subject,
            html: body.html,
            attachments_count: body.attachments?.length ?? 0,
          }),
        });
      } catch (webhookError) {
        console.error('Erro ao acionar webhook:', webhookError);
      }

      const response = await fetchImpl('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailPayload),
      });

      const result = await parseResendResponse(response);

      if (!response.ok) {
        console.error('Erro da API Resend:', result);
        throw new Error(extractErrorMessage(result));
      }

      const resendId =
        typeof result === 'object' && result !== null && !Array.isArray(result)
          ? (result as any).id
          : undefined;
      if (!resendId || typeof resendId !== 'string') {
        throw new Error('Resposta inválida do serviço de email');
      }

      if (supabase) {
        try {
          await supabase
            .from('sent_emails')
            .insert({
              from_email: body.from,
              to_email: body.to,
              subject: body.subject,
              html_body: body.html,
              attachments_count: body.attachments?.length ?? 0,
              status: 'sent',
              resend_id: resendId,
              sent_by: userId,
            });
        } catch (error) {
          console.error('Erro ao salvar histórico:', error);
        }
      }

      return {
        status: 200,
        body: { success: true, id: resendId },
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      };
    } catch (error: any) {
      console.error('Erro ao enviar email:', error);

      if (userId && supabase) {
        try {
          await supabase
            .from('sent_emails')
            .insert({
              from_email: body.from ?? 'unknown',
              to_email: body.to ?? 'unknown',
              subject: body.subject ?? 'unknown',
              html_body: body.html ?? '',
              attachments_count: body.attachments?.length ?? 0,
              status: 'failed',
              error_message: error?.message ?? 'Erro ao enviar email',
              sent_by: userId,
            });
        } catch (historyError) {
          console.error('Erro ao salvar histórico de falha:', historyError);
        }
      }

      return {
        status: 500,
        body: { success: false, error: error?.message ?? 'Erro ao enviar email' },
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      };
    }
  };
};

let cachedHandler:
  | ((body: SendEmailRequest, headers: IncomingHttpHeaders) => Promise<HandlerResult>)
  | null = null;

export const sendEmailHandler = (body: SendEmailRequest, headers: IncomingHttpHeaders) => {
  if (!cachedHandler) {
    cachedHandler = createSendEmailHandler();
  }
  return cachedHandler(body, headers);
};
