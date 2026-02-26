-- ═══════════════════════════════════════════════════════════════
-- Ajude JF — Schema v2
-- Modelagem por entidade com FK para cidades
-- Rodar no SQL Editor do Supabase Dashboard
-- ═══════════════════════════════════════════════════════════════

-- ── 0. LIMPAR SCHEMA ANTERIOR ───────────────────────────────────
DROP TABLE IF EXISTS registros CASCADE;


-- ── 1. CIDADES (referência) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS cidades (
  id    smallint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nome  text NOT NULL UNIQUE
);

INSERT INTO cidades (nome) VALUES
  ('Juiz de Fora'),
  ('Ubá'),
  ('Senador Firmino'),
  ('Matias Barbosa')
ON CONFLICT (nome) DO NOTHING;


-- ── 2. TRIGGER: updated_at automático ───────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ── 3. ABRIGOS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS abrigos (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at      timestamptz DEFAULT now() NOT NULL,
  updated_at      timestamptz DEFAULT now() NOT NULL,
  cidade_id       smallint    NOT NULL REFERENCES cidades(id),
  nome_local      text        NOT NULL,
  responsavel     text        NOT NULL,
  telefone        text        NOT NULL,
  endereco        text        NOT NULL,
  vagas           integer     DEFAULT 0 CHECK (vagas >= 0),
  recursos        text[]      DEFAULT '{}',
  aceita_animais  text        CHECK (aceita_animais IN ('Sim', 'Não', 'Consultar')),
  necessidades    text,
  nao_precisa     text,
  prioridade      text        NOT NULL CHECK (prioridade IN ('Alta', 'Média', 'Baixa')),
  obs             text,
  status          text        DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_atendimento', 'resolvido'))
);

CREATE INDEX IF NOT EXISTS idx_abrigos_cidade    ON abrigos(cidade_id);
CREATE INDEX IF NOT EXISTS idx_abrigos_status    ON abrigos(status);
CREATE INDEX IF NOT EXISTS idx_abrigos_prioridade ON abrigos(prioridade);
CREATE INDEX IF NOT EXISTS idx_abrigos_created   ON abrigos(created_at DESC);

CREATE TRIGGER trg_abrigos_updated_at
  BEFORE UPDATE ON abrigos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ── 4. PONTOS DE DOAÇÃO ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pontos_doacao (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at    timestamptz DEFAULT now() NOT NULL,
  updated_at    timestamptz DEFAULT now() NOT NULL,
  cidade_id     smallint    NOT NULL REFERENCES cidades(id),
  nome_local    text        NOT NULL,
  responsavel   text        NOT NULL,
  telefone      text        NOT NULL,
  endereco      text        NOT NULL,
  horario       text,
  aceita        text[]      DEFAULT '{}',
  pix_tipo      text        CHECK (pix_tipo IN ('CPF', 'CNPJ', 'E-mail', 'Telefone', 'Chave aleatória')),
  pix_chave     text,
  pix_titular   text,
  obs           text,
  status        text        DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_atendimento', 'resolvido'))
);

CREATE INDEX IF NOT EXISTS idx_pontos_doacao_cidade  ON pontos_doacao(cidade_id);
CREATE INDEX IF NOT EXISTS idx_pontos_doacao_status  ON pontos_doacao(status);
CREATE INDEX IF NOT EXISTS idx_pontos_doacao_created ON pontos_doacao(created_at DESC);

CREATE TRIGGER trg_pontos_doacao_updated_at
  BEFORE UPDATE ON pontos_doacao
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ── 5. DESAPARECIDOS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS desaparecidos (
  id                  uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at          timestamptz DEFAULT now() NOT NULL,
  updated_at          timestamptz DEFAULT now() NOT NULL,
  cidade_id           smallint    NOT NULL REFERENCES cidades(id),
  nome_pessoa         text        NOT NULL,
  idade               integer     CHECK (idade >= 0 AND idade <= 120),
  descricao           text        NOT NULL,
  ultima_vez_visto    timestamptz,
  local_visto         text,
  condicao_saude      text,
  informante_nome     text        NOT NULL,
  informante_tel      text        NOT NULL,
  relacao             text,
  obs                 text,
  status              text        DEFAULT 'desaparecido' CHECK (status IN ('desaparecido', 'encontrado', 'arquivado'))
);

CREATE INDEX IF NOT EXISTS idx_desaparecidos_cidade  ON desaparecidos(cidade_id);
CREATE INDEX IF NOT EXISTS idx_desaparecidos_status  ON desaparecidos(status);
CREATE INDEX IF NOT EXISTS idx_desaparecidos_created ON desaparecidos(created_at DESC);

CREATE TRIGGER trg_desaparecidos_updated_at
  BEFORE UPDATE ON desaparecidos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ── 6. PONTOS DE ALIMENTAÇÃO ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS pontos_alimentacao (
  id                    uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at            timestamptz DEFAULT now() NOT NULL,
  updated_at            timestamptz DEFAULT now() NOT NULL,
  cidade_id             smallint    NOT NULL REFERENCES cidades(id),
  nome_local            text        NOT NULL,
  responsavel           text        NOT NULL,
  telefone              text        NOT NULL,
  endereco              text        NOT NULL,
  horario               text,
  capacidade            text,
  refeicoes             text[]      DEFAULT '{}',
  precisa_voluntarios   text        CHECK (precisa_voluntarios IN ('Sim, urgente', 'Sim, mas não urgente', 'Não')),
  necessidades          text,
  obs                   text,
  status                text        DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_atendimento', 'resolvido'))
);

CREATE INDEX IF NOT EXISTS idx_pontos_alim_cidade  ON pontos_alimentacao(cidade_id);
CREATE INDEX IF NOT EXISTS idx_pontos_alim_status  ON pontos_alimentacao(status);
CREATE INDEX IF NOT EXISTS idx_pontos_alim_created ON pontos_alimentacao(created_at DESC);

CREATE TRIGGER trg_pontos_alim_updated_at
  BEFORE UPDATE ON pontos_alimentacao
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ── 7. COMUNIDADES / BAIRROS ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS comunidades (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at    timestamptz DEFAULT now() NOT NULL,
  updated_at    timestamptz DEFAULT now() NOT NULL,
  cidade_id     smallint    NOT NULL REFERENCES cidades(id),
  nome_local    text        NOT NULL,
  responsavel   text        NOT NULL,
  telefone      text        NOT NULL,
  endereco      text        NOT NULL,
  familias      integer     CHECK (familias >= 0),
  necessidades  text[]      DEFAULT '{}',
  nao_precisa   text,
  prioridade    text        NOT NULL CHECK (prioridade IN ('Alta', 'Média', 'Baixa')),
  obs           text        NOT NULL,
  status        text        DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_atendimento', 'resolvido'))
);

CREATE INDEX IF NOT EXISTS idx_comunidades_cidade    ON comunidades(cidade_id);
CREATE INDEX IF NOT EXISTS idx_comunidades_status    ON comunidades(status);
CREATE INDEX IF NOT EXISTS idx_comunidades_prioridade ON comunidades(prioridade);
CREATE INDEX IF NOT EXISTS idx_comunidades_created   ON comunidades(created_at DESC);

CREATE TRIGGER trg_comunidades_updated_at
  BEFORE UPDATE ON comunidades
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ── 8. VOLUNTÁRIOS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS voluntarios (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at      timestamptz DEFAULT now() NOT NULL,
  updated_at      timestamptz DEFAULT now() NOT NULL,
  cidade_id       smallint    NOT NULL REFERENCES cidades(id),
  nome            text        NOT NULL,
  telefone        text        NOT NULL,
  bairro          text,
  veiculo         text        CHECK (veiculo IN ('Sim, carro', 'Sim, moto', 'Não')),
  habilidades     text[]      DEFAULT '{}',
  disponibilidade text,
  obs             text,
  status          text        DEFAULT 'disponivel' CHECK (status IN ('disponivel', 'alocado', 'inativo'))
);

CREATE INDEX IF NOT EXISTS idx_voluntarios_cidade  ON voluntarios(cidade_id);
CREATE INDEX IF NOT EXISTS idx_voluntarios_status  ON voluntarios(status);
CREATE INDEX IF NOT EXISTS idx_voluntarios_created ON voluntarios(created_at DESC);

CREATE TRIGGER trg_voluntarios_updated_at
  BEFORE UPDATE ON voluntarios
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ── 9. RLS — TODAS AS TABELAS ────────────────────────────────────
ALTER TABLE cidades           ENABLE ROW LEVEL SECURITY;
ALTER TABLE abrigos           ENABLE ROW LEVEL SECURITY;
ALTER TABLE pontos_doacao     ENABLE ROW LEVEL SECURITY;
ALTER TABLE desaparecidos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE pontos_alimentacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE comunidades       ENABLE ROW LEVEL SECURITY;
ALTER TABLE voluntarios       ENABLE ROW LEVEL SECURITY;

-- cidades: leitura pública (necessário para o formulário montar o select)
CREATE POLICY "cidades_select_publico"
  ON cidades FOR SELECT TO anon USING (true);

-- INSERT público (anon) em todas as tabelas de cadastro
DO $$ DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'abrigos','pontos_doacao','desaparecidos',
    'pontos_alimentacao','comunidades','voluntarios'
  ]) LOOP
    EXECUTE format(
      'CREATE POLICY "insert_publico" ON %I FOR INSERT TO anon WITH CHECK (true)', t
    );
  END LOOP;
END $$;

-- SELECT e UPDATE apenas para autenticados (futuro painel admin)
DO $$ DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'abrigos','pontos_doacao','desaparecidos',
    'pontos_alimentacao','comunidades','voluntarios'
  ]) LOOP
    EXECUTE format(
      'CREATE POLICY "select_autenticado" ON %I FOR SELECT TO authenticated USING (true)', t
    );
    EXECUTE format(
      'CREATE POLICY "update_autenticado" ON %I FOR UPDATE TO authenticated USING (true) WITH CHECK (true)', t
    );
  END LOOP;
END $$;


-- ── 10. COMENTÁRIOS DE DOCUMENTAÇÃO ─────────────────────────────
COMMENT ON TABLE cidades            IS 'Cidades atendidas pela plataforma Ajude JF';
COMMENT ON TABLE abrigos            IS 'Locais que oferecem abrigo para desabrigados';
COMMENT ON TABLE pontos_doacao      IS 'Pontos físicos de coleta de doações + dados PIX';
COMMENT ON TABLE desaparecidos      IS 'Pessoas desaparecidas reportadas pela comunidade';
COMMENT ON TABLE pontos_alimentacao IS 'Locais que distribuem refeições ou alimentos';
COMMENT ON TABLE comunidades        IS 'Bairros e comunidades com necessidades urgentes';
COMMENT ON TABLE voluntarios        IS 'Pessoas disponíveis para ajudar como voluntárias';
