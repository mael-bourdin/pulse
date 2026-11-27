//! Chargement du jeu de données HAC-DATA-001 (spec/data-model.md → Chargement).
//!
//! `seed.json` est intégré au binaire : `pulse-api seed --reset`, les tests et les E2E
//! chargent exactement les mêmes données. Les utilisateurs n'y sont pas : ils vivent
//! dans le simulateur d'authentification.

use serde_json::Value;
use sqlx::PgPool;

const SEED_JSON: &str = include_str!("../../../data/hac-data-001/seed.json");

/// Une table : clé dans `seed.json`, puis l'INSERT qui lit le tableau JSON en `$1`.
/// `jsonb_to_recordset` convertit chaque objet en ligne typée (énumérations et dates comprises).
const TABLES: [(&str, &str); 6] = [
    (
        "preferences",
        r#"INSERT INTO preferences (preference_id, user_id, theme_prioritaire, notifications,
               frequence_rappel, moment_prefere, participation_defis)
           SELECT "preferenceId", "userId", "themePrioritaire", notifications,
                  "frequenceRappel", "momentPrefere", "participationDefis"
           FROM jsonb_to_recordset($1) AS x("preferenceId" text, "userId" text,
                "themePrioritaire" category, notifications boolean,
                "frequenceRappel" reminder_frequency, "momentPrefere" preferred_moment,
                "participationDefis" boolean)"#,
    ),
    (
        "goals",
        r#"INSERT INTO goals (goal_id, user_id, category, label, target_value, current_value,
               unit, status, start_date, end_date)
           SELECT "goalId", "userId", category, label, "targetValue", "currentValue",
                  unit, status, "startDate", "endDate"
           FROM jsonb_to_recordset($1) AS x("goalId" text, "userId" text, category category,
                label text, "targetValue" numeric, "currentValue" numeric, unit text,
                status goal_status, "startDate" date, "endDate" date)"#,
    ),
    (
        "challenges",
        r#"INSERT INTO challenges (challenge_id, title, category, description, start_date,
               end_date, target_value, unit, status, created_by)
           SELECT "challengeId", title, category, description, "startDate",
                  "endDate", "targetValue", unit, status, "createdBy"
           FROM jsonb_to_recordset($1) AS x("challengeId" text, title text, category category,
                description text, "startDate" date, "endDate" date, "targetValue" numeric,
                unit text, status challenge_status, "createdBy" text)"#,
    ),
    (
        "participations",
        r#"INSERT INTO participations (participation_id, challenge_id, user_id, joined_at,
               progress_value, status)
           SELECT "participationId", "challengeId", "userId", "joinedAt", "progressValue", status
           FROM jsonb_to_recordset($1) AS x("participationId" text, "challengeId" text,
                "userId" text, "joinedAt" date, "progressValue" numeric,
                status participation_status)"#,
    ),
    (
        "metrics",
        r#"INSERT INTO metrics (metric_id, user_id, period_start, period_end, metric_type,
               label, value, unit)
           SELECT "metricId", "userId", "periodStart", "periodEnd", "metricType", label, value, unit
           FROM jsonb_to_recordset($1) AS x("metricId" text, "userId" text, "periodStart" date,
                "periodEnd" date, "metricType" text, label text, value numeric, unit text)"#,
    ),
    (
        "contents",
        r#"INSERT INTO contents (content_id, title, type, category, status, published_at,
               updated_at, author_id)
           SELECT "contentId", title, type, category, status, "publishedAt", "updatedAt", "authorId"
           FROM jsonb_to_recordset($1) AS x("contentId" text, title text, type content_type,
                category category, status content_status, "publishedAt" date,
                "updatedAt" date, "authorId" text)"#,
    ),
];

/// Séquence → table et colonne d'identifiant. Après le chargement, chaque séquence
/// repart du plus grand numéro + 1 (goal-010 → goal-011).
const SEQUENCES: [(&str, &str, &str); 5] = [
    ("preference_seq", "preferences", "preference_id"),
    ("goal_seq", "goals", "goal_id"),
    ("challenge_seq", "challenges", "challenge_id"),
    ("participation_seq", "participations", "participation_id"),
    ("content_seq", "contents", "content_id"),
];

/// Vide toutes les tables, recharge HAC-DATA-001 et recale les séquences,
/// dans une seule transaction : en cas d'erreur, la base reste telle qu'avant.
pub async fn reset(pool: &PgPool) -> Result<(), String> {
    let data: Value =
        serde_json::from_str(SEED_JSON).map_err(|e| format!("seed.json illisible : {e}"))?;
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    sqlx::query("TRUNCATE preferences, goals, participations, challenges, metrics, contents")
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Vidage des tables : {e}"))?;

    for (key, insert) in TABLES {
        let rows = data
            .get(key)
            .ok_or_else(|| format!("seed.json : clé « {key} » absente"))?;
        sqlx::query(insert)
            .bind(rows)
            .execute(&mut *tx)
            .await
            .map_err(|e| format!("Chargement de {key} : {e}"))?;
    }

    for (sequence, table, column) in SEQUENCES {
        let sql = format!(
            "SELECT setval('{sequence}', \
             COALESCE(MAX(substring({column} FROM '[0-9]+$')::int), 0) + 1, false) FROM {table}"
        );
        sqlx::query(&sql)
            .execute(&mut *tx)
            .await
            .map_err(|e| format!("Séquence {sequence} : {e}"))?;
    }

    tx.commit().await.map_err(|e| e.to_string())
}
