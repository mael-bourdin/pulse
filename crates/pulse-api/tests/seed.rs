//! Le seed charge HAC-DATA-001 tel quel et prépare les identifiants suivants (TECH-04).

use pulse_api::seed;
use sqlx::PgPool;

async fn count(pool: &PgPool, table: &str) -> i64 {
    sqlx::query_scalar(&format!("SELECT count(*) FROM {table}"))
        .fetch_one(pool)
        .await
        .unwrap()
}

async fn next(pool: &PgPool, sequence: &str) -> i64 {
    sqlx::query_scalar(&format!("SELECT nextval('{sequence}')"))
        .fetch_one(pool)
        .await
        .unwrap()
}

#[sqlx::test(migrations = "../../migrations")]
async fn acc_qual_03_seed_conforme_a_hac_data_001(pool: PgPool) {
    seed::reset(&pool).await.unwrap();

    for (table, expected) in [
        ("preferences", 5),
        ("goals", 10),
        ("challenges", 6),
        ("participations", 10),
        ("metrics", 8),
        ("contents", 6),
    ] {
        assert_eq!(count(&pool, table).await, expected, "{table}");
    }

    // Références de spec/data-model.md utilisées par la recette.
    let (theme, frequency, moment): (String, String, String) = sqlx::query_as(
        "SELECT theme_prioritaire::text, frequence_rappel::text, moment_prefere::text FROM preferences WHERE preference_id = 'pref-001'",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(
        (theme.as_str(), frequency.as_str(), moment.as_str()),
        ("ACTIVITE", "QUOTIDIEN", "MATIN")
    );

    let alex_goals: Vec<(String, String)> = sqlx::query_as(
        "SELECT goal_id, status::text FROM goals WHERE user_id = 'usr-10027' ORDER BY goal_id",
    )
    .fetch_all(&pool)
    .await
    .unwrap();
    assert_eq!(
        alex_goals,
        [
            ("goal-001", "ACTIVE"),
            ("goal-002", "ACTIVE"),
            ("goal-009", "CLOSED")
        ]
        .map(|(id, status)| (id.to_string(), status.to_string()))
    );

    let progress: String = sqlx::query_scalar(
        "SELECT progress_value::text FROM participations WHERE participation_id = 'part-001'",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(progress, "7800.00");
}

#[sqlx::test(migrations = "../../migrations")]
async fn tech_04_sequences_recalees_apres_le_seed(pool: PgPool) {
    seed::reset(&pool).await.unwrap();
    assert_eq!(next(&pool, "preference_seq").await, 6);
    assert_eq!(next(&pool, "goal_seq").await, 11);
    assert_eq!(next(&pool, "challenge_seq").await, 7);
    assert_eq!(next(&pool, "participation_seq").await, 11);
    assert_eq!(next(&pool, "content_seq").await, 7);
}

#[sqlx::test(migrations = "../../migrations")]
async fn tech_04_reset_efface_les_donnees_ajoutees(pool: PgPool) {
    seed::reset(&pool).await.unwrap();
    sqlx::query("INSERT INTO goals (goal_id, user_id, category, label, target_value, unit, start_date) VALUES ('goal-011', 'usr-10027', 'SOMMEIL', 'Dormir', 8, 'h/nuit', '2026-02-15')")
        .execute(&pool)
        .await
        .unwrap();
    seed::reset(&pool).await.unwrap();
    assert_eq!(count(&pool, "goals").await, 10);
}
