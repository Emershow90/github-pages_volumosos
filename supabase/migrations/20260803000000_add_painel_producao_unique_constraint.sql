-- Migration: Add UNIQUE constraint (sector_id, upload_date) to painel_producao
-- Ensures single production record per sector and upload date

-- 1. Deduplicate table if any duplicates exist (keeping the most recent record by ctid)
DELETE FROM public.painel_producao a
USING public.painel_producao b
WHERE a.ctid < b.ctid
  AND a.sector_id = b.sector_id
  AND a.upload_date = b.upload_date;

-- 2. Apply UNIQUE constraint
ALTER TABLE public.painel_producao
ADD CONSTRAINT painel_producao_sector_date_key
UNIQUE (sector_id, upload_date);
