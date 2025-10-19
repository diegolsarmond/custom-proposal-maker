-- Criar tabela para histórico de emails enviados
CREATE TABLE public.sent_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_email TEXT NOT NULL,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  attachments_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'sent',
  resend_id TEXT,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  error_message TEXT
);

-- Habilitar RLS
ALTER TABLE public.sent_emails ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuários podem visualizar todos os emails enviados"
ON public.sent_emails
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Sistema pode inserir emails enviados"
ON public.sent_emails
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Índices para melhor performance
CREATE INDEX idx_sent_emails_sent_at ON public.sent_emails(sent_at DESC);
CREATE INDEX idx_sent_emails_from ON public.sent_emails(from_email);
CREATE INDEX idx_sent_emails_to ON public.sent_emails(to_email);
CREATE INDEX idx_sent_emails_sent_by ON public.sent_emails(sent_by);