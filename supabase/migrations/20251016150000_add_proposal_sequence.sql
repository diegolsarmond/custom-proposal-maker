-- Add sequential numbering columns to proposals
ALTER TABLE public.proposals
  ADD COLUMN sequence_year INTEGER,
  ADD COLUMN sequence_number INTEGER,
  ADD COLUMN proposal_number TEXT;

WITH numbered AS (
  SELECT
    id,
    EXTRACT(YEAR FROM date)::INTEGER AS year,
    ROW_NUMBER() OVER (
      PARTITION BY EXTRACT(YEAR FROM date)::INTEGER
      ORDER BY created_at
    ) AS seq
  FROM public.proposals
)
UPDATE public.proposals p
SET
  sequence_year = numbered.year,
  sequence_number = numbered.seq,
  proposal_number = LPAD(numbered.seq::TEXT, 3, '0') || '/' || numbered.year::TEXT
FROM numbered
WHERE p.id = numbered.id;

ALTER TABLE public.proposals
  ALTER COLUMN sequence_year SET NOT NULL,
  ALTER COLUMN sequence_number SET NOT NULL,
  ALTER COLUMN proposal_number SET NOT NULL;

CREATE UNIQUE INDEX proposals_sequence_unique
  ON public.proposals (sequence_year, sequence_number);

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

  PERFORM 1
  FROM public.proposals
  WHERE sequence_year = current_year
  FOR UPDATE;

  SELECT COALESCE(MAX(sequence_number), 0) + 1
  INTO next_seq
  FROM public.proposals
  WHERE sequence_year = current_year;

  NEW.sequence_year := current_year;
  NEW.sequence_number := next_seq;
  NEW.proposal_number := LPAD(next_seq::TEXT, 3, '0') || '/' || current_year::TEXT;

  RETURN NEW;
END;
$$;

CREATE TRIGGER proposals_set_sequence
  BEFORE INSERT ON public.proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.set_proposal_sequence();
