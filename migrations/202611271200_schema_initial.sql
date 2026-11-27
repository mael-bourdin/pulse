-- Schéma initial de PULSE V1 (spec/data-model.md).
-- Une migration fusionnée n'est jamais modifiée : on en ajoute une nouvelle (ADR-31).

CREATE TYPE category             AS ENUM ('ACTIVITE','SOMMEIL','HYDRATATION','STRESS','NUTRITION');
CREATE TYPE reminder_frequency   AS ENUM ('QUOTIDIEN','HEBDOMADAIRE','AUCUN');
CREATE TYPE preferred_moment     AS ENUM ('MATIN','MIDI','SOIR');
CREATE TYPE goal_status          AS ENUM ('ACTIVE','SUSPENDED','CLOSED');
CREATE TYPE challenge_status     AS ENUM ('OPEN','UPCOMING','CLOSED');
CREATE TYPE participation_status AS ENUM ('ACTIVE','LEFT','COMPLETED');
CREATE TYPE content_type         AS ENUM ('ARTICLE','FICHE','CONSEIL');
CREATE TYPE content_status       AS ENUM ('DRAFT','PUBLISHED');

CREATE TABLE preferences (
  preference_id        text PRIMARY KEY,
  user_id              text NOT NULL UNIQUE,
  theme_prioritaire    category NOT NULL,
  notifications        boolean NOT NULL,
  frequence_rappel     reminder_frequency NOT NULL,
  moment_prefere       preferred_moment NOT NULL,
  participation_defis  boolean NOT NULL,
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE goals (
  goal_id        text PRIMARY KEY,
  user_id        text NOT NULL,
  category       category NOT NULL,
  label          text NOT NULL CHECK (length(trim(label)) BETWEEN 1 AND 120),
  target_value   numeric(12,2) NOT NULL CHECK (target_value > 0),
  current_value  numeric(12,2) NOT NULL DEFAULT 0 CHECK (current_value >= 0),
  unit           text NOT NULL CHECK (unit IN ('pas/jour','min/jour','min/semaine','h/nuit','L/jour',
                   'séances/jour','séances/semaine','jours/semaine','portions/jour')),  -- F3-R11
  status         goal_status NOT NULL DEFAULT 'ACTIVE',
  start_date     date NOT NULL,
  end_date       date CHECK (end_date IS NULL OR end_date >= start_date)
);
CREATE INDEX goals_user ON goals(user_id);

CREATE TABLE challenges (
  challenge_id  text PRIMARY KEY,
  title         text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 120),
  category      category NOT NULL,
  description   text NOT NULL CHECK (length(trim(description)) BETWEEN 1 AND 1000),
  start_date    date NOT NULL,
  end_date      date NOT NULL CHECK (end_date >= start_date),
  target_value  numeric(12,2) NOT NULL CHECK (target_value > 0),
  unit          text NOT NULL CHECK (unit IN ('pas/jour','min/jour','min/semaine','h/nuit','L/jour',
                  'séances/jour','séances/semaine','jours/semaine','portions/jour')),  -- F3-R11
  status        challenge_status NOT NULL,
  created_by    text NOT NULL
);

CREATE TABLE participations (
  participation_id text PRIMARY KEY,
  challenge_id     text NOT NULL REFERENCES challenges,
  user_id          text NOT NULL,
  joined_at        date NOT NULL,
  progress_value   numeric(12,2) NOT NULL DEFAULT 0 CHECK (progress_value >= 0),
  status           participation_status NOT NULL
);
-- ACC-CHAL-05 : une seule participation ACTIVE par (défi, utilisateur), garantie par la base
CREATE UNIQUE INDEX one_active_participation
  ON participations(challenge_id, user_id) WHERE status = 'ACTIVE';

CREATE TABLE metrics (
  metric_id     text PRIMARY KEY,
  user_id       text NOT NULL,
  period_start  date NOT NULL,
  period_end    date NOT NULL,
  metric_type   text NOT NULL,
  label         text NOT NULL,
  value         numeric(12,2) NOT NULL,
  unit          text NOT NULL
);

CREATE TABLE contents (
  content_id    text PRIMARY KEY,
  title         text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 160),
  type          content_type NOT NULL,
  category      category NOT NULL,
  status        content_status NOT NULL,
  published_at  date,
  updated_at    date NOT NULL,
  author_id     text NOT NULL,
  CONSTRAINT contents_published_at_check
    CHECK ((status = 'DRAFT') = (published_at IS NULL))  -- RG-ADM-05
);

-- Identifiants des nouvelles lignes : préfixe + numéro sur 3 chiffres (goal-011).
-- Le seed recale ces séquences après chargement de HAC-DATA-001 (TECH-04).
CREATE SEQUENCE preference_seq START 1;
CREATE SEQUENCE goal_seq START 1;
CREATE SEQUENCE challenge_seq START 1;
CREATE SEQUENCE participation_seq START 1;
CREATE SEQUENCE content_seq START 1;
