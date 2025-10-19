import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendEmailRequest {
  from: string;
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: string; // base64
  }>;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Pega o token do usuário do header de autorização
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');
  let userId: string | null = null;
  
  if (token) {
    const { data: { user } } = await supabase.auth.getUser(token);
    userId = user?.id || null;
  }

  let from = '';
  let to = '';
  let subject = '';
  let html = '';
  let attachments: any[] | undefined;

  try {
    const requestData: SendEmailRequest = await req.json();
    from = requestData.from;
    to = requestData.to;
    subject = requestData.subject;
    html = requestData.html;
    attachments = requestData.attachments;

    console.log("Sending email from:", from, "to:", to);

    // Validação básica
    if (!from || !to || !subject || !html) {
      throw new Error("Campos obrigatórios faltando");
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY não configurada");
    }

    // Prepara o payload para a API do Resend
    const emailPayload: any = {
      from: `Quantum JUD <${from}>`,
      to: [to],
      bcc: ["contato@quantumtecnologia.com.br"],
      subject: subject,
      html: html,
    };

    // Adiciona anexos se existirem
    if (attachments && attachments.length > 0) {
      emailPayload.attachments = attachments.map(att => ({
        filename: att.filename,
        content: att.content,
      }));
    }

    // Faz a chamada direta para a API do Resend
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Erro da API Resend:", result);
      throw new Error(result.message || "Erro ao enviar email");
    }

    console.log("Email enviado com sucesso:", result);

    // Salva o histórico do email enviado
    const { error: dbError } = await supabase
      .from('sent_emails')
      .insert({
        from_email: from,
        to_email: to,
        subject: subject,
        html_body: html,
        attachments_count: attachments?.length || 0,
        status: 'sent',
        resend_id: result.id,
        sent_by: userId,
      });

    if (dbError) {
      console.error("Erro ao salvar histórico:", dbError);
      // Não falhamos a requisição se apenas o histórico falhar
    }

    return new Response(JSON.stringify({ 
      success: true, 
      id: result.id 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Erro ao enviar email:", error);
    
    // Tenta salvar o erro no histórico
    if (userId) {
      await supabase
        .from('sent_emails')
        .insert({
          from_email: from || 'unknown',
          to_email: to || 'unknown',
          subject: subject || 'unknown',
          html_body: html || '',
          attachments_count: attachments?.length || 0,
          status: 'failed',
          error_message: error.message,
          sent_by: userId,
        });
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Erro ao enviar email" 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);
