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
  const resendApiKey =
    overrides.resendApiKey ?? process.env.RESEND_API_KEY ?? process.env.SMTP_PASSWORD ?? '';
  const fromName = overrides.fromName ?? process.env.SMTP_FROM_NAME ?? 'Quantum Tecnologia';

  if (!resendApiKey) {
    throw new Error('RESEND_API_KEY não configurada');
  }

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

    const supabase = createSupabaseClient();
    const token = parseAuthorization(headers);
    let userId: string | null = null;

    if (token) {
      try {
        const { data } = await supabase.auth.getUser(token);
        userId = data.user?.id ?? null;
      } catch (error) {
        console.error('Erro ao obter usuário:', error);
      }
    }

    const emailPayload = buildEmailPayload(body, fromName);

    try {
      const response = await fetchImpl('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailPayload),
      });

      const result = (await response.json()) as any;

      if (!response.ok) {
        console.error('Erro da API Resend:', result);
        throw new Error(result?.message ?? 'Erro ao enviar email');
      }

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
            resend_id: result.id,
            sent_by: userId,
          });
      } catch (error) {
        console.error('Erro ao salvar histórico:', error);
      }

      return {
        status: 200,
        body: { success: true, id: result.id },
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      };
    } catch (error: any) {
      console.error('Erro ao enviar email:', error);

      if (userId) {
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
