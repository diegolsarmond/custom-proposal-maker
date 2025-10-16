-- Ensure proposal sequence generation is concurrency-safe
CREATE TABLE IF NOT EXISTS public.proposal_sequences (
  sequence_year INTEGER PRIMARY KEY,
  last_number INTEGER NOT NULL
);

INSERT INTO public.proposal_sequences (sequence_year, last_number)
SELECT
  sequence_year,
  MAX(sequence_number)
FROM public.proposals
GROUP BY sequence_year
ON CONFLICT (sequence_year) DO UPDATE
SET last_number = EXCLUDED.last_number;

CREATE OR REPLACE FUNCTION public.set_proposal_sequence()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_seq INTEGER;
  current_year INTEGER;
BEGIN
  current_year := EXTRACT(YEAR FROM NEW.date)::INTEGER;

  INSERT INTO public.proposal_sequences (sequence_year, last_number)
  VALUES (current_year, 1)
  ON CONFLICT (sequence_year) DO UPDATE
    SET last_number = public.proposal_sequences.last_number + 1
  RETURNING last_number INTO next_seq;

  NEW.sequence_year := current_year;
  NEW.sequence_number := next_seq;
  NEW.proposal_number := LPAD(next_seq::TEXT, 3, '0') || '/' || current_year::TEXT;

  RETURN NEW;
END;
$$;
