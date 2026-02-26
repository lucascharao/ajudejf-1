-- ═══════════════════════════════════════════════════════════════
-- Migration 001: Leitura pública (anon) para feature de Consulta
-- Execute no SQL Editor do Supabase Dashboard
-- ═══════════════════════════════════════════════════════════════

DO $$ DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'abrigos','pontos_doacao','desaparecidos',
    'pontos_alimentacao','comunidades','voluntarios'
  ]) LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = t AND policyname = 'select_publico'
    ) THEN
      EXECUTE format(
        'CREATE POLICY "select_publico" ON %I FOR SELECT TO anon USING (true)', t
      );
    END IF;
  END LOOP;
END $$;
