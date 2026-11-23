# Modèle de données (PostgreSQL 16)

PULSE ne stocke **ni utilisateurs, ni mots de passe, ni jetons**. L'identité vient du service d'auth ; les tables ne gardent que le `user_id` (texte, ex. `usr-10027`).

## Types énumérés

```sql
CREATE TYPE category             AS ENUM ('ACTIVITE','SOMMEIL','HYDRATATION','STRESS','NUTRITION');
CREATE TYPE reminder_frequency   AS ENUM ('QUOTIDIEN','HEBDOMADAIRE','AUCUN');
CREATE TYPE preferred_moment     AS ENUM ('MATIN','MIDI','SOIR');
CREATE TYPE goal_status          AS ENUM ('ACTIVE','SUSPENDED','CLOSED');
CREATE TYPE challenge_status     AS ENUM ('OPEN','UPCOMING','CLOSED');
CREATE TYPE participation_status AS ENUM ('ACTIVE','LEFT','COMPLETED');
CREATE TYPE content_type         AS ENUM ('ARTICLE','FICHE','CONSEIL');
CREATE TYPE content_status       AS ENUM ('DRAFT','PUBLISHED');
```

## Tables

```sql
CREATE TABLE preferences (
  preference_id        text PRIMARY KEY,               -- pref-001
  user_id              text NOT NULL UNIQUE,
  theme_prioritaire    category NOT NULL,
  notifications        boolean NOT NULL,
  frequence_rappel     reminder_frequency NOT NULL,
  moment_prefere       preferred_moment NOT NULL,
  participation_defis  boolean NOT NULL,
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE goals (
  goal_id        text PRIMARY KEY,                     -- goal-001
  user_id        text NOT NULL,
  category       category NOT NULL,
  label          text NOT NULL CHECK (length(trim(label)) BETWEEN 1 AND 120),
  target_value   numeric(12,2) NOT NULL CHECK (target_value > 0),
  current_value  numeric(12,2) NOT NULL DEFAULT 0 CHECK (current_value >= 0),
  unit           text NOT NULL CHECK (length(trim(unit)) BETWEEN 1 AND 30),
  status         goal_status NOT NULL DEFAULT 'ACTIVE',
  start_date     date NOT NULL,
  end_date       date CHECK (end_date IS NULL OR end_date >= start_date)
);
CREATE INDEX goals_user ON goals(user_id);

CREATE TABLE challenges (
  challenge_id  text PRIMARY KEY,                      -- chl-001
  title         text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 120),
  category      category NOT NULL,
  description   text NOT NULL CHECK (length(trim(description)) BETWEEN 1 AND 1000),
  start_date    date NOT NULL,
  end_date      date NOT NULL CHECK (end_date >= start_date),
  target_value  numeric(12,2) NOT NULL CHECK (target_value > 0),
  unit          text NOT NULL CHECK (length(trim(unit)) BETWEEN 1 AND 30),
  status        challenge_status NOT NULL,
  created_by    text NOT NULL
);

CREATE TABLE participations (
  participation_id text PRIMARY KEY,                   -- part-001
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
  metric_id     text PRIMARY KEY,                      -- met-001
  user_id       text NOT NULL,
  period_start  date NOT NULL,
  period_end    date NOT NULL,
  metric_type   text NOT NULL,
  label         text NOT NULL,
  value         numeric(12,2) NOT NULL,
  unit          text NOT NULL
);

CREATE TABLE contents (
  content_id    text PRIMARY KEY,                      -- cnt-001
  title         text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 160),
  type          content_type NOT NULL,
  category      category NOT NULL,
  status        content_status NOT NULL,
  published_at  date,
  updated_at    date NOT NULL,
  author_id     text NOT NULL,
  CHECK ((status = 'DRAFT') = (published_at IS NULL))  -- RG-ADM-05
);
```

## Identifiants

Les nouveaux identifiants reprennent le format de DATA : préfixe + numéro sur 3 chiffres (`goal-011`). Ils sont générés par une séquence par table : `CREATE SEQUENCE goal_seq START 11`, etc.

## Chargement de HAC-DATA-001

- Le classeur `.xlsm` (copié dans `docs/annexes/`) est converti **une fois** en `data/hac-data-001/*.json` (versionné) par `data/convert.py`. La conversion de l'ancienne version (`seed.json`) a été vérifiée contre le classeur : elle sert de point de départ.
- `make seed` (= `pulse-api seed --reset`) vide les tables, recharge les JSON et recale les séquences. On le lance avant chaque démo.
- Les utilisateurs et les mots de passe ne vont **pas** dans PostgreSQL. Ils restent dans `crates/auth-simulator/data/users.json`, avec des hachés Argon2id produits par `auth-simulator hash-users`.

## Données de référence utiles pour la recette

| Cas | Données |
|---|---|
| Préférences d'Alex | pref-001 : ACTIVITE, notifications oui, QUOTIDIEN, MATIN, défis oui |
| Objectifs d'Alex | goal-001 et goal-002 ACTIVE, goal-009 CLOSED |
| Participations d'Alex | part-001 (chl-001, ACTIVE, 7 800), part-006 (chl-002, LEFT), part-007 (chl-004, COMPLETED) |
| Métriques d'Alex | met-001 (5 jours actifs), met-002 (série de 4 jours) ; **aucune** WELLBEING_CHECKINS ni HYDRATION_DAYS (états vides) |
| Défis | chl-001, chl-002, chl-005 OPEN ; chl-003, chl-006 UPCOMING ; chl-004 CLOSED |
