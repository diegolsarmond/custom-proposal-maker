CREATE TABLE public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  proposal_id UUID REFERENCES public.proposals(id) ON DELETE SET NULL,
  value DECIMAL(12,2) NOT NULL,
  duration_months INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'ativo',
  renewal_policy TEXT NOT NULL,
  pdf_hash TEXT NOT NULL,
  signature_metadata JSONB,
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all contracts" ON public.contracts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create contracts" ON public.contracts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update all contracts" ON public.contracts
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Users can delete all contracts" ON public.contracts
  FOR DELETE TO authenticated USING (true);

CREATE TRIGGER set_updated_at_contracts
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_contracts_client_id ON public.contracts(client_id);
CREATE INDEX idx_contracts_proposal_id ON public.contracts(proposal_id);
