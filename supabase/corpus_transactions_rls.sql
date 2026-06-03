-- Run this in Supabase: SQL Editor → New query → Run
-- Fixes: "new row violates row-level security policy for table corpus_transactions"

ALTER TABLE public.corpus_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "corpus_transactions_select" ON public.corpus_transactions;
DROP POLICY IF EXISTS "corpus_transactions_insert" ON public.corpus_transactions;
DROP POLICY IF EXISTS "corpus_transactions_update" ON public.corpus_transactions;
DROP POLICY IF EXISTS "corpus_transactions_delete" ON public.corpus_transactions;

-- Allow the app (anon key) to read corpus fund rows
CREATE POLICY "corpus_transactions_select"
  ON public.corpus_transactions
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow inserts when user clicks Add on Corpus page
CREATE POLICY "corpus_transactions_insert"
  ON public.corpus_transactions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow edits from the transaction list
CREATE POLICY "corpus_transactions_update"
  ON public.corpus_transactions
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Allow deletes (if you use delete in the app)
CREATE POLICY "corpus_transactions_delete"
  ON public.corpus_transactions
  FOR DELETE
  TO anon, authenticated
  USING (true);
